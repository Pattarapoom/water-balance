"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BasinSummary, SubArea, TrendPoint } from "../../lib/water-data";
import BasinLeafletMap from "./BasinLeafletMap";

type MapMetric = "reservoir" | "balance" | "droughtIndex" | "runoffIndex" | "rainfall" | "supply" | "demand";
type ProvinceTableRow = { id: string; provinceCode: string; provinceName: string; basinId: string; basinName: string; date: string; rainfall: number | null; supply: number; demand: number; balance: number; reservoir: number; droughtIndex: number; runoffIndex: number };

const METRICS: Record<MapMetric, { label: string; unit: string; field: string }> = {
  reservoir: { label: "ปริมาณสะสม", unit: "ล้าน ลบ.ม.", field: "reservoir" },
  balance: { label: "ปริมาณสมดุลน้ำ", unit: "ล้าน ลบ.ม.", field: "water balance" },
  droughtIndex: { label: "ความเสี่ยงการขาดแคลนน้ำเพื่อการเกษตร", unit: "ดัชนี", field: "drought index" },
  runoffIndex: { label: "ดัชนีน้ำมาตรฐาน", unit: "ดัชนี", field: "runoff index" },
  rainfall: { label: "ปริมาณฝน", unit: "มม.", field: "rainfall" },
  supply: { label: "น้ำต้นทุน", unit: "ล้าน ลบ.ม.", field: "water supply" },
  demand: { label: "ความต้องการใช้น้ำ", unit: "ล้าน ลบ.ม.", field: "water demand" },
};

const number = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function metricValue(row: BasinSummary | SubArea | ProvinceTableRow | TrendPoint, metric: MapMetric): number | null {
  switch (metric) {
    case "reservoir": return row.reservoir ?? null;
    case "balance": return row.balance;
    case "droughtIndex": return row.droughtIndex ?? null;
    case "runoffIndex": return row.runoffIndex ?? null;
    case "rainfall": return row.rainfall;
    case "supply": return row.supply;
    case "demand": return row.demand;
  }
}

function metricHeading(metric: MapMetric) {
  return `${METRICS[metric].label} (${METRICS[metric].unit})`;
}

function metricText(row: BasinSummary | SubArea | ProvinceTableRow | TrendPoint, metric: MapMetric) {
  const value = metricValue(row, metric);
  return value === null ? "—" : number.format(value);
}

