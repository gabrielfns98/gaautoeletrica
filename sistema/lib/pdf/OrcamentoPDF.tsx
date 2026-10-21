import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { OFICINA, numeroCurto } from "@/lib/oficina";
import { reais, dataBR } from "@/lib/format";
import { formatarPlaca } from "@/lib/placa";
import { calcularTotais, subtotalItem, type ItemCalculo } from "@/lib/orcamento";
import { registrarFontes } from "@/lib/pdf/registrarFontes";

export type DadosOrcamento = {
  numero: number;
  emissao: Date;
  validadeAte: Date;
  cliente: { nome: string; telefone: string };
  van: { placa: string; modelo: string; ano: number | null; km: number | null };
  problemaRelatado: string;
  problemaReal: string | null;
  observacoes: string | null;
  descontoCentavos: number;
  itens: (ItemCalculo & { descricao: string })[];
  logoDataUri: string | null;
};

/** Roboto quando os arquivos existem; senão a Helvetica interna do PDF. */
const FAMILIA = registrarFontes();

const COR = OFICINA.corPrimaria;
const CINZA = "#6B7280";
const BORDA = "#E5E7EB";

const s = StyleSheet.create({
  page: {
    fontFamily: FAMILIA,
    fontSize: 9,
    color: "#111827",
    paddingTop: 24,
    paddingHorizontal: 32,
    paddingBottom: 52,
  },
  cabecalho: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  logo: { width: 150, height: 50, objectFit: "contain" },
  logoFallback: { fontSize: 14, fontWeight: 700, color: COR, width: 150 },
  oficina: { flex: 1, textAlign: "right", color: CINZA, lineHeight: 1.4 },
  oficinaNome: { fontSize: 11, fontWeight: 700, color: "#111827" },

  faixa: {
    backgroundColor: COR,
    color: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  faixaTitulo: { fontSize: 14, fontWeight: 700 },
  faixaDatas: { fontSize: 8, textAlign: "right", lineHeight: 1.4 },

  blocos: { flexDirection: "row", gap: 10, marginBottom: 8 },
  bloco: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDA,
    borderRadius: 3,
    padding: 8,
  },
  blocoTitulo: {
    fontSize: 7,
    fontWeight: 700,
    color: COR,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  linhaInfo: { flexDirection: "row", marginBottom: 1 },
  infoRotulo: { width: 52, color: CINZA },
  infoValor: { flex: 1 },

  secao: { marginBottom: 8 },
  secaoTitulo: {
    fontSize: 7,
    fontWeight: 700,
    color: COR,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  texto: { lineHeight: 1.4, textAlign: "justify" },
  textoCondicoes: { fontSize: 8, lineHeight: 1.4 },

  tabelaCabecalho: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDA,
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontWeight: 700,
    fontSize: 8,
  },
  tabelaLinha: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: BORDA,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  colDesc: { flex: 1, paddingRight: 6 },
  colQtd: { width: 34, textAlign: "center" },
  colValor: { width: 68, textAlign: "right" },
  colSub: { width: 72, textAlign: "right" },

  resumo: { marginTop: 8, alignSelf: "flex-end", width: 230 },
  resumoLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  resumoTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: COR,
    color: "#FFFFFF",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginTop: 4,
  },
  totalTexto: { fontSize: 12, fontWeight: 700 },

  assinatura: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
  },
  assinaturaLinha: { borderTopWidth: 1, borderColor: "#9CA3AF", paddingTop: 3, color: CINZA },

  rodape: {
    position: "absolute",
    bottom: 22,
    left: 32,
    right: 32,
    borderTopWidth: 1,
    borderColor: BORDA,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: CINZA,
  },
});

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={s.linhaInfo}>
      <Text style={s.infoRotulo}>{rotulo}</Text>
      <Text style={s.infoValor}>{valor}</Text>
    </View>
  );
}

