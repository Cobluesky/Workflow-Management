import { getAppMetricsRegistry } from "@/lib/metrics/app";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const registry = getAppMetricsRegistry();

  return new Response(await registry.metrics(), {
    status: 200,
    headers: {
      "Content-Type": registry.contentType,
      "Cache-Control": "no-store",
    },
  });
}
