import { registerSW } from "virtual:pwa-register";

const RECOVERY_THROTTLE_KEY = "__uf_runtime_recovery__";
const RECOVERY_THROTTLE_MS = 15000;
const RECOVERABLE_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /ChunkLoadError/i,
  /Loading chunk [\d]+ failed/i,
  /Unable to preload CSS/i,
];

const getErrorMessage = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value instanceof Error) return `${value.name}: ${value.message}`;

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return [record.name, record.message, record.reason]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" ");
  }

  return "";
};

const isRecoverableRuntimeError = (value: unknown) => {
  const message = getErrorMessage(value);
  return RECOVERABLE_PATTERNS.some((pattern) => pattern.test(message));
};

const shouldThrottleRecovery = () => {
  if (typeof window === "undefined") return true;

  const lastAttempt = Number(window.sessionStorage.getItem(RECOVERY_THROTTLE_KEY) ?? 0);
  const now = Date.now();

  if (now - lastAttempt < RECOVERY_THROTTLE_MS) {
    return true;
  }

  window.sessionStorage.setItem(RECOVERY_THROTTLE_KEY, String(now));
  return false;
};

const cleanupLegacyServiceWorkers = async () => {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map(async (registration) => {
      await registration.update().catch(() => undefined);

      const scriptUrl =
        registration.active?.scriptURL ||
        registration.waiting?.scriptURL ||
        registration.installing?.scriptURL ||
        "";

      if (!scriptUrl) return;

      const pathname = new URL(scriptUrl, window.location.origin).pathname;
      if (pathname.endsWith("/service-worker.js")) {
        await registration.unregister().catch(() => undefined);
      }
    }),
  );
};

const clearStaleCaches = async () => {
  if (!("caches" in window)) return;

  const cacheKeys = await caches.keys();
  const staleKeys = cacheKeys.filter(
    (key) =>
      key.includes("workbox") ||
      key.includes("precache") ||
      key.includes("vite") ||
      key.includes("uberfix"),
  );

  await Promise.all(staleKeys.map((key) => caches.delete(key).catch(() => false)));
};

const recoverApplication = async () => {
  if (shouldThrottleRecovery()) return;

  try {
    await cleanupLegacyServiceWorkers();
    await clearStaleCaches();
  } finally {
    window.location.reload();
  }
};

export const setupAppRecovery = () => {
  if (typeof window === "undefined") return;

  if (import.meta.env.PROD) {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        void updateSW(true);
      },
    });

    void cleanupLegacyServiceWorkers();
  }

  window.addEventListener("error", (event) => {
    if (isRecoverableRuntimeError(event.error || event.message)) {
      void recoverApplication();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (!isRecoverableRuntimeError(event.reason)) return;

    event.preventDefault();
    void recoverApplication();
  });
};