function displayDate(date: string) {
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "2-digit", timeZone: "Asia/Bangkok" };
  if (/^\d{4}-\d{2}$/.test(date)) {
    return new Intl.DateTimeFormat("th-TH", { month: "short", year: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(`${date}-01T12:00:00+07:00`));
  }
  if (date.includes("/")) {
    const [day, month, year] = date.split("/").map(Number);
    return new Intl.DateTimeFormat("th-TH", options).format(new Date(Date.UTC(year, month - 1, day, 12)));
  }
  const parsed = new Date(`${date}T12:00:00+07:00`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat("th-TH", options).format(parsed);
}

export default function BasinExplorer({ basins }: { basins: BasinSummary[] }) {
  const [selected, setSelected] = useState("all");
  const [boundary, setBoundary] = useState("main");
  const [horizon, setHorizon] = useState<"7days" | "6months">("7days");
  const [metric, setMetric] = useState<MapMetric>("balance");
  const [exportState, setExportState] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);
  const [subareas, setSubareas] = useState<SubArea[]>([]);
  const [subareaState, setSubareaState] = useState<"ready" | "loading" | "error">("ready");
  const [provinceList, setProvinceList] = useState<Array<{ code: string; name: string }>>([]);
  const [provinceQuery, setProvinceQuery] = useState("");
  const [provinceCodes, setProvinceCodes] = useState<string[]>([]);
  const [provinceRows, setProvinceRows] = useState<ProvinceTableRow[]>([]);
  const [provinceDataState, setProvinceDataState] = useState<"ready" | "loading" | "error">("ready");
  const [horizonBasins, setHorizonBasins] = useState<BasinSummary[]>(basins);
  const [horizonSeries, setHorizonSeries] = useState<Record<string, TrendPoint[]>>({});
  const [horizonState, setHorizonState] = useState<"ready" | "loading" | "error">("ready");
  const mapCaptureRef = useRef<HTMLDivElement | null>(null);
  const currentBasins = horizon === "7days" ? basins : horizonBasins;
  const visible = useMemo(() => selected === "all" ? currentBasins : currentBasins.filter((basin) => basin.id === selected), [currentBasins, selected]);
  const selectedBasin = currentBasins.find((basin) => basin.id === selected) ?? basins.find((basin) => basin.id === selected);
  const matchingProvinces = provinceList.filter((province) => province.name.toLocaleLowerCase("th").includes(provinceQuery.trim().toLocaleLowerCase("th")) || province.code.includes(provinceQuery.trim()));

  useEffect(() => {
    let active = true;
    fetch("/api/geo/provinces")
      .then((response) => {
        if (!response.ok) throw new Error("โหลดรายชื่อจังหวัดไม่สำเร็จ");
        return response.json() as Promise<{ features?: Array<{ properties?: { PROV_CODE?: string; PROV_NAME?: string } }> }>;
      })
      .then((geojson) => {
        if (!active) return;
        const provinces = (geojson.features ?? []).flatMap((feature) => {
          const code = feature.properties?.PROV_CODE;
          const name = feature.properties?.PROV_NAME;
          return code && name ? [{ code, name }] : [];
        });
        setProvinceList(provinces.sort((a, b) => a.name.localeCompare(b.name, "th")));
      })
      .catch(() => { if (active) setProvinceList([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (horizon === "7days") {
      setHorizonBasins(basins);
      setHorizonSeries({});
      setHorizonState("ready");
      return;
    }
    let active = true;
    setHorizonBasins([]);
    setHorizonState("loading");
    fetch("/api/v1/basins?horizon=6months")
      .then((response) => {
        if (!response.ok) throw new Error("โหลดข้อมูลคาดการณ์ 6 เดือนไม่สำเร็จ");
        return response.json() as Promise<{ basins?: BasinSummary[]; series?: Record<string, TrendPoint[]> }>;
      })
      .then((data) => {
        if (!active) return;
        setHorizonBasins(data.basins ?? []);
        setHorizonSeries(data.series ?? {});
        setHorizonState("ready");
      })
      .catch(() => { if (active) setHorizonState("error"); });
    return () => { active = false; };
  }, [basins, horizon]);

  useEffect(() => {
    if (selected === "all") {
      setSubareas([]);
      setSubareaState("ready");
      return;
    }
    let active = true;
    setSubareas([]);
    setSubareaState("loading");
    fetch(`/api/v1/basins/${selected}?horizon=${horizon}`)
      .then((response) => {
        if (!response.ok) throw new Error("โหลดตารางลุ่มน้ำย่อยไม่สำเร็จ");
        return response.json() as Promise<{ subareas?: SubArea[] }>;
      })
      .then((detail) => {
        if (!active) return;
        setSubareas(detail.subareas ?? []);
        setSubareaState("ready");
      })
      .catch(() => { if (active) setSubareaState("error"); });
    return () => { active = false; };
  }, [selected, horizon]);

  useEffect(() => {
    if (boundary !== "admin" || provinceCodes.length === 0) {
      setProvinceRows([]);
      setProvinceDataState("ready");
      return;
    }
    let active = true;
    setProvinceRows([]);
    setProvinceDataState("loading");
    const query = new URLSearchParams({ codes: provinceCodes.join(","), basins: selected === "all" ? "chi,mun" : selected, horizon });
    fetch(`/api/v1/provinces?${query}`)
      .then((response) => {
        if (!response.ok) throw new Error("โหลดข้อมูลจังหวัดไม่สำเร็จ");
        return response.json() as Promise<{ rows?: ProvinceTableRow[] }>;
      })
      .then((data) => {
        if (!active) return;
        setProvinceRows(data.rows ?? []);
        setProvinceDataState("ready");
      })
      .catch(() => { if (active) setProvinceDataState("error"); });
    return () => { active = false; };
  }, [boundary, horizon, provinceCodes, selected]);

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportCsv() {
    const headers = ["basin_code", "basin_id", "basin_name_th", "basin_name_en", "date", "rainfall_mm", "reservoir_mcm", "water_supply_mcm", "water_demand_mcm", "water_balance_mcm", "drought_index", "runoff_index", "status", "source_status"];
    const rows = visible.map((basin) => [basin.code, basin.id, basin.name, basin.nameEn, basin.date, basin.rainfall ?? "", basin.reservoir, basin.supply, basin.demand, basin.balance, basin.droughtIndex, basin.runoffIndex, basin.status, basin.sourceStatus]);
    const cell = (value: unknown) => `"${String(value).replaceAll('"', '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
    downloadBlob(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }), `water-balance-${selected}.csv`);
  }

  async function exportShapefile() {
    const response = await fetch("/api/geo/main-basins");
    if (!response.ok) throw new Error("โหลดขอบเขตลุ่มน้ำไม่สำเร็จ");
    const geojson = await response.json() as { type: string; features: Array<{ type: "Feature"; properties: Record<string, unknown>; geometry: unknown }> };
    const idByCode: Record<string, string> = { "04": "chi", "05": "mun", "06": "ping" };
    const basinById = new Map(visible.map((basin) => [basin.id, basin]));
    const features = geojson.features.flatMap((feature) => {
      const id = idByCode[String(feature.properties.MB_CODE ?? "")];
      const basin = id ? basinById.get(id) : undefined;
      if (!basin) return [];
      return [{ ...feature, properties: {
        MB_CODE: basin.code,
        BASIN_ID: basin.id.toUpperCase(),
        NAME_EN: basin.nameEn,
        DATE: basin.date.slice(0, 10),
        RAIN_MM: basin.rainfall ?? -9999,
        RESERVOIR: basin.reservoir,
        SUPPLY: basin.supply,
        DEMAND: basin.demand,
        BALANCE: basin.balance,
        DROUGHT: basin.droughtIndex,
        RUNOFF: basin.runoffIndex,
        MAP_METRIC: metric.toUpperCase().slice(0, 10),
        MAP_VALUE: metricValue(basin, metric) ?? -9999,
        STATUS: basin.status === "สมดุลดี" ? "BALANCED" : basin.status === "เฝ้าระวัง" ? "WATCH" : "DEFICIT",
        SRC_STATUS: basin.sourceStatus.toUpperCase(),
      } }];
    });
    if (!features.length) throw new Error("ไม่มีลุ่มน้ำที่เลือกสำหรับส่งออก");

    const [{ zip }, JSZipModule] = await Promise.all([import("@mapbox/shp-write"), import("jszip")]);
    const JSZip = JSZipModule.default;
    const shapeCollection = { type: "FeatureCollection" as const, features };
    const bytes = await zip(shapeCollection, { outputType: "uint8array", filename: "water-balance", folder: "water-balance" });
    const archive = await JSZip.loadAsync(bytes);
    Object.keys(archive.files).filter((path) => path.toLowerCase().endsWith(".dbf")).forEach((path) => {
      archive.file(path.replace(/\.dbf$/i, ".cpg"), "UTF-8");
    });
    const csvHeaders = ["รหัสลุ่มน้ำ", "ชื่อลุ่มน้ำ", "วันที่", "ปริมาณฝน (มม.)", "ปริมาณสะสม (ล้าน ลบ.ม.)", "น้ำต้นทุน (ล้าน ลบ.ม.)", "ความต้องการใช้น้ำ (ล้าน ลบ.ม.)", "สมดุลน้ำ (ล้าน ลบ.ม.)", "ความเสี่ยงขาดแคลนน้ำเกษตร", "ดัชนีน้ำมาตรฐาน", "สถานะ", "แหล่งข้อมูล"];
    const csvRows = visible.map((basin) => [basin.code, basin.name, basin.date, basin.rainfall ?? "", basin.reservoir, basin.supply, basin.demand, basin.balance, basin.droughtIndex, basin.runoffIndex, basin.status, basin.sourceStatus]);
    const quote = (value: unknown) => `"${String(value).replaceAll('"', '""')}"`;
    archive.file("water-balance/ข้อมูลภาษาไทย.csv", "\ufeff" + [csvHeaders, ...csvRows].map((row) => row.map(quote).join(",")).join("\r\n"));
    const blob = await archive.generateAsync({ type: "blob", compression: "STORE" });
    downloadBlob(blob, `water-balance-${selected}.zip`);
  }

  async function exportPng() {
    if (!mapCaptureRef.current) throw new Error("ยังไม่มีแผนที่ให้ส่งออก");
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(mapCaptureRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#eaf1ee" });
    const response = await fetch(dataUrl);
    downloadBlob(await response.blob(), `water-balance-map-${selected}-${metric}.png`);
  }

  async function handleExport(format: "CSV" | "SHP" | "PNG") {
    setExporting(format);
    setExportState("");
    try {
      if (format === "CSV") await exportCsv();
      if (format === "SHP") await exportShapefile();
      if (format === "PNG") await exportPng();
      setExportState(`ส่งออก ${format} แล้ว`);
    } catch (error) {
      setExportState(error instanceof Error ? error.message : "ส่งออกไม่สำเร็จ");
    } finally {
      setExporting(null);
    }
  }

  return (
    <section className="explorer" id="basin-explorer">
      <div className="explorer-workspace">
        <aside className="filter-panel" aria-label="ตัวเลือกข้อมูล">
          <div className="panel-title"><span>01</span><div><small>DATA FILTER</small><h3>ตัวเลือกข้อมูล</h3></div></div>
          <div className="filter-fields">
            <label><span>ขอบเขตลุ่มน้ำ</span><select value={selected} onChange={(event) => setSelected(event.target.value)}><option value="all">ทุกลุ่มน้ำ</option>{basins.map((basin) => <option value={basin.id} key={basin.id}>ลุ่มน้ำ{basin.name}</option>)}</select></label>
            <label><span>เลือกระดับขอบเขต</span><select value={boundary} onChange={(event) => setBoundary(event.target.value)}><option value="main">ลุ่มน้ำหลัก</option><option value="sub">ลุ่มน้ำสาขา</option><option value="admin">จังหวัด</option></select></label>
            {boundary === "admin" && <div className="province-picker">
              <label htmlFor="province-search">ค้นหาจังหวัด</label>
              <input id="province-search" type="search" value={provinceQuery} onChange={(event) => setProvinceQuery(event.target.value)} placeholder="พิมพ์ชื่อหรือรหัสจังหวัด" />
              <div className="province-picker-actions"><span>เลือกแล้ว {provinceCodes.length} จังหวัด</span><button type="button" onClick={() => setProvinceCodes([])}>ล้าง</button></div>
              <div className="province-checklist" role="group" aria-label="เลือกจังหวัด">
                {matchingProvinces.length ? matchingProvinces.map((province) => <label key={province.code}><input type="checkbox" checked={provinceCodes.includes(province.code)} onChange={(event) => setProvinceCodes((current) => event.target.checked ? [...current, province.code] : current.filter((code) => code !== province.code))} /><span>{province.name}</span></label>) : <small>{provinceList.length ? "ไม่พบจังหวัดที่ค้นหา" : "กำลังโหลดรายชื่อจังหวัด…"}</small>}
              </div>
            </div>}
            <label><span>ช่วงคาดการณ์</span><select value={horizon} onChange={(event) => setHorizon(event.target.value)}><option value="7days">ล่วงหน้า 7 วัน</option><option value="6months">ล่วงหน้า 6 เดือน</option></select></label>
            <label><span>ผลที่แสดงบนแผนที่และตาราง</span><select value={metric} onChange={(event) => setMetric(event.target.value as MapMetric)}><option value="reservoir">ปริมาณสะสม</option><option value="balance">ปริมาณสมดุลน้ำ</option><option value="droughtIndex">ความเสี่ยงการขาดแคลนน้ำเพื่อการเกษตร</option><option value="runoffIndex">ดัชนีน้ำมาตรฐาน</option><option value="rainfall">ปริมาณฝน</option><option value="supply">น้ำต้นทุน</option><option value="demand">ความต้องการใช้น้ำ</option></select></label>
            <button type="button" onClick={() => { setSelected("all"); setBoundary("main"); setHorizon("7days"); setMetric("balance"); setProvinceQuery(""); setProvinceCodes([]); }}>ล้างตัวกรอง</button>
          </div>
          <div className="export-panel">
            <span>ส่งออกข้อมูลที่เลือก</span>
            <div>
              <button type="button" disabled={Boolean(exporting) || visible.length === 0} onClick={() => void handleExport("CSV")}><b>CSV</b><small>ตารางข้อมูล</small></button>
              <button type="button" disabled={Boolean(exporting) || visible.length === 0} onClick={() => void handleExport("SHP")}><b>SHP</b><small>ขอบเขต ZIP</small></button>
              <button type="button" disabled={Boolean(exporting)} onClick={() => void handleExport("PNG")}><b>PNG</b><small>ภาพแผนที่</small></button>
            </div>
            <small className="export-message" aria-live="polite">{exporting ? `กำลังสร้างไฟล์ ${exporting}...` : exportState || `เลือก ${visible.length} ลุ่มน้ำ • ${METRICS[metric].label}`}</small>
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
          <div className="map-toolbar"><div className="panel-title"><span>02</span><div><small>INTERACTIVE MAP</small><h3>{selectedBasin ? `แผนที่ลุ่มน้ำ${selectedBasin.name}` : "แผนที่ลุ่มน้ำประเทศไทย"}</h3></div></div><small>{METRICS[metric].label} ({METRICS[metric].unit})</small></div>
          <BasinLeafletMap mapCaptureRef={mapCaptureRef} basins={currentBasins} metric={metric} selected={selected} boundary={boundary} provinceCodes={provinceCodes} onSelect={(id) => setSelected(selected === id ? "all" : id)} />
          <div className="map-legend"><span>ค่าน้อย</span><i className="metric-gradient" /><span>ค่ามาก</span><small>{METRICS[metric].label} • กดพื้นที่เพื่อกรองผล</small></div>
        </article>

        <article className="data-card workspace-data-card" id="data-table">
          <div className="table-heading"><div className="panel-title"><span>03</span><div><small>{METRICS[metric].label.toUpperCase()}</small><h3>{boundary === "admin" && provinceCodes.length ? "ผลตามจังหวัดที่เลือก" : selectedBasin ? `ข้อมูลลุ่มน้ำ${selectedBasin.name}` : "ตารางผลวิเคราะห์"}</h3></div></div><span>{boundary === "admin" && provinceCodes.length ? `${provinceRows.length} รายการ` : selected === "all" ? "สรุปทุกลุ่มน้ำ" : `ลุ่มน้ำย่อย ${subareas.length} รายการ`}</span></div>
          <div className="table-wrap workspace-table-wrap">
            <table className="basin-data-table compact-table">
              {boundary === "admin" && provinceCodes.length ? <>
                <thead><tr><th>จังหวัด</th><th>ลุ่มน้ำ</th><th>วันที่ข้อมูล</th><th>{metricHeading(metric)}</th></tr></thead>
                <tbody>
                  {provinceDataState === "loading" && <tr><td colSpan={4}>กำลังโหลดข้อมูลของจังหวัดที่เลือก…</td></tr>}
                  {provinceDataState === "error" && <tr><td colSpan={4}>โหลดข้อมูลจังหวัดไม่สำเร็จ</td></tr>}
                  {provinceDataState === "ready" && provinceRows.length === 0 && <tr><td colSpan={4}>ไม่มีข้อมูลคาดการณ์สำหรับจังหวัดที่เลือกในแหล่งข้อมูลนี้</td></tr>}
                  {provinceDataState === "ready" && provinceRows.map((row) => <tr key={`${row.id}-${row.date}`}>
                    <td><strong>{row.provinceName}</strong><small>{row.provinceCode}</small></td><td>ลุ่มน้ำ{row.basinName}</td><td>{displayDate(row.date)}</td><td className={(metricValue(row, metric) ?? 0) < 0 ? "negative-text" : "positive-text"}>{metricText(row, metric)}</td>
                  </tr>)}
                </tbody>
              </> : selected === "all" ? <>
                <thead><tr><th>ลุ่มน้ำ</th><th>วันที่ข้อมูล</th><th>{metricHeading(metric)}</th><th>สถานะ</th><th>แหล่งข้อมูล</th></tr></thead>
                <tbody>{horizonState === "loading" && <tr><td colSpan={5}>กำลังโหลดข้อมูลคาดการณ์ 6 เดือน…</td></tr>}{horizonState === "error" && <tr><td colSpan={5}>โหลดข้อมูลคาดการณ์ 6 เดือนไม่สำเร็จ</td></tr>}{horizonState === "ready" && visible.length === 0 && <tr><td colSpan={5}>{selected === "ping" ? "แหล่งข้อมูลลุ่มน้ำปิงยังไม่มีข้อมูลคาดการณ์ 6 เดือน" : "ไม่มีข้อมูลในช่วงคาดการณ์นี้"}</td></tr>}{horizon === "6months" ? visible.flatMap((basin) => (horizonSeries[basin.id] ?? []).map((point) => {
                  const status = point.balance < 0 ? "ขาดสมดุล" : point.rainfall !== null && point.rainfall < 10 ? "เฝ้าระวัง" : "สมดุลดี";
                  return <tr key={`${basin.id}-${point.date}`}>
                    <td><span className={`table-basin-dot ${basin.id}`} /><strong>{basin.name}</strong><small>{basin.code}</small></td>
                    <td>{displayDate(point.date)}</td><td className={(metricValue(point, metric) ?? 0) < 0 ? "negative-text" : "positive-text"}>{metricText(point, metric)}</td>
                    <td><span className={`status ${status === "เฝ้าระวัง" ? "watch" : status === "ขาดสมดุล" ? "critical" : ""}`}>{status}</span></td>
                    <td>ออนไลน์</td>
                  </tr>;
                })) : visible.map((basin) => <tr key={basin.id}>
                  <td><span className={`table-basin-dot ${basin.id}`} /><strong>{basin.name}</strong><small>{basin.code}</small></td>
                  <td>{displayDate(basin.date)}</td><td className={(metricValue(basin, metric) ?? 0) < 0 ? "negative-text" : "positive-text"}>{metricText(basin, metric)}</td>
                  <td><span className={`status ${basin.status === "เฝ้าระวัง" ? "watch" : basin.status === "ขาดสมดุล" ? "critical" : ""}`}>{basin.status}</span></td>
                  <td>{basin.sourceStatus === "live" ? "ออนไลน์" : "ข้อมูลสำรอง"}<a className="row-detail" href={`/forecast/${basin.id}`}>รายละเอียด →</a></td>
                </tr>)}</tbody>
              </> : <>
                <thead><tr><th>รหัส</th><th>ลุ่มน้ำย่อย</th>{horizon === "6months" && <th>เดือนคาดการณ์</th>}<th>{metricHeading(metric)}</th></tr></thead>
                <tbody>
                  {subareaState === "loading" && <tr><td colSpan={horizon === "6months" ? 4 : 3}>กำลังโหลดข้อมูลลุ่มน้ำย่อย…</td></tr>}
                  {subareaState === "error" && <tr><td colSpan={horizon === "6months" ? 4 : 3}>{horizon === "6months" && selected === "ping" ? "ลุ่มน้ำปิงยังไม่มีแหล่งข้อมูลคาดการณ์ 6 เดือน" : "โหลดข้อมูลลุ่มน้ำย่อยไม่สำเร็จ"}</td></tr>}
                  {subareaState === "ready" && subareas.length === 0 && <tr><td colSpan={horizon === "6months" ? 4 : 3}>ไม่มีข้อมูลลุ่มน้ำย่อยจากแหล่งข้อมูล</td></tr>}
                  {subareaState === "ready" && subareas.map((area) => <tr key={`${area.id}-${area.date ?? "latest"}`}>
                    <td>{area.id}</td><td>{area.name}</td>{horizon === "6months" && <td>{area.date ?? "—"}</td>}<td className={(metricValue(area, metric) ?? 0) < 0 ? "negative-text" : "positive-text"}>{metricText(area, metric)}</td>
                  </tr>)}
                </tbody>
              </>}
            </table>
          </div>
          <div className="table-foot"><span><i /> {boundary === "admin" && provinceCodes.length ? `${provinceRows.length} รายการจังหวัดจากต้นทาง` : selected === "all" ? `ข้อมูล ${visible.filter((basin) => basin.sourceStatus === "live").length}/${visible.length} แหล่งออนไลน์${horizon === "6months" ? " • 6 เดือน" : ""}` : `${subareas.length} ลุ่มน้ำย่อย • ${selectedBasin ? displayDate(selectedBasin.date) : ""}`}</span><a href={boundary === "admin" && provinceCodes.length ? `/api/v1/provinces?${new URLSearchParams({ codes: provinceCodes.join(","), basins: selected === "all" ? "chi,mun" : selected, horizon })}` : selected === "all" ? `/api/v1/basins?horizon=${horizon}` : `/api/v1/basins/${selected}?horizon=${horizon}`}>JSON API ↗</a></div>
        </article>
      </div>
    </section>
  );
}
