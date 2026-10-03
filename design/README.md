# G.A Auto Elétrica — Sistema e telas

> O trabalho que o cliente contrata deste produto:
> **deixar o carro na oficina e saber, a qualquer hora, em que pé está o serviço — sem ligar.**
>
> Tudo que não move o cliente em direção a isso ficou de fora.

Arquivos: [`tokens.json`](./tokens.json) (fonte da verdade) → espelhado em `src/index.css` e `tailwind.config.ts`.

---

## 1. Mapa de fluxo

```
                        ┌───────────────────────────┐
  Visitante ──────────► │  /  Entrada               │
                        │  O que é, o que resolve,  │
                        │  uma ação: Entrar         │
                        └─────────────┬─────────────┘
                                      │ Entrar / Criar conta
                                      ▼
                        ┌───────────────────────────┐
                        │  /entrar                  │
                        │  E-mail + senha           │
                        └─────────────┬─────────────┘
                                      │ sessão criada
                                      ▼
            ┌─────────────────────────────────────────────┐
            │  /painel        TELA 2 — estado vazio/lista │
            │  Sem veículo → "Cadastre seu carro"         │
            │  Com ordens  → lista por status             │
            └───────┬─────────────────────────┬───────────┘
                    │ Abrir ordem             │ toca numa ordem
                    ▼                         ▼
      ┌──────────────────────────┐   ┌────────────────────────────┐
      │ /painel/nova   TELA 3    │   │ /painel/os/:id    TELA 4   │
      │ Veículo → serviço →      │──►│ Linha do tempo do status,  │
      │ sintoma → data           │   │ custo, falar com a oficina │
      └──────────────────────────┘   └────────────────────────────┘
                    │
                    │ (admin)                       ┌──────────────────────┐
                    └──────────────────────────────►│ /oficina   (interno) │
                                                    │ fila de ordens,      │
                                                    │ muda status          │
                                                    └──────────────────────┘

                        ┌───────────────────────────┐
                        │  /conta         TELA 5    │
                        │  Dados, veículos, sair    │
                        └───────────────────────────┘
```

**Regra do fluxo:** da entrada à primeira ordem aberta são 4 toques —
Entrar → Abrir ordem → preencher → Confirmar. Nenhuma tela existe fora desse caminho.

---

## 2. Component sheet

Todo componente tem os 5 estados. `default · hover · focus · disabled · error`.

| Componente | default | hover | focus | disabled | error |
|---|---|---|---|---|---|
| **Button / primary** | `bg-foreground`, texto branco, raio md | `bg-primary-light` | anel 2px ink, offset 2px | `opacity-50`, `cursor-not-allowed`, sem hover | — (erro vive no campo, não no botão) |
| **Button / accent** | `bg-accent` (volt) + texto ink | `bg-accent/90` | anel ink | opacity-50 | — |
| **Button / outline** | borda `--border`, fundo card | `bg-muted` | anel ink | opacity-50 | — |
| **Button / ghost** | sem fundo | `bg-muted` | anel ink | opacity-50 | — |
| **Input / Textarea** | borda `--border`, raio sm, 44px alt. | borda `--primary-light` | anel ink, borda ink | `bg-muted`, texto slate | borda `--destructive` + mensagem abaixo com ícone |
| **Select** | igual input | igual input | anel ink no trigger | opacity-50 | borda destructive |
| **Card** | `bg-card`, borda, sombra raised | sombra overlay + `-translate-y-px` (só se clicável) | anel ink no link interno | — | borda destructive quando a ordem falhou |
| **StatusBadge** | cor por status (ver tabela) | — (não é interativo) | — | — | — |
| **StatusTimeline** | etapa feita = signal, atual = volt pulsando, futura = mist | — | — | — | etapa cancelada = alert |
| **EmptyState** | ícone + título + 1 frase + 1 ação | — | anel no botão | — | — |
| **Field (wrapper)** | label 14px, hint 12px slate | — | — | — | `aria-invalid`, `aria-describedby`, texto alert 14px |

### Cores de status (fechadas, não negociáveis)

