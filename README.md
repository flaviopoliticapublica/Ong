# Conecta ODS

Aplicativo web (sem dependências) que conecta ONGs, projetos, voluntários e apoiadores por eixo temático
(cultura, inclusão, esporte, educação, saúde, meio ambiente…) e pelos 17 Objetivos de Desenvolvimento Sustentável.

Para rodar: abra `index.html` no navegador (ou `python3 -m http.server`).

- **Explorar**: busca/filtros por eixo, ODS, estado, situação e necessidade; detalhes com ODS e parcerias sugeridas; "Quero ajudar".
- **Conexões**: ranking de afinidade (ODS 50%, eixo 25%, necessidade×oferta 15%, localização 10%).
- **Painel ODS**: cobertura por ODS, lacunas e matriz eixo × ODS.
- **Cadastrar projeto**: vincula novo projeto a eixos e ODS (salvo em localStorage).

Os dados em `data.js` são fictícios. Próximos passos: back-end/API, autenticação das ONGs, mapa, verificação de organizações.
