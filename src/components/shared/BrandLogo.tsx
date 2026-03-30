import { Link } from "react-router-dom";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showSubtitle?: boolean;
  subtitle?: string;
  linkTo?: string;
  className?: string;
  iconOnly?: boolean;
  variant?: "full" | "icon" | "text";
  /** Use on dark backgrounds - makes "Uber" white */
  darkBg?: boolean;
  /** Use animated gif icon */
  animated?: boolean;
  /** Add glow effect to icon */
  glow?: boolean;
}

const sizeMap = {
  sm: { icon: "w-9 h-9", text: "text-lg", subtitle: "text-[9px]", iconImg: "w-7 h-7", gap: "gap-2" },
  md: { icon: "w-11 h-11", text: "text-xl", subtitle: "text-[10px]", iconImg: "w-9 h-9", gap: "gap-2.5" },
  lg: { icon: "w-14 h-14", text: "text-2xl", subtitle: "text-xs", iconImg: "w-12 h-12", gap: "gap-3" },
  xl: { icon: "w-20 h-20", text: "text-4xl", subtitle: "text-sm", iconImg: "w-16 h-16", gap: "gap-4" },
};

export function BrandLogo({
  size = "md",
  showSubtitle = false,
  subtitle,
  linkTo = "/",
  className = "",
  variant = "full",
  darkBg = false,
  animated = false,
  glow = false,
}: BrandLogoProps) {
  const s = sizeMap[size];
  const iconSrc = animated ? "/uf-icon.gif" : "/uf-icon.png";

  const LogoIcon = () => (
    <div
      className={`${s.icon} flex items-center justify-center flex-shrink-0`}
      style={glow ? {
        filter: "drop-shadow(0 0 10px rgba(255,185,0,0.4)) drop-shadow(0 0 20px rgba(255,185,0,0.15))",
      } : undefined}
    >
      <img
        src={iconSrc}
        alt="UberFix"
        className={`${s.iconImg} object-contain`}
      />
    </div>
  );

  const LogoText = () => (
    <div className="min-w-0">
      <span className={`${s.text} font-bold tracking-[0.08em] leading-tight font-['Jozoor',sans-serif]`}>
        <span style={{ color: darkBg ? "#FFFFFF" : "#030957" }}>
          Uber
        </span>
        <span style={{ color: "#FFB900" }}>
          Fix
        </span>
      </span>
      {showSubtitle && subtitle && (
        <p className={`${s.subtitle} font-medium line-clamp-1 ${darkBg ? "text-white/60" : "text-muted-foreground"}`}>
          {subtitle}
        </p>
      )}
    </div>
  );

  const content = (
    <div className={`flex items-center ${s.gap} ${className}`}>
      {variant !== "text" && <LogoIcon />}
      {variant !== "icon" && <LogoText />}
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo} className="flex items-center no-underline">{content}</Link>;
  }

  return content;
}

/** Inline brand text for footers / small references */
export function BrandText({ className = "", darkBg = false }: { className?: string; darkBg?: boolean }) {
  return (
    <span className={`font-['Jozoor',sans-serif] font-bold ${className}`}>
      <span style={{ color: darkBg ? "#FFFFFF" : "#030957" }}>Uber</span>
      <span style={{ color: "#FFB900" }}>Fix</span>
    </span>
  );
}