| Status no banco | Rótulo na tela | Fundo | Texto |
|---|---|---|---|
| `pending` | Na fila | `#E8EAED` | `#101114` |
| `in_progress` | Em andamento | `#FFC400` | `#101114` |
| `completed` | Concluído | `#0C7A42` | `#FFFFFF` |
| `cancelled` | Cancelado | `#C4302B` | `#FFFFFF` |

### Regras que valem em todas as telas

- **Uma ação primária por tela.** O resto é outline ou ghost.
- **Hierarquia pelo espaço branco**, não por caixa dentro de caixa.
- **Erro diz o que houve e como resolver.** "Falha" sozinho é proibido.
- **Estado vazio convida**, não pede desculpa.
- **Volt nunca é texto sobre branco** (1,6:1). Só preenchimento com ink por cima.
- Mínimo **360px**, alvo de toque **44px**, foco visível em tudo.

---

## 3. As telas

### SCREEN 1 — Entrada (`/` + `/entrar`)

**Objetivo do usuário:** entender em 5 segundos que aqui ele acompanha o carro, e entrar.

**Layout:** superfície ink de altura contida (não 100vh). Coluna única no mobile, duas colunas
≥1024px: esquerda = promessa + 3 provas; direita = cartão de acesso. Ação primária: *Entrar*.
Oculto: preços, equipe, histórico da empresa — nada disso entra na decisão agora.

**Copy final:**
- H1: "Seu carro na oficina, sem telefonema."
- Sub: "Abra a ordem de serviço e acompanhe cada etapa — da fila à entrega."
- Botão: **Entrar e acompanhar** · secundário: **Ver serviços**
- Login, aba: *Entrar* / *Criar conta*. Botão: **Entrar**. Erro: "E-mail ou senha não conferem. Confira e tente de novo."

**Estados:** loading → botão "Entrando…" desabilitado · empty → n/a · error → alerta no topo do
formulário, foco movido para ele · success → vai para `/painel`.

**Motion:** bloco do hero `fade-up` 240ms uma vez. Troca de aba 120ms. Nada mais se mexe.

---

### SCREEN 2 — Painel / estado vazio (`/painel`)

**Objetivo do usuário:** ver, de relance, se tem algo acontecendo com o carro.

**Layout:** cabeçalho com saudação + ação primária *Abrir ordem*. Abaixo, ordens **em aberto**
primeiro (em andamento no topo, depois na fila), depois um grupo recolhido de concluídas.
Cada linha: placa, serviço, status, data. Oculto: filtros avançados, exportação, gráficos.

**Copy do vazio (dois níveis):**
- Sem veículo: "Cadastre seu carro" / "Com a placa e o modelo salvos, abrir uma ordem leva 30 segundos." → **Cadastrar veículo**
- Com veículo, sem ordem: "Nenhum serviço em aberto" / "Quando você abrir uma ordem, o andamento aparece aqui." → **Abrir ordem**

**Estados:** loading → 3 skeletons com a altura real da linha · empty → acima · error →
"Não consegui carregar suas ordens. Verifique a conexão." + **Tentar de novo** · success → lista.

**Motion:** linhas entram em `fade-up` 180ms, escalonadas 40ms. Skeleton não pisca.

---

### SCREEN 3 — Abrir ordem (`/painel/nova`)

**Objetivo do usuário:** dizer qual carro, qual problema e quando pode levar.

**Layout:** formulário de coluna única, máx. 560px, 4 campos na ordem da conversa real —
veículo, serviço, o que está acontecendo, quando pode levar. Barra de ação fixa no rodapé no
mobile. Ação primária: *Abrir ordem*. Oculto: upload de foto, orçamento, peças (vêm da oficina).

**Copy:** rótulos curtos; placeholder só onde o formato não é óbvio ("Ex.: o carro não pega de manhã").
Hint da data: "A oficina confirma o horário pelo WhatsApp." Botão: **Abrir ordem**.

**Estados:** loading → botão "Abrindo…" + campos desabilitados · empty → sem veículo, o
formulário abre direto no cadastro do veículo · error → por campo, em vermelho, com o foco no
primeiro inválido; erro de rede vira alerta no topo com **Tentar de novo** · success → navega
para a ordem criada com faixa de confirmação.

