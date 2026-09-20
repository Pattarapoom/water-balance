export type BasinAdapter = "ping-v1" | "legacy-chimun";

export type BasinConfig = {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  adapter: BasinAdapter;
  apiBase: string;
  sourceUrl: string;
  center: [number, number];
  capabilities: string[];
  color: string;
};

/**
 * Basin registry: adding a basin begins here. The UI and /api/v1/basins endpoint
 * are generated from this list; source-specific field mapping stays in the adapter.
 */
export const BASINS: BasinConfig[] = [
  {
    id: "ping",
    code: "06",
    nameTh: "ปิง",
    nameEn: "Ping",
    adapter: "ping-v1",
    apiBase: "http://43-211-16-217.sslip.io/api",
    sourceUrl: "http://43.211.16.217/forecast/ping",
    center: [98.97, 17.5],
    capabilities: ["7 วัน", "ระดับลุ่มน้ำ", "ลุ่มน้ำสาขา", "เขตการปกครอง"],
    color: "#137f7a",
  },
  {
    id: "chi",
    code: "04",
    nameTh: "ชี",
    nameEn: "Chi",
    adapter: "legacy-chimun",
    apiBase: "https://wb-chi.hii.or.th/api/main",
    sourceUrl: "https://wb-chi.hii.or.th/public/forecast",
    center: [102.5, 16.2],
    capabilities: ["7 วัน", "6 เดือน", "ลุ่มน้ำย่อย", "เขตการปกครอง"],
    color: "#7ca58e",
  },
  {
    id: "mun",
    code: "05",
    nameTh: "มูล",
    nameEn: "Mun",
    adapter: "legacy-chimun",
    apiBase: "https://wb-mun.hii.or.th/api/main",
    sourceUrl: "https://wb-mun.hii.or.th/public/forecast",
    center: [103.25, 15.4],
    capabilities: ["7 วัน", "6 เดือน", "ลุ่มน้ำย่อย", "เขตการปกครอง"],
    color: "#3f7279",
  },
];

export function getBasinConfig(id: string) {
  return BASINS.find((basin) => basin.id === id);
}
