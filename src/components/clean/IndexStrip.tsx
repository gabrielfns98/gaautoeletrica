import { indexStrip } from "./content";
import { Fade } from "./fx";

export default function IndexStrip() {
  return (
    <section className="hc-index">
      <div className="hc-shell">
        <div className="hc-index__row">
          {indexStrip.map((item, i) => (
            <Fade key={item.label} delay={i * 90} className="hc-index__cell">
              <span className="hc-label">{item.label}</span>
              <b>{item.value}</b>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}
