import { BASINS, type BasinConfig, getBasinConfig } from "./basins";

export type BasinSummary = {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  date: string;
  rainfall: number | null;
  supply: number;
  demand: number;
  reservoir: number;
  balance: number;
  droughtIndex: number;
  runoffIndex: number;
  status: "สมดุลดี" | "เฝ้าระวัง" | "ขาดสมดุล";
  sourceStatus: "live" | "fallback";
  sourceUrl: string;
};

export type TrendPoint = { date: string; rainfall: number | null; balance: number };
export type SubArea = { id: string; name: string; rainfall: number | null; supply: number; demand: number; balance: number };
export type BasinDetail = { summary: BasinSummary; trend: TrendPoint[]; subareas: SubArea[] };

const FALLBACK: Record<string, BasinDetail> = {
  ping: {
    summary: { id: "ping", code: "06", name: "ปิง", nameEn: "Ping", date: "2026-09-14", rainfall: 13.2, supply: 2982.55, demand: 87.99, reservoir: 5300.79, balance: 2894.56, droughtIndex: 0, runoffIndex: 0, status: "สมดุลดี", sourceStatus: "fallback", sourceUrl: "http://43.211.16.217/forecast/ping" },
    trend: [{ date: "14 ก.ย.", rainfall: 13.2, balance: 2894.56 }],
    subareas: [
      { id: "0601", name: "แม่น้ำปิงตอนบนส่วนที่ 1", rainfall: 8.9, supply: 23.91, demand: 4.81, balance: 19.1 },
      { id: "0604", name: "แม่น้ำแม่แตง", rainfall: 14.05, supply: 61.6, demand: 9.04, balance: 52.56 },
      { id: "0627", name: "คลองแม่ระกา", rainfall: 9.32, supply: 3.77, demand: 3.98, balance: -0.21 },
    ],
  },
  chi: {
    summary: { id: "chi", code: "04", name: "ชี", nameEn: "Chi", date: "2026-09-20", rainfall: 8.44, supply: 57.34, demand: 6.57, reservoir: 86.03, balance: 50.77, droughtIndex: 0, runoffIndex: 3, status: "เฝ้าระวัง", sourceStatus: "fallback", sourceUrl: "https://wb-chi.hii.or.th/public/forecast" },
    trend: [30.53, 68.01, 48.25, 39.31, 44.71, 60.01, 50.77].map((balance, i) => ({ date: `${14 + i} ก.ย.`, rainfall: [14.94, 35.91, 10.15, 5.93, 16.63, 21.42, 8.44][i], balance })),
    subareas: [],
  },
  mun: {
    summary: { id: "mun", code: "05", name: "มูล", nameEn: "Mun", date: "2026-09-20", rainfall: 10.17, supply: 534.67, demand: 9.36, reservoir: 57.77, balance: 525.31, droughtIndex: 0, runoffIndex: 3, status: "สมดุลดี", sourceStatus: "fallback", sourceUrl: "https://wb-mun.hii.or.th/public/forecast" },
    trend: [469.69, 484.1, 492.06, 493.37, 501.26, 555.95, 525.31].map((balance, i) => ({ date: `${14 + i} ก.ย.`, rainfall: [10.39, 8.33, 11.64, 6.73, 18.47, 25.7, 10.17][i], balance })),
    subareas: [],
  },
};

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusFor(balance: number, rainfall: number | null): BasinSummary["status"] {
  if (balance < 0) return "ขาดสมดุล";
  if (rainfall !== null && rainfall < 10) return "เฝ้าระวัง";
  return "สมดุลดี";
}

async function json<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error(`Upstream ${response.status}`);
  return response.json() as Promise<T>;
}

async function pingDetail(config: BasinConfig): Promise<BasinDetail> {
  const dates = await json<string[]>(`${config.apiBase}/basin/dates?model=7days&mb_code=${config.code}`);
  const date = dates.at(-1) ?? dates[0];
  if (!date) throw new Error("No Ping forecast date");
  const [mainRows, subRows] = await Promise.all([
    json<Record<string, unknown>[]>(`${config.apiBase}/basin/watershed/detail?date=${date}&model=7days&mb_code=${config.code}`),
    json<Record<string, unknown>[]>(`${config.apiBase}/basin/subbasin-l1/detail?date=${date}&model=7days&mb_code=${config.code}`),
  ]);
  const main = mainRows[0];
  if (!main) throw new Error("No Ping summary");
  const rainValues = subRows.map((row) => n(row.rainfall)).filter((value) => value > 0);
  const rainfall = rainValues.length ? rainValues.reduce((sum, value) => sum + value, 0) / rainValues.length : null;
  const balance = n(main.water_balance);
  const summary: BasinSummary = {
    id: config.id, code: config.code, name: config.nameTh, nameEn: config.nameEn, date, rainfall,
    supply: n(main.watersupply), demand: n(main.water_demand), reservoir: n(main.reservoir), balance,
    droughtIndex: n(main.drought_index), runoffIndex: n(main.runoff_index), status: statusFor(balance, rainfall),
    sourceStatus: "live", sourceUrl: config.sourceUrl,
  };
  const subareas = subRows.map((row) => ({ id: String(row.id ?? ""), name: String(row.name ?? row.id ?? ""), rainfall: row.rainfall == null ? null : n(row.rainfall), supply: n(row.watersupply), demand: n(row.water_demand), balance: n(row.water_balance) }));
  return { summary, trend: [{ date, rainfall, balance }], subareas };
}

async function legacyDetail(config: BasinConfig): Promise<BasinDetail> {
  const latest = await json<{ datesims?: { datesim: string }[] }>(`${config.apiBase}/forecast/lastsimulate/mv_mainbasin_forecast_weekly`);
  const simulationDate = latest.datesims?.[0]?.datesim;
  if (!simulationDate) throw new Error("No legacy forecast date");
  const rows = await json<Record<string, unknown>[]>(`${config.apiBase}/mv-mainbasin-forecast-weekly/${simulationDate}`);
  const daily = rows.filter((row) => !String(row.dateforecast ?? "").includes("-"));
  const latestDay = daily.at(-1);
  if (!latestDay) throw new Error("No legacy daily data");
  const rainfall = latestDay.rainfall == null ? null : n(latestDay.rainfall);
  const balance = n(latestDay.waterbalance);
  const summary: BasinSummary = {
    id: config.id, code: config.code, name: config.nameTh, nameEn: config.nameEn,
    date: String(latestDay.dateforecast ?? simulationDate), rainfall, supply: n(latestDay.watersupply),
    demand: n(latestDay.waterdemand), reservoir: n(latestDay.reservoir), balance,
    droughtIndex: n(latestDay.droughtindex), runoffIndex: n(latestDay.runoffindex),
    status: statusFor(balance, rainfall), sourceStatus: "live", sourceUrl: config.sourceUrl,
  };
  const trend = daily.map((row) => ({ date: String(row.dateforecast ?? ""), rainfall: row.rainfall == null ? null : n(row.rainfall), balance: n(row.waterbalance) }));
  return { summary, trend, subareas: [] };
}

export async function getBasinDetail(id: string): Promise<BasinDetail | null> {
  const config = getBasinConfig(id);
  if (!config) return null;
  try {
    return config.adapter === "ping-v1" ? await pingDetail(config) : await legacyDetail(config);
  } catch {
    return FALLBACK[id];
  }
}

export async function getBasinSummaries() {
  const results = await Promise.all(BASINS.map((basin) => getBasinDetail(basin.id)));
  return results.filter((result): result is BasinDetail => Boolean(result)).map((result) => result.summary);
}
