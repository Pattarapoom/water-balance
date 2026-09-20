import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BASINS, getBasinConfig } from "../../../lib/basins";
import { getBasinDetail } from "../../../lib/water-data";

export const dynamic = "force-dynamic";

const number = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function generateStaticParams() {
  return BASINS.map((basin) => ({ basin: basin.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ basin: string }> }): Promise<Metadata> {
  const { basin } = await params;
  const config = getBasinConfig(basin);
  if (!config) return { title: "ไม่พบลุ่มน้ำ" };
  const title = `ลุ่มน้ำ${config.nameTh} | Water Balance`;
  const description = `ผลวิเคราะห์น้ำต้นทุน ความต้องการน้ำ และสมดุลน้ำลุ่มน้ำ${config.nameTh}`;
  return {
    title,
    description,
    openGraph: { title, description, images: [] },
    twitter: { title, description, images: [] },
  };
}

export default async function BasinPage({ params }: { params: Promise<{ basin: string }> }) {
  const { basin } = await params;
  const [config, detail] = [getBasinConfig(basin), await getBasinDetail(basin)];
  if (!config || !detail) notFound();
  const { summary, trend, subareas } = detail;
  const chartMax = Math.max(...trend.map((point) => Math.abs(point.balance)), 1);
  const demandShare = summary.supply ? Math.min(100, (summary.demand / summary.supply) * 100) : 0;

  return (
    <main className="detail-page">
      <header className="topbar">
        <a className="brand" href="/" aria-label="กลับหน้าภาพรวม"><span className="brand-mark" aria-hidden="true">≈</span><span><strong>Water Balance</strong><small>ศูนย์ข้อมูลสมดุลน้ำลุ่มน้ำ</small></span></a>
        <nav aria-label="เมนูหลัก"><a href="/">ภาพรวม</a><a className="active" href={`/forecast/${basin}`}>ลุ่มน้ำ{summary.name}</a></nav>
        <a className="back-link" href="/">← กลับหน้าภาพรวม</a>
      </header>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">รหัสลุ่มน้ำ {summary.code} • {summary.nameEn}</p>
          <h1>ลุ่มน้ำ{summary.name}</h1>
          <p className="hero-copy">ผลวิเคราะห์สมดุลน้ำรอบล่าสุด พร้อมที่มาข้อมูลและค่าประกอบการประเมินในมาตรฐานกลาง</p>
        </div>
        <div className="detail-meta">
          <span className={`source-state ${summary.sourceStatus}`}><i /> {summary.sourceStatus === "live" ? "ข้อมูลจากต้นทาง" : "ข้อมูลสำรองล่าสุด"}</span>
          <small>วันที่ข้อมูล {summary.date}</small>
        </div>
      </section>

      <section className="detail-kpis" aria-label="ตัวเลขสมดุลน้ำ">
        <article className="balance-card"><span>สมดุลน้ำ</span><strong>{number.format(summary.balance)}</strong><small>ล้าน ลบ.ม.</small><em>{summary.status}</em></article>
        <article><span>น้ำต้นทุน</span><strong>{number.format(summary.supply)}</strong><small>ล้าน ลบ.ม.</small></article>
        <article><span>ความต้องการน้ำ</span><strong>{number.format(summary.demand)}</strong><small>ล้าน ลบ.ม.</small></article>
        <article><span>น้ำในอ่าง</span><strong>{number.format(summary.reservoir)}</strong><small>ล้าน ลบ.ม.</small></article>
        <article><span>ปริมาณฝน</span><strong>{summary.rainfall == null ? "—" : number.format(summary.rainfall)}</strong><small>มม.</small></article>
      </section>

      <section className="detail-grid">
        <article className="chart-card">
          <div className="section-heading"><div><p className="eyebrow">แนวโน้ม</p><h2>สมดุลน้ำตามช่วงเวลา</h2></div><span className="unit">ล้าน ลบ.ม.</span></div>
          <div className="trend-chart" aria-label="กราฟแนวโน้มสมดุลน้ำ">
            {trend.map((point) => (
              <div className="trend-column" key={point.date}>
                <span className="trend-value">{number.format(point.balance)}</span>
                <div className="trend-track"><i className={point.balance < 0 ? "negative" : ""} style={{ height: `${Math.max(6, (Math.abs(point.balance) / chartMax) * 100)}%` }} /></div>
                <small>{point.date}</small>
              </div>
            ))}
          </div>
        </article>

        <aside className="balance-explainer">
          <p className="eyebrow light">องค์ประกอบสมดุลน้ำ</p><h2>น้ำต้นทุน − ความต้องการ</h2>
          <div className="ratio"><span><i style={{ width: `${Math.max(2, 100 - demandShare)}%` }} /></span><small>สัดส่วนความต้องการต่อน้ำต้นทุน {number.format(demandShare)}%</small></div>
          <dl><div><dt>ดัชนีภัยแล้ง</dt><dd>{summary.droughtIndex}</dd></div><div><dt>ดัชนีน้ำท่า</dt><dd>{summary.runoffIndex}</dd></div></dl>
          <a href={`/api/v1/basins/${basin}`}>ดาวน์โหลดข้อมูล JSON ↗</a>
        </aside>
      </section>

      {subareas.length > 0 && (
        <section className="subarea-card">
          <div className="section-heading"><div><p className="eyebrow">รายละเอียดพื้นที่</p><h2>ลุ่มน้ำสาขา</h2></div><span className="unit">{subareas.length} พื้นที่</span></div>
          <div className="table-wrap"><table><thead><tr><th>รหัส</th><th>พื้นที่</th><th>ฝน (มม.)</th><th>น้ำต้นทุน</th><th>ความต้องการ</th><th>สมดุลน้ำ</th></tr></thead><tbody>{subareas.map((row) => <tr key={row.id}><td>{row.id}</td><td>{row.name}</td><td>{row.rainfall == null ? "—" : number.format(row.rainfall)}</td><td>{number.format(row.supply)}</td><td>{number.format(row.demand)}</td><td className={row.balance < 0 ? "negative-text" : "positive-text"}>{number.format(row.balance)}</td></tr>)}</tbody></table></div>
        </section>
      )}

      <section className="source-footer">
        <div><p className="eyebrow">แหล่งข้อมูล</p><h2>ตรวจสอบกลับไปยังระบบต้นทางได้</h2><p>Adapter แปลงชื่อฟิลด์ วันที่ และโครงสร้างผลลัพธ์ให้อยู่ในมาตรฐานกลาง โดยไม่แก้ค่าจากแบบจำลองต้นทาง</p></div>
        <a href={summary.sourceUrl} target="_blank" rel="noreferrer">เปิดระบบลุ่มน้ำ{summary.name} ↗</a>
      </section>
    </main>
  );
}
