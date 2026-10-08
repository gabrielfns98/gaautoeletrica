\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on

-- ---------- fixtures (como superusuário) ----------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111','rt@lab.br'),
  ('22222222-2222-2222-2222-222222222222','analista@lab.br'),
  ('33333333-3333-3333-3333-333333333333','recepcao@lab.br'),
  ('44444444-4444-4444-4444-444444444444','outra-unidade@lab.br');

insert into public.lab_unidades (id, codigo, sigla, nome, cnpj, municipio, uf, responsavel_tecnico)
values ('aaaaaaaa-0000-0000-0000-000000000001','13','LEM/BA','Laboratório Solos & Plantas',
        '18.472.904/0001-55','Luís Eduardo Magalhães','BA','Helena Prado'),
       ('aaaaaaaa-0000-0000-0000-000000000002','07','RVD/MT','Unidade Rio Verde',
        '18.472.904/0002-36','Rondonópolis','MT','Átila Rezende');

insert into public.lab_membros (id, user_id, papel_id, nome, email) values
  ('bbbbbbbb-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
   (select id from public.lab_papeis where nome='Responsável Técnico'),'Helena Prado','rt@lab.br'),
  ('bbbbbbbb-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222',
   (select id from public.lab_papeis where nome='Analista de bancada'),'Juliana Freire','analista@lab.br'),
  ('bbbbbbbb-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333',
   (select id from public.lab_papeis where nome='Recepção de amostras'),'Soraia Castro','recepcao@lab.br'),
  ('bbbbbbbb-0000-0000-0000-000000000004','44444444-4444-4444-4444-444444444444',
   (select id from public.lab_papeis where nome='Responsável Técnico'),'Outro RT','outra@lab.br');

insert into public.lab_membros_unidades (membro_id, unidade_id) values
  ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000002');

insert into public.lab_tabelas_preco (id, nome, desconto)
values ('cccccccc-0000-0000-0000-000000000001','Tabela cheia',0);

insert into public.lab_clientes (id, codigo, nome, documento, municipio, uf, tabela_preco_id)
values ('dddddddd-0000-0000-0000-000000000001','C1040','Fazenda Serra Azul Ltda.',
        '27.391.556/0001-78','Luís Eduardo Magalhães','BA','cccccccc-0000-0000-0000-000000000001');

insert into public.lab_equipamentos (id, tag, nome, tipo, unidade_id, protocolo, baud_rate)
values ('eeeeeeee-0000-0000-0000-000000000001','PHM-01','Potenciômetro Acidez I','phmetro',
        'aaaaaaaa-0000-0000-0000-000000000001','mettler',9600);

insert into public.lab_itens_estoque (id, codigo, nome, classe, unidade_medida, saldo, estoque_minimo)
values ('ffffffff-0000-0000-0000-000000000001','TP-700','Tampão pH 7,00','tampao','L',5.000,8);

\echo '--- T01 recepcao cria lote e amostra (deve passar) ---'
set role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
insert into public.lab_lotes_recepcao (id, numero, cliente_id, unidade_id, quantidade_amostras)
values ('0a000000-0000-0000-0000-000000000001','REC-2025-0900','dddddddd-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001', 1);
insert into public.lab_amostras (id, protocolo, lote_recepcao_id, cliente_id, grupo_id, unidade_id,
                                 identificacao_campo, prazo_entrega)
values ('0b000000-0000-0000-0000-000000000001','25.014532','0a000000-0000-0000-0000-000000000001',
        'dddddddd-0000-0000-0000-000000000001','solo','aaaaaaaa-0000-0000-0000-000000000001',
        'Serra Azul / T-01', now() + interval '7 days');
\echo 'T01 OK'
reset role;

\echo '--- T02 analista NAO pode criar amostra (deve falhar) ---'
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
savepoint s2;
do $$ begin
  insert into public.lab_amostras (protocolo, lote_recepcao_id, cliente_id, grupo_id, unidade_id,
                                   identificacao_campo, prazo_entrega)
  values ('25.099999','0a000000-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000001',
          'solo','aaaaaaaa-0000-0000-0000-000000000001','proibido', now());
  raise exception 'FALHOU: analista conseguiu criar amostra';
exception when insufficient_privilege then
  raise notice 'T02 OK — RLS bloqueou insert de amostra pelo analista';
end $$;
rollback to savepoint s2;
reset role;

