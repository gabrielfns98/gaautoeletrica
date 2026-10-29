/* ============================================================
   BANCADA — entrada do produto
   A Bancada distribuída roda sozinha: as rotas moram na raiz do
   domínio e nada da aplicação hospedeira entra neste pacote.
   ============================================================ */

import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { TooltipProvider } from '@/components/ui/tooltip';
import LimsApp from '@/lims/LimsApp';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <TooltipProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<LimsApp />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>,
);
