"use strict";
// ---------- utilidades ----------
const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const odsOf = (n) => ODS.find((o) => o.n === n);
const eixoOf = (id) => EIXOS.find((e) => e.id === id);
const necOf = (id) => NECESSIDADES.find((e) => e.id === id);
const ongOf = (id) => ALL_ONGS().find((o) => o.id === id);
const STATUS = { ativo: "Ativo", planejamento: "Em planejamento", concluido: "Concluído (replicável)" };

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("cods_" + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("cods_" + k, JSON.stringify(v)); } catch {} },
};
// dados vêm da API (servidor); ME = usuário logado
let DB = { ongs: [], projetos: [] }, ME = null;
const ALL_ONGS = () => DB.ongs;
const ALL_PROJ = () => DB.projetos;
async function api(method, url, body) {
  const r = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : { "Content-Type": "application/json" }, body: method === "GET" ? undefined : JSON.stringify(body || {}), credentials: "same-origin" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || "Erro " + r.status);
  return j;
}
async function recarregar() { DB = await api("GET", "/api/dados"); }
function navUser() {
  const n = $("#nav");
  n.querySelectorAll(".dyn").forEach((e) => e.remove());
  const add = (h, r, t) => n.insertAdjacentHTML("beforeend", `<a class="dyn" href="${h}" data-r="${r}">${t}</a>`);
  if (!ME) add("#conta", "conta", "Entrar / Criar conta");
  else {
    if (ME.tipo === "ong") add("#meus", "meus", "Meus projetos");
    n.insertAdjacentHTML("beforeend", `<a class="dyn" href="#" id="sair">Sair (${esc(ME.nome.split(" ")[0])})</a>`);
    $("#sair").onclick = async (e) => { e.preventDefault(); await api("POST", "/api/logout"); ME = null; navUser(); location.hash = "#explorar"; go(); };
  }
}

const odsBadge = (n, sm) => { const o = odsOf(n); return `<span class="ods ${sm ? "sm" : ""}" style="background:${o.cor}" title="ODS ${n} — ${esc(o.nome)}">${n}</span>`; };
const odsRow = (list) => `<div class="odsrow">${list.map((n) => odsBadge(n, true)).join("")}</div>`;
const eixoTags = (p) => p.eixos.map((id) => `<span class="tag">${eixoOf(id).icone} ${esc(eixoOf(id).nome)}</span>`).join("");

// ---------- motor de conexão ----------
// Pontuação 0–100: ODS (50) + eixo temático (25) + necessidade x oferta (15) + localização (10)
function score(p, perfil) {
  const why = [];
  let s = 0;
  const odsSel = perfil.ods || [], eixSel = perfil.eixos || [], ofr = perfil.oferece || [];
  if (odsSel.length) {
    const comuns = p.ods.filter((n) => odsSel.includes(n));
    // ODS principal (primeiro da lista) vale o dobro
    const peso = (n) => (n === p.ods[0] ? 2 : 1);
    const max = p.ods.reduce((a, n) => a + peso(n), 0);
    const got = comuns.reduce((a, n) => a + peso(n), 0);
    s += 50 * Math.min(1, (got / max) * 1.4);
    if (comuns.length) why.push(`ODS em comum: ${comuns.join(", ")}`);
  }
  if (eixSel.length) {
    const comuns = p.eixos.filter((e) => eixSel.includes(e));
    s += 25 * (comuns.length / Math.min(p.eixos.length, eixSel.length));
    if (comuns.length) why.push(`Eixo: ${comuns.map((e) => eixoOf(e).nome).join(", ")}`);
  }
  if (ofr.length) {
    const comuns = p.necessidades.filter((n) => ofr.includes(n));
    s += 15 * (comuns.length / Math.min(p.necessidades.length || 1, ofr.length));
    if (comuns.length) why.push(`Precisa de: ${comuns.map((n) => necOf(n).nome.toLowerCase()).join(", ")}`);
  }
  if (perfil.uf) {
    if (p.uf === perfil.uf) { s += 10; why.push(`Mesmo estado (${p.uf})`); }
  }
  if (p.status === "concluido") s *= 0.8;
  return { s: Math.round(s), why };
}

