(() => {
  const basins = {
    "06": { name: "ปิง", color: "#13877f", balance: 18.6, rainfall: 42.8, reservoir: 3210.4, supply: 294.3, demand: 275.7 },
    "04": { name: "ชี", color: "#75a78d", balance: 6.2, rainfall: 28.4, reservoir: 1084.2, supply: 181.5, demand: 175.3 },
    "05": { name: "มูล", color: "#3f7279", balance: -4.8, rainfall: 19.6, reservoir: 928.7, supply: 206.1, demand: 210.9 },
  };
  const samples = [
    { basin: "06", sub: "ลำน้ำปิงตอนบนส่วนที่ 1", province: "เชียงใหม่", rain: 52.3, reservoir: 982.5, supply: 74.6, demand: 69.2 },
    { basin: "06", sub: "ลำน้ำปิงตอนบนส่วนที่ 2", province: "เชียงใหม่", rain: 43.8, reservoir: 704.2, supply: 61.4, demand: 55.6 },
    { basin: "06", sub: "ลำน้ำแม่แตง", province: "เชียงใหม่", rain: 47.1, reservoir: 215.7, supply: 32.8, demand: 28.4 },
    { basin: "06", sub: "ลำน้ำกวง", province: "ลำพูน", rain: 28.2, reservoir: 183.4, supply: 26.3, demand: 30.6 },
    { basin: "04", sub: "ลำน้ำพอง", province: "ขอนแก่น", rain: 32.1, reservoir: 320.5, supply: 39.6, demand: 35.4 },
    { basin: "04", sub: "ลำน้ำชีตอนบน", province: "ชัยภูมิ", rain: 25.6, reservoir: 276.2, supply: 34.1, demand: 30.8 },
    { basin: "04", sub: "ลำน้ำยัง", province: "กาฬสินธุ์", rain: 21.7, reservoir: 188.3, supply: 28.2, demand: 29.4 },
    { basin: "04", sub: "ลำน้ำปาว", province: "มหาสารคาม", rain: 34.4, reservoir: 299.1, supply: 45.7, demand: 42.0 },
    { basin: "05", sub: "ลำตะคอง", province: "นครราชสีมา", rain: 16.3, reservoir: 238.1, supply: 41.8, demand: 47.5 },
    { basin: "05", sub: "ลำพระเพลิง", province: "นครราชสีมา", rain: 22.9, reservoir: 184.6, supply: 32.4, demand: 35.0 },
    { basin: "05", sub: "ลำปลายมาศ", province: "บุรีรัมย์", rain: 18.5, reservoir: 142.7, supply: 27.9, demand: 29.8 },
    { basin: "05", sub: "ลำน้ำมูลตอนล่าง", province: "อุบลราชธานี", rain: 20.8, reservoir: 363.3, supply: 50.6, demand: 53.1 },
  ].map((row) => ({ ...row, balance: Number((row.supply - row.demand).toFixed(1)) }));
  const metrics = {
    balance: { label: "ปริมาณสมดุลน้ำ", field: "balance", unit: "ล้าน ลบ.ม." },
    reservoir: { label: "ปริมาณสะสม", field: "reservoir", unit: "ล้าน ลบ.ม." },
    rainfall: { label: "ปริมาณฝน", field: "rainfall", unit: "มม." },
    supply: { label: "น้ำต้นทุน", field: "supply", unit: "ล้าน ลบ.ม." },
    demand: { label: "ความต้องการใช้น้ำ", field: "demand", unit: "ล้าน ลบ.ม." },
  };
  const monthLabels = ["ก.ย. 69", "ต.ค. 69", "พ.ย. 69", "ธ.ค. 69", "ม.ค. 70", "ก.พ. 70"];
  const colors = ["#b74d42", "#e99b4b", "#d8d76a", "#64a889", "#197b83"];
  const $ = (id) => document.getElementById(id);
  const number = (value) => new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const state = { basin: "all", horizon: "7days", metric: "balance", province: "", mapLayer: null, provinceLayer: null, map: null };

  function currentRows() {
    let rows = samples.filter((row) => (state.basin === "all" || row.basin === state.basin)
      && (!state.province || row.province.includes(state.province)));
    if (state.horizon === "6months") {
      rows = rows.flatMap((row) => monthLabels.map((period, index) => {
        const factor = [1, .96, .91, .87, .82, .78][index];
        const projected = { ...row, period };
        for (const key of ["rain", "reservoir", "supply", "demand", "balance"]) projected[key] = Number((row[key] * factor).toFixed(1));
        return projected;
      }));
    } else {
      rows = rows.map((row) => ({ ...row, period: "ล่วงหน้า 7 วัน" }));
    }
    return rows;
  }

  function colorFor(value, values) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const normalized = max === min ? .5 : (value - min) / (max - min);
    return colors[Math.min(colors.length - 1, Math.floor(normalized * colors.length))];
  }

  function getBasinMetric(basin) {
    const key = metrics[state.metric].field;
    if (key === "balance" || key === "rainfall" || key === "reservoir" || key === "supply" || key === "demand") return basin[key];
    return basin.balance;
  }

  function updateMapStyle() {
    if (!state.mapLayer) return;
    const values = Object.values(basins).map(getBasinMetric);
    state.mapLayer.setStyle((feature) => {
      const code = String(feature?.properties?.MB_CODE || "");
      const basin = basins[code];
      const active = basin && (state.basin === "all" || state.basin === code);
      return {
        color: "#fff", weight: active ? 1.8 : 1.1, opacity: 1,
        fillColor: active ? colorFor(getBasinMetric(basin), values) : "#c8d0cd",
        fillOpacity: active ? .83 : .42,
      };
    });
    state.mapLayer.eachLayer((layer) => {
      const code = String(layer.feature?.properties?.MB_CODE || "");
      const basin = basins[code];
      if (!basin || !layer.setTooltipContent) return;
      const name = layer.feature?.properties?.MBASIN_T || "ลุ่มน้ำ";
      layer.setTooltipContent(`<div class="demo-tooltip"><small>ลุ่มน้ำ${name} • รหัส ${code}</small><b>${number(getBasinMetric(basin))}</b><small>${metrics[state.metric].label} (${metrics[state.metric].unit}) • ค่าจำลอง</small></div>`);
    });
  }

  function render() {
    const rows = currentRows();
    const metric = metrics[state.metric];
    const basinLabel = state.basin === "all" ? "ทุกลุ่มน้ำ" : `ลุ่มน้ำ${basins[state.basin]?.name || ""}`;
    $("selected-name").textContent = basinLabel;
    $("summary-period").textContent = `คาดการณ์${state.horizon === "7days" ? " 7 วัน" : " 6 เดือน"} • ข้อมูลตัวอย่าง`;
    $("summary-count").textContent = `${rows.length} รายการ`;
    const average = rows.length ? rows.reduce((sum, row) => sum + row.balance, 0) / rows.length : 0;
    $("summary-balance").textContent = rows.length ? `${number(average)} ลบ.ม.` : "—";
    $("metric-chip").textContent = metric.label;
    $("record-count").textContent = `${rows.length} รายการ`;
    $("result-rows").innerHTML = rows.map((row) => `<tr><td>${row.sub}</td><td>${row.province}</td><td>${row.period}</td><td>${number(row.rain)}</td><td>${number(row.supply)}</td><td>${number(row.demand)}</td><td>${number(row.balance)}</td><td><span class="status ${row.balance < 0 ? "watch" : ""}">${row.balance < 0 ? "เฝ้าระวัง" : "สมดุล"}</span></td></tr>`).join("") || `<tr><td colspan="8" style="text-align:center;color:#78908e;padding:36px">ไม่พบข้อมูลตัวอย่างที่ตรงกับตัวกรอง</td></tr>`;
    updateMapStyle();
  }

  function exportCsv() {
    const rows = currentRows();
    const header = ["ลุ่มน้ำ", "ลุ่มน้ำย่อย", "จังหวัด", "ช่วงเวลา", "ปริมาณฝน (มม.)", "น้ำต้นทุน (ล้าน ลบ.ม.)", "ความต้องการใช้น้ำ (ล้าน ลบ.ม.)", "สมดุลน้ำ (ล้าน ลบ.ม.)"];
    const body = rows.map((row) => [basins[row.basin].name, row.sub, row.province, row.period, row.rain, row.supply, row.demand, row.balance]);
    const csv = [header, ...body].map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    link.download = "water-balance-demo.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function setSelectedBasin(code) {
    state.basin = code;
    $("basin-select").value = code;
    render();
    const featureLayer = state.mapLayer?.getLayers().find((layer) => String(layer.feature?.properties?.MB_CODE || "") === code);
    if (featureLayer?.getBounds) state.map.fitBounds(featureLayer.getBounds(), { padding: [32, 32], maxZoom: 8 });
  }

  async function initMap() {
    const map = L.map("map", { minZoom: 5, maxZoom: 12, scrollWheelZoom: true }).setView([15.4, 101.1], 6);
    state.map = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
    try {
      const geojson = await fetch("./data/main-basins.geojson").then((response) => { if (!response.ok) throw new Error("boundary"); return response.json(); });
      state.mapLayer = L.geoJSON(geojson, {
        style: { color: "#fff", weight: 1.2, fillColor: "#c8d0cd", fillOpacity: .42 },
        onEachFeature: (feature, layer) => {
          const code = String(feature.properties?.MB_CODE || "");
          const basin = basins[code];
          const name = feature.properties?.MBASIN_T || "ลุ่มน้ำ";
          layer.bindTooltip(`<div class="demo-tooltip"><small>ลุ่มน้ำ${name} • รหัส ${code}</small><b>${basin ? number(getBasinMetric(basin)) : "ไม่มีข้อมูลตัวอย่าง"}</b><small>${basin ? `${metrics[state.metric].label} (${metrics[state.metric].unit}) • ค่าจำลอง` : "ยังไม่มีข้อมูลจำลองของลุ่มน้ำนี้"}</small></div>`, { sticky: true, direction: "auto", className: "basin-tooltip" });
          layer.on({ mouseover: () => layer.setStyle({ weight: 2.8, fillOpacity: .95 }), mouseout: () => state.mapLayer?.resetStyle(layer), click: () => { if (basin) setSelectedBasin(code); } });
        },
      }).addTo(map);
      map.fitBounds(state.mapLayer.getBounds(), { padding: [18, 18] });
      updateMapStyle();
    } catch {
      $("map").insertAdjacentHTML("beforeend", '<div class="map-fallback">โหลดขอบเขตแผนที่ไม่สำเร็จ • ลองรีเฟรชอีกครั้ง</div>');
    }
  }

  $("basin-select").addEventListener("change", (event) => { state.basin = event.target.value; render(); if (state.basin === "all") state.map.fitBounds(state.mapLayer.getBounds(), { padding: [18, 18] }); else setSelectedBasin(state.basin); });
  $("horizon-select").addEventListener("change", (event) => { state.horizon = event.target.value; render(); });
  $("metric-select").addEventListener("change", (event) => { state.metric = event.target.value; render(); });
  $("province-search").addEventListener("input", (event) => { state.province = event.target.value.trim(); render(); });
  $("province-toggle").addEventListener("change", async (event) => {
    if (event.target.checked) {
      if (!state.provinceLayer) {
        try {
          const geojson = await fetch("./data/thai-provinces.geojson").then((response) => { if (!response.ok) throw new Error("province boundary"); return response.json(); });
          const provinces = new Set();
          state.provinceLayer = L.geoJSON(geojson, { style: { color: "#47625f", weight: .65, opacity: .65, fillOpacity: 0 }, onEachFeature: (feature) => { const p = feature.properties || {}; if (p.PROV_CODE && p.PROV_NAME) provinces.add(`${p.PROV_NAME} (${p.PROV_CODE})`); } });
          $("province-options").innerHTML = Array.from(provinces).sort().map((name) => `<option value="${name.replace(/ \(\d+\)$/, "")}"></option>`).join("");
        } catch { event.target.checked = false; return; }
      }
      state.provinceLayer.addTo(state.map);
    } else if (state.provinceLayer) state.map.removeLayer(state.provinceLayer);
  });
  $("reset-button").addEventListener("click", () => {
    state.basin = "all"; state.horizon = "7days"; state.metric = "balance"; state.province = "";
    $("basin-select").value = "all"; $("horizon-select").value = "7days"; $("metric-select").value = "balance"; $("province-search").value = ""; $("province-toggle").checked = false;
    if (state.provinceLayer) state.map.removeLayer(state.provinceLayer);
    render(); if (state.mapLayer) state.map.fitBounds(state.mapLayer.getBounds(), { padding: [18, 18] });
  });
  $("csv-button").addEventListener("click", exportCsv);
  if (window.L) initMap(); else $("map").innerHTML = '<div class="map-fallback">กำลังโหลดแผนที่ • โปรดตรวจการเชื่อมต่ออินเทอร์เน็ต</div>';
  render();
})();
