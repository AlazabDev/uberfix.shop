import { Link } from "react-router-dom";

interface AppFooterProps {
  className?: string;
  variant?: "simple" | "full";
}

export function AppFooter({ className = "", variant = "simple" }: AppFooterProps) {
  if (variant === "simple") {
    return (
      <footer className={`mt-8 py-4 text-center text-xs text-muted-foreground border-t ${className}`}>
        <div className="space-x-4 space-x-reverse">
          <Link to="/user-guide" className="hover:text-primary transition-colors">دليل المستخدم</Link>
          <span>•</span>
          <Link to="/terms-of-service" className="hover:text-primary transition-colors">شروط الاستخدام</Link>
          <span>•</span>
          <Link to="/privacy-policy" className="hover:text-primary transition-colors">سياسة الخصوصية</Link>
          <span>•</span>
          <Link to="/data-deletion" className="hover:text-primary transition-colors">حذف البيانات</Link>
        </div>
        <div className="mt-2">
          جميع الحقوق محفوظة © 2025 UberFix
        </div>
      </footer>
    );
  }

  return null;
}