// parceiros sugeridos: projetos de OUTRAS ONGs com ODS compartilhados e eixos complementares
function parceiros(p, n = 4) {
  return ALL_PROJ()
    .filter((q) => q.id !== p.id && q.ong !== p.ong)
    .map((q) => {
      const odsC = q.ods.filter((x) => p.ods.includes(x));
      const eixNovos = q.eixos.filter((e) => !p.eixos.includes(e));
      return { q, odsC, eixNovos, v: odsC.length * 3 + eixNovos.length + (q.uf === p.uf ? 1 : 0) };
    })
    .filter((x) => x.odsC.length)
    .sort((a, b) => b.v - a.v)
    .slice(0, n);
}

// ---------- estado e roteador ----------
let filtro = { q: "", eixo: "", ods: "", uf: "", status: "", nec: "" };
let perfil = store.get("perfil", { ods: [], eixos: [], oferece: [], uf: "" });

const rotas = { explorar: vExplorar, conexoes: vConexoes, painel: vPainel, conta: vConta, meus: vMeus, cadastrar: vCadastrar };
function go() {
  const r = (location.hash.replace("#", "").split("?")[0]) || "explorar";
  const f = rotas[r] || vExplorar;
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.r === r));
  Promise.resolve(f($("#app"))).catch((e) => { $("#app").innerHTML = `<p role="alert">Erro: ${esc(e.message)}</p>`; });
}
addEventListener("hashchange", go);

// ---------- cartão de projeto ----------
function card(p, extra = "") {
  const o = ongOf(p.ong);
  return `<article class="card">
    <div><span class="tag st-${esc(p.status)}">${esc(STATUS[p.status])}</span>${eixoTags(p)}</div>
    <h3>${esc(p.nome)}</h3>
    <div class="meta">${esc(o?.nome || "")} · ${esc(p.cidade)}/${esc(p.uf)}</div>
    <p style="margin:0">${esc(p.resumo)}</p>
    ${odsRow(p.ods)}
    ${extra}
    <div class="act"><button data-det="${esc(p.id)}">Ver detalhes</button><button class="sec" data-ajudar="${esc(p.id)}">Quero ajudar</button></div>
  </article>`;
}
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-det],[data-ajudar],[data-close]");
  if (!t) return;
  if (t.dataset.det) detalhe(t.dataset.det);
  if (t.dataset.ajudar) ajudar(t.dataset.ajudar);
  if (t.dataset.close !== undefined) fechar();
});
addEventListener("keydown", (e) => { if (e.key === "Escape") fechar(); });
let lastFocus;
function abrir(html) {
  lastFocus = document.activeElement;
  const m = $("#modal");
  m.innerHTML = `<div class="sheet">${html}</div>`;
  m.hidden = false;
  m.onclick = (e) => { if (e.target === m) fechar(); };
  (m.querySelector("input,textarea,button") || m).focus();
}
function fechar() { $("#modal").hidden = true; lastFocus?.focus?.(); }

function detalhe(id) {
  const p = ALL_PROJ().find((x) => x.id === id);
  if (!p) return;
  const o = ongOf(p.ong);
  const par = parceiros(p);
  abrir(`<header><div><h2 id="mtitle" style="margin:0">${esc(p.nome)}</h2><div class="meta">${esc(o?.nome)} · ${esc(p.cidade)}/${esc(p.uf)}${o?.desde ? " · desde " + esc(o.desde) : ""}</div></div><button class="sec" data-close aria-label="Fechar">✕</button></header>
    <p>${esc(p.resumo)}</p>
    <p class="meta"><strong>Público:</strong> ${esc(p.publico)} · <strong>Beneficiários:</strong> ${esc(p.beneficiarios)} · <strong>Indicador:</strong> ${esc(p.indicador)}</p>
    <h2>Conexão com os ODS</h2>
    ${p.ods.map((n, i) => `<div class="mini"><span>${odsBadge(n, true)} ${esc(odsOf(n).nome)}</span><span class="meta">${i === 0 ? "ODS principal" : "ODS associado"}</span></div>`).join("")}
    <h2>O que o projeto procura</h2>
    <div>${p.necessidades.map((n) => `<span class="tag">${esc(necOf(n).nome)}</span>`).join("") || "—"}</div>
    <h2>Possíveis parcerias (ODS em comum)</h2>
    ${par.length ? par.map(({ q, odsC }) => `<div class="mini"><span><button class="sec" data-det="${esc(q.id)}">${esc(q.nome)}</button> <span class="meta">${esc(ongOf(q.ong)?.nome)}</span></span><span>${odsC.map((n) => odsBadge(n, true)).join("")}</span></div>`).join("") : `<p class="meta">Nenhuma sugestão ainda.</p>`}
    <p style="margin-top:16px"><button data-ajudar="${esc(p.id)}">Quero ajudar</button></p>`);
}

