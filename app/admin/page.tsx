import type { Metadata } from "next";
import { BASINS } from "../../lib/basins";
import { getBasinSummaries } from "../../lib/water-data";
import AdminConsole from "./AdminConsole";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Console | Water Balance",
  description: "หลังบ้านสำหรับจัดการแหล่งข้อมูลและลุ่มน้ำในระบบ Water Balance",
  openGraph: { title: "Admin Console | Water Balance", description: "จัดการ Basin Registry และตรวจสอบการเชื่อมต่อข้อมูล", images: [] },
  twitter: { title: "Admin Console | Water Balance", description: "จัดการ Basin Registry และตรวจสอบการเชื่อมต่อข้อมูล", images: [] },
};

export default async function AdminPage() {
  const summaries = await getBasinSummaries();
  const rows = BASINS.map((basin) => ({
    id: basin.id,
    code: basin.code,
    nameTh: basin.nameTh,
    nameEn: basin.nameEn,
    adapter: basin.adapter,
    apiBase: basin.apiBase,
    sourceUrl: basin.sourceUrl,
    capabilities: basin.capabilities,
    sourceStatus: summaries.find((summary) => summary.id === basin.id)?.sourceStatus ?? "fallback",
    lastDate: summaries.find((summary) => summary.id === basin.id)?.date ?? "—",
  }));

  return <AdminConsole initialBasins={rows} />;
}