\echo '--- T03 analista cria ensaio e leitura ---'
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
insert into public.lab_ensaios (id, amostra_id, parametro_id, status, analista_id)
values ('0c000000-0000-0000-0000-000000000001','0b000000-0000-0000-0000-000000000001',
        (select id from public.lab_parametros where codigo='PH-H2O'),'em-bancada',
        'bbbbbbbb-0000-0000-0000-000000000002');
\echo 'T03 OK'
reset role;

\echo '--- T04 leitura com calibracao REPROVADA deve falhar ---'
insert into public.lab_calibracoes (id, equipamento_id, data, pontos, slope_percentual,
                                    slope_mv_por_ph, offset_mv, r2, status, valida_ate)
values ('0d000000-0000-0000-0000-00000000bad1','eeeeeeee-0000-0000-0000-000000000001', now(),
        '[{"tampao":4.01,"mV":180},{"tampao":7.00,"mV":35}]'::jsonb,
        92.0, 54.4, 35.0, 0.9998, 'reprovada', now() + interval '12 hours');
do $$ begin
  insert into public.lab_leituras_ph (ensaio_id, amostra_id, parametro_id, equipamento_id,
    calibracao_id, origem, mv, temperatura, ph_bruto, ph_corrigido, extrator)
  values ('0c000000-0000-0000-0000-000000000001','0b000000-0000-0000-0000-000000000001',
          (select id from public.lab_parametros where codigo='PH-H2O'),
          'eeeeeeee-0000-0000-0000-000000000001','0d000000-0000-0000-0000-00000000bad1',
          'instrumento', 93.1, 24.8, 5.42, 5.44, 'H2O');
  raise exception 'FALHOU: aceitou leitura com calibracao reprovada';
exception when others then
  if sqlerrm like '%reprovada%' then raise notice 'T04 OK — %', sqlerrm;
  else raise; end if;
end $$;

\echo '--- T05 leitura com calibracao VALIDA passa; vencida falha ---'
insert into public.lab_calibracoes (id, equipamento_id, data, pontos, slope_percentual,
                                    slope_mv_por_ph, offset_mv, r2, status, valida_ate)
values ('0d000000-0000-0000-0000-000000000001','eeeeeeee-0000-0000-0000-000000000001', now(),
        '[{"tampao":4.01,"mV":176.8},{"tampao":7.00,"mV":-2.4},{"tampao":10.01,"mV":-180.2}]'::jsonb,
        99.1, 58.63, -2.4, 0.99998, 'valida', now() + interval '12 hours');
insert into public.lab_leituras_ph (id, ensaio_id, amostra_id, parametro_id, equipamento_id,
  calibracao_id, analista_id, origem, mv, temperatura, ph_bruto, ph_corrigido, extrator,
  estavel, tempo_estabilizacao_s, deriva_mv_por_min)
values ('0e000000-0000-0000-0000-000000000001','0c000000-0000-0000-0000-000000000001',
        '0b000000-0000-0000-0000-000000000001',
        (select id from public.lab_parametros where codigo='PH-H2O'),
        'eeeeeeee-0000-0000-0000-000000000001','0d000000-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000002','instrumento', 93.1, 24.8, 5.42, 5.44, 'H2O',
        true, 23, 0.18);
do $$ begin
  insert into public.lab_leituras_ph (ensaio_id, amostra_id, parametro_id, equipamento_id,
    calibracao_id, origem, mv, temperatura, ph_bruto, ph_corrigido, extrator, data_hora)
  values ('0c000000-0000-0000-0000-000000000001','0b000000-0000-0000-0000-000000000001',
          (select id from public.lab_parametros where codigo='PH-H2O'),
          'eeeeeeee-0000-0000-0000-000000000001','0d000000-0000-0000-0000-000000000001',
          'manual', 93.1, 24.8, 5.42, 5.44, 'H2O', now() + interval '2 days');
  raise exception 'FALHOU: aceitou leitura fora da validade';
exception when others then
  if sqlerrm like '%vencida%' then raise notice 'T05 OK — %', sqlerrm;
  else raise; end if;
end $$;

\echo '--- T06 pH fora de 0..14 recusado ---'
do $$ begin
  insert into public.lab_leituras_ph (ensaio_id, amostra_id, parametro_id, equipamento_id,
    calibracao_id, origem, mv, temperatura, ph_bruto, ph_corrigido, extrator)
  values ('0c000000-0000-0000-0000-000000000001','0b000000-0000-0000-0000-000000000001',
          (select id from public.lab_parametros where codigo='PH-H2O'),
          'eeeeeeee-0000-0000-0000-000000000001','0d000000-0000-0000-0000-000000000001',
          'manual', 93.1, 24.8, 15.2, 15.2, 'H2O');
  raise exception 'FALHOU: aceitou pH 15,2';
