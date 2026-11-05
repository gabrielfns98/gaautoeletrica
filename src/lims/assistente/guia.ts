/* ============================================================
   BANCADA — guia de uso, a base do assistente

   Um só texto serve a duas coisas:

   - no servidor, vira as instruções do modelo que responde no chat;
   - no navegador, vira a busca de reserva, quando o modelo não está
     disponível (sem chave configurada, sem rede, fora do ar).

   Por isso o guia descreve o sistema como ele é hoje, tela por tela,
   com os nomes que aparecem no menu e nos botões. Um assistente que
   manda clicar num botão que não existe é pior que nenhum: quem está
   aprendendo o sistema acredita nele. Ao mudar uma tela, mude aqui.

   Este arquivo não importa nada do resto da aplicação, de propósito:
   a função do servidor o carrega sozinho, sem o restante do pacote.
   ============================================================ */

export interface TopicoGuia {
  id: string;
  titulo: string;
  /** termos que alguém usaria para perguntar sobre isto */
  palavras: string[];
  texto: string;
}

export const GUIA: TopicoGuia[] = [
  {
    id: 'primeiros-passos',
    titulo: 'Primeiros passos num sistema vazio',
    palavras: ['começar', 'inicio', 'primeiro', 'vazio', 'zerado', 'ordem', 'passo', 'configurar', 'implantar', 'comecar'],
    texto: `Um sistema recém-instalado vem com o catálogo pronto (elementos, métodos, faixas de interpretação, fórmulas, modelos de laudo, tabelas de recomendação) e sem nenhum cliente, amostra ou laudo. A ordem que funciona:
1. Configurações → aba Unidade: confira os dados que saem no cabeçalho do laudo.
2. Usuários e papéis → Novo usuário: cadastre a equipe (analistas, responsável técnico, recepção).
3. Clientes → Novo: cadastre quem manda amostra.
4. Recepção → escolha o cliente → Protocolar lote: as amostras e os ensaios são criados na hora.
5. Opere como analista e lance os resultados em Resultados.
6. Um responsável técnico revisa e aprova em Revisão, e assina o laudo em Laudos.`,
  },
  {
    id: 'clientes',
    titulo: 'Cadastrar cliente',
    palavras: ['cliente', 'clientes', 'cadastrar cliente', 'empresa', 'cnpj', 'cpf', 'fazenda', 'produtor', 'carteira'],
    texto: `Menu Clientes (logo abaixo de Painel) → botão Novo. Razão social, CNPJ ou CPF, município e UF são obrigatórios; o resto é opcional. O sistema recusa dois clientes com o mesmo documento, porque o histórico de amostras se dividiria entre os dois.
Para editar, use o lápis na linha; para desativar sem apagar o histórico, o botão de desligar. Clicar na linha abre a ficha, com as amostras e os laudos do cliente.
Quem pode cadastrar: administrador, responsável técnico e recepção.`,
  },
  {
    id: 'usuarios',
    titulo: 'Usuários, papéis e "operar como"',
    palavras: ['usuario', 'usuário', 'analista', 'papel', 'papéis', 'permissao', 'permissão', 'acesso', 'login', 'equipe', 'operar como', 'trocar usuario', 'habilitacao', 'habilitação', 'crq', 'responsavel tecnico', 'rt'],
    texto: `Menu Usuários e papéis → Novo usuário. Informe nome, e-mail, cargo e papel.
Papéis de fábrica: Administrador (tudo), Responsável Técnico (aprova resultados e assina laudos), Analista de bancada (executa ensaios e lança resultados, não aprova), Recepção de amostras (protocola lotes e cadastra clientes), Comercial (cadastro de clientes).
Regras: quem lança resultado (Analista, RT) precisa estar habilitado em pelo menos uma análise, marcada em Habilitações. Quem aprova resultado (RT) precisa do registro no conselho, porque ele sai impresso sob a assinatura do laudo.
Para ver o sistema pelos olhos de outra pessoa: clique no seu nome no canto superior direito → Operar como → escolha o usuário. O menu passa a mostrar só o que aquele papel pode usar.
A aba Papéis e permissões mostra e edita a matriz de módulo × ação de cada papel.`,
  },
  {
    id: 'recepcao',
    titulo: 'Receber amostras (protocolar lote)',
    palavras: ['recepcao', 'recepção', 'lote', 'protocolar', 'protocolo', 'receber', 'entrada', 'amostra nova', 'nao conformidade', 'não conformidade', 'escopo'],
    texto: `Menu Recepção → Novo protocolo. Escolha o grupo de análise (Solo, Foliar, Fertilizantes…), o cliente, a quantidade de amostras, a prioridade, a transportadora e, se houver, a nota fiscal de remessa. Em Escopo de ensaios, marque o que será analisado. Desligue "Amostras conformes na entrada" para registrar uma não conformidade (massa insuficiente, embalagem danificada etc.) e descreva em Observações.
Protocolar lote cria as amostras e os ensaios na hora; eles aparecem na fila da bancada. Para imprimir as etiquetas do lote, use o menu Etiquetas.
Se o cliente não aparece na lista, cadastre-o antes em Clientes.`,
  },
  {
    id: 'etiquetas',
    titulo: 'Etiquetas com código de barras',
    palavras: ['etiqueta', 'etiquetas', 'codigo de barras', 'código de barras', 'imprimir etiqueta', 'termica', 'térmica', 'a4', 'code128'],
    texto: `Menu Etiquetas: escolha o lote e o formato (folha A4 ou impressora térmica) e imprima. O código de barras (Code128) é o protocolo da amostra, e é ele que o leitor bipa em Resultados para achar a amostra. Para reimprimir a etiqueta de uma amostra só, abra a ficha dela em Amostras.`,
  },
  {
    id: 'importacao',
    titulo: 'Importar planilha ou arquivo de equipamento',
    palavras: ['importar', 'importacao', 'importação', 'planilha', 'excel', 'csv', 'colar', 'arquivo', 'equipamento exporta', 'modelo de importacao', 'leitura bruta', 'absorbancia', 'absorbância'],
    texto: `Menu Importação. Dois fluxos com a mesma sequência: amostras ou resultados. Cole as células direto do Excel (Ctrl+C, Ctrl+V) ou envie o arquivo CSV/XLSX; confira as colunas que o sistema sugeriu; revise linha a linha; grave. Linha com erro não entra.
O relatório que o aparelho exporta pode ser usado como vem: o sistema ignora o cabeçalho e o rodapé do fabricante e entende o formato "um bloco por amostra".
Para não mapear as colunas toda vez, salve um modelo de importação por equipamento. Quando o arquivo traz leitura bruta (absorbância, intensidade), o sistema converte em resultado pela curva de calibração, pelo fator de diluição e pela massa ou volume da amostra.`,
  },
  {
    id: 'amostras',
    titulo: 'Amostras: consultar, editar, cancelar',
    palavras: ['amostra', 'amostras', 'acervo', 'ficha', 'editar amostra', 'cancelar amostra', 'incluir analise', 'retirar analise', 'rastreabilidade'],
    texto: `Menu Amostras: lista de todas as amostras, com busca e filtros. Clique numa amostra para abrir a ficha completa, com os ensaios, o histórico e a interpretação dos resultados.
Na ficha: editar os dados da amostra, incluir ou retirar uma análise, cancelar a amostra (o histórico fica) e reimprimir a etiqueta.`,
  },
  {
    id: 'resultados',
    titulo: 'Lançar resultados (trabalho do analista)',
    palavras: ['resultado', 'resultados', 'lancar', 'lançar', 'digitar', 'grade', 'lancamento', 'lançamento', 'pesquisar', 'corrida', 'codigo de barras', 'calculado', 'ctc', 'v%', 'soma de bases'],
    texto: `Menu Resultados. Primeiro defina a corrida: bipe o código de barras do copo, ou filtre por faixa de amostra, análise, tipo de análise, situação e data de entrada, e clique em Pesquisar.
A aba Lista mostra as amostras encontradas; a aba Lançamento (no alto, à direita) abre a grade para digitar. Enter e as setas andam pela coluna, do jeito que a bancada lê. Os valores calculados (SB, CTC, V%, m%, H+Al pelo SMP) saem sozinhos quando os elementos de que dependem são lançados; as fórmulas ficam em Cadastros → Fórmula.
Ao gravar, os ensaios passam para "lido" e seguem para a revisão. Só aparecem as análises em que o analista está habilitado.`,
  },
  {
    id: 'bancada',
    titulo: 'Bancada e leitura em equipamento',
    palavras: ['bancada', 'phmetro', 'pHmetro', 'ph', 'leitura', 'calibracao', 'calibração', 'tampao', 'tampão', 'eletrodo', 'aquisicao', 'aquisição', 'serial'],
    texto: `Menu Bancada: fila de leituras por equipamento e a estação de leitura. O número ao lado do item no menu é quanto está na fila.
O pH é um equipamento entre outros. Para o pHmetro há calibração multiponto com os tampões, conferência de slope e offset, compensação de temperatura e captura automática quando a leitura estabiliza. Equipamento com calibração ou verificação vencida fica bloqueado para leitura até ser recalibrado.
A leitura direta pela porta serial/USB funciona no Chrome ou no Edge; sem o aparelho conectado, há uma bancada virtual para treino.`,
  },
  {
    id: 'revisao',
    titulo: 'Revisão e aprovação',
    palavras: ['revisao', 'revisão', 'aprovar', 'aprovacao', 'aprovação', 'liberar', 'repetir', 'segregacao', 'segregação', 'iso 17025', 'rsd', 'replica', 'réplica'],
    texto: `Menu Revisão: os ensaios por situação (pendentes, em bancada, lidos, revisados, aprovados, repetir). Selecione e aprove, ou mande repetir.
Regra que não se desliga: ninguém aprova o próprio resultado. É a segregação de funções da ISO/IEC 17025, conferida na tela e no banco. Por isso o analista lança e outra pessoa, com papel de Responsável Técnico, aprova.
Réplicas com RSD acima do critério de aceitação são sinalizadas; os critérios ficam em Configurações → Critérios de aceitação.`,
  },
  {
    id: 'qualidade',
    titulo: 'Qualidade: controle interno e proficiência',
    palavras: ['qualidade', 'controle interno', 'westgard', 'levey', 'mrc', 'material de referencia', 'proficiencia', 'proficiência', 'interlaboratorial', 'paqlf', 'iac', 'z-score', 'zscore', 'vies', 'viés'],
    texto: `Menu Qualidade, duas abas.
Controle interno: carta de Levey-Jennings sobre o material de referência, com as regras de Westgard (1-3s, 2-2s, R-4s, 4-1s, 10x). Diz se a bancada está estável.
Proficiência: os programas interlaboratoriais (PAQLF/Embrapa, IAC) e as rodadas. Para cada ensaio, o sistema calcula z, z' e En a partir do valor designado; |z| até 2 é satisfatório, entre 2 e 3 questionável, 3 ou mais insatisfatório. Três rodadas seguidas do mesmo lado do valor designado acusam viés do método. Diz se a bancada está certa.`,
  },
  {
    id: 'laudos',
    titulo: 'Laudos: emitir, assinar e salvar em PDF',
    palavras: ['laudo', 'laudos', 'assinar', 'emitir', 'pdf', 'imprimir', 'baixar', 'modelo de laudo', 'foliar', 'analitico', 'analítico', 'lq', '< lq', 'enviar laudo'],
    texto: `Menu Laudos: clique no laudo para abrir. Só resultado aprovado entra no laudo; se não houver nenhum, o sistema avisa em vez de desenhar tabela vazia.
Assinar e emitir: assina com o usuário que está operando (precisa ser Responsável Técnico) e gera o código de verificação pública.
Imprimir / salvar PDF: abre a caixa de impressão do navegador; escolha "Salvar como PDF". O arquivo já vem com o número do laudo.
O formato vem do modelo configurado em Cadastros → Modelo do Laudo: Analítico (fertilizantes, com garantia), Tecido Vegetal (foliar, com barra de suficiência) ou genérico. Resultado abaixo do limite de quantificação sai como "< LQ".`,
  },
  {
    id: 'recomendacao',
    titulo: 'Recomendação de calagem e adubação',
    palavras: ['recomendacao', 'recomendação', 'calagem', 'calcario', 'calcário', 'adubacao', 'adubação', 'gesso', 'gessagem', 'prnt', 'cfsemg', 'boletim 100', 'smp', 'npk', 'agronomo', 'agrônomo'],
    texto: `Nos laudos de solo aparece a opção "Anexar recomendação de calagem e adubação". Escolha a tabela de referência (CFSEMG/MG, Boletim 100/SP, Cerrado ou curva SMP do RS/SC), o PRNT do corretivo e a profundidade de incorporação. O anexo sai em folha própria, uma por amostra.
Ele usa a cultura e a produtividade esperada da amostra. A recomendação é ato de engenheiro agrônomo: o anexo tem campo de assinatura e CREA separado do laudo.
Tabelas, alvos por cultura e doses ficam em Cadastros → Recomendação.`,
  },
  {
    id: 'equipamentos',
    titulo: 'Equipamentos e controle metrológico',
    palavras: ['equipamento', 'equipamentos', 'verificacao', 'verificação', 'balanca', 'balança', 'espectro', 'absorcao atomica', 'manutencao', 'manutenção', 'vencido', 'metrologico', 'metrológico'],
    texto: `Menu Equipamentos: o parque instalado, com a situação metrológica de cada aparelho (em dia, a vencer, vencido) e o histórico de verificações. Tipos novos de equipamento se cadastram pelo próprio laboratório. Aparelho com verificação vencida não pode ser usado para leitura.`,
  },
  {
    id: 'estoque',
    titulo: 'Estoque de reagentes',
    palavras: ['estoque', 'reagente', 'reagentes', 'lote de reagente', 'validade', 'controlado', 'exercito', 'exército', 'pf'],
    texto: `Menu Estoque: reagentes e padrões com lote, validade, nível mínimo e controle de produtos controlados (Polícia Federal/Exército).`,
  },
  {
    id: 'cadastros',
    titulo: 'Cadastros (catálogo do laboratório)',
    palavras: ['cadastro', 'cadastros', 'tipo de analise', 'pacote', 'elemento', 'metodologia', 'metodo', 'método', 'curva', 'legenda', 'faixa', 'interpretacao', 'interpretação', 'formula', 'fórmula', 'bandeja', 'profundidade', 'cultura', 'convenio', 'convênio', 'desconto', 'observacao fixa', 'preço', 'preco'],
    texto: `Menu Cadastros. Tudo o que muda de laboratório para laboratório: Tipo de Análise (pacotes com elementos, prazo e preço), Elemento, Metodologia, Curva analítica, Legenda (faixas de interpretação por elemento e cultura), Fórmula dos calculados, Recomendação, Bandeja, Profundidade, Cultura, Tipo de Cliente, Convênio, Desconto, Observação Fixa e Modelo do Laudo.
Em todas as listas: Novo, Editar (lápis), Duplicar e Desativar. Desativar no lugar de excluir mantém o histórico de quem já usou o item.`,
  },
  {
    id: 'configuracoes',
    titulo: 'Configurações',
    palavras: ['configuracao', 'configuração', 'configuracoes', 'unidade', 'tema', 'escuro', 'claro', 'aparencia', 'aparência', 'criterio', 'critério', 'grupos de analise', 'parametros', 'demonstracao', 'demonstração', 'dados'],
    texto: `Menu Configurações, abas: Unidade (dados impressos no laudo), Grupos de análise, Parâmetros, Critérios de aceitação (RSD de réplicas, limites, deriva, por ensaio), Aparência (tema claro ou escuro; também pelo ícone de sol/lua no topo) e Dados.
Na aba Dados: carregar ou limpar a massa de demonstração, um laboratório fictício completo para apresentar o sistema. Limpar devolve o sistema ao estado de recém-instalado.`,
  },
  {
    id: 'dados-salvos',
    titulo: 'Os dados ficam salvos?',
    palavras: ['salvar', 'salvo', 'sumiu', 'perdi', 'perdeu', 'apagou', 'recarregar', 'f5', 'atualizar pagina', 'banco de dados', 'persistir'],
    texto: `Depende de como o sistema foi publicado. Sem banco de dados ligado, ele trabalha em memória: navegar pelo menu não apaga nada, mas recarregar a página (F5) ou fechar a aba perde o que foi cadastrado. Com o banco ligado, tudo é gravado no servidor. O assistente informa o modo atual quando você pergunta.`,
  },
  {
    id: 'adiado',
    titulo: 'Financeiro, fiscal e vendas',
    palavras: ['financeiro', 'fiscal', 'nota fiscal', 'nfs-e', 'boleto', 'faturamento', 'cobranca', 'cobrança', 'receber', 'funil', 'proposta', 'orcamento', 'orçamento', 'crm'],
    texto: `Os módulos de financeiro, fiscal (NFS-e) e a parte de vendas (funil e propostas) estão fora do escopo desta fase, por decisão do laboratório: o foco é a parte do analista. Eles voltam numa fase seguinte.`,
  },
];

