import BasinExplorer from "./components/BasinExplorer";
import { getBasinSummaries } from "../lib/water-data";

export const dynamic = "force-dynamic";

function dateValue(date: string) {
  if (date.includes("/")) {
    const [day, month, year] = date.split("/").map(Number);
    return new Date(year, month - 1, day).getTime();
  }
  return new Date(date).getTime();
}

export default async function Home() {
  const basins = await getBasinSummaries();
  const positive = basins.filter((basin) => basin.balance >= 0).length;
  const watch = basins.filter((basin) => basin.status !== "สมดุลดี").length;
  const live = basins.filter((basin) => basin.sourceStatus === "live").length;
  const latestDate = [...basins].sort((a, b) => dateValue(b.date) - dateValue(a.date))[0]?.date ?? "—";

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#overview" aria-label="หน้าภาพรวมสมดุลน้ำ">
          <span className="brand-mark" aria-hidden="true">≈</span>
          <span><strong>Water Balance</strong><small>ศูนย์ข้อมูลสมดุลน้ำลุ่มน้ำ</small></span>
        </a>
        <nav aria-label="เมนูหลัก">
          <a className="active" href="#overview">ภาพรวม</a>
          <a href="#basin-explorer">แผนที่ลุ่มน้ำ</a>
          <a href="#data-table">ตารางข้อมูล</a>
        </nav>
        <div className="top-actions">
          <div className="live-chip"><i /> เชื่อมต่อ {live}/{basins.length} แหล่ง</div>
          <a className="admin-link" href="/admin">Admin Console</a>
        </div>
      </header>

      <section className="hero compact-hero" id="overview">
        <div>
          <p className="eyebrow">ระบบแบบจำลองวิเคราะห์สมดุลน้ำ • Multi-basin</p>
          <h1>แผนที่เดียว เห็นทุกลุ่มน้ำ</h1>
          <p className="hero-copy">รวมผลวิเคราะห์ลุ่มน้ำปิง ชี และมูล ให้เลือกพื้นที่ ดูแผนที่ และเปรียบเทียบตารางสมดุลน้ำในมาตรฐานเดียวกัน</p>
        </div>
        <div className="hero-note">
          <span>ข้อมูลรอบล่าสุด</span>
          <strong>{latestDate}</strong>
          <small>รีเฟรชจากต้นทางเมื่อเปิดหน้า</small>
        </div>
      </section>

      <section className="metric-grid" aria-label="ตัวเลขภาพรวม">
        <article><span>ลุ่มน้ำในระบบ</span><strong>{basins.length}</strong><small>ลุ่มน้ำ</small><em>พร้อมเพิ่มผ่าน Basin Registry</em></article>
        <article><span>เชื่อมต่อข้อมูลจริง</span><strong>{live}/{basins.length}</strong><small>แหล่ง</small><em className={live === basins.length ? "positive" : "warning"}>มีระบบสำรองเมื่อปลายทางไม่ตอบสนอง</em></article>
        <article><span>สมดุลเป็นบวก</span><strong>{positive}</strong><small>ลุ่มน้ำ</small><em className="positive">น้ำต้นทุนสูงกว่าความต้องการ</em></article>
        <article><span>พื้นที่เฝ้าระวัง</span><strong>{watch}</strong><small>ลุ่มน้ำ</small><em className={watch ? "warning" : "positive"}>{watch ? "ควรติดตามฝนและค่าสมดุล" : "ยังไม่พบพื้นที่เฝ้าระวัง"}</em></article>
      </section>

      <BasinExplorer basins={basins} />
    </main>
  );
}
