"use strict";
// Servidor do Conecta ODS: API REST + login (sessões por cookie) + arquivos estáticos.
// Sem dependências npm: usa apenas módulos nativos do Node 22+ (http, crypto, node:sqlite).
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const PORT = +process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, "conecta.db");
const SESSION_DAYS = 7;
const SECURE = process.env.NODE_ENV === "production";

// ---------- catálogo (reaproveita data.js do front-end) ----------
const cat = vm.runInNewContext(fs.readFileSync(path.join(__dirname, "data.js"), "utf8") + "\n;({ODS,EIXOS,NECESSIDADES,ONGS,PROJETOS})");
const EIXO_IDS = cat.EIXOS.map((e) => e.id), NEC_IDS = cat.NECESSIDADES.map((n) => n.id);
const STATUS = ["ativo", "planejamento", "concluido"];

// ---------- banco ----------
const db = new DatabaseSync(DB_FILE);
db.exec(`
PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS ongs(id TEXT PRIMARY KEY, nome TEXT NOT NULL, cidade TEXT, uf TEXT, desde INTEGER, sobre TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, email TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, hash TEXT NOT NULL, tipo TEXT NOT NULL CHECK(tipo IN('ong','apoiador')), ong_id TEXT REFERENCES ongs(id), criado TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expira INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS projetos(id TEXT PRIMARY KEY, ong_id TEXT NOT NULL REFERENCES ongs(id) ON DELETE CASCADE, nome TEXT NOT NULL, eixos TEXT NOT NULL, ods TEXT NOT NULL, cidade TEXT, uf TEXT, publico TEXT, beneficiarios INTEGER DEFAULT 0, status TEXT NOT NULL, necessidades TEXT NOT NULL, resumo TEXT, indicador TEXT);
CREATE TABLE IF NOT EXISTS interesses(id INTEGER PRIMARY KEY AUTOINCREMENT, projeto_id TEXT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id), nome TEXT NOT NULL, contato TEXT NOT NULL, tipo TEXT, msg TEXT, criado TEXT NOT NULL);
`);
const q = (sql, ...a) => db.prepare(sql).all(...a);
const one = (sql, ...a) => db.prepare(sql).get(...a);
const run = (sql, ...a) => db.prepare(sql).run(...a);

if (!one("SELECT 1 x FROM ongs LIMIT 1")) { // dados de demonstração (fictícios), só na primeira execução
  for (const o of cat.ONGS) run("INSERT INTO ongs(id,nome,cidade,uf,desde,sobre) VALUES(?,?,?,?,?,?)", o.id, o.nome, o.cidade, o.uf, o.desde, o.sobre);
  for (const p of cat.PROJETOS) insertProjeto(p.id, p.ong, p);
}
function insertProjeto(id, ongId, p) {
  run("INSERT INTO projetos(id,ong_id,nome,eixos,ods,cidade,uf,publico,beneficiarios,status,necessidades,resumo,indicador) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
    id, ongId, p.nome, JSON.stringify(p.eixos), JSON.stringify(p.ods), p.cidade, p.uf, p.publico, p.beneficiarios, p.status, JSON.stringify(p.necessidades), p.resumo, p.indicador);
}
const projOut = (r) => ({ id: r.id, ong: r.ong_id, nome: r.nome, eixos: JSON.parse(r.eixos), ods: JSON.parse(r.ods), cidade: r.cidade, uf: r.uf, publico: r.publico, beneficiarios: r.beneficiarios, status: r.status, necessidades: JSON.parse(r.necessidades), resumo: r.resumo, indicador: r.indicador });

