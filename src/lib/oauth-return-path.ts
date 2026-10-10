export function oauthReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  // A fixed parsing origin keeps validation independent of the current host.
  const origin = "https://app.invalid";
  try {
    const target = new URL(value, origin);
    if (target.origin !== origin || target.pathname.startsWith("//")) return "/";
    return target.pathname + target.search + target.hash;
  } catch {
    return "/";
  }
}

const PENDING_KEY = "uf_oauth_consent_next";

/** يحفظ مسار شاشة التفويض المعلّق ليعود إليه المستخدم بعد أي طريقة دخول. */
export function savePendingConsent(next: string | null) {
  const path = oauthReturnPath(next);
  try {
    if (path.startsWith("/.lovable/oauth/consent")) sessionStorage.setItem(PENDING_KEY, path);
  } catch { /* storage unavailable */ }
}

/** يسترجع ويمسح مسار التفويض المعلّق إن وُجد. */
export function takePendingConsent(): string | null {
  try {
    const v = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    const path = oauthReturnPath(v);
    return path.startsWith("/.lovable/oauth/consent") ? path : null;
  } catch {
    return null;
  }
}