/* ---------------- Contexto da tela ---------------- */

/** Nome de cada rota, como aparece no menu. */
export const TELAS: Record<string, string> = {
  '': 'Painel',
  crm: 'Clientes',
  recepcao: 'Recepção',
  importacao: 'Importação',
  etiquetas: 'Etiquetas',
  amostras: 'Amostras',
  bancada: 'Bancada',
  resultados: 'Resultados',
  ensaios: 'Revisão',
  qualidade: 'Qualidade',
  laudos: 'Laudos',
  estoque: 'Estoque',
  equipamentos: 'Equipamentos',
  usuarios: 'Usuários e papéis',
  auditoria: 'Auditoria',
  cadastros: 'Cadastros',
  configuracoes: 'Configurações',
};

/** A tela a partir do endereço, sem depender do prefixo /lab. */
export function telaDoCaminho(caminho: string): string {
  const partes = caminho.split('?')[0].split('/').filter(Boolean);
  const chave = partes.find((p) => p !== 'lab' && p in TELAS) ?? '';
  return TELAS[chave];
}

export type ModoDados = 'vazio' | 'demonstracao' | 'banco';

/** O que o navegador conta ao servidor sobre quem pergunta. */
export interface ContextoTela {
  tela: string;
  papel: string;
  modo: ModoDados;
  modulos: string[];
  contagens: { clientes: number; usuarios: number; amostras: number; laudos: number };
}

