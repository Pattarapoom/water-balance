import { getBasinDetail } from "../../../../../lib/water-data";

export async function GET(_request: Request, { params }: { params: Promise<{ basin: string }> }) {
  const { basin } = await params;
  const horizon = new URL(_request.url).searchParams.get("horizon") === "6months" ? "6months" : "7days";
  const detail = await getBasinDetail(basin, horizon);
  if (!detail) return Response.json({ error: "Basin not found" }, { status: 404 });
  return Response.json({ generated_at: new Date().toISOString(), ...detail });
}
