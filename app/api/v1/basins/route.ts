import { BASINS } from "../../../../lib/basins";
import { getBasinSummaries } from "../../../../lib/water-data";

export async function GET() {
  const summaries = await getBasinSummaries();
  return Response.json({
    generated_at: new Date().toISOString(),
    count: summaries.length,
    basins: summaries.map((summary) => ({
      ...summary,
      capabilities: BASINS.find((basin) => basin.id === summary.id)?.capabilities ?? [],
    })),
  });
}
