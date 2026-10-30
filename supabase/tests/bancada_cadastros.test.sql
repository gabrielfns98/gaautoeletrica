\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on

-- ---------- fixtures (como superusuário) ----------
insert into auth.users (id, email) values
  ('55555555-5555-5555-5555-555555555555','config@lab.br'),
  ('66666666-6666-6666-6666-666666666666','bancada@lab.br');

insert into public.lab_unidades (id, codigo, sigla, nome, cnpj, municipio, uf, responsavel_tecnico)
values ('cccccccc-0000-0000-0000-000000000001','99','TST/BA','Unidade de teste',
        '18.472.904/0099-00','Luís Eduardo Magalhães','BA','RT de teste');

insert into public.lab_membros (id, user_id, papel_id, nome, email) values
  ('eeeeeeee-0000-0000-0000-000000000001','55555555-5555-5555-5555-555555555555',
   (select id from public.lab_papeis where nome='Administrador'),'Config','config@lab.br'),
  ('eeeeeeee-0000-0000-0000-000000000002','66666666-6666-6666-6666-666666666666',
   (select id from public.lab_papeis where nome='Analista de bancada'),'Analista','bancada@lab.br');

insert into public.lab_membros_unidades (membro_id, unidade_id) values
  ('eeeeeeee-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001'),
  ('eeeeeeee-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000001');

insert into public.lab_grupos_analise (id, nome, abreviacao) values ('teste','Teste','TST');

insert into public.lab_parametros (id, codigo, nome, grupo_id, metodo) values
  ('ffffffff-0000-0000-0000-000000000001','TST-P','Parâmetro de teste','teste','método de teste');

\echo '--- C01 administrador cria pacote, curva e legenda ---'
set role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-5555-5555-555555555555',false);
insert into public.lab_tipos_analise (id, codigo, nome, grupo_id, prazo_dias)
values ('11110000-0000-0000-0000-000000000001','TST GP','Pacote de teste','teste',5);
insert into public.lab_tipos_analise_parametros (tipo_id, parametro_id, ordem)
values ('11110000-0000-0000-0000-000000000001','ffffffff-0000-0000-0000-000000000001',1);
insert into public.lab_curvas (id, codigo, nome, parametro_id, pontos, coef_angular, coef_linear, r2, valida_ate)
values ('22220000-0000-0000-0000-000000000001','CV-01','Curva de teste',
        'ffffffff-0000-0000-0000-000000000001',
        '[{"concentracao":0,"leitura":0.001},{"concentracao":10,"leitura":0.512}]',
        0.0511, 0.0009, 0.9993, now() + interval '30 days');
insert into public.lab_legendas (id, codigo, nome, parametro_id, fonte, faixas, padrao)
values ('33330000-0000-0000-0000-000000000001','LG-01','Legenda de teste',
        'ffffffff-0000-0000-0000-000000000001','CFSEMG',
        '[{"ate":2,"rotulo":"baixo","severidade":"baixo"},{"de":2,"rotulo":"bom","severidade":"adequado"}]', true);
do $$ begin raise notice 'C01 OK — cadastros criados pelo administrador'; end $$;
reset role;

\echo '--- C02 analista LE a curva e a legenda sem ter configuracoes ---'
set role authenticated;
select set_config('request.jwt.claim.sub','66666666-6666-6666-6666-666666666666',false);
do $$
declare curvas int; legendas int; pacotes int;
begin
  select count(*) into curvas from public.lab_curvas;
  select count(*) into legendas from public.lab_legendas;
  select count(*) into pacotes from public.lab_tipos_analise;
  if curvas <> 1 or legendas <> 1 or pacotes <> 1 then
    raise exception 'FALHOU: analista não enxergou os cadastros (% curvas, % legendas, % pacotes)',
      curvas, legendas, pacotes;
  end if;
  raise notice 'C02 OK — analista lê curva, legenda e pacote';
end $$;
reset role;

\echo '--- C03 analista NAO escreve cadastro (deve falhar) ---'
set role authenticated;
select set_config('request.jwt.claim.sub','66666666-6666-6666-6666-666666666666',false);
savepoint c3;
do $$ begin
  insert into public.lab_legendas (codigo, nome, parametro_id, fonte, faixas)
  values ('LG-99','Proibida','ffffffff-0000-0000-0000-000000000001','x',
          '[{"rotulo":"x","severidade":"adequado"}]');
  raise exception 'FALHOU: analista conseguiu criar legenda';
exception when insufficient_privilege then
  raise notice 'C03 OK — RLS bloqueou escrita de cadastro pelo analista';
end $$;
rollback to savepoint c3;
reset role;

\echo '--- C04 so uma legenda padrao por parametro e cultura ---'
set role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-5555-5555-555555555555',false);
savepoint c4;
do $$ begin
  insert into public.lab_legendas (codigo, nome, parametro_id, fonte, faixas, padrao)
  values ('LG-02','Segunda padrão','ffffffff-0000-0000-0000-000000000001','CFSEMG',
          '[{"rotulo":"x","severidade":"adequado"}]', true);
  raise exception 'FALHOU: aceitou duas legendas padrão para o mesmo parâmetro';
exception when unique_violation then
  raise notice 'C04 OK — uma legenda padrão por parâmetro e cultura';
end $$;
rollback to savepoint c4;
reset role;

\echo '--- C05 curva com menos de dois pontos e recusada ---'
set role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-5555-5555-555555555555',false);
savepoint c5;
do $$ begin
  insert into public.lab_curvas (codigo, nome, parametro_id, pontos, coef_angular, r2, valida_ate)
  values ('CV-02','Curva curta','ffffffff-0000-0000-0000-000000000001',
          '[{"concentracao":1,"leitura":0.05}]', 0.05, 0.99, now() + interval '1 day');
  raise exception 'FALHOU: aceitou curva com um ponto só';
exception when check_violation then
  raise notice 'C05 OK — curva exige pelo menos dois pontos';
end $$;
rollback to savepoint c5;
reset role;

\echo '--- C06 amostra registra o pacote contratado ---'
set role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-5555-5555-555555555555',false);
insert into public.lab_clientes (id, codigo, nome, documento, municipio, uf)
values ('44440000-0000-0000-0000-000000000001','C-99','Cliente de teste','00.000.000/0001-00','LEM','BA');
insert into public.lab_lotes_recepcao (id, numero, cliente_id, unidade_id, quantidade_amostras)
values ('55550000-0000-0000-0000-000000000001','REC-TST-01','44440000-0000-0000-0000-000000000001',
        'cccccccc-0000-0000-0000-000000000001', 1);
insert into public.lab_amostras (protocolo, lote_recepcao_id, cliente_id, grupo_id, unidade_id,
                                 identificacao_campo, prazo_entrega, tipo_analise_id)
values ('99.000001','55550000-0000-0000-0000-000000000001','44440000-0000-0000-0000-000000000001',
        'teste','cccccccc-0000-0000-0000-000000000001','Ponto de teste',
        now() + interval '5 days','11110000-0000-0000-0000-000000000001');
do $$
declare achou int;
begin
  select count(*) into achou from public.lab_amostras
  where protocolo = '99.000001' and tipo_analise_id = '11110000-0000-0000-0000-000000000001';
  if achou <> 1 then raise exception 'FALHOU: amostra não guardou o pacote'; end if;
  raise notice 'C06 OK — amostra guarda o tipo de análise contratado';
end $$;
reset role;

\echo ''
\echo '============ TODOS OS TESTES DE CADASTROS PASSARAM ============'
