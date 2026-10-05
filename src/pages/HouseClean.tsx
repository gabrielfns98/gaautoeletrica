import { useEffect } from "react";
import { MessageCircle } from "lucide-react";
import "@/styles/clean.css";

import CleanNav from "@/components/clean/CleanNav";
import FilmRooms from "@/components/clean/FilmRooms";
import Finale from "@/components/clean/Finale";
import { Services, Process, Plans, Testimonials, Faq } from "@/components/clean/Sections";
import Contact from "@/components/clean/Contact";
import CleanFooter from "@/components/clean/CleanFooter";
import { brand, waLink } from "@/components/clean/content";

const TITLE = `${brand.name} — limpeza profissional que você sente na porta`;
const DESC =
  "Limpeza residencial e corporativa com equipe verificada, checklist de 42 itens e garantia de 48 horas. Orçamento em 5 minutos pelo WhatsApp.";

export default function HouseClean() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = TITLE;

    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute("content") ?? null;
    meta?.setAttribute("content", DESC);

    const root = document.documentElement;
    const prevBehavior = root.style.scrollBehavior;
    const prevPadding = root.style.scrollPaddingTop;
    root.style.scrollBehavior = "smooth";
    root.style.scrollPaddingTop = "5.5rem";

    return () => {
      document.title = prevTitle;
      if (meta && prevDesc !== null) meta.setAttribute("content", prevDesc);
      root.style.scrollBehavior = prevBehavior;
      root.style.scrollPaddingTop = prevPadding;
    };
  }, []);

  return (
    <div className="hc">
      <CleanNav />

      <main>
        <span id="topo" />
        <FilmRooms />
        <Finale />
        <Services />
        <Process />
        <Plans />
        <Testimonials />
        <Faq />
        <Contact />
      </main>

      <CleanFooter />

      <a
        className="hc-fab"
        href={waLink(`Oi, ${brand.name}! Quero um orçamento de limpeza.`)}
        target="_blank"
        rel="noreferrer"
        aria-label="Falar no WhatsApp"
      >
        <MessageCircle size={16} /> <span>WhatsApp</span>
      </a>
    </div>
  );
}