**Motion:** erro do campo aparece com `fade-up` 120ms. Nenhum shake.

---

### SCREEN 4 — Acompanhamento (`/painel/os/:id`)

**Objetivo do usuário:** saber em que etapa está e quando fica pronto.

**Layout:** topo = placa + serviço + StatusBadge grande. Centro = linha do tempo vertical de 4
etapas com data em cada uma concluída. Base = custo (quando houver) e **Falar com a oficina**
(WhatsApp já preenchido com a placa e o nº da ordem). Oculto: histórico de peças, nota fiscal.

**Copy:** etapas "Ordem aberta → Na fila da oficina → Em andamento → Concluído".
Quando concluído: "Pronto para retirada. Seg a sex, 8h às 18h."
Cancelado: "Esta ordem foi cancelada." + **Abrir nova ordem**.

**Estados:** loading → skeleton da linha do tempo · empty → n/a · error → 404 honesto: "Essa
ordem não existe ou não é sua." + **Voltar ao painel** · success → faixa verde no topo depois
de criar, some em 6s.

**Motion:** etapa atual com `pulse-dot` 1,6s. Faixa de sucesso entra em 180ms.

---

### SCREEN 5 — Conta (`/conta`)

**Objetivo do usuário:** corrigir o telefone, adicionar outro carro, sair.

**Layout:** três blocos empilhados — *Seus dados*, *Seus veículos*, *Sessão*. Cada bloco salva
sozinho. Ação primária por bloco (salvar), e *Sair* fica em outline, nunca em vermelho —
não é destrutivo.

**Copy:** hint do telefone: "É por aqui que a oficina te avisa quando o carro fica pronto."
Botão: **Salvar dados**. Confirmação: toast "Dados salvos."

**Estados:** loading → skeleton dos campos · empty → "Nenhum veículo cadastrado" + **Cadastrar
veículo** · error → mensagem no bloco que falhou, os outros continuam funcionando · success →
toast 180ms, sem recarregar a tela.

**Motion:** bloco salvo pisca a borda em signal por 240ms. Só isso.

---

## 4. O que foi retirado e por quê

| Retirado | Motivo |
|---|---|
| Painel de admin na home pública | Mostrava "Acesso negado" para todo visitante. Foi para `/oficina`. |
| "Atendimento IA 24/7" | Não existe IA no produto, e o horário real é 8h–18h. |
| Notas 4,9 / 4,8 por serviço e "mais de 1000 clientes" | Números do template, não medidos. Repor só com dado real. |
| Partículas flutuantes no hero | Movimento sem função. |
| Links "Política de Privacidade" e "Termos" sem destino | Link morto. Voltam quando as páginas existirem. |
| Link para `#inventory` no rodapé | Âncora inexistente — a seção nunca foi montada. |

---

## 5. Verificação

Rodado contra a aplicação real (Chromium, servidor de desenvolvimento), não contra maquete.

| Checagem | Resultado |
|---|---|
| `tsc --noEmit` | sem erros |
| `npm run build` | passa |
| `npm run lint` | 5 erros, todos pré-existentes no boilerplate do shadcn (`command.tsx`, `textarea.tsx`, `useAuth.tsx`, `require()` no `tailwind.config.ts`). Nenhum nos arquivos novos. |
| Rolagem horizontal em 360px | 0px em todas as 14 telas/estados |
| Erros de console | nenhum em todas as telas |
| Foco de teclado em `/entrar` | visível nos 6 primeiros controles da ordem de tabulação |
| Contraste do texto renderizado | todas as amostras ≥ AA; pior caso 5,83:1 |
| `/painel` sem sessão | redireciona para `/entrar` |
| `/oficina` com conta de cliente | mostra o aviso de área interna, não os dados |

Estados renderizados e conferidos: painel com lista, painel vazio sem veículo, painel com falha
de rede, nova ordem com e sem veículo salvo, ordem em andamento, ordem concluída, ordem
inexistente, conta, fila da oficina e fila sem permissão.

### Correção encontrada na revisão

O ponto do `StatusBadge` usava a mesma cor do fundo do chip em "Concluído" e "Cancelado" —
verde sobre verde, invisível. Passou a usar a cor de primeiro plano do próprio chip.
