/**
 * Sanitize a filename for safe storage in Supabase Storage object keys.
 *
 * Storage object keys should be ASCII-safe so HTTP headers (Content-Disposition,
 * signed URLs) don't mangle non-Latin characters. We keep a slugified ASCII
 * version as the storage key while preserving the original (Arabic) name in
 * the database column for display.
 */
export function sanitizeStorageFilename(originalName: string): {
  ascii: string;
  ext: string;
  base: string;
} {
  const lastDot = originalName.lastIndexOf(".");
  const rawBase = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
  const rawExt = lastDot > 0 ? originalName.slice(lastDot + 1) : "";

  // Keep only ASCII letters, digits, dash, underscore, dot in the extension.
  const ext = rawExt.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 10);

  // Replace any non-ASCII or unsafe char in the base with a single dash.
  let asciiBase = rawBase
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  if (!asciiBase) {
    asciiBase = "file";
  }

  const ascii = ext ? `${asciiBase}.${ext}` : asciiBase;
  return { ascii, ext, base: asciiBase };
}

/** RFC 5987-encoded filename for Content-Disposition headers. */
export function encodeFilenameForHeader(name: string): string {
  return encodeURIComponent(name).replace(/['()]/g, escape).replace(/\*/g, "%2A");
}