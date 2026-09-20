"use client";

import { useMemo, useState } from "react";
import type { BasinSummary } from "../../lib/water-data";
import BasinLeafletMap from "./BasinLeafletMap";

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

      <div className="explorer-workspace">
        <aside className="filter-panel" aria-label="ตัวเลือกข้อมูล">
          <div className="panel-title"><span>01</span><div><small>DATA FILTER</small><h3>ตัวเลือกข้อมูล</h3></div></div>
          <div className="filter-fields">
            <label><span>ขอบเขตลุ่มน้ำ</span><select value={selected} onChange={(event) => setSelected(event.target.value)}><option value="all">ทุกลุ่มน้ำ</option>{basins.map((basin) => <option value={basin.id} key={basin.id}>ลุ่มน้ำ{basin.name}</option>)}</select></label>
            <label><span>ระดับพื้นที่</span><select value={boundary} onChange={(event) => setBoundary(event.target.value)}><option value="main">ลุ่มน้ำหลัก</option><option value="sub">ลุ่มน้ำสาขา</option><option value="admin">เขตการปกครอง</option></select></label>
            <label><span>ช่วงคาดการณ์</span><select value={horizon} onChange={(event) => setHorizon(event.target.value)}><option value="7days">ล่วงหน้า 7 วัน</option><option value="6months">ล่วงหน้า 6 เดือน</option></select></label>
            <button type="button" onClick={() => { setSelected("all"); setBoundary("main"); setHorizon("7days"); }}>ล้างตัวกรอง</button>
          </div>
          <div className="filter-summary">
            <span>พื้นที่ที่เลือก</span>
            <strong>{selectedBasin ? `ลุ่มน้ำ${selectedBasin.name}` : "ทุกลุ่มน้ำ"}</strong>
            <small>{horizon === "7days" ? "คาดการณ์ 7 วัน" : "แนวโน้ม 6 เดือน"} • {boundary === "main" ? "ลุ่มน้ำหลัก" : boundary === "sub" ? "ลุ่มน้ำสาขา" : "เขตการปกครอง"}</small>
            <dl><div><dt>พื้นที่</dt><dd>{visible.length}</dd></div><div><dt>ข้อมูลจริง</dt><dd>{visible.filter((basin) => basin.sourceStatus === "live").length}/{visible.length}</dd></div><div><dt>สมดุลรวม*</dt><dd>{number.format(visible.reduce((sum, basin) => sum + basin.balance, 0))}</dd></div></dl>
            <p>*ใช้เพื่อมองภาพรวม ควรเทียบวันที่และนิยามก่อนใช้ตัดสินใจ</p>
          </div>
        </aside>

        <article className="map-card" aria-label="แผนที่ลุ่มน้ำแบบเลือกได้">
          <div className="map-toolbar"><div className="panel-title"><span>02</span><div><small>INTERACTIVE MAP</small><h3>{selectedBasin ? `แผนที่ลุ่มน้ำ${selectedBasin.name}` : "แผนที่ลุ่มน้ำประเทศไทย"}</h3></div></div><small>{boundary === "main" ? "ขอบเขตลุ่มน้ำหลัก" : boundary === "sub" ? "ขอบเขตลุ่มน้ำสาขา" : "ขอบเขตการปกครอง"}</small></div>
          <BasinLeafletMap basins={basins} selected={selected} boundary={boundary} onSelect={(id) => setSelected(selected === id ? "all" : id)} />
          <div className="map-legend"><span><i className="legend-ping" /> ปิง</span><span><i className="legend-chi" /> ชี</span><span><i className="legend-mun" /> มูล</span><small>กดพื้นที่บนแผนที่เพื่อกรองตาราง</small></div>
        </article>

        <article className="data-card workspace-data-card" id="data-table">
          <div className="table-heading"><div className="panel-title"><span>03</span><div><small>ANALYSIS RESULT</small><h3>{selectedBasin ? `ข้อมูลลุ่มน้ำ${selectedBasin.name}` : "ตารางผลวิเคราะห์"}</h3></div></div><span>ล้าน ลบ.ม.</span></div>
          <div className="table-wrap workspace-table-wrap">
            <table className="basin-data-table compact-table">
              <thead><tr><th>ลุ่มน้ำ</th><th>ฝน</th><th>น้ำต้นทุน</th><th>ต้องการ</th><th>สมดุล</th><th>สถานะ</th></tr></thead>
              <tbody>{visible.map((basin) => <tr key={basin.id}>
                <td><span className={`table-basin-dot ${basin.id}`} /><strong>{basin.name}</strong><small>{basin.code} • {displayDate(basin.date)}</small></td>
                <td>{basin.rainfall == null ? "—" : number.format(basin.rainfall)}<small>มม.</small></td>
                <td>{number.format(basin.supply)}</td>
                <td>{number.format(basin.demand)}</td>
                <td className={basin.balance < 0 ? "negative-text" : "positive-text"}>{number.format(basin.balance)}</td>
                <td><span className={`status ${basin.status === "เฝ้าระวัง" ? "watch" : basin.status === "ขาดสมดุล" ? "critical" : ""}`}>{basin.status}</span><a className="row-detail" href={`/forecast/${basin.id}`}>รายละเอียด →</a></td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="table-foot"><span><i /> ข้อมูล {visible.filter((basin) => basin.sourceStatus === "live").length}/{visible.length} แหล่งออนไลน์</span><a href="/api/v1/basins">JSON API ↗</a></div>
        </article>
      </div>
    </section>
  );
}