function ajudar(id) {
  const p = ALL_PROJ().find((x) => x.id === id);
  if (!p) return;
  abrir(`<header><h2 id="mtitle" style="margin:0">Apoiar: ${esc(p.nome)}</h2><button class="sec" data-close aria-label="Fechar">✕</button></header>
  <form id="fa" style="display:grid;gap:10px;margin-top:10px">
    <div><label for="a1">Seu nome ou organização</label><input id="a1" required maxlength="100" value="${esc(ME?.nome || "")}"></div>
    <div><label for="a2">E-mail ou telefone</label><input id="a2" required maxlength="100" value="${esc(ME?.email || "")}"></div>
    <div><label for="a3">Como quer contribuir?</label><select id="a3">${NECESSIDADES.map((n) => `<option value="${esc(n.id)}" ${p.necessidades.includes(n.id) ? "" : ""}>${esc(n.nome)}</option>`).join("")}<option value="outro">Outro</option></select></div>
    <div><label for="a4">Mensagem</label><textarea id="a4" maxlength="500"></textarea></div>
    <button>Enviar interesse</button>
    <p class="meta">Seus dados de contato serão vistos apenas pela ONG responsável pelo projeto.</p><p id="aerr" class="meta" role="alert" style="color:var(--warn)"></p>
  </form>`);
  $("#fa").onsubmit = async (e) => {
    e.preventDefault();
    try { await api("POST", "/api/interesses", { projeto: id, nome: $("#a1").value, contato: $("#a2").value, tipo: $("#a3").value, msg: $("#a4").value }); }
    catch (er) { $("#aerr").textContent = er.message; return; }
    $(".sheet").innerHTML = `<h2 id="mtitle">Obrigado! 💚</h2><p class="ok">Seu interesse em “${esc(p.nome)}” foi registrado.</p><button data-close>Fechar</button>`;
  };
}

// ---------- Explorar ----------
function aplicarFiltro() {
  const f = filtro, q = f.q.trim().toLowerCase();
  return ALL_PROJ().filter((p) => {
    const o = ongOf(p.ong);
    if (q && !(p.nome + " " + p.resumo + " " + (o?.nome || "") + " " + p.cidade).toLowerCase().includes(q)) return false;
    if (f.eixo && !p.eixos.includes(f.eixo)) return false;
    if (f.ods && !p.ods.includes(+f.ods)) return false;
    if (f.uf && p.uf !== f.uf) return false;
    if (f.status && p.status !== f.status) return false;
    if (f.nec && !p.necessidades.includes(f.nec)) return false;
    return true;
  });
}
function opts(list, cur, ph) { return `<option value="">${ph}</option>` + list.map(([v, t]) => `<option value="${esc(v)}" ${String(cur) === String(v) ? "selected" : ""}>${esc(t)}</option>`).join(""); }