const PAPEIS = new Set([
  'Administrador', 'Responsável Técnico', 'Analista de bancada',
  'Recepção de amostras', 'Comercial', 'Financeiro',
]);
const TELAS_VALIDAS = new Set(Object.values(TELAS));
const MODOS = new Set<ModoDados>(['vazio', 'demonstracao', 'banco']);

const contagem = (v: unknown) =>
  (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(Math.floor(v), 1_000_000) : 0);

/**
 * Limpa o contexto que veio do navegador.
 *
 * O contexto entra nas instruções do modelo com autoridade de
 * operador, então nada de texto livre passa: a tela, o papel e os
 * módulos são conferidos contra listas fechadas, e as contagens são
 * números. Um usuário que edite a requisição consegue, no máximo,
 * dizer que está noutra tela — não consegue escrever instruções.
 */
export function limparContexto(bruto: unknown): ContextoTela | undefined {
  if (!bruto || typeof bruto !== 'object') return undefined;
  const c = bruto as Record<string, unknown>;
  const tela = typeof c.tela === 'string' && TELAS_VALIDAS.has(c.tela) ? c.tela : 'Painel';
  const papel = typeof c.papel === 'string' && PAPEIS.has(c.papel) ? c.papel : 'não informado';
  const modo = typeof c.modo === 'string' && MODOS.has(c.modo as ModoDados) ? (c.modo as ModoDados) : 'vazio';
  const modulos = Array.isArray(c.modulos)
    ? c.modulos.filter((m): m is string => typeof m === 'string' && TELAS_VALIDAS.has(m)).slice(0, 30)
    : [];
  const n = (c.contagens ?? {}) as Record<string, unknown>;
  return {
    tela, papel, modo, modulos,
    contagens: {
      clientes: contagem(n.clientes), usuarios: contagem(n.usuarios),
      amostras: contagem(n.amostras), laudos: contagem(n.laudos),
    },
  };
}

