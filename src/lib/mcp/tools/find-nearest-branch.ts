import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { anonClient, errorResult, textResult } from "../supabase";

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default defineTool({
  name: "find_nearest_branch",
  title: "Find nearest branch",
  description: "إرجاع أقرب فرع UberFix لإحداثيات العميل.",
  inputSchema: {
    lat: z.number().describe("خط العرض."),
    lng: z.number().describe("خط الطول."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ lat, lng }) => {
    const { data, error } = await anonClient()
      .from("branches")
      .select("id, code, name, city, address, phone, latitude, longitude")
      .eq("is_active", true)
      .not("latitude", "is", null)
      .not("longitude", "is", null);
    if (error) return errorResult(error.message);
    const withDist = (data ?? [])
      .map((b: any) => ({ ...b, distance_km: haversineKm({ lat, lng }, { lat: Number(b.latitude), lng: Number(b.longitude) }) }))
      .sort((a, b) => a.distance_km - b.distance_km);
    return textResult({ nearest: withDist[0] ?? null, top5: withDist.slice(0, 5) });
  },
});