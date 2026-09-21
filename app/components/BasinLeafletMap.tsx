"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { GeoJsonObject, Feature, Geometry } from "geojson";
import type { GeoJSON as LeafletGeoJSON, LeafletMouseEvent, Map as LeafletMap, Path, PathOptions, Polygon } from "leaflet";
import type { BasinSummary } from "../../lib/water-data";

type BasinProperties = { MB_CODE?: string; MBASIN_T?: string; MBASIN_E?: string };
type ProvinceProperties = { PROV_CODE?: string; PROV_NAME?: string; FIRST_FIRS?: string };

const BASIN_IDS: Record<string, string> = { "04": "chi", "05": "mun", "06": "ping" };
const METRIC_COLORS = ["#197b83", "#64a889", "#d3cc66", "#e99b4b", "#c94d42"];
const number = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
type MapMetric = "reservoir" | "balance" | "droughtIndex" | "runoffIndex" | "rainfall" | "supply" | "demand";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function tooltipContent(properties: BasinProperties, basin?: BasinSummary) {
  const code = escapeHtml(properties.MB_CODE ?? "—");
  const name = escapeHtml(properties.MBASIN_T ?? "ลุ่มน้ำ");
  const nameEn = escapeHtml(properties.MBASIN_E ?? "");
  if (!basin) {
    return `<div class="water-tooltip-card"><header><span>รหัสลุ่มน้ำ ${code}</span><strong>ลุ่มน้ำ${name}</strong><small>${nameEn}</small></header><div class="tooltip-empty"><b>ยังไม่เชื่อมข้อมูลสมดุลน้ำ</b><span>เพิ่มแหล่งข้อมูลได้จาก Admin Console</span></div></div>`;
  }
  const statusClass = basin.balance < 0 ? "negative" : "positive";
  const sourceLabel = basin.sourceStatus === "live" ? "ข้อมูลจากต้นทาง" : "ข้อมูลสำรองล่าสุด";
  return `<div class="water-tooltip-card">
    <header><span>รหัสลุ่มน้ำ ${code}</span><strong>ลุ่มน้ำ${name}</strong><small>${nameEn}</small></header>
    <dl>
      <div><dt>วันที่ข้อมูล</dt><dd>${escapeHtml(basin.date)}</dd></div>
      <div><dt>ปริมาณสะสม</dt><dd>${number.format(basin.reservoir)} <small>ล้าน ลบ.ม.</small></dd></div>
      <div><dt>ปริมาณฝน</dt><dd>${basin.rainfall == null ? "—" : number.format(basin.rainfall)} <small>มม.</small></dd></div>
      <div><dt>น้ำต้นทุน</dt><dd>${number.format(basin.supply)} <small>ล้าน ลบ.ม.</small></dd></div>
      <div><dt>ความต้องการใช้น้ำ</dt><dd>${number.format(basin.demand)} <small>ล้าน ลบ.ม.</small></dd></div>
      <div class="tooltip-balance"><dt>สมดุลน้ำ</dt><dd class="${statusClass}">${number.format(basin.balance)} <small>ล้าน ลบ.ม.</small></dd></div>
      <div><dt>ความเสี่ยงขาดแคลนน้ำเกษตร</dt><dd>${number.format(basin.droughtIndex)}</dd></div>
      <div><dt>ดัชนีน้ำมาตรฐาน</dt><dd>${number.format(basin.runoffIndex)}</dd></div>
    </dl>
    <footer><span><i class="${basin.sourceStatus}"></i>${sourceLabel}</span><b>${escapeHtml(basin.status)}</b></footer>
  </div>`;
}

function metricValue(basin: BasinSummary, metric: MapMetric) {
  switch (metric) {
    case "reservoir": return basin.reservoir;
    case "balance": return basin.balance;
    case "droughtIndex": return basin.droughtIndex;
    case "runoffIndex": return basin.runoffIndex;
    case "rainfall": return basin.rainfall;
    case "supply": return basin.supply;
    case "demand": return basin.demand;
  }
}

