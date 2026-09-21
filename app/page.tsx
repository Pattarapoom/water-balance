import BasinExplorer from "./components/BasinExplorer";
import { getBasinSummaries } from "../lib/water-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const basins = await getBasinSummaries();
  const live = basins.filter((basin) => basin.sourceStatus === "live").length;

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/" aria-label="หน้าภาพรวมสมดุลน้ำ">
          <span className="brand-mark" aria-hidden="true" />
          <span><strong>ระบบแบบจำลองวิเคราะห์สมดุลน้ำระดับลุ่มน้ำ</strong></span>
        </a>
        <div className="top-actions">
          <div className="live-chip"><i /> เชื่อมต่อ {live}/{basins.length} แหล่ง</div>
          <a className="admin-link" href="/admin">Admin Console</a>
        </div>
      </header>

      <BasinExplorer basins={basins} />
    </main>
  );
}