const DESCRICAO_MODO: Record<ModoDados, string> = {
  vazio: 'sistema vazio, sem banco de dados ligado: o que for cadastrado some ao recarregar a página',
  demonstracao: 'massa de demonstração carregada (dados fictícios), sem banco de dados: some ao recarregar a página',
  banco: 'ligado ao banco de dados: tudo o que é cadastrado fica gravado',
};

/** O contexto como texto, para a mensagem de sistema do turno. */
export function textoDoContexto(c: ContextoTela): string {
  return [
    'Situação de quem está perguntando, agora:',
    `- Tela aberta: ${c.tela}`,
    `- Papel do usuário: ${c.papel}`,
    `- Menus que esse papel enxerga: ${c.modulos.length ? c.modulos.join(', ') : 'não informado'}`,
    `- Dados: ${DESCRICAO_MODO[c.modo]}`,
    `- Cadastrados: ${c.contagens.clientes} clientes, ${c.contagens.usuarios} usuários, `
      + `${c.contagens.amostras} amostras, ${c.contagens.laudos} laudos`,
    'Use isto para ajustar a resposta (por exemplo, se o papel não enxerga um menu, diga quem pode). '
      + 'Não repita esta lista para o usuário.',
  ].join('\n');
}

/* ---------------- Instruções do modelo ---------------- */