function vExplorar(root) {
  const ufs = [...new Set(ALL_PROJ().map((p) => p.uf))].sort();
  const todos = ALL_PROJ();
  root.innerHTML = `<h1>Encontre projetos e ONGs</h1>
  <p class="lead">Busque iniciativas ativas por eixo temático, ODS, localização e necessidade. Cada projeto mostra a quais Objetivos de Desenvolvimento Sustentável contribui.</p>
  <div class="stats"><div class="stat"><b>${ALL_ONGS().length}</b>ONGs</div><div class="stat"><b>${todos.length}</b>projetos</div><div class="stat"><b>${new Set(todos.flatMap((p) => p.ods)).size}/17</b>ODS cobertos</div><div class="stat"><b>${todos.reduce((a, p) => a + (+p.beneficiarios || 0), 0).toLocaleString("pt-BR")}</b>beneficiários</div></div>
  <form class="panel filters" id="ff" role="search">
    <div><label for="fq">Busca</label><input id="fq" type="search" value="${esc(filtro.q)}" placeholder="nome, cidade, tema…"></div>
    <div><label for="fe">Eixo temático</label><select id="fe">${opts(EIXOS.map((e) => [e.id, e.icone + " " + e.nome]), filtro.eixo, "Todos")}</select></div>
    <div><label for="fo">ODS</label><select id="fo">${opts(ODS.map((o) => [o.n, `${o.n} — ${o.nome}`]), filtro.ods, "Todos")}</select></div>
    <div><label for="fu">Estado</label><select id="fu">${opts(ufs.map((u) => [u, u]), filtro.uf, "Todos")}</select></div>
    <div><label for="fs">Situação</label><select id="fs">${opts(Object.entries(STATUS), filtro.status, "Todas")}</select></div>
    <div><label for="fn">Precisa de</label><select id="fn">${opts(NECESSIDADES.map((n) => [n.id, n.nome]), filtro.nec, "Qualquer")}</select></div>
    <div><button type="button" class="sec" id="fclear">Limpar filtros</button></div>
  </form>
  <div id="res"></div>`;
  const map = { fq: "q", fe: "eixo", fo: "ods", fu: "uf", fs: "status", fn: "nec" };
  const draw = () => {
    const r = aplicarFiltro();
    $("#res").innerHTML = `<p class="meta" role="status">${r.length} projeto(s) encontrado(s)</p><div class="grid">${r.map((p) => card(p)).join("") || `<p>Nada encontrado. Tente limpar os filtros.</p>`}</div>`;
  };
  Object.entries(map).forEach(([id, k]) => { $("#" + id).oninput = (e) => { filtro[k] = e.target.value; draw(); }; });
  $("#ff").onsubmit = (e) => e.preventDefault();
  $("#fclear").onclick = () => { filtro = { q: "", eixo: "", ods: "", uf: "", status: "", nec: "" }; vExplorar(root); };
  draw();
}

