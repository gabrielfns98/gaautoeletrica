/* ============================================================
   BANCADA — importar leitura bruta do aparelho

   O espectrofotômetro exporta absorbância, a absorção atômica
   exporta concentração no extrato, o fotômetro exporta intensidade.
   Nenhum deles exporta o número do laudo: entre um e outro estão a
   curva de calibração e o preparo da amostra.

   Hoje essa conta é feita em planilha, fora do sistema, e é onde o
   laboratório erra em silêncio — a planilha não sabe que a curva
   venceu, não conhece o limite de quantificação e não avisa quando a
   leitura passou do padrão mais alto.
   ============================================================ */

import { useMemo } from 'react';
import { FlaskConical, TriangleAlert } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { useBancada } from '../../data/store';
import { Pilula, Secao } from '../../components/primitivos';
import { numero } from '../../lib/format';
import type { Preparo } from '../../lib/aquisicao';
import type { Curva, Parametro } from '../../types';

export interface ConfigBruta {
  ativo: boolean;
  preparo: Preparo;
  /** curva escolhida por parâmetro; vazio usa a vigente do cadastro */
  curvaPorParametro: Record<string, string>;
}

export const CONFIG_BRUTA_PADRAO: ConfigBruta = {
  ativo: false,
  // Mehlich-1 como o laboratório faz: 10 cm³ de solo em 100 mL.
  preparo: { tomada: 10, unidadeTomada: 'cm3', volumeExtrato: 100, diluicao: 1 },
  curvaPorParametro: {},
};

/**
 * A curva que vale para o parâmetro: a escolhida na tela, senão a
 * ativa mais recente do cadastro. Curva vencida continua aparecendo,
 * com aviso — recusá-la aqui esconderia o motivo de o resultado não
 * sair.
 */
export function curvaDoParametro(
  curvas: Curva[],
  parametroId: string,
  escolhida: string | undefined,
): Curva | undefined {
  if (escolhida) {
    const c = curvas.find((x) => x.id === escolhida);
    if (c) return c;
  }
  return curvas
    .filter((c) => c.ativa && c.parametroId === parametroId)
    .sort((a, b) => +new Date(b.data) - +new Date(a.data))[0];
}

