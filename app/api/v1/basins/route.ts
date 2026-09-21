import { BASINS } from "../../../../lib/basins";
import { getBasinDetails } from "../../../../lib/water-data";

export async function GET(request: Request) {
  const requestedHorizon = new URL(request.url).searchParams.get("horizon");
  const horizon = requestedHorizon === "6months" ? "6months" : "7days";
  const details = await getBasinDetails(horizon);
  const summaries = details.map((detail) => detail.summary);
  return Response.json({
    generated_at: new Date().toISOString(),
    count: summaries.length,
    basins: summaries.map((summary) => ({
      ...summary,
      capabilities: BASINS.find((basin) => basin.id === summary.id)?.capabilities ?? [],
    })),
    series: Object.fromEntries(details.map((detail) => [detail.summary.id, detail.trend])),
  });
}
