import { Link } from "react-router-dom";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showSubtitle?: boolean;
  subtitle?: string;
  linkTo?: string;
  className?: string;
  iconOnly?: boolean;
  variant?: "full" | "icon" | "text";
}

const sizeMap = {
  sm: { icon: "w-8 h-8", uber: "text-base", fix: "text-base", subtitle: "text-[9px]", iconImg: "w-6 h-6" },
  md: { icon: "w-10 h-10", uber: "text-lg", fix: "text-lg", subtitle: "text-[10px]", iconImg: "w-8 h-8" },
  lg: { icon: "w-12 h-12", uber: "text-xl", fix: "text-xl", subtitle: "text-xs", iconImg: "w-10 h-10" },
  xl: { icon: "w-16 h-16", uber: "text-3xl", fix: "text-3xl", subtitle: "text-sm", iconImg: "w-14 h-14" },
};

export function BrandLogo({
  size = "md",
  showSubtitle = false,
  subtitle,
  linkTo = "/",
  className = "",
  variant = "full",
}: BrandLogoProps) {
  const s = sizeMap[size];

  const LogoIcon = () => (
    <div className={`${s.icon} rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md`}>
      <img
        src="/uf-icon.png"
        alt="UberFix"
        className={`${s.iconImg} object-contain`}
      />
    </div>
  );

  const LogoText = () => (
    <div className="min-w-0">
      <h1 className={`font-bold tracking-tight leading-tight`}>
        <span className={`${s.uber} font-['Jozoor',sans-serif]`} style={{ color: "#030957" }}>
          Uber
        </span>
        <span className={`${s.fix} font-['Jozoor',sans-serif]`} style={{ color: "#FFB900" }}>
          Fix
        </span>
      </h1>
      {showSubtitle && subtitle && (
        <p className={`${s.subtitle} text-muted-foreground font-medium line-clamp-1`}>
          {subtitle}
        </p>
      )}
    </div>
  );

  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      {variant !== "text" && <LogoIcon />}
      {variant !== "icon" && <LogoText />}
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo} className="flex items-center gap-2 no-underline">{content}</Link>;
  }

  return content;
}

/** Inline brand text for footers / small references */
export function BrandText({ className = "" }: { className?: string }) {
  return (
    <span className={`font-['Jozoor',sans-serif] font-bold ${className}`}>
      <span style={{ color: "#030957" }}>Uber</span>
      <span style={{ color: "#FFB900" }}>Fix</span>
    </span>
  );
}