function basinStyle(feature: Feature<Geometry, BasinProperties> | undefined, selected: string, metric: MapMetric, basins: BasinSummary[]): PathOptions {
  const code = feature?.properties?.MB_CODE ?? "";
  const id = BASIN_IDS[code];
  const basin = basins.find((item) => item.id === id);
  const value = basin ? metricValue(basin, metric) : null;
  const values = basins.map((item) => metricValue(item, metric)).filter((item): item is number => item !== null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const normalized = value === null || max === min ? 0.5 : (value - min) / (max - min);
  const colorIndex = Math.min(METRIC_COLORS.length - 1, Math.floor(normalized * METRIC_COLORS.length));
  return {
    color: "#ffffff",
    weight: selected === id ? 2.8 : 1.1,
    opacity: 1,
    fillColor: value === null ? "#c8cdd1" : METRIC_COLORS[colorIndex],
    fillOpacity: 0.82,
  };
}

export default function BasinLeafletMap({ basins, metric, selected, boundary, provinceCodes, mapCaptureRef, onSelect }: { basins: BasinSummary[]; metric: MapMetric; selected: string; boundary: string; provinceCodes: string[]; mapCaptureRef: MutableRefObject<HTMLDivElement | null>; onSelect: (id: string) => void }) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const basinLayerRef = useRef<LeafletGeoJSON | null>(null);
  const provinceLayerRef = useRef<LeafletGeoJSON | null>(null);
  const selectRef = useRef(onSelect);
  const [showProvinces, setShowProvinces] = useState(boundary === "admin");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  selectRef.current = onSelect;

  useEffect(() => {
    setShowProvinces(boundary === "admin");
  }, [boundary]);

  useEffect(() => {
    let disposed = false;

    async function setup() {
      if (!elementRef.current || mapRef.current) return;
      try {
        const L = await import("leaflet");
        if (disposed || !elementRef.current) return;
        const map = L.map(elementRef.current, { zoomControl: true, minZoom: 5, maxZoom: 12, attributionControl: true }).setView([15.4, 101.1], 6);
        mapRef.current = map;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
          crossOrigin: true,
        }).addTo(map);

        const [basinResponse, provinceResponse] = await Promise.all([
          fetch("/api/geo/main-basins"),
          fetch("/api/geo/provinces"),
        ]);
        if (!basinResponse.ok || !provinceResponse.ok) throw new Error("GeoJSON unavailable");
        const [basinData, provinceData] = await Promise.all([basinResponse.json(), provinceResponse.json()]) as [GeoJsonObject, GeoJsonObject];
        if (disposed) return;

        const provinceLayer = L.geoJSON(provinceData, {
          style: (feature) => {
            const active = provinceCodes.includes(String((feature?.properties as ProvinceProperties | undefined)?.PROV_CODE ?? ""));
            return { color: active ? "#ffffff" : "#506b69", weight: active ? 2 : 0.7, opacity: active ? 1 : 0.7, fillColor: "#168477", fillOpacity: active ? 0.34 : 0 };
          },
          interactive: false,
          onEachFeature: (feature: Feature<Geometry, ProvinceProperties>, layer) => {
            if (feature.properties?.PROV_NAME) layer.bindTooltip(feature.properties.PROV_NAME, { sticky: true, className: "province-tooltip" });
          },
        });
        provinceLayerRef.current = provinceLayer;

        const basinLayer = L.geoJSON(basinData, {
          style: (feature) => basinStyle(feature as Feature<Geometry, BasinProperties>, selected, metric, basins),
          onEachFeature: (feature: Feature<Geometry, BasinProperties>, layer) => {
            const properties = feature.properties ?? {};
            const code = properties.MB_CODE ?? "—";
            const id = BASIN_IDS[code];
            const basin = basins.find((item) => item.id === id);
            layer.bindTooltip(tooltipContent(properties, basin), { sticky: true, direction: "auto", offset: [0, 8], opacity: 1, className: "basin-tooltip water-data-tooltip" });
            const keepTooltipInMap = (event: LeafletMouseEvent) => {
              const tooltip = layer.getTooltip();
              if (!tooltip) return;
              const point = event.containerPoint;
              const size = map.getSize();
              const node = tooltip.getElement();
              const width = node?.offsetWidth ?? 290;
              const height = node?.offsetHeight ?? 420;
              const margin = 12;

              // Leaflet's `auto` only flips left/right. Flip vertically near the
              // map's top and bottom edges so tall data cards remain visible.
              const verticalRisk = point.y < height / 2 + margin || point.y > size.y - height / 2 - margin;
              const horizontalRisk = point.x < width / 2 + margin || point.x > size.x - width / 2 - margin;
              if (verticalRisk && (!horizontalRisk || point.y < height / 2 + margin && point.y <= size.y - point.y)) {
                tooltip.options.direction = point.y < height / 2 + margin ? "bottom" : "top";
              } else if (horizontalRisk) {
                tooltip.options.direction = point.x < width / 2 + margin ? "right" : "left";
              } else {
                tooltip.options.direction = "auto";
              }
              layer.openTooltip(event.latlng);
            };
            layer.on({
              mouseover: (event) => {
                (layer as Path).setStyle({ weight: id ? 3.5 : 1.5, fillOpacity: 0.9 });
                keepTooltipInMap(event);
              },
              mousemove: keepTooltipInMap,
              mouseout: () => basinLayerRef.current?.resetStyle(layer),
              click: (event) => { layer.openTooltip(event.latlng); if (id) selectRef.current(id); },
            });
          },
        }).addTo(map);
        basinLayerRef.current = basinLayer;
        map.fitBounds(basinLayer.getBounds(), { padding: [14, 14] });
        if (boundary === "admin") provinceLayer.addTo(map);
        setState("ready");
      } catch {
        setState("error");
      }
    }

    setup();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      basinLayerRef.current = null;
      provinceLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = basinLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.setStyle((feature) => basinStyle(feature as Feature<Geometry, BasinProperties>, selected, metric, basins));
    if (selected === "all") {
      map.fitBounds(layer.getBounds(), { padding: [14, 14] });
      return;
    }
    layer.eachLayer((item) => {
      const feature = (item as typeof item & { feature?: Feature<Geometry, BasinProperties> }).feature;
      if (BASIN_IDS[feature?.properties?.MB_CODE ?? ""] === selected && "getBounds" in item) {
        map.fitBounds((item as Polygon).getBounds(), { padding: [28, 28], maxZoom: 7 });
      }
    });
  }, [selected, metric, basins]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = provinceLayerRef.current;
    if (!map || !layer) return;
    if (showProvinces) layer.addTo(map);
    else map.removeLayer(layer);
  }, [showProvinces, state]);

  useEffect(() => {
    const layer = provinceLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.setStyle((feature) => {
      const active = provinceCodes.includes(String((feature?.properties as ProvinceProperties | undefined)?.PROV_CODE ?? ""));
      return { color: active ? "#ffffff" : "#506b69", weight: active ? 2 : 0.7, opacity: active ? 1 : 0.7, fillColor: "#168477", fillOpacity: active ? 0.34 : 0 };
    });
    if (provinceCodes.length) {
      let selectedBounds: ReturnType<LeafletMap["getBounds"]> | null = null;
      layer.eachLayer((item) => {
        const feature = (item as typeof item & { feature?: Feature<Geometry, ProvinceProperties> }).feature;
        if (!provinceCodes.includes(feature?.properties?.PROV_CODE ?? "") || !("getBounds" in item)) return;
        const bounds = (item as Polygon).getBounds();
        if (selectedBounds) selectedBounds.extend(bounds);
        else selectedBounds = bounds;
      });
      if (selectedBounds) map.fitBounds(selectedBounds, { padding: [28, 28], maxZoom: 8 });
    }
  }, [provinceCodes, state]);

  return (
    <div className="leaflet-shell">
      <div ref={(element) => { elementRef.current = element; mapCaptureRef.current = element; }} className="leaflet-map" aria-label="แผนที่ Leaflet แสดงขอบเขตลุ่มน้ำหลักและจังหวัดของประเทศไทย" />
      <div className="leaflet-layer-control">
        <button type="button" className={showProvinces ? "active" : ""} aria-pressed={showProvinces} onClick={() => setShowProvinces((value) => !value)}><i /> ขอบเขตจังหวัด</button>
        <span><i className={state} /> {state === "loading" ? "กำลังโหลด GeoJSON" : state === "ready" ? "GeoJSON พร้อมใช้งาน" : "โหลด GeoJSON ไม่สำเร็จ"}</span>
      </div>
      {state === "error" && <div className="map-error">ไม่สามารถโหลดชั้นข้อมูลแผนที่ได้ กรุณาลองใหม่อีกครั้ง</div>}
    </div>
  );
}
