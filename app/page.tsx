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
          <span className="brand-mark" aria-hidden="true">≈</span>
          <span><strong>Water Balance</strong><small>ศูนย์ข้อมูลสมดุลน้ำลุ่มน้ำ</small></span>
        </a>
        <nav aria-label="เมนูหลัก">
          <a className="active" href="#basin-explorer">ภาพรวม</a>
          <a href="#basin-explorer">แผนที่ลุ่มน้ำ</a>
          <a href="#data-table">ตารางข้อมูล</a>
        </nav>
        <div className="top-actions">
          <div className="live-chip"><i /> เชื่อมต่อ {live}/{basins.length} แหล่ง</div>
          <a className="admin-link" href="/admin">Admin Console</a>
        </div>
      </header>

      <BasinExplorer basins={basins} />
    </main>
  );
}
