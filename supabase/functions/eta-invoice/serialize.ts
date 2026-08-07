// ETA (Egyptian Tax Authority) canonical serialization for e-invoice signing.
// Reference: ETA e-invoicing SDK "Serialization" specification.

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

function quote(v: string): string {
  return `"${v}"`;
}

export function serializeDocument(obj: Record<string, Json>): string {
  let out = "";
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const name = key.toUpperCase();
    if (Array.isArray(value)) {
      out += quote(name);
      for (const item of value) {
        out += quote(name);
        out += serializeDocument(item as Record<string, Json>);
      }
    } else if (typeof value === "object") {
      out += quote(name);
      out += serializeDocument(value as Record<string, Json>);
    } else {
      out += quote(name);
      out += quote(String(value));
    }
  }
  return out;
}