import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** `escuro` = sobre superfície ink. */
  tom?: "escuro" | "claro";
  className?: string;
}

const Logo = ({ tom = "escuro", className }: LogoProps) => (
  <span className={cn("flex items-center gap-2.5", className)}>
    <img src={logo} alt="" aria-hidden="true" className="h-8 w-8 shrink-0 object-contain" />
    <span className="flex flex-col leading-none">
      <span
        className={cn(
          "font-display text-base font-bold tracking-tight",
          tom === "escuro" ? "text-white" : "text-foreground",
        )}
      >
        G.A Auto Elétrica
      </span>
      <span
        className={cn(
          "text-caption font-normal tracking-normal",
          tom === "escuro" ? "text-white/60" : "text-muted-foreground",
        )}
      >
        Uberaba — MG
      </span>
    </span>
  </span>
);

export default Logo;