/**
 * As instruções do assistente. São fixas — nada que mude por pedido
 * entra aqui — para que o servidor do modelo reaproveite o cache
 * entre uma pergunta e outra. O que muda (tela, papel) vai numa
 * mensagem de sistema no fim da conversa.
 */
export function instrucoesDoAssistente(): string {
  const guia = GUIA.map((t) => `## ${t.titulo}\n${t.texto}`).join('\n\n');
  return `Você é o assistente do Bancada, um sistema de gestão para laboratórios de análises agrícolas e industriais (solo, tecido vegetal, fertilizantes, corretivos, água e outros). Quem pergunta trabalha no laboratório: analistas de bancada, responsáveis técnicos, pessoal da recepção, administradores. Muitos estão aprendendo o sistema agora.

Seu trabalho é explicar como usar o Bancada. Responda em português do Brasil, em tom direto e cordial.

Como responder:
- Vá direto ao caminho: nome do menu, depois o botão, como aparecem na tela, por exemplo "Clientes → Novo". Use passos numerados quando houver mais de dois.
- Seja breve. Uma pergunta simples pede duas ou três frases.
- Baseie-se no guia abaixo. Ele descreve o sistema como é hoje. Se algo não está no guia, diga que não tem certeza em vez de supor um menu ou botão; mandar alguém procurar um botão que não existe atrapalha mais do que ajuda.
- Você só explica. Não consegue clicar, cadastrar, alterar nem consultar dados do sistema, e não deve dizer que fez algo.
- Perguntas técnicas de laboratório (o que é V%, para que serve o índice SMP, como ler um z-score) você pode explicar em termos gerais. Interpretar o resultado de uma amostra real, decidir a dose de corretivo de um talhão ou aprovar um resultado é papel do responsável técnico ou do engenheiro agrônomo; diga isso quando a pergunta for nessa direção.
- Se a pergunta não tem relação com o laboratório nem com o sistema, diga gentilmente que você ajuda com o Bancada.
- Quando o papel do usuário não enxerga o menu de que ele precisa, explique qual papel tem acesso e que um administrador pode ajustar em Usuários e papéis.

# Guia do Bancada

${guia}`;
}

