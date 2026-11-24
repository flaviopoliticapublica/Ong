// Dados do aplicativo. Organizações e projetos abaixo são FICTÍCIOS (exemplos de demonstração).
const ODS = [
  [1, "Erradicação da Pobreza", "#E5243B"],
  [2, "Fome Zero e Agricultura Sustentável", "#DDA63A"],
  [3, "Saúde e Bem-Estar", "#4C9F38"],
  [4, "Educação de Qualidade", "#C5192D"],
  [5, "Igualdade de Gênero", "#FF3A21"],
  [6, "Água Potável e Saneamento", "#26BDE2"],
  [7, "Energia Limpa e Acessível", "#FCC30B"],
  [8, "Trabalho Decente e Crescimento Econômico", "#A21942"],
  [9, "Indústria, Inovação e Infraestrutura", "#FD6925"],
  [10, "Redução das Desigualdades", "#DD1367"],
  [11, "Cidades e Comunidades Sustentáveis", "#FD9D24"],
  [12, "Consumo e Produção Responsáveis", "#BF8B2E"],
  [13, "Ação Contra a Mudança Global do Clima", "#3F7E44"],
  [14, "Vida na Água", "#0A97D9"],
  [15, "Vida Terrestre", "#56C02B"],
  [16, "Paz, Justiça e Instituições Eficazes", "#00689D"],
  [17, "Parcerias e Meios de Implementação", "#19486A"],
].map(([n, nome, cor]) => ({ n, nome, cor }));

const EIXOS = [
  { id: "cultura", nome: "Cultura", icone: "🎭" },
  { id: "inclusao", nome: "Inclusão", icone: "🤝" },
  { id: "esporte", nome: "Esporte", icone: "⚽" },
  { id: "educacao", nome: "Educação", icone: "📚" },
  { id: "saude", nome: "Saúde", icone: "🩺" },
  { id: "meioambiente", nome: "Meio Ambiente", icone: "🌱" },
  { id: "geracaorenda", nome: "Geração de Renda", icone: "💼" },
  { id: "direitos", nome: "Direitos Humanos", icone: "⚖️" },
  { id: "tecnologia", nome: "Tecnologia e Inovação", icone: "💡" },
  { id: "assistencia", nome: "Assistência Social", icone: "🍲" },
];

const NECESSIDADES = [
  { id: "voluntarios", nome: "Voluntários" },
  { id: "doacoes", nome: "Doações financeiras" },
  { id: "materiais", nome: "Materiais / equipamentos" },
  { id: "parcerias", nome: "Parcerias institucionais" },
  { id: "mentoria", nome: "Mentoria / conhecimento técnico" },
];

const ONGS = [
  { id: "o1", nome: "Instituto Raízes do Saber", cidade: "São Paulo", uf: "SP", desde: 2009, sobre: "Educação popular e formação de jovens em periferias urbanas." },
  { id: "o2", nome: "Associação Mãos Verdes", cidade: "Belém", uf: "PA", desde: 2014, sobre: "Restauração florestal e agroecologia com comunidades ribeirinhas." },
  { id: "o3", nome: "Movimento Bola Pra Frente", cidade: "Recife", uf: "PE", desde: 2012, sobre: "Esporte como ferramenta de inclusão e proteção de crianças e jovens." },
  { id: "o4", nome: "Coletivo Palco Aberto", cidade: "Salvador", uf: "BA", desde: 2016, sobre: "Cultura afro-brasileira, circuito de artes e economia criativa." },
  { id: "o5", nome: "Rede Acessa Brasil", cidade: "Belo Horizonte", uf: "MG", desde: 2011, sobre: "Acessibilidade, tecnologia assistiva e inclusão de pessoas com deficiência." },
  { id: "o6", nome: "Instituto Maré Limpa", cidade: "Florianópolis", uf: "SC", desde: 2018, sobre: "Conservação marinha e combate ao lixo nos oceanos." },
  { id: "o7", nome: "Casa Mulheres de Fibra", cidade: "Fortaleza", uf: "CE", desde: 2010, sobre: "Acolhimento, autonomia econômica e defesa de direitos das mulheres." },
  { id: "o8", nome: "Saúde na Estrada", cidade: "Porto Velho", uf: "RO", desde: 2015, sobre: "Atenção primária e telessaúde para comunidades isoladas." },
];

