import { describe, expect, it } from 'vitest';

import { conferirUsuario, usuarioEmBranco } from './FichaUsuario';
import { PAPEIS_PADRAO } from '../../lib/rbac';

const papel = (id: string) => PAPEIS_PADRAO.find((p) => p.id === id)!;
const base = () => ({
  ...usuarioEmBranco('un-01', 'papel-analista'),
  nome: 'Marina Lins', email: 'marina@lab.com.br',
});

describe('conferirUsuario', () => {
  it('analista com habilitação passa', () => {
    expect(conferirUsuario({ ...base(), habilitacoes: ['solo'] }, papel('papel-analista'), [])).toBeUndefined();
  });

  /* Analista sem habilitação entra no sistema e não consegue lançar
     nada: a grade de resultados filtra pelo que ele pode assinar. */
  it('analista sem habilitação é recusado', () => {
    expect(conferirUsuario(base(), papel('papel-analista'), [])).toMatch(/habilitad/);
  });

  it('RT sem registro no conselho é recusado', () => {
    const rt = { ...base(), papelId: 'papel-rt', habilitacoes: ['solo' as const] };
    expect(conferirUsuario(rt, papel('papel-rt'), [])).toMatch(/registro no conselho/);
    expect(conferirUsuario({ ...rt, crq: 'CRQ IV 041' }, papel('papel-rt'), [])).toBeUndefined();
  });

  /* O administrador tem todas as permissões por gerir o sistema. Se
     as regras de bancada valessem para ele, o único usuário de uma
     instalação nova não poderia ser editado. */
  it('administrador não precisa de CRQ nem habilitação', () => {
    const adm = { ...base(), papelId: 'papel-admin' };
    expect(conferirUsuario(adm, papel('papel-admin'), [])).toBeUndefined();
  });

  it('recepção não precisa de habilitação', () => {
    const r = { ...base(), papelId: 'papel-recepcao' };
    expect(conferirUsuario(r, papel('papel-recepcao'), [])).toBeUndefined();
  });

  it('e-mail repetido é recusado, sem diferenciar maiúsculas', () => {
    const outro = { ...base(), id: 'usr-x', nome: 'Outra', email: 'MARINA@lab.com.br' };
    expect(conferirUsuario({ ...base(), habilitacoes: ['solo'] }, papel('papel-analista'), [outro]))
      .toMatch(/já é de Outra/);
  });

  it('editar o próprio usuário não acusa e-mail repetido', () => {
    const u = { ...base(), habilitacoes: ['solo' as const] };
    expect(conferirUsuario(u, papel('papel-analista'), [u])).toBeUndefined();
  });

  it('nome e e-mail são obrigatórios, e o e-mail tem de ser válido', () => {
    expect(conferirUsuario({ ...base(), nome: ' ' }, papel('papel-analista'), [])).toMatch(/nome/);
    expect(conferirUsuario({ ...base(), email: 'marina' }, papel('papel-analista'), [])).toMatch(/válido/);
  });
});