// ---------- Conexões (match) ----------
function vConexoes(root) {
  const ufs = [...new Set(ALL_PROJ().map((p) => p.uf))].sort();
  root.innerHTML = `<h1>Conexões inteligentes</h1>
  <p class="lead">Diga quais ODS e eixos importam para você ou sua organização e o que você pode oferecer. Ranqueamos os projetos pela afinidade (ODS 50%, eixo 25%, necessidade × oferta 15%, localização 10%).</p>
  <form class="panel" id="fm">
    <h2 style="margin-top:0">Seus ODS de interesse</h2>
    <div class="odspick">${ODS.map((o) => `<label><input type="checkbox" name="ods" value="${o.n}" ${perfil.ods.includes(o.n) ? "checked" : ""}>${odsBadge(o.n, true)} ${esc(o.nome)}</label>`).join("")}</div>
    <h2>Eixos temáticos</h2>
    <div class="odspick">${EIXOS.map((e) => `<label><input type="checkbox" name="eixos" value="${e.id}" ${perfil.eixos.includes(e.id) ? "checked" : ""}>${e.icone} ${esc(e.nome)}</label>`).join("")}</div>
    <h2>O que você pode oferecer</h2>
    <div class="odspick">${NECESSIDADES.map((n) => `<label><input type="checkbox" name="oferece" value="${n.id}" ${perfil.oferece.includes(n.id) ? "checked" : ""}>${esc(n.nome)}</label>`).join("")}</div>
    <div style="max-width:240px;margin-top:12px"><label for="mu">Seu estado (opcional)</label><select id="mu">${opts(ufs.map((u) => [u, u]), perfil.uf, "Qualquer")}</select></div>
  </form>
  <div id="mr"></div>`;
  const ler = () => {
    const g = (n) => [...document.querySelectorAll(`#fm [name=${n}]:checked`)].map((i) => (n === "ods" ? +i.value : i.value));
    perfil = { ods: g("ods"), eixos: g("eixos"), oferece: g("oferece"), uf: $("#mu").value };
    store.set("perfil", perfil);
    draw();
  };
  const draw = () => {
    if (!perfil.ods.length && !perfil.eixos.length) { $("#mr").innerHTML = `<p class="meta">Selecione ao menos um ODS ou eixo para ver as conexões.</p>`; return; }
    const r = ALL_PROJ().map((p) => ({ p, ...score(p, perfil) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 12);
    $("#mr").innerHTML = `<h2>Melhores conexões</h2><div class="grid">${r.map(({ p, s, why }) => card(p, `<div><span class="score">${s}% de afinidade</span><div class="bar2" role="img" aria-label="${s}%"><i style="width:${s}%"></i></div><div class="why">${why.map(esc).join(" · ")}</div></div>`)).join("") || "<p>Sem resultados.</p>"}</div>`;
  };
  $("#fm").oninput = ler;
  draw();
}

// ---------- Painel ODS ----------
function vPainel(root) {
  const proj = ALL_PROJ();
  const cont = Object.fromEntries(ODS.map((o) => [o.n, proj.filter((p) => p.ods.includes(o.n))]));
  const main = Object.fromEntries(ODS.map((o) => [o.n, proj.filter((p) => p.ods[0] === o.n).length]));
  const benef = (n) => cont[n].reduce((a, p) => a + (+p.beneficiarios || 0), 0);
  const lacunas = ODS.filter((o) => cont[o.n].length <= 1);
  root.innerHTML = `<h1>Painel dos ODS</h1>
  <p class="lead">Veja como a rede contribui com a Agenda 2030. Contornos tracejados indicam ODS com pouca cobertura — oportunidades para novos projetos e parcerias. Clique em um ODS para ver os projetos.</p>
  <div class="odsgrid">${ODS.map((o) => `<button class="odst ${cont[o.n].length <= 1 ? "gap" : ""}" style="background:${o.cor}" data-ods="${o.n}" aria-label="ODS ${o.n}: ${esc(o.nome)}, ${cont[o.n].length} projetos"><b>${o.n}</b><small>${esc(o.nome)}</small><span><strong>${cont[o.n].length}</strong> projetos · ${main[o.n]} principal<br>${benef(o.n).toLocaleString("pt-BR")} pessoas</span></button>`).join("")}</div>
  <h2>Lacunas de cobertura</h2>
  <p>${lacunas.length ? lacunas.map((o) => `${odsBadge(o.n, true)} ${esc(o.nome)}`).join(" &nbsp; ") : "Todos os ODS têm ao menos 2 projetos."}</p>
  <h2>Eixos × ODS</h2>
  <div class="panel" style="overflow:auto"><table style="border-collapse:collapse;width:100%;font-size:.85rem"><thead><tr><th style="text-align:left;padding:4px">Eixo</th>${ODS.map((o) => `<th style="padding:2px">${odsBadge(o.n, true)}</th>`).join("")}</tr></thead><tbody>${EIXOS.map((e) => `<tr><td style="padding:4px;white-space:nowrap">${e.icone} ${esc(e.nome)}</td>${ODS.map((o) => { const c = proj.filter((p) => p.eixos.includes(e.id) && p.ods.includes(o.n)).length; return `<td style="text-align:center;padding:2px">${c ? `<span class="tag" style="margin:0;background:${o.cor};color:#fff">${c}</span>` : `<span class="meta">·</span>`}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>`;
  root.querySelectorAll("[data-ods]").forEach((b) => (b.onclick = () => {
    filtro = { q: "", eixo: "", ods: b.dataset.ods, uf: "", status: "", nec: "" };
    location.hash = "#explorar";
  }));
}

// ---------- Conta (login / cadastro) ----------
function vConta(root) {
  if (ME) { location.hash = ME.tipo === "ong" ? "#meus" : "#explorar"; return; }
  root.innerHTML = `<h1>Entrar ou criar conta</h1>
  <p class="lead">ONGs publicam e gerenciam seus projetos e recebem interessados. Apoiadores e voluntários têm conta para agilizar o contato.</p>
  <div class="row">
    <form class="panel" id="fl" style="display:grid;gap:10px;align-content:start"><h2 style="margin:0">Entrar</h2>
      <div><label for="l1">E-mail</label><input id="l1" type="email" required autocomplete="username"></div>
      <div><label for="l2">Senha</label><input id="l2" type="password" required autocomplete="current-password"></div>
      <p id="lerr" class="meta" role="alert" style="color:var(--warn)"></p><button>Entrar</button></form>
    <form class="panel" id="fr" style="display:grid;gap:10px;align-content:start"><h2 style="margin:0">Criar conta</h2>
      <div><label for="r0">Tipo de conta</label><select id="r0"><option value="ong">Sou uma ONG</option><option value="apoiador">Sou voluntário / apoiador</option></select></div>
      <div><label for="r1">Seu nome</label><input id="r1" required maxlength="100" autocomplete="name"></div>
      <div><label for="r2">E-mail</label><input id="r2" type="email" required autocomplete="username"></div>
      <div><label for="r3">Senha (mín. 8 caracteres)</label><input id="r3" type="password" required minlength="8" autocomplete="new-password"></div>
      <div class="ongf"><label for="r4">Nome da ONG</label><input id="r4" maxlength="100"></div>
      <div class="ongf"><label for="r5">Cidade</label><input id="r5" maxlength="60"></div>
      <div class="ongf"><label for="r6">UF</label><input id="r6" maxlength="2" style="text-transform:uppercase"></div>
      <p id="rerr" class="meta" role="alert" style="color:var(--warn)"></p><button>Criar conta</button></form>
  </div>`;
  const toggle = () => root.querySelectorAll(".ongf").forEach((d) => { d.hidden = $("#r0").value !== "ong"; d.querySelector("input").required = !d.hidden; });
  $("#r0").onchange = toggle; toggle();
  const entrou = (j) => { ME = j.user; navUser(); location.hash = ME.tipo === "ong" ? "#meus" : "#explorar"; go(); };
  $("#fl").onsubmit = async (e) => { e.preventDefault(); try { entrou(await api("POST", "/api/login", { email: $("#l1").value, senha: $("#l2").value })); } catch (er) { $("#lerr").textContent = er.message; } };
  $("#fr").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const j = await api("POST", "/api/register", { tipo: $("#r0").value, nome: $("#r1").value, email: $("#r2").value, senha: $("#r3").value, ongNome: $("#r4").value, cidade: $("#r5").value, uf: $("#r6").value });
      await recarregar(); entrou(j);
    } catch (er) { $("#rerr").textContent = er.message; }
  };
}

// ---------- Meus projetos (área da ONG) ----------
async function vMeus(root) {
  if (!ME || ME.tipo !== "ong") { location.hash = "#conta"; return; }
  const meus = ALL_PROJ().filter((p) => p.ong === ME.ong_id);
  const ints = await api("GET", "/api/interesses");
  root.innerHTML = `<h1>Meus projetos</h1>
  <p class="lead">Gerencie os projetos da sua ONG e acompanhe quem quer ajudar.</p>
  <p><a class="btn" href="#cadastrar">+ Novo projeto</a></p>
  <div class="grid">${meus.map((p) => card(p, `<div class="act"><a class="btn sec" href="#cadastrar?${esc(p.id)}">Editar</a><button class="sec" data-del="${esc(p.id)}">Excluir</button></div>`).replace(/<button data-det[^]*?<\/button><button class="sec" data-ajudar[^]*?<\/button>/, "")).join("") || "<p>Você ainda não publicou projetos.</p>"}</div>
  <h2>Interessados em ajudar (${ints.length})</h2>
  <div class="panel">${ints.map((i) => `<div class="mini" style="display:block"><strong>${esc(i.nome)}</strong> · ${esc(i.contato)}<div class="meta">${esc(i.projeto)} · ${esc(necOf(i.tipo)?.nome || "Outro")} · ${esc(new Date(i.criado).toLocaleDateString("pt-BR"))}</div>${i.msg ? `<div>${esc(i.msg)}</div>` : ""}</div>`).join("") || "<p class='meta'>Nenhum interesse recebido ainda.</p>"}</div>`;
  root.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
    if (!confirm("Excluir este projeto?")) return;
    await api("DELETE", "/api/projetos/" + b.dataset.del); await recarregar(); vMeus(root);
  }));
}

