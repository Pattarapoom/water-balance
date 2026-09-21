import { BASINS } from "../../../../lib/basins";

type SourceRow = Record<string, unknown>;

async function json<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Upstream ${response.status}`);
  return response.json() as Promise<T>;
}

function parseThaiDate(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(year, month - 1, day).getTime();
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const horizon = query.get("horizon") === "6months" ? "6months" : "7days";
  const model = horizon === "6months" ? "6months" : "weekly";
  const codes = new Set((query.get("codes") ?? "").split(",").filter(Boolean));
  const requestedBasins = new Set((query.get("basins") ?? "").split(",").filter(Boolean));
  const sources = BASINS.filter((basin) => basin.adapter === "legacy-chimun" && (!requestedBasins.size || requestedBasins.has(basin.id)));
  if (!codes.size) return Response.json({ rows: [], count: 0, unavailableBasins: [] });

  const settled = await Promise.all(sources.map(async (basin) => {
    try {
      const latest = await json<{ datesims?: { datesim: string }[] }>(`${basin.apiBase}/forecast/lastsimulate/mv_mainbasin_forecast_${model}`);
      const simulationDate = latest.datesims?.[0]?.datesim;
      if (!simulationDate) throw new Error("No forecast date");
      const sourceRows = await json<SourceRow[]>(`${basin.apiBase}/mv-province-forecast-${model}/${simulationDate}`);
      const dailyRows = sourceRows.filter((row) => typeof row.dateforecast === "string" && !row.dateforecast.includes("-"));
      const forecastRows = horizon === "6months" ? sourceRows : dailyRows.filter((row) => String(row.dateforecast) === dailyRows.map((item) => String(item.dateforecast)).sort((a, b) => parseThaiDate(b) - parseThaiDate(a))[0]);
      const rows = forecastRows
        .filter((row) => codes.has(String(row.prov_code ?? "")))
        .map((row) => ({
          id: `${basin.id}-${String(row.prov_code ?? "")}`,
          provinceCode: String(row.prov_code ?? ""),
          provinceName: String(row.prov_nam_t ?? "").replace(/^จ\./, ""),
          basinId: basin.id,
          basinName: basin.nameTh,
          date: String(row.dateforecast ?? ""),
          rainfall: row.rainfall == null ? null : Number(row.rainfall),
          supply: Number(row.watersupply ?? 0),
          demand: Number(row.waterdemand ?? 0),
          balance: Number(row.waterbalance ?? 0),
          reservoir: Number(row.reservoir ?? 0),
          droughtIndex: Number(row.droughtindex ?? 0),
          runoffIndex: Number(row.runoffindex ?? 0),
        }));
      return { rows, unavailable: null };
    } catch {
      return { rows: [], unavailable: basin.nameTh };
    }
  }));

  const rows = settled.flatMap((result) => result.rows);
  return Response.json({ rows, count: rows.length, unavailableBasins: settled.flatMap((result) => result.unavailable ? [result.unavailable] : []) });
}
