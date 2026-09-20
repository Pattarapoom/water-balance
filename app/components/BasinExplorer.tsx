"use client";

import { useMemo, useState } from "react";
import type { BasinSummary } from "../../lib/water-data";

const number = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function displayDate(date: string) {
  if (date.includes("/")) {
    const [day, month, year] = date.split("/").map(Number);
    return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit" }).format(new Date(year, month - 1, day));
  }
  const parsed = new Date(`${date}T00:00:00+07:00`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit" }).format(parsed);
}

export default function BasinExplorer({ basins }: { basins: BasinSummary[] }) {
  const [selected, setSelected] = useState("all");
  const [boundary, setBoundary] = useState("main");
  const [horizon, setHorizon] = useState("7days");
  const visible = useMemo(() => selected === "all" ? basins : basins.filter((basin) => basin.id === selected), [basins, selected]);
  const selectedBasin = basins.find((basin) => basin.id === selected);

  return (
    <section className="explorer" id="basin-explorer">
      <div className="explorer-heading">
        <div><p className="eyebrow">ผลการวิเคราะห์เชิงพื้นที่</p><h2>แผนที่และตารางลุ่มน้ำ</h2></div>
        <span className="data-note"><i /> ข้อมูลพร้อมใช้งาน {basins.length} ลุ่มน้ำ</span>
      </div>

      <div className="filter-bar" aria-label="ตัวกรองข้อมูล">
        <label><span>ขอบเขตลุ่มน้ำ</span><select value={selected} onChange={(event) => setSelected(event.target.value)}><option value="all">ทุกลุ่มน้ำ</option>{basins.map((basin) => <option value={basin.id} key={basin.id}>ลุ่มน้ำ{basin.name}</option>)}</select></label>
        <label><span>ระดับพื้นที่</span><select value={boundary} onChange={(event) => setBoundary(event.target.value)}><option value="main">ลุ่มน้ำหลัก</option><option value="sub">ลุ่มน้ำสาขา</option><option value="admin">เขตการปกครอง</option></select></label>
        <label><span>ช่วงคาดการณ์</span><select value={horizon} onChange={(event) => setHorizon(event.target.value)}><option value="7days">ล่วงหน้า 7 วัน</option><option value="6months">ล่วงหน้า 6 เดือน</option></select></label>
        <button type="button" onClick={() => { setSelected("all"); setBoundary("main"); setHorizon("7days"); }}>ล้างตัวกรอง</button>
      </div>

      <div className="map-table-layout">
        <article className="map-card" aria-label="แผนที่ลุ่มน้ำแบบเลือกได้">
          <div className="map-toolbar"><div><span>แผนที่ประเทศไทย</span><strong>{selectedBasin ? `ลุ่มน้ำ${selectedBasin.name}` : "ภาพรวม 3 ลุ่มน้ำ"}</strong></div><small>{boundary === "main" ? "ขอบเขตลุ่มน้ำหลัก" : boundary === "sub" ? "ขอบเขตลุ่มน้ำสาขา" : "ขอบเขตการปกครอง"}</small></div>
          <div className="map-stage">
            <div className="map-grid" aria-hidden="true" />
            <div className="thailand-silhouette" aria-hidden="true"><i /><i /><i /></div>
            <button className={`basin-shape map-ping ${selected === "ping" ? "selected" : ""} ${selected !== "all" && selected !== "ping" ? "muted" : ""}`} type="button" onClick={() => setSelected(selected === "ping" ? "all" : "ping")}><b>ปิง</b><small>06</small></button>
            <button className={`basin-shape map-chi ${selected === "chi" ? "selected" : ""} ${selected !== "all" && selected !== "chi" ? "muted" : ""}`} type="button" onClick={() => setSelected(selected === "chi" ? "all" : "chi")}><b>ชี</b><small>04</small></button>
            <button className={`basin-shape map-mun ${selected === "mun" ? "selected" : ""} ${selected !== "all" && selected !== "mun" ? "muted" : ""}`} type="button" onClick={() => setSelected(selected === "mun" ? "all" : "mun")}><b>มูล</b><small>05</small></button>
            <div className="map-compass" aria-hidden="true">N<span>↑</span></div>
            <div className="map-scale" aria-hidden="true"><i /> 200 กม.</div>
          </div>
          <div className="map-legend"><span><i className="legend-ping" /> ปิง</span><span><i className="legend-chi" /> ชี</span><span><i className="legend-mun" /> มูล</span><small>กดพื้นที่บนแผนที่เพื่อกรองตาราง</small></div>
        </article>

        <aside className="map-insight">
          <p className="eyebrow light">พื้นที่ที่เลือก</p>
          <h2>{selectedBasin ? `ลุ่มน้ำ${selectedBasin.name}` : "ทุกลุ่มน้ำ"}</h2>
          <p>{horizon === "7days" ? "ผลคาดการณ์ระยะสั้น 7 วัน" : "แนวโน้มระยะกลาง 6 เดือน"} ระดับ{boundary === "main" ? "ลุ่มน้ำหลัก" : boundary === "sub" ? "ลุ่มน้ำสาขา" : "เขตการปกครอง"}</p>
          <dl>
            <div><dt>จำนวนพื้นที่</dt><dd>{visible.length}</dd></div>
            <div><dt>สมดุลรวมเพื่อการแสดงผล</dt><dd>{number.format(visible.reduce((sum, basin) => sum + basin.balance, 0))}</dd></div>
            <div><dt>สถานะข้อมูลจริง</dt><dd>{visible.filter((basin) => basin.sourceStatus === "live").length}/{visible.length}</dd></div>
          </dl>
          <small>ยอดรวมใช้เพื่อการมองภาพรวมเท่านั้น ควรเทียบวันที่และนิยามของแต่ละแบบจำลองก่อนใช้ตัดสินใจ</small>
        </aside>
      </div>

      <article className="data-card" id="data-table">
        <div className="table-heading"><div><p className="eyebrow">ตารางผลการวิเคราะห์</p><h2>{selectedBasin ? `ข้อมูลลุ่มน้ำ${selectedBasin.name}` : "เปรียบเทียบทุกลุ่มน้ำ"}</h2></div><span>หน่วยน้ำ: ล้าน ลบ.ม.</span></div>
        <div className="table-wrap">
          <table className="basin-data-table">
            <thead><tr><th>ลุ่มน้ำ</th><th>วันที่ข้อมูล</th><th>ฝน (มม.)</th><th>น้ำต้นทุน</th><th>ความต้องการ</th><th>สมดุลน้ำ</th><th>สถานะ</th><th /></tr></thead>
            <tbody>{visible.map((basin) => <tr key={basin.id}>
              <td><span className={`table-basin-dot ${basin.id}`} /><strong>{basin.name}</strong><small>{basin.code} • {basin.nameEn}</small></td>
              <td>{displayDate(basin.date)}</td>
              <td>{basin.rainfall == null ? "—" : number.format(basin.rainfall)}</td>
              <td>{number.format(basin.supply)}</td>
              <td>{number.format(basin.demand)}</td>
              <td className={basin.balance < 0 ? "negative-text" : "positive-text"}>{number.format(basin.balance)}</td>
              <td><span className={`status ${basin.status === "เฝ้าระวัง" ? "watch" : basin.status === "ขาดสมดุล" ? "critical" : ""}`}>{basin.status}</span></td>
              <td><a className="row-detail" href={`/forecast/${basin.id}`}>ดูรายละเอียด →</a></td>
            </tr>)}</tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
