import { Sparkles } from "lucide-react";
import { marquee } from "./content";

export default function Marquee() {
  const items = [...marquee, ...marquee];
  return (
    <div className="hc-marquee" aria-hidden="true">
      <div className="hc-marquee__track">
        {items.map((item, i) => (
          <span className="hc-marquee__item" key={`${item}-${i}`}>
            <Sparkles size={15} /> {item}
          </span>
        ))}
      </div>
    </div>
  );
}
