import { Navigate, useLocation } from "react-router-dom";

/** /register و /role-selection أصبحا جزءًا من الوجهة الواحدة /login?mode=signup */
export default function LegacyAuthRedirect() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set("mode", "signup");
  return <Navigate to={`/login?${params.toString()}`} replace />;
}