exception when check_violation then raise notice 'T06 OK — check de faixa de pH barrou';
end $$;

update public.lab_ensaios set status='lido', leitura_ph_id='0e000000-0000-0000-0000-000000000001',
  valor=5.44, data_leitura=now() where id='0c000000-0000-0000-0000-000000000001';

\echo '--- T07 segregacao de funcoes: analista nao aprova o proprio ensaio ---'
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
savepoint s7;
do $$ begin
  update public.lab_ensaios
     set status='aprovado', revisor_id='bbbbbbbb-0000-0000-0000-000000000002'
   where id='0c000000-0000-0000-0000-000000000001';
  raise exception 'FALHOU: analista aprovou o proprio resultado';
exception
  when check_violation then raise notice 'T07 OK — constraint de segregacao barrou';
  when insufficient_privilege then raise notice 'T07 OK — RLS barrou (analista nao tem analises:aprovar)';
  when others then
    if sqlerrm like '%Segregação%' then raise notice 'T07 OK — %', sqlerrm; else raise; end if;
end $$;
rollback to savepoint s7;
reset role;

\echo '--- T08 RT aprova (deve passar) ---'
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
update public.lab_ensaios
   set status='aprovado', revisor_id='bbbbbbbb-0000-0000-0000-000000000001'
 where id='0c000000-0000-0000-0000-000000000001';
select 'T08 OK — aprovado em ' || to_char(data_aprovacao,'HH24:MI:SS')
from public.lab_ensaios where id='0c000000-0000-0000-0000-000000000001';
reset role;

\echo '--- T09 auditoria automatica registrou a transicao ---'
select 'T09 ' || case when count(*) >= 1 then 'OK' else 'FALHOU' end ||
       ' — ' || count(*) || ' registro(s) de auditoria em lab_ensaios'
from public.lab_auditoria where entidade='lab_ensaios';

\echo '--- T10 escopo por unidade: RT de outra unidade nao enxerga a amostra ---'
set role authenticated;
select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444',false);
select 'T10 ' || case when count(*) = 0 then 'OK' else 'FALHOU' end ||
       ' — amostras visiveis para a outra unidade: ' || count(*)
from public.lab_amostras;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select 'T10b ' || case when count(*) = 1 then 'OK' else 'FALHOU' end ||
       ' — amostras visiveis para o RT da unidade: ' || count(*)
from public.lab_amostras;
reset role;

\echo '--- T11 estoque: saida maior que o saldo e recusada ---'
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
savepoint s11;
do $$ begin
  insert into public.lab_movimentos_estoque (item_id, tipo, quantidade, motivo)
  values ('ffffffff-0000-0000-0000-000000000001','saida', 99, 'estouro');
  raise exception 'FALHOU: permitiu saida acima do saldo';
exception when others then
  if sqlerrm like '%Saldo insuficiente%' then raise notice 'T11 OK — %', sqlerrm; else raise; end if;
end $$;
rollback to savepoint s11;

insert into public.lab_movimentos_estoque (item_id, tipo, quantidade, motivo)
values ('ffffffff-0000-0000-0000-000000000001','saida', 1.5, 'consumo na bancada');
select 'T12 ' || case when saldo = 3.5 then 'OK' else 'FALHOU' end ||
       ' — saldo apos saida: ' || saldo
from public.lab_itens_estoque where id='ffffffff-0000-0000-0000-000000000001';
reset role;

\echo '--- T13 papel so aceita permissao do vocabulario ---'
do $$ begin
  insert into public.lab_papeis (nome, permissoes) values ('Inventado', array['nao-existe:ver']);
  raise exception 'FALHOU: aceitou permissao invalida';
exception when check_violation then raise notice 'T13 OK — vocabulario de permissoes respeitado';
end $$;

\echo '--- T14 nota autorizada exige protocolo ---'
do $$ begin
  insert into public.lab_notas_fiscais (numero, cliente_id, competencia, status, codigo_servico,
    discriminacao, valor_servicos, base_calculo, aliquota_iss, valor_liquido)
  values ('9001','dddddddd-0000-0000-0000-000000000001','2025-10','autorizada','17.09',
          'Análises', 1000, 1000, 3, 948.5);
  raise exception 'FALHOU: autorizou nota sem protocolo';
exception when check_violation then raise notice 'T14 OK — nota autorizada exige protocolo';
end $$;

\echo ''
\echo '================ TODOS OS TESTES DE RLS/REGRAS PASSARAM ================'