export function OrcamentoPDF(dados: DadosOrcamento) {
  const totais = calcularTotais(dados.itens, dados.descontoCentavos);
  const pecas = dados.itens.filter((i) => i.tipo !== "mao_de_obra");
  const servicos = dados.itens.filter((i) => i.tipo === "mao_de_obra");
  const numero = numeroCurto(dados.numero);

  return (
    <Document
      title={`Orçamento ${numero} — ${formatarPlaca(dados.van.placa)}`}
      author={OFICINA.nome}
    >
      <Page size="A4" style={s.page} wrap>
        {/* 1. Cabeçalho */}
        <View style={s.cabecalho} fixed>
          {dados.logoDataUri ? (
            <Image src={dados.logoDataUri} style={s.logo} />
          ) : (
            <Text style={s.logoFallback}>{OFICINA.nome}</Text>
          )}
          <View style={s.oficina}>
            <Text style={s.oficinaNome}>{OFICINA.nome}</Text>
            <Text>CNPJ {OFICINA.cnpj}</Text>
            <Text>{OFICINA.endereco}</Text>
            <Text>{OFICINA.cidade}</Text>
            <Text>
              {OFICINA.telefone} · {OFICINA.email}
            </Text>
          </View>
        </View>

        <View style={s.faixa}>
          <Text style={s.faixaTitulo}>ORÇAMENTO Nº {numero}</Text>
          <View style={s.faixaDatas}>
            <Text>Emissão: {dataBR(dados.emissao)}</Text>
            <Text>Válido até: {dataBR(dados.validadeAte)}</Text>
          </View>
        </View>

        {/* 2 e 3. Cliente e Veículo */}
        <View style={s.blocos}>
          <View style={s.bloco}>
            <Text style={s.blocoTitulo}>Cliente</Text>
            <Info rotulo="Nome" valor={dados.cliente.nome} />
            <Info rotulo="Telefone" valor={dados.cliente.telefone} />
          </View>
          <View style={s.bloco}>
            <Text style={s.blocoTitulo}>Veículo</Text>
            <Info rotulo="Placa" valor={formatarPlaca(dados.van.placa)} />
            <Info rotulo="Modelo" valor={dados.van.modelo} />
            <Info rotulo="Ano" valor={dados.van.ano ? String(dados.van.ano) : "—"} />
            <Info
              rotulo="Km"
              valor={dados.van.km ? `${dados.van.km.toLocaleString("pt-BR")} km` : "—"}
            />
          </View>
        </View>

        {/* 4. Problema relatado e diagnóstico */}
        <View style={s.secao}>
          <Text style={s.secaoTitulo}>Problema relatado</Text>
          <Text style={s.texto}>{dados.problemaRelatado}</Text>
        </View>
        {dados.problemaReal && (
          <View style={s.secao}>
            <Text style={s.secaoTitulo}>Diagnóstico</Text>
            <Text style={s.texto}>{dados.problemaReal}</Text>
          </View>
        )}

        {/* 5. Tabelas */}
        {pecas.length > 0 && (
          <View style={s.secao}>
            <Text style={s.secaoTitulo}>Peças</Text>
            <View style={s.tabelaCabecalho} fixed>
              <Text style={s.colDesc}>Descrição</Text>
              <Text style={s.colQtd}>Qtd</Text>
              <Text style={s.colValor}>Valor unit.</Text>
              <Text style={s.colSub}>Subtotal</Text>
            </View>
            {pecas.map((item, i) => (
              <View key={`p${i}`} style={s.tabelaLinha} wrap={false}>
                <Text style={s.colDesc}>{item.descricao}</Text>
                <Text style={s.colQtd}>{item.quantidade}</Text>
                <Text style={s.colValor}>{reais(item.valorUnitarioCentavos)}</Text>
                <Text style={s.colSub}>{reais(subtotalItem(item))}</Text>
              </View>
            ))}
          </View>
        )}

        {servicos.length > 0 && (
          <View style={s.secao}>
            <Text style={s.secaoTitulo}>Mão de obra</Text>
            <View style={s.tabelaCabecalho} fixed>
              <Text style={s.colDesc}>Descrição</Text>
              <Text style={s.colSub}>Valor</Text>
            </View>
            {servicos.map((item, i) => (
              <View key={`s${i}`} style={s.tabelaLinha} wrap={false}>
                <Text style={s.colDesc}>{item.descricao}</Text>
                <Text style={s.colSub}>{reais(subtotalItem(item))}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 6. Resumo */}
        <View style={s.resumo} wrap={false}>
          <View style={s.resumoLinha}>
            <Text>Peças</Text>
            <Text>{reais(totais.pecasCentavos)}</Text>
          </View>
          <View style={s.resumoLinha}>
            <Text>Mão de obra</Text>
            <Text>{reais(totais.maoDeObraCentavos)}</Text>
          </View>
          <View style={s.resumoLinha}>
            <Text>Subtotal</Text>
            <Text>{reais(totais.subtotalCentavos)}</Text>
          </View>
          {totais.descontoCentavos > 0 && (
            <View style={s.resumoLinha}>
              <Text>Desconto</Text>
              <Text>- {reais(totais.descontoCentavos)}</Text>
            </View>
          )}
          <View style={s.resumoTotal}>
            <Text style={s.totalTexto}>TOTAL</Text>
            <Text style={s.totalTexto}>{reais(totais.totalCentavos)}</Text>
          </View>
        </View>

        {/* 7. Observações e condições */}
        {(dados.observacoes || OFICINA.pix) && (
          <View style={s.secao} break={false}>
            <Text style={s.secaoTitulo}>Observações e condições</Text>
            {dados.observacoes && <Text style={s.textoCondicoes}>{dados.observacoes}</Text>}
            {OFICINA.pix ? (
              <Text style={[s.textoCondicoes, { marginTop: 4, fontWeight: 700 }]}>
                PIX: {OFICINA.pix}
              </Text>
            ) : null}
          </View>
        )}

        {/* 8. Assinatura */}
        <View style={s.assinatura} wrap={false}>
          <View style={{ flex: 2 }}>
            <Text style={s.assinaturaLinha}>De acordo (assinatura do cliente)</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.assinaturaLinha}>Data</Text>
          </View>
        </View>

        {/* 9. Rodapé com paginação */}
        <View style={s.rodape} fixed>
          <Text>
            {OFICINA.nome} · {OFICINA.telefone} · {OFICINA.email}
            {OFICINA.instagram ? ` · ${OFICINA.instagram}` : ""}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