// ---------- senhas e sessões ----------
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString("hex");
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
function newSession(userId) {
  const tok = crypto.randomBytes(32).toString("base64url");
  run("INSERT INTO sessions(token,user_id,expira) VALUES(?,?,?)", sha(tok), userId, Date.now() + SESSION_DAYS * 864e5); // só o hash é guardado
  return tok;
}
function cookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").map((c) => c.trim().split("=")).filter((x) => x[0]).map(([k, ...v]) => [k, v.join("=")]));
}
function currentUser(req) {
  const tok = cookies(req).sid;
  if (!tok) return null;
  const s = one("SELECT user_id, expira FROM sessions WHERE token=?", sha(tok));
  if (!s) return null;
  if (s.expira < Date.now()) { run("DELETE FROM sessions WHERE token=?", sha(tok)); return null; }
  return one("SELECT id,nome,email,tipo,ong_id FROM users WHERE id=?", s.user_id);
}
const setCookie = (res, tok, maxAge) => res.setHeader("Set-Cookie", `sid=${tok}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${SECURE ? "; Secure" : ""}`);

// limitador simples por IP+rota (em memória)
const hits = new Map();
function limited(req, key, max, windowMs) {
  const k = key + "|" + req.socket.remoteAddress, now = Date.now();
  const arr = (hits.get(k) || []).filter((t) => now - t < windowMs);
  arr.push(now); hits.set(k, arr);
  return arr.length > max;
}
setInterval(() => hits.clear(), 3600e3).unref();

// ---------- validação ----------
class HttpError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const str = (v, name, { min = 1, max = 200, req = true } = {}) => {
  v = typeof v === "string" ? v.trim() : "";
  if (!v && !req) return "";
  if (v.length < min || v.length > max) throw new HttpError(400, `Campo inválido: ${name}`);
  return v;
};
function validarProjeto(b) {
  const eixos = [...new Set(Array.isArray(b.eixos) ? b.eixos : [])], ods = [...new Set(Array.isArray(b.ods) ? b.ods.map(Number) : [])];
  const necessidades = [...new Set(Array.isArray(b.necessidades) ? b.necessidades : [])];
  if (!eixos.length || !eixos.every((e) => EIXO_IDS.includes(e))) throw new HttpError(400, "Escolha ao menos um eixo válido.");
  if (!ods.length || !ods.every((n) => Number.isInteger(n) && n >= 1 && n <= 17)) throw new HttpError(400, "Escolha ao menos um ODS válido (1–17).");
  if (!necessidades.every((n) => NEC_IDS.includes(n))) throw new HttpError(400, "Necessidade inválida.");
  if (!STATUS.includes(b.status)) throw new HttpError(400, "Situação inválida.");
  const benef = Math.max(0, Math.min(1e8, parseInt(b.beneficiarios, 10) || 0));
  return {
    nome: str(b.nome, "nome", { max: 100 }), eixos, ods, necessidades, status: b.status, beneficiarios: benef,
    cidade: str(b.cidade, "cidade", { max: 60 }), uf: str(b.uf, "UF", { min: 2, max: 2 }).toUpperCase(),
    publico: str(b.publico, "público", { max: 100, req: false }) || "—", resumo: str(b.resumo, "resumo", { max: 400 }),
    indicador: str(b.indicador, "indicador", { max: 100, req: false }) || "—",
  };
}

