import assert from "node:assert/strict";
import test from "node:test";

async function request(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the water balance overview", async () => {
  const response = await request("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Water Balance \| ศูนย์ข้อมูลสมดุลน้ำลุ่มน้ำ/);
  assert.match(html, /เห็นสถานการณ์น้ำทั้งหมด/);
  assert.match(html, /ปิง/);
  assert.match(html, /ชี/);
  assert.match(html, /มูล/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Your site is taking shape/i);
});

test("renders basin detail with basin-specific metadata", async () => {
  const response = await request("/forecast/chi");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>ลุ่มน้ำชี \| Water Balance<\/title>/i);
  assert.match(html, /สมดุลน้ำตามช่วงเวลา/);
  assert.doesNotMatch(html, /og:image/);
});

test("exposes the normalized basin API", async () => {
  const response = await request("/api/v1/basins");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.count, 3);
  assert.deepEqual(body.basins.map((basin) => basin.id), ["ping", "chi", "mun"]);
});
