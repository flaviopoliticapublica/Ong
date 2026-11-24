# Conecta ODS

Aplicativo web que conecta ONGs, projetos, voluntários e apoiadores por eixo temático
(cultura, inclusão, esporte, educação, saúde, meio ambiente…) e pelos 17 ODS.

## Executar
Requer Node.js ≥ 22.5 (sem dependências npm).

    npm start        # http://localhost:3000
    npm test         # testes da API (banco temporário)

Variáveis: `PORT`, `DB_FILE` (padrão `conecta.db`), `NODE_ENV=production` (cookie Secure; use HTTPS).

## Funcionalidades
- **Explorar / Conexões / Painel ODS**: busca, ranking de afinidade (ODS 50%, eixo 25%, necessidade×oferta 15%, local 10%) e cobertura dos ODS.
- **Contas**: ONGs e apoiadores criam conta e fazem login. ONGs criam, editam e excluem **apenas os próprios** projetos e veem os interessados em ajudar (contato visível só para a ONG dona).

## Back-end
`server.js` — API REST + estáticos, SQLite (`node:sqlite`).
- Senhas com scrypt + salt; sessões por cookie HttpOnly/SameSite=Lax (token guardado como hash, 7 dias).
- Proteções: limite de tentativas de login, validação server-side, corpo máx. 50 KB, checagem de Origin/JSON (CSRF), CSP.
- Rotas: `GET /api/dados`, `GET /api/me`, `POST /api/register|login|logout`, `POST|PUT|DELETE /api/projetos[/:id]`, `POST|GET /api/interesses`.

Os dados iniciais (`data.js`) são fictícios e só entram no banco na primeira execução.

Próximos passos: verificação de ONGs (CNPJ/documentos) e moderação, recuperação de senha por e-mail, mapa, notificações.
