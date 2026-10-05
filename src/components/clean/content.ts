/* =============================================================================
 * House Clean — conteúdo da landing page
 * -----------------------------------------------------------------------------
 * TUDO que é texto, preço, contato e imagem fica aqui. Para publicar:
 *
 * 1) Troque `brand.whatsapp` pelo número real (só dígitos, com DDI 55).
 * 2) Para usar as fotos reais no lugar das ilustrações, jogue os arquivos em
 *    `src/assets/clean/` e troque só o import no topo deste arquivo, ex.:
 *        import sala from "@/assets/clean/sala.jpg";
 *    Formato recomendado: 1600x1000 (16:10) ou maior, .webp/.jpg.
 * ===========================================================================*/

import salaImg from "@/assets/clean/sala.svg";
import cozinhaImg from "@/assets/clean/cozinha.svg";
import banheiroImg from "@/assets/clean/banheiro.svg";
import quartoImg from "@/assets/clean/quarto.svg";
import escritorioImg from "@/assets/clean/escritorio.svg";
import salaAntesImg from "@/assets/clean/sala-antes.svg";

export const brand = {
  name: "House Clean",
  initials: "HC",
  tagline: "Limpeza profissional",
  whatsapp: "5511999999999",
  whatsappLabel: "(11) 99999-9999",
  email: "contato@houseclean.com.br",
  region: "São Paulo e região metropolitana",
  instagram: "https://www.instagram.com/house_cleang",
  hours: "Seg a sáb · 7h às 19h",
};

export const waLink = (text: string) =>
  `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(text)}`;

export const navLinks = [
  { href: "#ambientes", label: "Ambientes" },
  { href: "#servicos", label: "Serviços" },
  { href: "#resultado", label: "Resultado" },
  { href: "#planos", label: "Planos" },
  { href: "#duvidas", label: "Dúvidas" },
];

export const hero = {
  badge: "Agenda aberta para esta semana",
  title: { lead: "Sua casa limpa", accent: "de verdade — até o último canto" },
  lede:
    "Equipe treinada, produtos que não agridem a sua casa e um checklist de 42 itens conferido antes de ir embora. Você volta e sente a diferença no primeiro passo.",
  primary: "Pedir orçamento no WhatsApp",
  secondary: "Ver ambientes",
  chips: [
    { title: "Checklist de 42 itens", note: "Conferido em cada visita" },
    { title: "4,9 de 5", note: "Mais de 300 avaliações" },
    { title: "Produtos eco", note: "Seguros para pets e crianças" },
  ],
};

export const marquee = [
  "Equipe uniformizada",
  "Produtos biodegradáveis",
  "Profissionais verificados",
  "Orçamento em 5 minutos",
  "Garantia de 48 horas",
  "Seguro contra danos",
  "Atendimento aos sábados",
  "Sem taxa de deslocamento",
];

/** Cenas do bloco que cresce e troca conforme o scroll. */
export const rooms = [
  {
    id: "sala",
    img: salaImg,
    kicker: "Sala de estar",
    title: "O pó some de onde ninguém olha",
    text:
      "Rodapés, atrás dos móveis, cortinas e o topo dos quadros. Estofado aspirado fibra a fibra e madeira hidratada para voltar a refletir a luz.",
    tags: ["Aspiração profunda", "Estofados", "Pó em 360°"],
  },
  {
    id: "cozinha",
    img: cozinhaImg,
    kicker: "Cozinha",
    title: "Gordura não resiste a vapor e paciência",
    text:
      "Desengordurante aplicado em coifa, azulejo e armário, com remoção completa do resíduo. Pia polida, torneira sem mancha de calcário e lixo higienizado.",
    tags: ["Desengorduração", "Coifa e azulejo", "Pia polida"],
  },
  {
    id: "banheiro",
    img: banheiroImg,
    kicker: "Banheiro",
    title: "Rejunte claro, box sem marca d'água",
    text:
      "Atacamos o encardido do rejunte, o calcário do box e os pontos de mofo. Tudo finalizado com desinfecção hospitalar nas áreas de contato.",
    tags: ["Rejunte", "Antimofo", "Desinfecção"],
  },
  {
    id: "quarto",
    img: quartoImg,
    kicker: "Quartos",
    title: "Cama feita, ar leve, noite melhor",
    text:
      "Troca de roupa de cama, aspiração do colchão com foco em ácaros e organização das superfícies. O quarto fica pronto para deitar e dormir.",
    tags: ["Antiácaro", "Troca de enxoval", "Organização"],
  },
  {
    id: "escritorio",
    img: escritorioImg,
    kicker: "Escritório",
    title: "Time produtivo começa por mesa limpa",
    text:
      "Higienização de teclados, telas e maçanetas, copa em ordem e lixeiras trocadas. Fazemos fora do horário comercial para não parar a operação.",
    tags: ["Fora do expediente", "Pontos de toque", "Copa e banheiros"],
  },
];