// ---------- rotas ----------
const routes = [];
const route = (method, pattern, handler) => routes.push({ method, re: new RegExp("^" + pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$"), handler });
const needLogin = (u) => { if (!u) throw new HttpError(401, "Faça login para continuar."); return u; };
const needOng = (u) => { needLogin(u); if (u.tipo !== "ong" || !u.ong_id) throw new HttpError(403, "Apenas contas de ONG podem fazer isso."); return u; };
const meOut = (u) => u && { id: u.id, nome: u.nome, email: u.email, tipo: u.tipo, ong_id: u.ong_id };

route("GET", "/api/dados", () => ({ ongs: q("SELECT id,nome,cidade,uf,desde,sobre FROM ongs ORDER BY nome"), projetos: q("SELECT * FROM projetos ORDER BY rowid").map(projOut) }));
route("GET", "/api/me", ({ user }) => ({ user: meOut(user) }));

route("POST", "/api/register", ({ body, res }) => {
  const nome = str(body.nome, "nome", { max: 100 }), email = str(body.email, "e-mail", { max: 120 }).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "E-mail inválido.");
  const senha = typeof body.senha === "string" ? body.senha : "";
  if (senha.length < 8 || senha.length > 200) throw new HttpError(400, "A senha deve ter de 8 a 200 caracteres.");
  const tipo = body.tipo === "ong" ? "ong" : "apoiador";
  if (one("SELECT 1 x FROM users WHERE email=?", email)) throw new HttpError(409, "Este e-mail já está cadastrado.");
  let ongId = null;
  db.exec("BEGIN");
  try {
    if (tipo === "ong") {
      ongId = "o" + crypto.randomBytes(5).toString("hex");
      run("INSERT INTO ongs(id,nome,cidade,uf,desde,sobre) VALUES(?,?,?,?,?,?)", ongId, str(body.ongNome, "nome da ONG", { max: 100 }), str(body.cidade, "cidade", { max: 60 }), str(body.uf, "UF", { min: 2, max: 2 }).toUpperCase(), new Date().getFullYear(), str(body.sobre, "sobre", { max: 300, req: false }));
    }
    const salt = crypto.randomBytes(16).toString("hex");
    const r = run("INSERT INTO users(nome,email,salt,hash,tipo,ong_id,criado) VALUES(?,?,?,?,?,?,?)", nome, email, salt, hashPw(senha, salt), tipo, ongId, new Date().toISOString());
    db.exec("COMMIT");
    setCookie(res, newSession(Number(r.lastInsertRowid)), SESSION_DAYS * 86400);
    return { user: meOut(one("SELECT id,nome,email,tipo,ong_id FROM users WHERE id=?", r.lastInsertRowid)) };
  } catch (e) { db.exec("ROLLBACK"); throw e; }
});

route("POST", "/api/login", ({ body, req, res }) => {
  if (limited(req, "login", 10, 15 * 60e3)) throw new HttpError(429, "Muitas tentativas. Aguarde alguns minutos.");
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "", senha = typeof body.senha === "string" ? body.senha : "";
  const u = one("SELECT * FROM users WHERE email=?", email);
  const salt = u ? u.salt : "00".repeat(16); // custo constante mesmo se o e-mail não existir
  const h = Buffer.from(hashPw(senha.slice(0, 200), salt), "hex");
  const ok = u && crypto.timingSafeEqual(h, Buffer.from(u.hash, "hex"));
  if (!ok) throw new HttpError(401, "E-mail ou senha incorretos.");
  setCookie(res, newSession(u.id), SESSION_DAYS * 86400);
  return { user: meOut(u) };
});

route("POST", "/api/logout", ({ req, res }) => {
  const tok = cookies(req).sid;
  if (tok) run("DELETE FROM sessions WHERE token=?", sha(tok));
  setCookie(res, "", 0);
  return { ok: true };
});

route("POST", "/api/projetos", ({ user, body }) => {
  needOng(user);
  const id = "p" + crypto.randomBytes(5).toString("hex");
  insertProjeto(id, user.ong_id, validarProjeto(body));
  return projOut(one("SELECT * FROM projetos WHERE id=?", id));
});
route("PUT", "/api/projetos/:id", ({ user, body, params }) => {
  needOng(user);
  const p = validarProjeto(body);
  const r = run("UPDATE projetos SET nome=?,eixos=?,ods=?,cidade=?,uf=?,publico=?,beneficiarios=?,status=?,necessidades=?,resumo=?,indicador=? WHERE id=? AND ong_id=?",
    p.nome, JSON.stringify(p.eixos), JSON.stringify(p.ods), p.cidade, p.uf, p.publico, p.beneficiarios, p.status, JSON.stringify(p.necessidades), p.resumo, p.indicador, params.id, user.ong_id);
  if (!r.changes) throw new HttpError(404, "Projeto não encontrado na sua ONG.");
  return projOut(one("SELECT * FROM projetos WHERE id=?", params.id));
});
route("DELETE", "/api/projetos/:id", ({ user, params }) => {
  needOng(user);
  if (!run("DELETE FROM projetos WHERE id=? AND ong_id=?", params.id, user.ong_id).changes) throw new HttpError(404, "Projeto não encontrado na sua ONG.");
  return { ok: true };
});

route("POST", "/api/interesses", ({ user, body, req }) => {
  if (limited(req, "interesse", 20, 3600e3)) throw new HttpError(429, "Muitos envios. Tente mais tarde.");
  const proj = one("SELECT id FROM projetos WHERE id=?", str(body.projeto, "projeto", { max: 40 }));
  if (!proj) throw new HttpError(404, "Projeto não encontrado.");
  const tipo = NEC_IDS.includes(body.tipo) ? body.tipo : "outro";
  run("INSERT INTO interesses(projeto_id,user_id,nome,contato,tipo,msg,criado) VALUES(?,?,?,?,?,?,?)", proj.id, user?.id ?? null, str(body.nome, "nome", { max: 100 }), str(body.contato, "contato", { max: 100 }), tipo, str(body.msg, "mensagem", { max: 500, req: false }), new Date().toISOString());
  return { ok: true };
});
// só a ONG dona do projeto vê quem demonstrou interesse (dados de contato)
route("GET", "/api/interesses", ({ user }) => {
  needOng(user);
  return q("SELECT i.id,i.projeto_id,p.nome AS projeto,i.nome,i.contato,i.tipo,i.msg,i.criado FROM interesses i JOIN projetos p ON p.id=i.projeto_id WHERE p.ong_id=? ORDER BY i.id DESC", user.ong_id);
});

// ---------- servidor ----------
const STATIC = { "/": "index.html", "/index.html": "index.html", "/styles.css": "styles.css", "/app.js": "app.js", "/data.js": "data.js" };
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
const HEADERS = { "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "same-origin", "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'" };

function readBody(req) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on("data", (c) => { n += c.length; if (n > 50e3) { reject(new HttpError(413, "Requisição grande demais.")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks)) : {}); } catch { reject(new HttpError(400, "JSON inválido.")); } });
  });
}

