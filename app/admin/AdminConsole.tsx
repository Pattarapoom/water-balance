"use client";

import { FormEvent, useState } from "react";

type AdminBasin = {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  adapter: string;
  apiBase: string;
  sourceUrl: string;
  capabilities: string[];
  sourceStatus: "live" | "fallback";
  lastDate: string;
  draft?: boolean;
};

export default function AdminConsole({ initialBasins }: { initialBasins: AdminBasin[] }) {
  const [basins, setBasins] = useState(initialBasins);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(initialBasins.map((basin) => [basin.id, true])));
  const [notice, setNotice] = useState("ระบบพร้อมรับการตั้งค่า");
  const [testing, setTesting] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nameTh = String(form.get("nameTh") ?? "").trim();
    const code = String(form.get("code") ?? "").trim();
    const apiBase = String(form.get("apiBase") ?? "").trim();
    if (!nameTh || !code || !apiBase) {
      setNotice("กรุณากรอกชื่อลุ่มน้ำ รหัส และ API Base URL ให้ครบ");
      return;
    }
    const id = nameTh.toLowerCase().replace(/\s+/g, "-") + "-draft";
    setBasins((current) => [...current, {
      id,
      code,
      nameTh,
      nameEn: String(form.get("nameEn") ?? "Draft"),
      adapter: String(form.get("adapter") ?? "configurable-rest"),
      apiBase,
      sourceUrl: String(form.get("sourceUrl") ?? apiBase),
      capabilities: ["7 วัน", "กำลังตั้งค่า"],
      sourceStatus: "fallback",
      lastDate: "รอตรวจสอบ",
      draft: true,
    }]);
    setEnabled((current) => ({ ...current, [id]: false }));
    setNotice(`บันทึกลุ่มน้ำ${nameTh}เป็นแบบร่างแล้ว — ยังไม่เผยแพร่สู่หน้าสาธารณะ`);
    event.currentTarget.reset();
  }

  function testConnection() {
    setTesting(true);
    setNotice("กำลังจำลองการตรวจสอบ endpoint และ schema...");
    window.setTimeout(() => {
      setTesting(false);
      setNotice("ตรวจรูปแบบ URL ผ่านแล้ว ขั้นถัดไปคือกำหนด Field Mapping และทดสอบข้อมูลตัวอย่าง");
    }, 700);
  }

  return (
    <main className="admin-shell">
      <header className="topbar admin-topbar">
        <a className="brand" href="/" aria-label="กลับหน้าสาธารณะ"><span className="brand-mark" aria-hidden="true" /><span><strong>ระบบแบบจำลองวิเคราะห์สมดุลน้ำระดับลุ่มน้ำ</strong><small>Administration Console</small></span></a>
        <nav aria-label="เมนูหลังบ้าน"><a className="active" href="#registry">Basin Registry</a><a href="#add-basin">เพิ่มลุ่มน้ำ</a><a href="#activity">ประวัติระบบ</a></nav>
        <a className="public-link" href="/">ดูหน้าสาธารณะ ↗</a>
      </header>

      <section className="admin-hero">
        <div><p className="eyebrow">System Administration</p><h1>จัดการลุ่มน้ำและแหล่งข้อมูล</h1><p>ตรวจสถานะ เปิด–ปิดการเผยแพร่ และเตรียมเชื่อมลุ่มน้ำใหม่จากศูนย์กลางเดียว</p></div>
        <div className="admin-user"><span>AD</span><div><strong>Demo Administrator</strong><small>สิทธิ์: System Admin</small></div></div>
      </section>

      <section className="admin-metrics" aria-label="สถานะระบบ">
        <article><span>ลุ่มน้ำทั้งหมด</span><strong>{basins.length}</strong><small>รวมแบบร่าง</small></article>
        <article><span>เผยแพร่หน้าเว็บ</span><strong>{Object.values(enabled).filter(Boolean).length}</strong><small>ลุ่มน้ำ</small></article>
        <article><span>เชื่อมต่อข้อมูลจริง</span><strong>{basins.filter((basin) => basin.sourceStatus === "live").length}</strong><small>แหล่ง</small></article>
        <article><span>รายการรอตั้งค่า</span><strong>{basins.filter((basin) => basin.draft).length}</strong><small>แบบร่าง</small></article>
      </section>

      <section className="admin-grid" id="registry">
        <article className="registry-card">
          <div className="admin-section-heading"><div><p className="eyebrow">Basin Registry</p><h2>แหล่งข้อมูลในระบบ</h2></div><span className="admin-status"><i /> Production configuration</span></div>
          <div className="table-wrap"><table className="registry-table"><thead><tr><th>ลุ่มน้ำ</th><th>Adapter</th><th>Endpoint</th><th>ข้อมูลล่าสุด</th><th>การเชื่อมต่อ</th><th>เผยแพร่</th></tr></thead><tbody>
            {basins.map((basin) => <tr key={basin.id}>
              <td><strong>{basin.code} • {basin.nameTh}</strong><small>{basin.nameEn}{basin.draft ? " • แบบร่าง" : ""}</small></td>
              <td><code>{basin.adapter}</code></td>
              <td><span className="endpoint" title={basin.apiBase}>{basin.apiBase.replace(/^https?:\/\//, "")}</span></td>
              <td>{basin.lastDate}</td>
              <td><span className={`connection-state ${basin.sourceStatus}`}><i /> {basin.sourceStatus === "live" ? "Live" : basin.draft ? "Pending" : "Fallback"}</span></td>
              <td><button className={`switch ${enabled[basin.id] ? "on" : ""}`} type="button" aria-label={`${enabled[basin.id] ? "ปิด" : "เปิด"}การเผยแพร่ลุ่มน้ำ${basin.nameTh}`} aria-pressed={enabled[basin.id]} onClick={() => { setEnabled((current) => ({ ...current, [basin.id]: !current[basin.id] })); setNotice(`ปรับสถานะลุ่มน้ำ${basin.nameTh}ในเดโมแล้ว`); }}><i /></button></td>
            </tr>)}
          </tbody></table></div>
        </article>

        <aside className="workflow-card">
          <p className="eyebrow light">ขั้นตอนควบคุมคุณภาพ</p><h2>ก่อนเผยแพร่ลุ่มน้ำใหม่</h2>
          <ol><li><b>1</b><span><strong>ลงทะเบียนแหล่งข้อมูล</strong><small>กำหนด URL, Adapter และเจ้าของข้อมูล</small></span></li><li><b>2</b><span><strong>จับคู่ฟิลด์มาตรฐาน</strong><small>ฝน น้ำต้นทุน ความต้องการ และสมดุล</small></span></li><li><b>3</b><span><strong>ตรวจคุณภาพและหน่วย</strong><small>ทดสอบวันที่ ค่าว่าง และ fallback</small></span></li><li><b>4</b><span><strong>อนุมัติและเผยแพร่</strong><small>เปิดหน้าแผนที่ ตาราง และ Unified API</small></span></li></ol>
        </aside>
      </section>

      <section className="admin-lower-grid">
        <form className="add-basin-card" id="add-basin" onSubmit={submit}>
          <div className="admin-section-heading"><div><p className="eyebrow">Onboarding</p><h2>เพิ่มลุ่มน้ำใหม่</h2></div><span className="draft-pill">บันทึกเป็นแบบร่าง</span></div>
          <div className="form-grid">
            <label><span>ชื่อลุ่มน้ำ (ไทย) *</span><input name="nameTh" placeholder="เช่น ยม" /></label>
            <label><span>ชื่อภาษาอังกฤษ</span><input name="nameEn" placeholder="เช่น Yom" /></label>
            <label><span>รหัสลุ่มน้ำ *</span><input name="code" placeholder="เช่น 07" /></label>
            <label><span>ชนิด Adapter</span><select name="adapter"><option value="configurable-rest">Configurable REST</option><option value="ping-v1">Ping V1</option><option value="legacy-chimun">Legacy Chi/Mun</option></select></label>
            <label className="full"><span>API Base URL *</span><input name="apiBase" type="url" placeholder="https://example.go.th/api" /></label>
            <label className="full"><span>หน้าเว็บไซต์ต้นทาง</span><input name="sourceUrl" type="url" placeholder="https://example.go.th/forecast" /></label>
          </div>
          <div className="form-actions"><button className="secondary-button" type="button" onClick={testConnection} disabled={testing}>{testing ? "กำลังตรวจสอบ..." : "ทดสอบการเชื่อมต่อ"}</button><button className="primary-button" type="submit">บันทึกแบบร่าง</button></div>
        </form>

        <aside className="activity-card" id="activity">
          <p className="eyebrow">System Activity</p><h2>สถานะล่าสุด</h2>
          <div className="notice-box"><i /> <span>{notice}</span></div>
          <ul><li><span className="activity-dot live" /><div><strong>ซิงก์ข้อมูล 3 ลุ่มน้ำ</strong><small>อัตโนมัติเมื่อมีคำขอหน้าเว็บ</small></div></li><li><span className="activity-dot" /><div><strong>Unified API พร้อมใช้งาน</strong><small>/api/v1/basins</small></div></li><li><span className="activity-dot" /><div><strong>Field mapping แยกตาม Adapter</strong><small>ลดผลกระทบเมื่อเพิ่มแหล่งข้อมูลใหม่</small></div></li></ul>
          <p className="demo-note">Demo scope: การตั้งค่าบนหน้านี้เป็นสถานะชั่วคราว ยังไม่บันทึกลงฐานข้อมูลหรือระบบสิทธิ์จริง</p>
        </aside>
      </section>
    </main>
  );
}
