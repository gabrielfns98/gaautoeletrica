# Bancada — Sistema de Gestão Laboratorial

Sistema de gestão para laboratório de análises agroindustriais (solo, foliar,
água, fertilizantes, corretivos, sementes…), com o módulo de **potenciometria
de pH** como núcleo da operação.

Montado em `/lab` dentro desta aplicação. O site institucional existente em `/`
continua intacto.

```
npm install
npm run dev     # a Bancada fica em http://localhost:8080/lab
```

---

## O módulo de pH

A leitura de pH não é um campo de formulário: é uma estação de bancada.

**`lib/ph.ts`** implementa a eletroquímica de verdade, e não uma aproximação:

- **Equação de Nernst** — slope teórico `S(T) = ln(10)·R·T/F`, que dá
  59,16 mV/pH a 25 °C e varia com a temperatura.
- **Tampões certificados** — valores de pH dos tampões 4,01 / 7,00 / 10,01 em
  função da temperatura (DIN 19266 / NIST), com interpolação linear.
- **Calibração multiponto** — regressão de mV sobre o pH real do tampão, com
  slope percentual, offset no ponto isopotencial, R² e os critérios de
  aceitação usuais (slope 95–105%, offset ±30 mV, R² ≥ 0,999).
- **Compensação de temperatura** — o slope é reescalado para a temperatura da
  amostra; depois o resultado é normalizado para 25 °C pelo coeficiente da
  matriz (suspensão de solo varia cerca de −0,006 pH/°C).
- **Detecção de estabilidade** — regressão da deriva na janela final do sinal;
  abaixo de 0,6 mV/min por 10 s a leitura é capturada sozinha.
- **Réplicas** — média, desvio padrão e RSD, com bloqueio acima de 2%.
- **Controle de qualidade** — regras de Westgard (1-3s, 2-2s, R-4s, 4-1s, 10x)
  sobre a série histórica do material de controle.
- **Interpretação agronômica** — CFSEMG para pH em água, Boletim 100 (IAC) para
  CaCl₂, índice SMP para acidez potencial e CONAMA 357/430 para água e efluente.

`lib/ph.test.ts` cobre tudo isso com 58 asserções numéricas:

```sh
npx tsx src/lims/lib/ph.test.ts
```

### Aquisição do sinal — `lib/serial.ts`

Três caminhos, intercambiáveis pela mesma interface `FontePh`:

| Modo | Como funciona |
|---|---|
| **Instrumento** | pHmetro físico pela **Web Serial API** (USB/RS-232). Parsers para Mettler Toledo, Hanna, Digimed, Tecnal e ASCII genérico. Exige Chrome ou Edge em HTTPS. |
| **Bancada virtual** | Simulador que reproduz a resposta do eletrodo de vidro: aproximação exponencial do equilíbrio com ruído e deriva. Serve para treino e demonstração. |
| **Importação** | Lê o CSV/TSV exportado pelo instrumento e concilia cada linha com um ensaio pendente pelo protocolo ou pela identificação de campo. |

---

## Módulos

| Rota | O que faz |
|---|---|
| `/lab` | Painel: fluxo de amostras, acidez do solo, produtividade da bancada, estado dos pHmetros |
| `/lab/recepcao` | Protocolo de lotes, conferência de conformidade, abertura automática dos ensaios |
| `/lab/amostras` | Acervo, ficha completa com curva de estabilização e interpretação agronômica |
| `/lab/ph` | **Bancada, calibração, controle de qualidade e importação** |
| `/lab/ensaios` | Lista de trabalho, revisão técnica e aprovação em lote |
| `/lab/laudos` | Compilação dos resultados, assinatura do RT e código de verificação |
| `/lab/crm` | Carteira, funil de oportunidades, histórico de relacionamento, propostas |
| `/lab/financeiro` | Contas a receber e a pagar, fluxo de caixa, aging, despesas por categoria |
| `/lab/fiscal` | NFS-e com ISS e retenções federais apuradas automaticamente |
| `/lab/estoque` | Reagentes e padrões, lotes com validade, produtos controlados |
| `/lab/equipamentos` | Parque instalado, estado metrológico, desgaste do eletrodo, manutenção |
| `/lab/usuarios` | Usuários e matriz de permissões por módulo × ação |
| `/lab/auditoria` | Trilha de auditoria com exportação em CSV |
| `/lab/configuracoes` | Unidade, catálogo de ensaios, critérios metrológicos, aparência |

---

## Permissões

O modelo é `papel → conjunto de permissões "modulo:acao"`, com 14 módulos e 6
ações. Sete papéis de fábrica: Administrador, Responsável Técnico, Analista de
bancada, Recepção, Comercial, Financeiro e Portal do cliente.

Uma regra não depende da matriz e **não pode ser desligada por permissão**:
quem leu um ensaio não pode aprová-lo. A segregação de funções exigida pela
ISO/IEC 17025 (7.8.1) é verificada na interface, numa *constraint* de tabela e
num gatilho do banco.

O menu do topo permite **operar como** qualquer usuário, para ver o sistema
pelos olhos de cada papel — módulos sem permissão somem da barra lateral e a
rota é bloqueada.

---

## Dados

A massa de demonstração (`data/seed.ts`) é gerada por um PRNG determinístico:
a mesma semente produz sempre o mesmo laboratório — cerca de 120 lotes, 990
amostras, 2.900 ensaios e 1.100 leituras de pH, com status coerente com a idade
de cada amostra.

Ela vive **em memória**. Os traces de estabilização somam alguns megabytes e não
caberiam com folga no `localStorage`; só tema e operador ativo são persistidos.

### Ligar no Supabase

O esquema de produção já está escrito e testado:

- `supabase/migrations/20251008120000_bancada_lims.sql` — 29 tabelas com RLS,
  gatilhos de integridade do processo e os papéis de fábrica.
- `supabase/tests/bancada_rls.test.sql` — 14 testes contra um Postgres de
  verdade (ver `supabase/tests/README.md`).

As funções de `data/store.tsx` (`useAcoes`) já têm a assinatura que terão
quando chamarem o Supabase, então a troca da fonte não altera as telas.

O banco não confia na interface: a calibração vencida bloqueia a leitura, o pH
fora de 0–14 é recusado, a saída maior que o saldo é recusada e a transição de
status gera auditoria automática — tudo no servidor.

---

## Design

Tema duplo. **Painel de instrumento** (escuro, grafite, para bancada com pouca
luz) e **caderno de bancada** (claro, papel quente). Tipografia: Instrument
Serif nos títulos, IBM Plex Sans na interface, IBM Plex Mono em todo número.

A escala de pH é a linguagem cromática do sistema: a rampa do indicador
universal (`--ph-0` a `--ph-14`) é a mesma no chip do resultado, na régua da
amostra, no mostrador da bancada e no histograma do painel. Um valor de pH tem
sempre a mesma cor em todo o sistema.

> **Nota sobre JSX genérico:** não escreva `<Tabela<Amostra> …>`. O
> transformador de desenvolvimento do Lovable injeta atributos nas tags e não
> consegue analisar argumentos de tipo explícitos em JSX — o `npm run build`
> passa e o `npm run dev` quebra. `Tabela` e `Segmentos` usam `NoInfer` para
> que o tipo seja inferido de `dados`/`opcoes` sem anotação.