export const roomsIntro = {
  badge: "Ambiente por ambiente",
  title: "Role e veja onde a gente chega",
  text: "Cada cômodo tem um protocolo próprio. Nada de passar pano por cima.",
};

export const services = [
  {
    icon: "sparkles",
    title: "Limpeza padrão",
    text: "A manutenção do dia a dia, feita com método para a casa nunca acumular serviço.",
    items: ["Todos os cômodos", "Banheiros e cozinha", "Lixos e superfícies"],
    price: "a partir de R$ 180",
  },
  {
    icon: "hammer",
    title: "Limpeza pesada e pós-obra",
    text: "Respingo de tinta, cimento e poeira fina de obra: removemos antes da mudança chegar.",
    items: ["Remoção de respingos", "Vidros e esquadrias", "Poeira fina"],
    price: "a partir de R$ 420",
  },
  {
    icon: "sofa",
    title: "Higienização de estofados",
    text: "Extração a quente em sofás, poltronas, colchões e tapetes. Secagem em poucas horas.",
    items: ["Extratora profissional", "Antiácaro e antiodor", "Tapetes e colchões"],
    price: "a partir de R$ 220",
  },
  {
    icon: "glass",
    title: "Vidros e fachadas",
    text: "Janelas, sacadas e vidros altos com equipamento próprio e segurança em primeiro lugar.",
    items: ["Alturas com cinto", "Sem marca de água", "Esquadrias inclusas"],
    price: "a partir de R$ 260",
  },
  {
    icon: "building",
    title: "Escritórios e comércios",
    text: "Contratos recorrentes com equipe fixa, relatório por visita e reposição de insumos.",
    items: ["Equipe fixa", "Relatório por visita", "Insumos inclusos"],
    price: "sob medida",
  },
  {
    icon: "key",
    title: "Pós-mudança e temporada",
    text: "Entrega de imóvel e turnover de Airbnb com enxoval trocado e foto do resultado.",
    items: ["Enxoval trocado", "Checklist com fotos", "Prazo de 3 horas"],
    price: "a partir de R$ 240",
  },
];

export const wipe = {
  badge: "Antes e depois",
  title: "A diferença não é a propaganda, é o rodo",
  text:
    "Role a página e acompanhe a passagem. O mesmo cômodo, o mesmo ângulo — só que depois de um protocolo completo de limpeza profunda.",
  before: salaAntesImg,
  after: salaImg,
  points: [
    { title: "Checklist assinado", text: "Você recebe a lista do que foi feito ao fim de cada visita." },
    { title: "Garantia de 48h", text: "Achou um ponto esquecido? A gente volta sem cobrar nada." },
    { title: "Equipe verificada", text: "Antecedentes conferidos e treinamento interno antes do primeiro serviço." },
  ],
};

export const steps = [
  { n: "01", title: "Conta pra gente", text: "Manda o tamanho do imóvel e o que mais te incomoda. Respondemos em minutos." },
  { n: "02", title: "Agenda no seu horário", text: "Escolhe o dia; confirmamos a equipe e o tempo estimado por escrito." },
  { n: "03", title: "Limpeza com checklist", text: "A equipe chega uniformizada, com material próprio e protocolo por cômodo." },
  { n: "04", title: "Vistoria final", text: "Conferimos juntos. Só encerramos quando você aprova o resultado." },
];