/* ---------------- Busca de reserva ---------------- */

const normalizar = (t: string) =>
  t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * Os tópicos do guia que melhor respondem à pergunta, sem modelo.
 *
 * É a reserva para quando o assistente não está disponível: casa as
 * palavras da pergunta com os termos de cada tópico. Não entende a
 * pergunta, só aponta o trecho do guia que mais provavelmente a
 * responde — e diz isso ao usuário.
 */
export function buscarNoGuia(pergunta: string, limite = 2): TopicoGuia[] {
  const p = ` ${normalizar(pergunta).replace(/[^\p{L}\p{N}%<\s-]/gu, ' ')} `;
  const pontuados = GUIA.map((t) => {
    let pontos = 0;
    for (const palavra of t.palavras) {
      const alvo = normalizar(palavra);
      // Termo de várias palavras vale mais: é mais específico.
      if (p.includes(` ${alvo} `) || p.includes(` ${alvo}s `)) pontos += alvo.includes(' ') ? 3 : 2;
      else if (alvo.length >= 5 && p.includes(alvo)) pontos += 1;
    }
    if (p.includes(normalizar(t.titulo))) pontos += 3;
    return { t, pontos };
  });
  return pontuados
    .filter((x) => x.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, limite)
    .map((x) => x.t);
}