const server = http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(HEADERS)) res.setHeader(k, v);
  const url = new URL(req.url, "http://x"), p = url.pathname;
  const send = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(obj)); };
  try {
    if (p.startsWith("/api/")) {
      const mutating = req.method !== "GET" && req.method !== "HEAD";
      // defesa contra CSRF: exige JSON e, se houver Origin, que seja o mesmo host
      if (mutating) {
        if (!/^application\/json/.test(req.headers["content-type"] || "")) throw new HttpError(415, "Use application/json.");
        const o = req.headers.origin;
        if (o && new URL(o).host !== req.headers.host) throw new HttpError(403, "Origem não permitida.");
      }
      for (const r of routes) {
        const m = r.method === req.method && p.match(r.re);
        if (!m) continue;
        const body = mutating ? await readBody(req) : {};
        return send(200, await r.handler({ req, res, body, params: m.groups || {}, user: currentUser(req) }));
      }
      throw new HttpError(404, "Rota não encontrada.");
    }
    const f = STATIC[p];
    if (!f || req.method !== "GET") { res.writeHead(404); return res.end("Não encontrado"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(f)] });
    res.end(fs.readFileSync(path.join(__dirname, f)));
  } catch (e) {
    if (e instanceof HttpError) return send(e.code, { erro: e.message });
    console.error(e); send(500, { erro: "Erro interno." });
  }
});
if (require.main === module) server.listen(PORT, () => console.log(`Conecta ODS em http://localhost:${PORT}`));
module.exports = server;