// ---------- Cadastrar / editar projeto ----------
function vCadastrar(root) {
  if (!ME || ME.tipo !== "ong") { location.hash = "#conta"; return; }
  const editId = location.hash.split("?")[1];
  const ed = editId && ALL_PROJ().find((p) => p.id === editId && p.ong === ME.ong_id);
  const v = (k, d = "") => esc(ed ? ed[k] : d);
  const ordem = ed ? [...ed.ods] : [];
  root.innerHTML = `<h1>${ed ? "Editar projeto" : "Novo projeto"}</h1>
  <p class="lead">Vincule o projeto aos ODS e eixos. Ele passa a aparecer nas buscas e conexões.</p>
  <form class="panel" id="fc" style="display:grid;gap:12px">
    <div class="row">
      <div><label for="c2">Nome do projeto *</label><input id="c2" required maxlength="100" value="${v("nome")}"></div>
      <div><label for="c3">Cidade *</label><input id="c3" required maxlength="60" value="${v("cidade")}"></div>
      <div><label for="c4">UF *</label><input id="c4" required maxlength="2" pattern="[A-Za-z]{2}" style="text-transform:uppercase" value="${v("uf")}"></div>
      <div><label for="c5">Público atendido</label><input id="c5" maxlength="100" value="${ed && ed.publico !== "—" ? v("publico") : ""}"></div>
      <div><label for="c6">Nº de beneficiários</label><input id="c6" type="number" min="0" value="${v("beneficiarios")}"></div>
      <div><label for="c7">Situação</label><select id="c7">${Object.entries(STATUS).map(([k, t]) => `<option value="${k}" ${ed?.status === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      <div><label for="c8">Indicador de resultado</label><input id="c8" maxlength="100" value="${ed && ed.indicador !== "—" ? v("indicador") : ""}"></div>
    </div>
    <div><label for="c9">Resumo do projeto *</label><textarea id="c9" required maxlength="400">${v("resumo")}</textarea></div>
    <fieldset style="border:0;padding:0;margin:0"><legend><label>Eixos temáticos * (ao menos um)</label></legend><div class="odspick">${EIXOS.map((e) => `<label><input type="checkbox" name="e" value="${e.id}" ${ed?.eixos.includes(e.id) ? "checked" : ""}>${e.icone} ${esc(e.nome)}</label>`).join("")}</div></fieldset>
    <fieldset style="border:0;padding:0;margin:0"><legend><label>ODS * (o primeiro marcado será o principal)</label></legend><div class="odspick">${ODS.map((o) => `<label><input type="checkbox" name="o" value="${o.n}" ${ordem.includes(o.n) ? "checked" : ""}>${odsBadge(o.n, true)} ${esc(o.nome)}</label>`).join("")}</div></fieldset>
    <fieldset style="border:0;padding:0;margin:0"><legend><label>O que o projeto precisa</label></legend><div class="odspick">${NECESSIDADES.map((n) => `<label><input type="checkbox" name="n" value="${n.id}" ${ed?.necessidades.includes(n.id) ? "checked" : ""}>${esc(n.nome)}</label>`).join("")}</div></fieldset>
    <p id="cerr" class="meta" role="alert" style="color:var(--warn)"></p>
    <div><button>${ed ? "Salvar alterações" : "Publicar projeto"}</button></div>
  </form>`;
  root.querySelectorAll("[name=o]").forEach((i) => i.addEventListener("change", () => {
    const n = +i.value, k = ordem.indexOf(n);
    if (i.checked && k < 0) ordem.push(n); else if (!i.checked && k >= 0) ordem.splice(k, 1);
  }));
  $("#fc").onsubmit = async (e) => {
    e.preventDefault();
    const g = (n) => [...root.querySelectorAll(`[name=${n}]:checked`)].map((i) => i.value);
    const body = { nome: $("#c2").value, cidade: $("#c3").value, uf: $("#c4").value, publico: $("#c5").value, beneficiarios: $("#c6").value, status: $("#c7").value, indicador: $("#c8").value, resumo: $("#c9").value, eixos: g("e"), ods: [...ordem], necessidades: g("n") };
    try {
      await api(ed ? "PUT" : "POST", "/api/projetos" + (ed ? "/" + ed.id : ""), body);
      await recarregar(); location.hash = "#meus";
    } catch (er) { $("#cerr").textContent = er.message; }
  };
}

// ---------- início ----------
(async () => {
  try { [ME] = [(await api("GET", "/api/me")).user]; await recarregar(); }
  catch { $("#app").innerHTML = `<p role="alert">Não foi possível carregar os dados. Inicie o servidor com <code>npm start</code>.</p>`; return; }
  navUser(); go();
})();
