import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import CursoNatal from "./pages/CursoNatal";

/** Site independente do curso (build com `--mode curso`): só a página do treinamento. */
const CursoApp = () => (
  <BrowserRouter>
    <Toaster />
    <Routes>
      <Route path="/" element={<CursoNatal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default CursoApp;
