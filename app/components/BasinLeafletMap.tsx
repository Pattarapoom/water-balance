"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJsonObject, Feature, Geometry } from "geojson";
import type { GeoJSON as LeafletGeoJSON, Map as LeafletMap, Path, PathOptions, Polygon } from "leaflet";

type BasinProperties = { MB_CODE?: string; MBASIN_T?: string; MBASIN_E?: string };
type ProvinceProperties = { PROV_CODE?: string; PROV_NAME?: string; FIRST_FIRS?: string };

const BASIN_IDS: Record<string, string> = { "04": "chi", "05": "mun", "06": "ping" };
const COLORS: Record<string, string> = { "04": "#79a88e", "05": "#376f78", "06": "#11817b" };

function basinStyle(feature: Feature<Geometry, BasinProperties> | undefined, selected: string): PathOptions {
  const code = feature?.properties?.MB_CODE ?? "";
  const id = BASIN_IDS[code];
  const active = selected === "all" || selected === id;
  return {
    color: id ? "#ffffff" : "#547b78",
    weight: selected === id ? 3.5 : id ? 1.8 : 0.7,
    opacity: id ? 1 : 0.55,
    fillColor: COLORS[code] ?? "#b7cbc6",
    fillOpacity: id ? (active ? 0.78 : 0.18) : selected === "all" ? 0.25 : 0.09,
  };
}

export default function BasinLeafletMap({ selected, boundary, onSelect }: { selected: string; boundary: string; onSelect: (id: string) => void }) {
  const elementRef = useRef<HTMLDivElement>(null);
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
        }).addTo(map);

        const [basinResponse, provinceResponse] = await Promise.all([
          fetch("/api/geo/main-basins"),
          fetch("/api/geo/provinces"),
        ]);
        if (!basinResponse.ok || !provinceResponse.ok) throw new Error("GeoJSON unavailable");
        const [basinData, provinceData] = await Promise.all([basinResponse.json(), provinceResponse.json()]) as [GeoJsonObject, GeoJsonObject];
        if (disposed) return;

        const provinceLayer = L.geoJSON(provinceData, {
          style: { color: "#506b69", weight: 0.7, opacity: 0.7, fillOpacity: 0 },
          interactive: false,
          onEachFeature: (feature: Feature<Geometry, ProvinceProperties>, layer) => {
            if (feature.properties?.PROV_NAME) layer.bindTooltip(feature.properties.PROV_NAME, { sticky: true, className: "province-tooltip" });
          },
        });
        provinceLayerRef.current = provinceLayer;

        const basinLayer = L.geoJSON(basinData, {
          style: (feature) => basinStyle(feature as Feature<Geometry, BasinProperties>, selected),
          onEachFeature: (feature: Feature<Geometry, BasinProperties>, layer) => {
            const properties = feature.properties ?? {};
            const code = properties.MB_CODE ?? "—";
            const id = BASIN_IDS[code];
            const status = id ? "คลิกเพื่อดูข้อมูลสมดุลน้ำ" : "ยังไม่เชื่อมข้อมูลสมดุลน้ำ";
            layer.bindTooltip(`<strong>${code} • ${properties.MBASIN_T ?? "ลุ่มน้ำ"}</strong><br><span>${properties.MBASIN_E ?? ""}</span><br><small>${status}</small>`, { sticky: true, className: "basin-tooltip" });
            layer.on({
              mouseover: () => (layer as Path).setStyle({ weight: id ? 3.5 : 1.5, fillOpacity: id ? 0.88 : 0.42 }),
              mouseout: () => basinLayerRef.current?.resetStyle(layer),
              click: () => { if (id) selectRef.current(id); },
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
    layer.setStyle((feature) => basinStyle(feature as Feature<Geometry, BasinProperties>, selected));
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
  }, [selected]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = provinceLayerRef.current;
    if (!map || !layer) return;
    if (showProvinces) layer.addTo(map);
    else map.removeLayer(layer);
  }, [showProvinces, state]);

  return (
    <div className="leaflet-shell">
      <div ref={elementRef} className="leaflet-map" aria-label="แผนที่ Leaflet แสดงขอบเขตลุ่มน้ำหลักและจังหวัดของประเทศไทย" />
      <div className="leaflet-layer-control">
        <button type="button" className={showProvinces ? "active" : ""} aria-pressed={showProvinces} onClick={() => setShowProvinces((value) => !value)}><i /> ขอบเขตจังหวัด</button>
        <span><i className={state} /> {state === "loading" ? "กำลังโหลด GeoJSON" : state === "ready" ? "GeoJSON พร้อมใช้งาน" : "โหลด GeoJSON ไม่สำเร็จ"}</span>
      </div>
      {state === "error" && <div className="map-error">ไม่สามารถโหลดชั้นข้อมูลแผนที่ได้ กรุณาลองใหม่อีกครั้ง</div>}
    </div>
  );
}
