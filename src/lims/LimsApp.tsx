/* ============================================================
   BANCADA — rotas do sistema de gestão laboratorial
   Montado em /lab dentro da aplicação existente.
   ============================================================ */

import { Navigate, Route, Routes } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import type { ReactElement } from 'react';

import { Toaster } from '@/components/ui/sonner';

import { BancadaProvider, useBancada } from './data/store';
import Shell from './components/Shell';
import { Secao, Vazio } from './components/primitivos';
import type { Modulo } from './types';

import Painel from './pages/Painel';
import Recepcao from './pages/Recepcao';
import Importacao from './pages/Importacao';
import Amostras from './pages/Amostras';
import EstacaoPh from './pages/ph';
import Resultados from './pages/Resultados';
import Ensaios from './pages/Ensaios';
import Laudos from './pages/Laudos';
import Crm from './pages/Crm';
import Financeiro from './pages/Financeiro';
import Fiscal from './pages/Fiscal';
import Estoque from './pages/Estoque';
import Equipamentos from './pages/Equipamentos';
import Usuarios from './pages/Usuarios';
import Auditoria from './pages/Auditoria';
import Cadastros from './pages/cadastros';
import Configuracoes from './pages/Configuracoes';

/** Bloqueia a rota quando o papel do usuário não enxerga o módulo. */
function Protegido({ modulo, children }: { modulo: Modulo; children: ReactElement }) {
  const { podeVerModulo, papel } = useBancada();
  if (podeVerModulo(modulo)) return children;
  return (
    <Secao>
      <Vazio
        icone={ShieldOff}
        titulo="Módulo indisponível para o seu papel"
        descricao={`O papel “${papel?.nome ?? '—'}” não tem permissão de visualização neste módulo. Troque de operador pelo menu do topo ou peça acesso ao administrador.`}
      />
    </Secao>
  );
}

export default function LimsApp() {
  return (
    <BancadaProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Protegido modulo="dashboard"><Painel /></Protegido>} />
          <Route path="recepcao" element={<Protegido modulo="recepcao"><Recepcao /></Protegido>} />
          <Route path="importacao" element={<Protegido modulo="amostras"><Importacao /></Protegido>} />
          <Route path="amostras" element={<Protegido modulo="amostras"><Amostras /></Protegido>} />
          <Route path="ph" element={<Protegido modulo="ph"><EstacaoPh /></Protegido>} />
          <Route path="resultados" element={<Protegido modulo="analises"><Resultados /></Protegido>} />
          <Route path="ensaios" element={<Protegido modulo="analises"><Ensaios /></Protegido>} />
          <Route path="laudos" element={<Protegido modulo="laudos"><Laudos /></Protegido>} />
          <Route path="crm" element={<Protegido modulo="crm"><Crm /></Protegido>} />
          <Route path="financeiro" element={<Protegido modulo="financeiro"><Financeiro /></Protegido>} />
          <Route path="fiscal" element={<Protegido modulo="fiscal"><Fiscal /></Protegido>} />
          <Route path="estoque" element={<Protegido modulo="estoque"><Estoque /></Protegido>} />
          <Route path="equipamentos" element={<Protegido modulo="equipamentos"><Equipamentos /></Protegido>} />
          <Route path="usuarios" element={<Protegido modulo="usuarios"><Usuarios /></Protegido>} />
          <Route path="auditoria" element={<Protegido modulo="auditoria"><Auditoria /></Protegido>} />
          <Route path="cadastros" element={<Protegido modulo="configuracoes"><Cadastros /></Protegido>} />
          <Route path="configuracoes" element={<Protegido modulo="configuracoes"><Configuracoes /></Protegido>} />
          <Route path="*" element={<Navigate to="/lab" replace />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" richColors closeButton />
    </BancadaProvider>
  );
}