export const stats = [
  { value: 1200, suffix: "+", label: "Limpezas entregues" },
  { value: 4.9, decimals: 1, label: "Nota média dos clientes" },
  { value: 98, suffix: "%", label: "Contratam de novo" },
  { value: 24, suffix: "h", label: "Para encaixar na agenda" },
];

export const plans = [
  {
    name: "Avulsa",
    note: "Para aquela faxina pontual",
    price: "180",
    unit: "/ visita",
    items: ["Até 80 m²", "Uma profissional", "Checklist completo", "Material incluso"],
    cta: "Agendar avulsa",
    featured: false,
  },
  {
    name: "Quinzenal",
    note: "O plano preferido das famílias",
    price: "149",
    unit: "/ visita",
    items: ["Até 120 m²", "Mesma equipe sempre", "Checklist + relatório", "Garantia de 48h", "Remarcação livre"],
    cta: "Quero quinzenal",
    featured: true,
    flag: "mais pedido",
  },
  {
    name: "Semanal / Empresas",
    note: "Rotina para casas grandes e escritórios",
    price: "sob medida",
    unit: "",
    items: ["Metragem livre", "Equipe dedicada", "Nota fiscal e contrato", "Insumos reabastecidos", "Gestor de conta"],
    cta: "Falar com consultor",
    featured: false,
  },
];

export const testimonials = [
  {
    name: "Marina Alves",
    role: "Apartamento · Pinheiros",
    text: "Contratei achando que seria mais do mesmo. Abri a porta e o cheiro já era outro. O rejunte do banheiro voltou a ser branco — coisa que eu já tinha desistido.",
  },
  {
    name: "Rodrigo Tavares",
    role: "Escritório · 14 pessoas",
    text: "Fazem a limpeza depois das 19h e deixam relatório no grupo. Em oito meses, não tive uma única reclamação do time.",
  },
  {
    name: "Clara Menezes",
    role: "Casa · Santo André",
    text: "A equipe é sempre a mesma, chega no horário e já sabe onde fica cada coisa. Pra quem trabalha fora, isso vale ouro.",
  },
];

export const faq = [
  {
    q: "Preciso fornecer produtos e equipamentos?",
    a: "Não. A equipe leva todo o material, inclusive aspirador e extratora. Se você preferir um produto específico por causa de alergia ou piso delicado, é só avisar que usamos o seu.",
  },
  {
    q: "Quanto tempo demora uma limpeza?",
    a: "Uma limpeza padrão em apartamento de até 80 m² leva de 4 a 5 horas com uma profissional. Limpeza pesada e pós-obra variam conforme o estado do imóvel — o prazo vai confirmado por escrito no orçamento.",
  },
  {
    q: "Posso ficar fora de casa durante o serviço?",
    a: "Pode. A maioria dos nossos clientes não está presente. Combinamos a entrega da chave com antecedência e você acompanha pelo relatório com fotos no fim do serviço.",
  },
  {
    q: "Os produtos são seguros para pets e crianças?",
    a: "Sim. Trabalhamos com linha biodegradável e sem cloro na maior parte dos ambientes. Onde a desinfecção exige produto mais forte, aplicamos e removemos o resíduo antes de liberar o cômodo.",
  },
  {
    q: "E se eu não gostar do resultado?",
    a: "Você tem 48 horas para apontar qualquer ponto. A equipe volta e refaz sem custo nenhum. É a nossa garantia padrão, sem letra miúda.",
  },
  {
    q: "Atendem quais regiões?",
    a: `Atendemos ${brand.region}. Fora dessa área conseguimos avaliar caso a caso para contratos recorrentes — chama no WhatsApp que a gente responde.`,
  },
];

export const propertyTypes = ["Apartamento", "Casa", "Escritório", "Comércio", "Pós-obra", "Airbnb / temporada"];
export const frequencies = ["Uma vez (avulsa)", "Semanal", "Quinzenal", "Mensal", "Ainda não sei"];