// ods: lista de ODS (1-17) com os quais o projeto contribui; o primeiro é o principal.
const PROJETOS = [
  { id: "p1", ong: "o1", nome: "Cursinho Popular Rede Jovem", eixos: ["educacao", "inclusao"], ods: [4, 10, 8], cidade: "São Paulo", uf: "SP", publico: "Jovens de 15 a 24 anos", beneficiarios: 320, status: "ativo", necessidades: ["voluntarios", "materiais"], resumo: "Preparação gratuita para vestibular e ENEM, com acompanhamento socioemocional e orientação de carreira.", indicador: "Aprovação em universidades públicas" },
  { id: "p2", ong: "o1", nome: "Códigos do Amanhã", eixos: ["tecnologia", "educacao", "geracaorenda"], ods: [4, 9, 8, 5], cidade: "São Paulo", uf: "SP", publico: "Meninas e jovens de baixa renda", beneficiarios: 150, status: "ativo", necessidades: ["mentoria", "parcerias", "doacoes"], resumo: "Formação em programação e design com foco em meninas, conectando egressas ao mercado de trabalho.", indicador: "Egressas empregadas em tecnologia" },
  { id: "p3", ong: "o2", nome: "Quintais Agroflorestais", eixos: ["meioambiente", "geracaorenda"], ods: [15, 2, 13, 1], cidade: "Belém", uf: "PA", publico: "Famílias ribeirinhas", beneficiarios: 210, status: "ativo", necessidades: ["doacoes", "mentoria", "parcerias"], resumo: "Sistemas agroflorestais que regeneram áreas degradadas e geram renda com cacau, açaí e frutíferas nativas.", indicador: "Hectares restaurados" },
  { id: "p4", ong: "o2", nome: "Guardiões das Nascentes", eixos: ["meioambiente", "educacao"], ods: [6, 15, 13], cidade: "Belém", uf: "PA", publico: "Escolas e comunidades rurais", beneficiarios: 900, status: "ativo", necessidades: ["voluntarios", "materiais"], resumo: "Mapeamento e proteção de nascentes com monitoramento comunitário da qualidade da água.", indicador: "Nascentes protegidas" },
  { id: "p5", ong: "o3", nome: "Gol de Letra", eixos: ["esporte", "educacao", "inclusao"], ods: [3, 4, 10, 16], cidade: "Recife", uf: "PE", publico: "Crianças de 7 a 14 anos", beneficiarios: 420, status: "ativo", necessidades: ["voluntarios", "materiais", "doacoes"], resumo: "Futebol e reforço escolar no contraturno, com metodologia de convivência e prevenção à violência.", indicador: "Frequência escolar dos participantes" },
  { id: "p6", ong: "o3", nome: "Paradesporto Para Todos", eixos: ["esporte", "inclusao", "saude"], ods: [3, 10, 11], cidade: "Recife", uf: "PE", publico: "Pessoas com deficiência", beneficiarios: 95, status: "ativo", necessidades: ["materiais", "voluntarios", "parcerias"], resumo: "Modalidades adaptadas (basquete em cadeira de rodas, goalball) em espaços públicos acessíveis.", indicador: "Atletas em competições" },
  { id: "p7", ong: "o4", nome: "Circuito Ancestral", eixos: ["cultura", "geracaorenda"], ods: [11, 8, 10], cidade: "Salvador", uf: "BA", publico: "Artistas e mestres da cultura popular", beneficiarios: 180, status: "ativo", necessidades: ["parcerias", "doacoes"], resumo: "Rede de feiras, oficinas e apresentações que valoriza saberes afro-brasileiros e gera renda para artistas locais.", indicador: "Renda média gerada aos artistas" },
  { id: "p8", ong: "o4", nome: "Biblioteca Viva do Subúrbio", eixos: ["cultura", "educacao"], ods: [4, 11, 16], cidade: "Salvador", uf: "BA", publico: "Moradores do Subúrbio Ferroviário", beneficiarios: 1200, status: "ativo", necessidades: ["voluntarios", "materiais"], resumo: "Biblioteca comunitária com rodas de leitura, cinema ao ar livre e oficinas de memória.", indicador: "Empréstimos e participantes em atividades" },
  { id: "p9", ong: "o5", nome: "Tecnologia Assistiva Aberta", eixos: ["tecnologia", "inclusao", "saude"], ods: [10, 9, 3, 17], cidade: "Belo Horizonte", uf: "MG", publico: "Pessoas com deficiência", beneficiarios: 260, status: "ativo", necessidades: ["mentoria", "parcerias", "materiais"], resumo: "Desenvolvimento aberto de órteses, próteses e adaptadores impressos em 3D, com manuais livres.", indicador: "Dispositivos entregues" },
  { id: "p10", ong: "o5", nome: "Trabalho Sem Barreiras", eixos: ["inclusao", "geracaorenda", "direitos"], ods: [8, 10, 4], cidade: "Belo Horizonte", uf: "MG", publico: "Pessoas com deficiência em idade ativa", beneficiarios: 130, status: "ativo", necessidades: ["parcerias", "mentoria"], resumo: "Capacitação e intermediação de vagas, com consultoria de acessibilidade para empresas.", indicador: "Pessoas contratadas" },
  { id: "p11", ong: "o6", nome: "Mar Sem Plástico", eixos: ["meioambiente", "educacao"], ods: [14, 12, 13], cidade: "Florianópolis", uf: "SC", publico: "Pescadores, escolas e turistas", beneficiarios: 3500, status: "ativo", necessidades: ["voluntarios", "doacoes"], resumo: "Mutirões de limpeza, ecobarreiras em rios e campanha de redução de plástico descartável.", indicador: "Toneladas de resíduos retiradas" },
  { id: "p12", ong: "o6", nome: "Recicla Costeira", eixos: ["meioambiente", "geracaorenda"], ods: [12, 8, 14, 11], cidade: "Florianópolis", uf: "SC", publico: "Cooperativas de catadores", beneficiarios: 70, status: "planejamento", necessidades: ["doacoes", "parcerias", "materiais"], resumo: "Transforma resíduos plásticos recolhidos em peças vendidas por cooperativas, com rastreabilidade.", indicador: "Renda dos cooperados" },
  { id: "p13", ong: "o7", nome: "Autonomia em Rede", eixos: ["direitos", "geracaorenda", "inclusao"], ods: [5, 8, 1, 16], cidade: "Fortaleza", uf: "CE", publico: "Mulheres em situação de vulnerabilidade", beneficiarios: 240, status: "ativo", necessidades: ["mentoria", "doacoes", "parcerias"], resumo: "Capacitação profissional, microcrédito solidário e apoio jurídico para mulheres que romperam ciclos de violência.", indicador: "Mulheres com renda própria" },
  { id: "p14", ong: "o7", nome: "Ciranda Cuidadora", eixos: ["assistencia", "direitos", "educacao"], ods: [5, 4, 3], cidade: "Fortaleza", uf: "CE", publico: "Mães e crianças de 0 a 5 anos", beneficiarios: 110, status: "ativo", necessidades: ["voluntarios", "materiais"], resumo: "Espaço de acolhimento infantil que permite às mães estudar e trabalhar, com apoio psicossocial.", indicador: "Mães em estudo ou trabalho" },
  { id: "p15", ong: "o8", nome: "Telessaúde Amazônica", eixos: ["saude", "tecnologia"], ods: [3, 9, 10, 17], cidade: "Porto Velho", uf: "RO", publico: "Comunidades isoladas", beneficiarios: 2800, status: "ativo", necessidades: ["parcerias", "materiais", "voluntarios"], resumo: "Consultas remotas, kits de diagnóstico rápido e agentes comunitários treinados em locais sem acesso a hospitais.", indicador: "Atendimentos realizados" },
  { id: "p16", ong: "o8", nome: "Água Segura Ribeirinha", eixos: ["saude", "meioambiente", "assistencia"], ods: [6, 3, 1], cidade: "Porto Velho", uf: "RO", publico: "Famílias ribeirinhas", beneficiarios: 600, status: "ativo", necessidades: ["doacoes", "materiais"], resumo: "Filtros comunitários e educação sanitária para reduzir doenças de veiculação hídrica.", indicador: "Famílias com água segura" },
  { id: "p17", ong: "o3", nome: "Cozinha Solidária da Várzea", eixos: ["assistencia", "inclusao"], ods: [2, 1, 12], cidade: "Recife", uf: "PE", publico: "Pessoas em insegurança alimentar", beneficiarios: 500, status: "concluido", necessidades: ["parcerias"], resumo: "Refeições diárias com alimentos de reaproveitamento. Ciclo encerrado; aberto a replicação com novos parceiros.", indicador: "Refeições servidas" },
];