export function PainelLeituraBruta({
  config, aoMudar, parametros,
}: {
  config: ConfigBruta;
  aoMudar: (c: ConfigBruta) => void;
  /** elementos mapeados nas colunas da planilha */
  parametros: Parametro[];
}) {
  const { estado } = useBancada();

  const fator = useMemo(() => {
    const { tomada, volumeExtrato, diluicao = 1, aliquota } = config.preparo;
    if (!(tomada > 0) || !(volumeExtrato > 0) || !(diluicao > 0)) return undefined;
    const fa = aliquota ? (aliquota.final > 0 && aliquota.tomada > 0 ? aliquota.final / aliquota.tomada : NaN) : 1;
    const f = (volumeExtrato / tomada) * diluicao * fa;
    return Number.isFinite(f) ? f : undefined;
  }, [config.preparo]);

  const mudarPreparo = (campo: keyof Preparo, valor: unknown) =>
    aoMudar({ ...config, preparo: { ...config.preparo, [campo]: valor } as Preparo });

  const semCurva = parametros.filter(
    (p) => !curvaDoParametro(estado.curvas, p.id, config.curvaPorParametro[p.id]),
  );

  return (
    <Secao
      titulo="Leitura bruta do aparelho"
      descricao="A planilha traz absorbância ou intensidade, e o sistema converte pela curva e pelo preparo."
      acoes={
        <Switch
          checked={config.ativo}
          onCheckedChange={(ativo) => aoMudar({ ...config, ativo })}
          aria-label="A planilha traz leitura bruta"
        />
      }
    >
      {!config.ativo ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Desligado, cada coluna mapeada é gravada como resultado pronto — que é o caso
          quando o próprio aparelho já aplicou a curva.
        </p>
      ) : (
        <div className="space-y-5">
          {/* --- Preparo --- */}
          <div>
            <p className="label-micro mb-2.5">Preparo da amostra</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="label-micro mb-1.5 block" htmlFor="lb-tomada">Tomada</Label>
                <div className="flex gap-1.5">
                  <Input
                    id="lb-tomada" type="number" step="0.001" min={0}
                    value={config.preparo.tomada}
                    onChange={(e) => mudarPreparo('tomada', Number(e.target.value))}
                    className="num h-9"
                  />
                  <Select
                    value={config.preparo.unidadeTomada}
                    onValueChange={(v) => mudarPreparo('unidadeTomada', v)}
                  >
                    <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="cm3">cm³</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="label-micro mb-1.5 block" htmlFor="lb-volume">Volume do extrato</Label>
                <Input
                  id="lb-volume" type="number" step="0.1" min={0}
                  value={config.preparo.volumeExtrato}
                  onChange={(e) => mudarPreparo('volumeExtrato', Number(e.target.value))}
                  className="num h-9"
                />
              </div>

              <div>
                <Label className="label-micro mb-1.5 block" htmlFor="lb-dil">Diluição</Label>
                <Input
                  id="lb-dil" type="number" step="0.1" min={0}
                  value={config.preparo.diluicao ?? 1}
                  onChange={(e) => mudarPreparo('diluicao', Number(e.target.value))}
                  className="num h-9"
                />
              </div>

              <div>
                <Label className="label-micro mb-1.5 block">Fator resultante</Label>
                <p className="num flex h-9 items-center text-sm font-semibold text-foreground">
                  {fator === undefined ? '—' : `× ${numero(fator, 3)}`}
                </p>
              </div>
            </div>

            <p className="mt-2 text-[0.68rem] leading-relaxed text-muted-foreground">
              {config.preparo.unidadeTomada === 'g'
                ? 'Tomada em grama: o resultado sai em mg/kg.'
                : 'Tomada em cm³: o resultado sai em mg/dm³, como na rotina de solo.'}
            </p>
          </div>

          {/* --- Curvas --- */}
          <div className="border-t border-[hsl(var(--line-soft))] pt-4">
            <p className="label-micro mb-2.5">Curva por elemento</p>
            {parametros.length === 0 ? (
              <p className="text-xs text-muted-foreground">Mapeie as colunas para escolher as curvas.</p>
            ) : (
              <ul className="space-y-2">
                {parametros.map((p) => {
                  const disponiveis = estado.curvas.filter((c) => c.parametroId === p.id);
                  const atual = curvaDoParametro(estado.curvas, p.id, config.curvaPorParametro[p.id]);
                  const vencida = atual ? new Date(atual.validaAte) < new Date() : false;
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-2.5">
                      <span className="num w-24 shrink-0 text-xs text-foreground">{p.codigo}</span>
                      <Select
                        value={atual?.id ?? ''}
                        onValueChange={(v) => aoMudar({
                          ...config,
                          curvaPorParametro: { ...config.curvaPorParametro, [p.id]: v },
                        })}
                      >
                        <SelectTrigger className="h-9 min-w-[16rem] flex-1">
                          <SelectValue placeholder="nenhuma curva cadastrada" />
                        </SelectTrigger>
                        <SelectContent>
                          {disponiveis.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nome} · R² {numero(c.r2, 4)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {atual && (
                        <>
                          <span className="num shrink-0 text-[0.66rem] text-muted-foreground">
                            LQ {numero(atual.loq ?? 0, 3)}
                          </span>
                          {vencida && (
                            <Pilula tom="alerta" className="shrink-0 px-1.5 py-0 text-[0.6rem]">
                              curva vencida
                            </Pilula>
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {semCurva.length > 0 && (
              <p className="mt-2.5 flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-[hsl(var(--warning))]">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Sem curva para {semCurva.map((p) => p.codigo).join(', ')}. Essas colunas não serão
                convertidas — cadastre a curva ou desligue a leitura bruta.
              </p>
            )}
          </div>

          <p className="flex items-start gap-1.5 border-t border-[hsl(var(--line-soft))] pt-3 text-[0.68rem] leading-relaxed text-muted-foreground">
            <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Leitura abaixo do limite de quantificação entra como &lt; LQ e não vira número; acima
            do padrão mais alto da curva, a linha pede diluição em vez de extrapolar.
          </p>
        </div>
      )}
    </Secao>
  );
}
