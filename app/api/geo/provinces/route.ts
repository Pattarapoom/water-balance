const SOURCE = "https://s2s.hii.or.th/simplified/THA_adm1.json";

export async function GET() {
  try {
    const upstream = await fetch(SOURCE, { signal: AbortSignal.timeout(15000) });
    if (!upstream.ok) throw new Error(`Upstream ${upstream.status}`);
    return new Response(await upstream.arrayBuffer(), {
      headers: {
        "content-type": "application/geo+json; charset=utf-8",
        "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        "x-geojson-source": SOURCE,
      },
    });
  } catch {
    return Response.json({ error: "ไม่สามารถโหลดขอบเขตจังหวัดได้", source: SOURCE }, { status: 502 });
  }
}
