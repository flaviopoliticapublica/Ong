// Teste de ponta a ponta da API (usa banco temporário).
process.env.DB_FILE = require("path").join(require("os").tmpdir(), "conecta-test-" + process.pid + ".db");
const assert = require("node:assert/strict");
const server = require("./server");
server.listen(0, async () => {
  const base = "http://localhost:" + server.address().port;
  let cookie = "";
  const call = async (m, u, b, ck = cookie) => {
    const r = await fetch(base + u, { method: m, headers: { "Content-Type": "application/json", cookie: ck }, body: b ? JSON.stringify(b) : undefined });
    const sc = r.headers.get("set-cookie"); if (sc && ck === cookie) cookie = sc.split(";")[0];
    return { s: r.status, j: await r.json().catch(() => ({})) };
  };
  try {
    assert.equal((await call("GET", "/api/dados")).j.projetos.length, 17);
    assert.equal((await call("POST", "/api/projetos", {})).s, 401);
    const reg = await call("POST", "/api/register", { tipo: "ong", nome: "Ana", email: "ana@ex.org", senha: "senha-forte-1", ongNome: "ONG X", cidade: "Natal", uf: "rn" });
    assert.equal(reg.s, 200); assert.equal(reg.j.user.tipo, "ong");
    assert.equal((await call("POST", "/api/register", { tipo: "apoiador", nome: "B", email: "ana@ex.org", senha: "12345678" })).s, 409);
    assert.equal((await call("POST", "/api/register", { tipo: "apoiador", nome: "B", email: "b@ex.org", senha: "curta" })).s, 400);
    const proj = { nome: "P1", cidade: "Natal", uf: "RN", resumo: "r", status: "ativo", eixos: ["cultura"], ods: [4, 10], necessidades: ["voluntarios"] };
    assert.equal((await call("POST", "/api/projetos", { ...proj, ods: [99] })).s, 400);
    const c = await call("POST", "/api/projetos", proj); assert.equal(c.s, 200);
    assert.equal((await call("PUT", "/api/projetos/" + c.j.id, { ...proj, nome: "P2" })).j.nome, "P2");
    // anônimo envia interesse; só a ONG dona lê
    assert.equal((await call("POST", "/api/interesses", { projeto: c.j.id, nome: "Zé", contato: "ze@x.com", tipo: "voluntarios" }, "")).s, 200);
    assert.equal((await call("GET", "/api/interesses")).j.length, 1);
    const ap = await call("POST", "/api/register", { tipo: "apoiador", nome: "Bia", email: "bia@ex.org", senha: "outra-senha-1" }, "x=1");
    const ck2 = ""; assert.equal(ap.s, 200);
    // outra ONG não edita projeto alheio nem vê interesses
    const ong2 = await fetch(base + "/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "ong", nome: "C", email: "c@ex.org", senha: "senha-forte-2", ongNome: "ONG Y", cidade: "Rio", uf: "RJ" }) });
    const ck = ong2.headers.get("set-cookie").split(";")[0];
    assert.equal((await call("PUT", "/api/projetos/" + c.j.id, proj, ck)).s, 404);
    assert.equal((await call("DELETE", "/api/projetos/" + c.j.id, {}, ck)).s, 404);
    assert.equal((await call("GET", "/api/interesses", null, ck)).j.length, 0);
    // login errado / certo / logout
    assert.equal((await call("POST", "/api/login", { email: "ana@ex.org", senha: "errada123" }, "")).s, 401);
    assert.equal((await call("POST", "/api/login", { email: "ana@ex.org", senha: "senha-forte-1" }, "")).s, 200);
    await call("POST", "/api/logout"); assert.equal((await call("GET", "/api/me")).j.user, null);
    // CSRF: origem diferente é bloqueada
    const bad = await fetch(base + "/api/login", { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://evil.example" }, body: "{}" });
    assert.equal(bad.status, 403);
    console.log("OK: todos os testes passaram");
  } catch (e) { console.error(e); process.exitCode = 1; }
  server.close(); setTimeout(() => process.exit(), 100);
});
