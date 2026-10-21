import { PrismaClient } from "@prisma/client";
import { OBSERVACOES_ORCAMENTO_PADRAO } from "../lib/oficina";

const prisma = new PrismaClient();

function dias(n: number): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  // limpa na ordem das dependências
  await prisma.itemOS.deleteMany();
  await prisma.oS.deleteMany();
  await prisma.van.deleteMany();
  await prisma.cliente.deleteMany();

  const transportes = await prisma.cliente.create({
    data: {
      nome: "Transportes Souza Ltda",
      telefone: "5511988887777",
      obs: "Frota de 3 vans. Avisar o João antes de iniciar serviço acima de R$ 1.000.",
      vans: {
        create: [
          { placa: "ABC1234", modelo: "Mercedes-Benz Sprinter 415", ano: 2019 },
          { placa: "DEF2E34", modelo: "Renault Master 2.3", ano: 2021, obs: "Teto alto." },
          { placa: "GHI5678", modelo: "Fiat Ducato Cargo", ano: 2017 },
        ],
      },
    },
    include: { vans: true },
  });

  const maria = await prisma.cliente.create({
    data: {
      nome: "Maria Aparecida Gonçalves",
      telefone: "5511977776666",
      vans: { create: [{ placa: "JKL9F01", modelo: "Peugeot Boxer Minibus", ano: 2022 }] },
    },
    include: { vans: true },
  });

  const escola = await prisma.cliente.create({
    data: {
      nome: "Escola Pequeno Príncipe",
      telefone: "5511966665555",
      obs: "Van escolar: não pode ficar parada em dia de aula.",
      vans: { create: [{ placa: "MNO3456", modelo: "Iveco Daily 35S14", ano: 2018 }] },
    },
    include: { vans: true },
  });

  const [sprinter, master, ducato] = transportes.vans;
  const boxer = maria.vans[0];
  const daily = escola.vans[0];

  // 1) Fixada no topo, com itens e desconto -> orçamento completo
  await prisma.oS.create({
    data: {
      vanId: sprinter.id,
      dataEntrada: dias(-4),
      km: 248_530,
      prioridade: "normal",
      status: "em_servico",
      fixada: true,
      previsaoEntrega: dias(1),
      problemaRelatado:
        "Van não dá partida pela manhã e as luzes do painel piscam com o motor ligado.",
      problemaReal:
        "Alternador com diodo retificador queimado e bateria sulfatada. Cabo de massa do motor oxidado.",
      servicoFeito:
        "Substituição do alternador, troca da bateria, limpeza e refazimento do cabo de massa. Teste de carga aprovado.",
      descontoCentavos: 15_000,
      validadeDias: 7,
      observacoesOrcamento: OBSERVACOES_ORCAMENTO_PADRAO,
      itens: {
        create: [
          { tipo: "peca_comprada", descricao: "Alternador 14V 120A remanufaturado (linha Sprinter CDI)", quantidade: 1, valorUnitarioCentavos: 132_000 },
          { tipo: "peca_comprada", descricao: "Bateria 100Ah selada, 18 meses de garantia", quantidade: 1, valorUnitarioCentavos: 89_900 },
          { tipo: "peca_comprada", descricao: "Cabo de massa reforçado 25mm² com terminais estanhados", quantidade: 2, valorUnitarioCentavos: 7_450 },
          { tipo: "peca_reparada", descricao: "Recuperação do suporte do alternador (solda e usinagem)", quantidade: 1, valorUnitarioCentavos: 12_000 },
          { tipo: "mao_de_obra", descricao: "Diagnóstico elétrico completo com scanner e teste de consumo parasita", quantidade: 1, valorUnitarioCentavos: 18_000 },
          { tipo: "mao_de_obra", descricao: "Substituição do alternador e revisão do circuito de carga", quantidade: 1, valorUnitarioCentavos: 45_000 },
        ],
      },
    },
  });

  // 2) Urgente, com previsão atrasada -> aparece em vermelho no painel
  await prisma.oS.create({
    data: {
      vanId: daily.id,
      dataEntrada: dias(-7),
      km: 312_880,
      prioridade: "urgente",
      status: "na_fila",
      previsaoEntrega: dias(-2),
      problemaRelatado:
        "Superaquecendo na subida e perdendo força. Motorista relatou cheiro de queimado na cabine.",
      observacoesOrcamento: OBSERVACOES_ORCAMENTO_PADRAO,
    },
  });

  // 3) Aguardando peça, com itens -> segundo orçamento completo
  await prisma.oS.create({
    data: {
      vanId: master.id,
      dataEntrada: dias(-10),
      km: 158_200,
      prioridade: "normal",
      status: "aguardando_peca",
      previsaoEntrega: dias(3),
      problemaRelatado: "Porta lateral elétrica não fecha e o alarme dispara sozinho à noite.",
      problemaReal:
        "Motor do trilho da porta lateral travado e módulo do alarme com infiltração de água.",
      validadeDias: 10,
      observacoesOrcamento: OBSERVACOES_ORCAMENTO_PADRAO,
      itens: {
        create: [
          { tipo: "peca_comprada", descricao: "Motor do trilho da porta lateral elétrica (original)", quantidade: 1, valorUnitarioCentavos: 214_500 },
          { tipo: "peca_comprada", descricao: "Kit de vedação da coluna B com borrachas e buchas", quantidade: 1, valorUnitarioCentavos: 23_800 },
          { tipo: "peca_reparada", descricao: "Recuperação do módulo do alarme: limpeza de placa e troca de relé", quantidade: 1, valorUnitarioCentavos: 32_000 },
          { tipo: "mao_de_obra", descricao: "Desmontagem do forro, troca do motor do trilho e regulagem da porta", quantidade: 1, valorUnitarioCentavos: 38_000 },
          { tipo: "mao_de_obra", descricao: "Reinstalação e configuração do alarme com teste de 24 horas", quantidade: 1, valorUnitarioCentavos: 16_000 },
        ],
      },
    },
  });

  // 4) Na fila, sem previsão
  await prisma.oS.create({
    data: {
      vanId: boxer.id,
      dataEntrada: dias(-1),
      km: 64_310,
      prioridade: "normal",
      status: "na_fila",
      problemaRelatado: "Ar-condicionado só gela parado e o painel acende a luz de injeção.",
      observacoesOrcamento: OBSERVACOES_ORCAMENTO_PADRAO,
    },
  });

  // 5) Pronta para retirada
  await prisma.oS.create({
    data: {
      vanId: ducato.id,
      dataEntrada: dias(-6),
      km: 401_770,
      prioridade: "normal",
      status: "pronta",
      previsaoEntrega: dias(0),
      problemaRelatado: "Farol direito queimando lâmpada toda semana.",
      problemaReal: "Soquete do farol derretido e chicote com emenda mal feita por terceiros.",
      servicoFeito: "Troca do soquete, refazimento de 80 cm de chicote e instalação de lâmpadas novas.",
      observacoesOrcamento: OBSERVACOES_ORCAMENTO_PADRAO,
      itens: {
        create: [
          { tipo: "peca_comprada", descricao: "Soquete H4 cerâmico com chicote", quantidade: 1, valorUnitarioCentavos: 8_900 },
          { tipo: "mao_de_obra", descricao: "Refazimento do chicote do farol direito", quantidade: 1, valorUnitarioCentavos: 22_000 },
        ],
      },
    },
  });

  // 6) Entregue (histórico: não aparece no painel)
  await prisma.oS.create({
    data: {
      vanId: sprinter.id,
      dataEntrada: dias(-95),
      km: 236_940,
      prioridade: "normal",
      status: "entregue",
      dataEntrega: dias(-92),
      problemaRelatado: "Motor de partida fazendo barulho de catraca.",
      problemaReal: "Bendix do motor de partida desgastado.",
      servicoFeito: "Troca do bendix e limpeza do motor de partida.",
      observacoesOrcamento: OBSERVACOES_ORCAMENTO_PADRAO,
      itens: {
        create: [
          { tipo: "peca_reparada", descricao: "Motor de partida: troca do bendix e revisão", quantidade: 1, valorUnitarioCentavos: 46_000 },
          { tipo: "mao_de_obra", descricao: "Remoção e instalação do motor de partida", quantidade: 1, valorUnitarioCentavos: 14_000 },
        ],
      },
    },
  });

  const total = await prisma.oS.count();
  console.log(`Seed concluído: ${total} OS criadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