/* ---------------- Conversa ---------------- */

export interface MensagemChat {
  role: 'user' | 'assistant';
  content: string;
}

export const LIMITE_MENSAGENS = 20;
export const LIMITE_CARACTERES = 2000;

/**
 * Confere a conversa que o navegador mandou.
 *
 * Devolve só as últimas mensagens, alternando usuário e assistente e
 * terminando numa pergunta. Mensagem longa demais é recusada, não
 * cortada: cortar mudaria a pergunta sem o usuário saber.
 */
export function conferirConversa(
  bruto: unknown,
): { ok: true; mensagens: MensagemChat[] } | { ok: false; erro: string } {
  if (!Array.isArray(bruto) || bruto.length === 0) return { ok: false, erro: 'Conversa vazia.' };
  const mensagens: MensagemChat[] = [];
  for (const m of bruto.slice(-LIMITE_MENSAGENS)) {
    if (!m || typeof m !== 'object') return { ok: false, erro: 'Mensagem inválida.' };
    const { role, content } = m as Record<string, unknown>;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') {
      return { ok: false, erro: 'Mensagem inválida.' };
    }
    const texto = content.trim();
    if (!texto) continue;
    if (texto.length > LIMITE_CARACTERES) {
      return { ok: false, erro: `Mensagem com mais de ${LIMITE_CARACTERES} caracteres.` };
    }
    const anterior = mensagens[mensagens.length - 1];
    // Duas do mesmo lado seguidas se juntam: acontece quando uma
    // resposta falhou no meio e o usuário perguntou de novo.
    if (anterior && anterior.role === role) anterior.content += `\n\n${texto}`;
    else mensagens.push({ role, content: texto });
  }
  while (mensagens.length && mensagens[0].role !== 'user') mensagens.shift();
  if (!mensagens.length || mensagens[mensagens.length - 1].role !== 'user') {
    return { ok: false, erro: 'A conversa precisa terminar numa pergunta.' };
  }
  return { ok: true, mensagens };
}

/** Perguntas sugeridas conforme a tela em que a pessoa está. */
export const SUGESTOES: Record<string, string[]> = {
  Painel: ['Por onde eu começo?', 'Como cadastro um analista?', 'Os dados ficam salvos?'],
  Clientes: ['Quais dados são obrigatórios?', 'Como desativo um cliente?'],
  'Recepção': ['Como protocolo um lote?', 'Como registro uma não conformidade?'],
  Resultados: ['Como lanço os resultados?', 'Por que a grade está vazia?', 'Como a CTC é calculada?'],
  'Revisão': ['Por que não consigo aprovar?', 'Como mando repetir um ensaio?'],
  Laudos: ['Como salvo o laudo em PDF?', 'Quem pode assinar o laudo?'],
  'Usuários e papéis': ['Como crio um usuário analista?', 'Como opero como outro usuário?'],
  Bancada: ['Por que o equipamento está bloqueado?', 'Como calibro o pHmetro?'],
  'Importação': ['Como importo do Excel?', 'Como salvo um modelo de importação?'],
  Qualidade: ['O que é o z-score?', 'Como funciona o controle interno?'],
  Cadastros: ['Como cadastro um pacote de análises?', 'Como edito uma fórmula?'],
};
