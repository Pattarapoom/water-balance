import { getBasinSummaries } from "../lib/water-data";

export const dynamic = "force-dynamic";

const number = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function displayDate(date: string) {
  if (date.includes("/")) {
    const [day, month, year] = date.split("/").map(Number);
    const parsed = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
  }
  const parsed = new Date(`${date}T00:00:00+07:00`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
}

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
        <nav aria-label="เมนูหลัก"><a className="active" href="#overview">ภาพรวม</a><a href="#basins">ลุ่มน้ำ</a><a href="#sources">แหล่งข้อมูล</a></nav>
        <div className="live-chip"><i /> เชื่อมต่อข้อมูล {live}/{basins.length} แหล่ง</div>
      </header>

      <section className="hero" id="overview">
        <div>
          <p className="eyebrow">ภาพรวมสถานการณ์น้ำ • {basins.length} ลุ่มน้ำ</p>
          <h1>เห็นสถานการณ์น้ำทั้งหมด<br />ในภาพเดียว</h1>
          <p className="hero-copy">รวมผลวิเคราะห์ลุ่มน้ำปิง ชี และมูล เพื่อดูปริมาณน้ำต้นทุน ความต้องการน้ำ และสมดุลน้ำในมาตรฐานเดียวกัน</p>
        </div>
        <div className="hero-actions">
          <span className="control-label">ข้อมูลรอบล่าสุด</span>
          <div className="select-like"><span>{displayDate(latestDate)}</span><b aria-hidden="true">●</b></div>
          <p><span className="dot" /> รีเฟรชข้อมูลจากต้นทางอัตโนมัติเมื่อเปิดหน้า</p>
        </div>
      </section>

      <section className="metric-grid" aria-label="ตัวเลขภาพรวม">
        <article><span>ลุ่มน้ำสมดุลเป็นบวก</span><strong>{positive}/{basins.length}</strong><small>ลุ่มน้ำ</small><em className="positive">น้ำต้นทุนสูงกว่าความต้องการ</em></article>
        <article><span>ลุ่มน้ำที่ติดตาม</span><strong>{basins.length}</strong><small>ลุ่มน้ำ</small><em>ปิง • ชี • มูล</em></article>
        <article><span>พื้นที่เฝ้าระวัง</span><strong>{watch}</strong><small>ลุ่มน้ำ</small><em className={watch ? "warning" : "positive"}>{watch ? "ตรวจจากฝนและค่าสมดุลล่าสุด" : "ยังไม่พบพื้นที่เฝ้าระวัง"}</em></article>
        <article><span>แหล่งข้อมูลออนไลน์</span><strong>{live}</strong><small>จาก {basins.length}</small><em>{live === basins.length ? "ข้อมูลจากระบบต้นทาง" : "บางแหล่งใช้ข้อมูลสำรองล่าสุด"}</em></article>
      </section>

      <section className="content-grid" id="basins">
        <div className="basin-panel">
          <div className="section-heading"><div><p className="eyebrow">สถานการณ์รายลุ่มน้ำ</p><h2>เปรียบเทียบสมดุลน้ำ</h2></div><span className="unit">หน่วย: ล้าน ลบ.ม.</span></div>
          <div className="basin-list">
            {basins.map((basin) => (
              <a className="basin-row" href={`/forecast/${basin.id}`} key={basin.id}>
                <span className={`basin-symbol ${basin.id}`} aria-hidden="true">{basin.code}</span>
                <span className="basin-name"><small>ลุ่มน้ำ</small><strong>{basin.name}</strong></span>
                <span className="bar-wrap"><span className="bar-labels"><small>น้ำต้นทุน {number.format(basin.supply)}</small><small>ความต้องการ {number.format(basin.demand)}</small></span><span className="bar"><i style={{ width: `${Math.max(8, Math.min(100, basin.supply ? (Math.max(0, basin.balance) / basin.supply) * 100 : 0))}%` }} /></span></span>
                <span className="basin-value"><strong>{number.format(basin.balance)}</strong><small>สมดุลน้ำ</small></span>
                <span className={`status ${basin.status === "เฝ้าระวัง" ? "watch" : basin.status === "ขาดสมดุล" ? "critical" : ""}`}>{basin.status}</span><b className="arrow" aria-hidden="true">→</b>
              </a>
            ))}
          </div>
        </div>

        <aside className="insight-panel" id="sources">
          <p className="eyebrow light">ภาพรวมล่าสุด</p><h2>{positive === basins.length ? "ทุกลุ่มน้ำยังเป็นบวก" : "พบพื้นที่ต้องติดตาม"}</h2>
          <p>ระบบปรับชื่อฟิลด์ หน่วย และวันที่จากแต่ละแหล่งให้อยู่ในรูปแบบเดียวกัน ก่อนแสดงผลเปรียบเทียบ</p>
          <div className="insight-number"><span>เชื่อมต่อข้อมูลจริง</span><strong>{live}/{basins.length} <small>แหล่ง</small></strong></div>
          <a href="/api/v1/basins">เปิด Unified API <span>↗</span></a>
          <small className="disclaimer">ไม่รวมค่าทั้งสามลุ่มน้ำเป็นยอดเดียว เพราะรอบเวลาและนิยามข้อมูลต้นทางอาจต่างกัน</small>
        </aside>
      </section>
    </main>
  );
}
