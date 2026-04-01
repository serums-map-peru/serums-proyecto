import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function dbPath() {
  return path.join(process.cwd(), "backend", "src", "data", "serums.db");
}

function openDb() {
  const p = dbPath();
  if (!fs.existsSync(p)) return null;
  return new DatabaseSync(p);
}

function cleanString(value: string | null) {
  const raw = String(value || "").trim();
  return raw.length ? raw : null;
}

function parseNumberParam(value: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseBooleanParam(value: unknown) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "1" || raw === "true" || raw === "yes" || raw === "y" || raw === "si" || raw === "sí") return true;
  if (raw === "0" || raw === "false" || raw === "no" || raw === "n") return false;
  return null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeIpressCode(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  return digits.padStart(8, "0");
}

function normalizeDepartmentKey(value: unknown) {
  const raw = String(value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z_]/g, "");
  return raw;
}

const DEPARTMENT_CENTERS: Record<string, { lat: number; lng: number }> = {
  AMAZONAS: { lat: -6.2317, lng: -77.869 },
  ANCASH: { lat: -9.5281, lng: -77.5289 },
  APURIMAC: { lat: -13.6352, lng: -72.8814 },
  AREQUIPA: { lat: -16.3988, lng: -71.5369 },
  AYACUCHO: { lat: -13.1631, lng: -74.2236 },
  CAJAMARCA: { lat: -7.164, lng: -78.5109 },
  CALLAO: { lat: -12.0566, lng: -77.1181 },
  CUSCO: { lat: -13.5319, lng: -71.9675 },
  HUANCAVELICA: { lat: -12.785, lng: -74.9717 },
  HUANUCO: { lat: -9.93, lng: -76.2422 },
  ICA: { lat: -14.0678, lng: -75.7286 },
  JUNIN: { lat: -12.0651, lng: -75.2049 },
  LA_LIBERTAD: { lat: -8.1117, lng: -79.0288 },
  LAMBAYEQUE: { lat: -6.7714, lng: -79.8409 },
  LIMA: { lat: -12.0464, lng: -77.0428 },
  LORETO: { lat: -3.7437, lng: -73.2516 },
  MADRE_DE_DIOS: { lat: -12.5933, lng: -69.1891 },
  MOQUEGUA: { lat: -17.1933, lng: -70.935 },
  PASCO: { lat: -10.684, lng: -76.2568 },
  PIURA: { lat: -5.1945, lng: -80.6328 },
  PUNO: { lat: -15.84, lng: -70.0219 },
  SAN_MARTIN: { lat: -6.4825, lng: -76.3733 },
  TACNA: { lat: -18.0146, lng: -70.2536 },
  TUMBES: { lat: -3.5669, lng: -80.4515 },
  UCAYALI: { lat: -8.3791, lng: -74.5539 },
};

const CSV_FILES = [
  "6675608-oferta-de-plazas-serums-2025-i-remunerado(2).csv",
  "6675608-oferta-de-plazas-serums-2025-i-equivalente.csv",
];

type AddressCache = {
  key: string;
  byCode: Map<string, string>;
};

let addressCache: AddressCache | null = null;

function buildCacheKey() {
  const parts: string[] = [];
  for (const rel of CSV_FILES) {
    const p = path.join(process.cwd(), rel);
    if (!fs.existsSync(p)) continue;
    const st = fs.statSync(p);
    parts.push(`${rel}:${st.size}:${st.mtimeMs}`);
  }
  return parts.join("|");
}

function parseCsvSemicolon(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const QUOTE = '"';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === QUOTE) {
        if (input[i + 1] === QUOTE) {
          field += QUOTE;
          i += 1;
          continue;
        }
        inQuotes = false;
        continue;
      }
      field += ch;
      continue;
    }
    if (ch === QUOTE) {
      inQuotes = true;
      continue;
    }
    if (ch === ";") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\r") continue;
    if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }
  row.push(field);
  rows.push(row);
  while (rows.length && rows[rows.length - 1].every((c) => String(c || "").trim() === "")) rows.pop();
  return rows;
}

function parseCoord(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw.replace(/,/g, "."));
  return Number.isFinite(n) ? n : null;
}

function withinPeru(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -20.7 || lat > 1.2) return false;
  if (lng < -82.5 || lng > -67.0) return false;
  return true;
}

function normalizeModularCode(value: unknown) {
  const raw = String(value ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  return digits.length <= 8 ? digits.padStart(8, "0") : digits;
}

type DbfField = { name: string; type: string; length: number; decimal: number; offset: number };

function readDbfIndex(filePath: string) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  if (buf.length < 64) return null;

  const numRecords = buf.readUInt32LE(4);
  const headerLen = buf.readUInt16LE(8);
  const recordLen = buf.readUInt16LE(10);
  if (!Number.isFinite(numRecords) || !Number.isFinite(headerLen) || !Number.isFinite(recordLen)) return null;

  const fields: DbfField[] = [];
  let offset = 32;
  let fieldOffset = 1;
  while (offset + 32 <= headerLen && buf[offset] !== 0x0d) {
    const nameRaw = buf.subarray(offset, offset + 11);
    const nul = nameRaw.indexOf(0);
    const name = nameRaw
      .subarray(0, nul >= 0 ? nul : nameRaw.length)
      .toString("latin1")
      .trim();
    const type = buf.subarray(offset + 11, offset + 12).toString("latin1");
    const length = buf.readUInt8(offset + 16);
    const decimal = buf.readUInt8(offset + 17);
    fields.push({ name, type, length, decimal, offset: fieldOffset });
    fieldOffset += length;
    offset += 32;
  }

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const find = (pred: (n: string) => boolean) => fields.find((f) => pred(norm(f.name))) || null;

  const fCod =
    find((n) => n === "codmodular" || n.includes("codmodular") || n.includes("codmod")) ||
    find((n) => n === "codigo" || n.includes("modular"));
  const fAnexo = find((n) => n === "anexo" || n.includes("anexo"));
  const fLat = find((n) => n === "lat" || n === "latitud" || n.includes("lat"));
  const fLng = find((n) => n === "lng" || n === "lon" || n === "longitud" || n.includes("long") || n.includes("lon"));
  if (!fCod || !fLat || !fLng) return null;

  const byCode = new Map<string, { lat: number; lng: number }>();

  for (let i = 0; i < numRecords; i++) {
    const recStart = headerLen + i * recordLen;
    if (recStart + recordLen > buf.length) break;
    const deleted = buf[recStart] === 0x2a;
    if (deleted) continue;

    const readField = (f: DbfField) =>
      buf
        .subarray(recStart + f.offset, recStart + f.offset + f.length)
        .toString("latin1")
        .trim();

    const codRaw = readField(fCod);
    const codDigits = String(codRaw || "").replace(/\D/g, "").trim();
    if (!codDigits) continue;
    const cod7 = codDigits.length < 7 ? codDigits.padStart(7, "0") : codDigits.slice(0, 7);

    const lat = parseCoord(readField(fLat));
    const lng = parseCoord(readField(fLng));
    if (lat == null || lng == null) continue;
    if (!withinPeru(lat, lng)) continue;

    const paddedKey = cod7.padStart(8, "0");
    byCode.set(paddedKey, { lat, lng });

    if (fAnexo) {
      const anexoDigits = String(readField(fAnexo) || "").replace(/\D/g, "").trim();
      const anexo = anexoDigits ? anexoDigits[0] : "";
      if (anexo) {
        const concatKey = `${cod7}${anexo}`;
        byCode.set(concatKey, { lat, lng });
      }
    }
  }

  return byCode;
}

function loadMineduCoords() {
  const candidates = [
    path.join(process.cwd(), "Padron_web.dbf"),
    path.join(process.cwd(), "Padlocaladi_web.dbf"),
    path.join(process.cwd(), "Instituciones_apoyo.dbf"),
  ];
  const merged = new Map<string, { lat: number; lng: number; source: string }>();
  for (const p of candidates) {
    const idx = readDbfIndex(p);
    if (!idx) continue;
    const source = path.basename(p);
    for (const [code, v] of idx.entries()) {
      if (!merged.has(code)) merged.set(code, { ...v, source });
    }
  }
  return merged;
}

function loadRenipressCoords(csvPath: string) {
  if (!fs.existsSync(csvPath)) return new Map<string, { lat: number; lng: number }>();
  const content = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsvSemicolon(content);
  const header = rows[0] || [];
  const key = (s: string) => String(s || "").trim().toLowerCase();
  const col = new Map<string, number>();
  for (let i = 0; i < header.length; i++) col.set(key(header[i]), i);

  const idxCod = col.get("cod_ipress") ?? col.get("codipress") ?? null;
  const idxNorte = col.get("norte") ?? null;
  const idxEste = col.get("este") ?? null;

  const out = new Map<string, { lat: number; lng: number }>();
  if (idxCod == null || idxNorte == null || idxEste == null) return out;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const code = normalizeIpressCode(idxCod < row.length ? row[idxCod] : "");
    if (!code) continue;
    const lat = parseCoord(idxNorte < row.length ? row[idxNorte] : "");
    const lng = parseCoord(idxEste < row.length ? row[idxEste] : "");
    if (lat == null || lng == null) continue;
    if (!withinPeru(lat, lng)) continue;
    out.set(code, { lat, lng });
  }

  return out;
}

function getAddressMap() {
  const cacheKey = buildCacheKey();
  if (addressCache && addressCache.key === cacheKey) return addressCache.byCode;

  const byCode = new Map<string, string>();
  for (const rel of CSV_FILES) {
    const p = path.join(process.cwd(), rel);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, "utf8");
    const rows = parseCsvSemicolon(raw);
    if (!rows.length) continue;
    const header = (rows[0] || []).map((h) => String(h || "").toLowerCase().trim());
    const idxCodigo = header.findIndex((h) => h === "codigo" || h.includes("codigo"));
    const idxDireccion = header.findIndex((h) => h === "direccion" || h.includes("direccion"));
    if (idxCodigo < 0 || idxDireccion < 0) continue;
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const code = normalizeIpressCode(row[idxCodigo]);
      if (!code) continue;
      const direccion = String(row[idxDireccion] ?? "").trim();
      if (!direccion) continue;
      const prev = byCode.get(code);
      if (!prev || direccion.length > prev.length) byCode.set(code, direccion);
    }
  }

  addressCache = { key: cacheKey, byCode };
  return byCode;
}

function isValidLatLng(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 || lng === 0) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
  importance?: number;
  address?: Record<string, unknown>;
};

async function nominatimSearchPe(query: string, timeoutMs = 6_000) {
  const viewbox = "-82.5,1.2,-67.0,-20.7";
  const upstream = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query,
  )}&format=json&addressdetails=1&limit=8&countrycodes=pe&viewbox=${encodeURIComponent(viewbox)}&bounded=1`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.max(500, Math.round(timeoutMs)));
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(upstream, {
          headers: {
            accept: "application/json",
            "user-agent": "SERUMS-Map-Peru/1.0",
          },
          signal: controller.signal,
        });
        if (res.status === 429 && attempt === 0) {
          await sleep(1500);
          continue;
        }
        if (!res.ok) return [];
        const body = (await res.json().catch(() => null)) as unknown;
        return Array.isArray(body) ? (body as NominatimResult[]) : [];
      } catch {
        if (attempt === 0) {
          await sleep(800);
          continue;
        }
        return [];
      }
    }
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

function pickBestNominatim(results: NominatimResult[]) {
  const filtered = results.filter((r) => {
    const addr = r.address;
    const cc =
      addr && typeof addr === "object" && "country_code" in addr
        ? String((addr as { country_code?: unknown }).country_code || "").toLowerCase()
        : "";
    return cc === "pe";
  });
  if (!filtered.length) return null;
  const sorted = filtered
    .slice()
    .sort((a, b) => (Number(b.importance) || 0) - (Number(a.importance) || 0));
  const first = sorted[0];
  const lat = first && typeof first.lat === "string" ? Number(first.lat) : NaN;
  const lng = first && typeof first.lon === "string" ? Number(first.lon) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!isValidLatLng(lat, lng)) return null;
  return { lat, lng, display_name: first.display_name || "" };
}

function pickBestNominatimWithHints(results: NominatimResult[], hints: string[]) {
  const filtered = results.filter((r) => {
    const addr = r.address;
    const cc =
      addr && typeof addr === "object" && "country_code" in addr
        ? String((addr as { country_code?: unknown }).country_code || "").toLowerCase()
        : "";
    return cc === "pe";
  });
  if (!filtered.length) return null;

  const hintParts = hints
    .map((h) => String(h || "").trim().toLowerCase())
    .filter((h) => h.length >= 3);

  let best: { lat: number; lng: number; display_name: string } | null = null;
  let bestScore = -Infinity;

  for (const r of filtered) {
    const lat = typeof r.lat === "string" ? Number(r.lat) : NaN;
    const lng = typeof r.lon === "string" ? Number(r.lon) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!isValidLatLng(lat, lng)) continue;

    const name = String(r.display_name || "").toLowerCase();
    let hits = 0;
    for (const h of hintParts) {
      if (name.includes(h)) hits += 1;
    }

    const score = (Number(r.importance) || 0) + hits * 0.25;
    if (score > bestScore) {
      bestScore = score;
      best = { lat, lng, display_name: r.display_name || "" };
    }
  }

  return best;
}

function pickBestNominatimWithHintsResult(results: NominatimResult[], hints: string[]) {
  const filtered = results.filter((r) => {
    const addr = r.address;
    const cc =
      addr && typeof addr === "object" && "country_code" in addr
        ? String((addr as { country_code?: unknown }).country_code || "").toLowerCase()
        : "";
    return cc === "pe";
  });
  if (!filtered.length) return null;

  const hintParts = hints
    .map((h) => String(h || "").trim().toLowerCase())
    .filter((h) => h.length >= 3);

  let best: { lat: number; lng: number; display_name: string; address: Record<string, unknown> } | null = null;
  let bestScore = -Infinity;

  for (const r of filtered) {
    const lat = typeof r.lat === "string" ? Number(r.lat) : NaN;
    const lng = typeof r.lon === "string" ? Number(r.lon) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!isValidLatLng(lat, lng)) continue;

    const name = String(r.display_name || "").toLowerCase();
    let hits = 0;
    for (const h of hintParts) {
      if (name.includes(h)) hits += 1;
    }

    const importance = Number(r.importance) || 0;
    const score = hits * 10 + importance;
    if (score > bestScore) {
      bestScore = score;
      best = {
        lat,
        lng,
        display_name: r.display_name || "",
        address: r.address && typeof r.address === "object" ? (r.address as Record<string, unknown>) : {},
      };
    }
  }

  return best;
}

type NominatimReverseResult = {
  display_name?: string;
  address?: Record<string, unknown>;
};

async function nominatimReversePe(lat: number, lng: number, timeoutMs = 6_000) {
  const viewbox = "-82.5,1.2,-67.0,-20.7";
  const upstream = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(
    String(lat),
  )}&lon=${encodeURIComponent(String(lng))}&format=jsonv2&addressdetails=1&zoom=18&countrycodes=pe&viewbox=${encodeURIComponent(
    viewbox,
  )}&bounded=1`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.max(500, Math.round(timeoutMs)));
  try {
    try {
      const res = await fetch(upstream, {
        headers: {
          accept: "application/json",
          "user-agent": "SERUMS-Map-Peru/1.0",
        },
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const body = (await res.json().catch(() => null)) as unknown;
      return body && typeof body === "object" ? (body as NominatimReverseResult) : null;
    } catch {
      return null;
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizePlace(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesPlace(expected: string, candidates: Array<unknown>) {
  const exp = normalizePlace(expected);
  if (!exp) return false;
  for (const c of candidates) {
    const got = normalizePlace(c);
    if (!got) continue;
    if (got === exp) return true;
    if (got.includes(exp) || exp.includes(got)) return true;
  }
  return false;
}

function getDeptCentroid(nameRaw: string) {
  const n = normalizePlace(nameRaw);
  const map: Record<string, { lat: number; lng: number }> = {
    "lima": { lat: -12.05, lng: -77.05 },
    "callao": { lat: -12.05, lng: -77.12 },
    "ica": { lat: -14.07, lng: -75.73 },
    "arequipa": { lat: -16.39, lng: -71.54 },
    "moquegua": { lat: -17.19, lng: -70.94 },
    "tacna": { lat: -18.01, lng: -70.25 },
    "la libertad": { lat: -8.11, lng: -79.03 },
    "lambayeque": { lat: -6.77, lng: -79.84 },
    "piura": { lat: -5.20, lng: -80.64 },
    "tumbes": { lat: -3.56, lng: -80.45 },
    "ancash": { lat: -9.53, lng: -77.53 },
    "huanuco": { lat: -9.93, lng: -76.24 },
    "pasco": { lat: -10.68, lng: -76.25 },
    "junin": { lat: -11.9, lng: -75.34 },
    "huancavelica": { lat: -12.78, lng: -74.98 },
    "ayacucho": { lat: -13.16, lng: -74.22 },
    "apurimac": { lat: -13.63, lng: -73.35 },
    "cusco": { lat: -13.52, lng: -71.97 },
    "puno": { lat: -15.84, lng: -70.02 },
    "madre de dios": { lat: -12.60, lng: -69.19 },
    "ucayali": { lat: -8.38, lng: -74.57 },
    "loreto": { lat: -3.75, lng: -73.25 },
    "san martin": { lat: -6.47, lng: -76.37 },
    "amazonas": { lat: -5.12, lng: -78.05 },
    "cajamarca": { lat: -7.16, lng: -78.50 },
  };
  return map[n] || null;
}

type OverpassElement = {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

async function overpassSearchByNameAround(
  namePattern: string,
  lat: number,
  lng: number,
  radius: number,
  timeoutMs = 8_000,
) {
  const query = `
    [out:json][timeout:25];
    (
      node["healthcare"]["name"~"${namePattern}",i](around:${radius},${lat},${lng});
      node["amenity"="hospital"]["name"~"${namePattern}",i](around:${radius},${lat},${lng});
      way["healthcare"]["name"~"${namePattern}",i](around:${radius},${lat},${lng});
      way["amenity"="hospital"]["name"~"${namePattern}",i](around:${radius},${lat},${lng});
      relation["healthcare"]["name"~"${namePattern}",i](around:${radius},${lat},${lng});
      relation["amenity"="hospital"]["name"~"${namePattern}",i](around:${radius},${lat},${lng});
    );
    out center 12;
  `;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.max(500, Math.round(timeoutMs)));
  try {
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }).toString(),
        signal: controller.signal,
      });
      if (!res.ok) return [];
      const body = (await res.json().catch(() => null)) as unknown;
      const elements =
        body && typeof body === "object" && "elements" in body ? (body as { elements?: unknown }).elements : null;
      return Array.isArray(elements) ? (elements as OverpassElement[]) : [];
    } catch {
      return [];
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

function deg2rad(x: number) {
  return (x * Math.PI) / 180;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = deg2rad(bLat - aLat);
  const dLng = deg2rad(bLng - aLng);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(deg2rad(aLat)) * Math.cos(deg2rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s1 + s2));
}

function normalizeName(value: string) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(PUESTO|CENTRO|HOSPITAL|CLINICA|POLICLINICO|POSTA|DE|DEL|LA|EL|LOS|LAS|II|I|III|IV)\b/g, "")
    .trim();
}

function escapeRegex(input: string) {
  return String(input || "")
    .replace(/"/g, " ")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildNamePattern(name: string) {
  const raw = String(name || "").trim();
  const rawPattern = escapeRegex(raw).replace(/\s+/g, "\\s+");
  const normalized = normalizeName(raw);
  const normalizedParts = normalized.split(" ").filter((w) => w.length >= 3);
  const normalizedTop = normalizedParts.slice(0, 5).join("\\s+");
  const normalizedPattern = (normalizedTop || normalized).replace(/\s+/g, "\\s+");

  if (rawPattern && normalizedPattern && rawPattern !== normalizedPattern) return `(${rawPattern})|(${normalizedPattern})`;
  return rawPattern || normalizedPattern || "";
}

function cleanNameForGeocoding(nombre: string) {
  const raw = String(nombre || "").trim();
  const first = raw.includes(";") ? raw.split(";")[0] : raw;
  return first.replace(/\s+/g, " ").trim();
}

function pickBestOverpassMatch(elements: OverpassElement[], targetName: string, anchorLat: number, anchorLng: number) {
  const targetNorm = normalizeName(targetName);
  const targetWords = targetNorm.split(" ").filter((w) => w.length >= 3);
  const targetSet = new Set(targetWords);


  let best: { lat: number; lng: number; display_name: string } | null = null;
  let bestScore = -Infinity;

  for (const el of elements) {
    const lat = typeof el.lat === "number" ? el.lat : typeof el.center?.lat === "number" ? el.center.lat : NaN;
    const lng = typeof el.lon === "number" ? el.lon : typeof el.center?.lon === "number" ? el.center.lon : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!isValidLatLng(lat, lng)) continue;

    const name = String(el.tags?.name || el.tags?.["name:es"] || "").trim();
    if (!name) continue;

    const norm = normalizeName(name);
    const words = norm.split(" ").filter((w) => w.length >= 3);
    let hits = 0;
    for (const w of words) {
      if (targetSet.has(w)) hits += 1;
    }
    if (hits <= 0) continue;

    const distKm = haversineKm(anchorLat, anchorLng, lat, lng);
    const score = hits * 3 - distKm;
    if (score > bestScore) {
      bestScore = score;
      best = { lat, lng, display_name: name };
    }
  }

  return best;
}

async function computeAnchor(distrito: string, provincia: string, departamento: string, timeoutMs?: number) {
  const q =
    distrito && provincia && departamento
      ? `${distrito}, ${provincia}, ${departamento}, Peru`
      : distrito && provincia
        ? `${distrito}, ${provincia}, Peru`
        : provincia && departamento
          ? `${provincia}, ${departamento}, Peru`
          : provincia
            ? `${provincia}, Peru`
            : departamento
              ? `${departamento}, Peru`
              : "Peru";

  const best = await nominatimSearchPe(q, timeoutMs).then((r) =>
    pickBestNominatimWithHints(r, [distrito, provincia, departamento]),
  );
  if (best) return { lat: best.lat, lng: best.lng };

  const deptKey = normalizeDepartmentKey(departamento);
  const center = (deptKey && DEPARTMENT_CENTERS[deptKey]) || null;
  if (center) return center;

  return { lat: -9.189967, lng: -75.015152 };
}

export async function POST(request: Request) {
  const db = openDb();
  if (!db) {
    return NextResponse.json(
      { error: { message: "Base de datos no encontrada.", status: 500 } },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const rawBody = await request.text().catch(() => "");
  let body: Record<string, unknown> | null = null;
  if (rawBody && rawBody.trim()) {
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      body = null;
    }
  }
  const strategy = String(
    (body && typeof body.strategy === "string" ? body.strategy : null) ?? url.searchParams.get("strategy") ?? "",
  )
    .trim()
    .toLowerCase();

  const maxFromBody =
    body && (typeof body.max === "number" || typeof body.max === "string") ? Number(body.max) : null;
  const delayFromBody =
    body && (typeof body.delay_ms === "number" || typeof body.delay_ms === "string") ? Number(body.delay_ms) : null;
  const iterationsFromBody =
    body && (typeof body.iterations === "number" || typeof body.iterations === "string") ? Number(body.iterations) : null;
  const maxRuntimeFromBody =
    body && (typeof body.max_runtime_ms === "number" || typeof body.max_runtime_ms === "string")
      ? Number(body.max_runtime_ms)
      : null;
  const includeMineduFromBody = body ? parseBooleanParam((body as Record<string, unknown>).include_minedu) : null;

  const maxRaw = Number.isFinite(maxFromBody) ? maxFromBody : parseNumberParam(url.searchParams.get("max"));
  const delayRaw = Number.isFinite(delayFromBody) ? delayFromBody : parseNumberParam(url.searchParams.get("delay_ms"));
  const iterationsRaw = Number.isFinite(iterationsFromBody)
    ? iterationsFromBody
    : parseNumberParam(url.searchParams.get("iterations"));
  const maxRuntimeRaw = Number.isFinite(maxRuntimeFromBody)
    ? maxRuntimeFromBody
    : parseNumberParam(url.searchParams.get("max_runtime_ms"));
  const includeMineduRaw =
    includeMineduFromBody != null ? includeMineduFromBody : parseBooleanParam(url.searchParams.get("include_minedu"));
  const isImportStrategy = strategy === "renipress_import" || strategy === "minedu_import";
  const maxCap = strategy === "centroid" || isImportStrategy ? 9000 : 800;
  const max = maxRaw != null && Number.isFinite(maxRaw) && maxRaw > 0 ? Math.min(maxCap, Math.round(maxRaw)) : 50;
  const delayMs =
    strategy === "centroid"
      ? 0
      : delayRaw != null && Number.isFinite(delayRaw) && delayRaw >= 0
        ? Math.min(5000, Math.round(delayRaw))
        : 1200;
  const iterations =
    strategy === "refine" && iterationsRaw != null && Number.isFinite(iterationsRaw) && iterationsRaw > 1
      ? Math.min(20, Math.round(iterationsRaw))
      : 1;
  const maxRuntimeMs =
    maxRuntimeRaw != null && Number.isFinite(maxRuntimeRaw) && maxRuntimeRaw > 0
      ? Math.min(300_000, Math.round(maxRuntimeRaw))
      : null;
  const includeMinedu = includeMineduRaw === true;

  const addressByCode = getAddressMap();
  const now = new Date().toISOString();
  const queryCache = new Map<string, { lat: number; lng: number } | null>();

  try {
    const startedAt = Date.now();
    let stoppedEarly = false;
    const invalidWhere = `
      (h.lat IS NULL OR h.lng IS NULL OR CAST(h.lat AS REAL) = 0 OR CAST(h.lng AS REAL) = 0
        OR CAST(h.lat AS REAL) NOT BETWEEN -90 AND 90 OR CAST(h.lng AS REAL) NOT BETWEEN -180 AND 180)
    `;
    const canGeocodeWhere = `
      COALESCE(h.nombre_establecimiento, '') <> ''
      AND COALESCE(h.departamento, '') <> ''
      AND COALESCE(h.provincia, '') <> ''
      AND COALESCE(h.distrito, '') <> ''
    `;

    if (strategy === "renipress_import" || strategy === "minedu_import") {
      const upsertOverride = db.prepare(
        `
        INSERT INTO hospital_coord_overrides (hospital_id, lat, lng, source, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(hospital_id) DO UPDATE SET
          lat = excluded.lat,
          lng = excluded.lng,
          source = excluded.source,
          updated_at = excluded.updated_at
      `,
      );
      const updateHospital = db.prepare(
        `
        UPDATE hospitals
        SET lat = ?, lng = ?, coordenadas_fuente = ?, updated_at = ?
        WHERE id = ?
      `,
      );

      let processed = 0;
      let updated = 0;
      let failed = 0;

      if (strategy === "renipress_import") {
        const csvPath = path.join(process.cwd(), "RENIPRESS_27-02-2026.csv");
        const coords = loadRenipressCoords(csvPath);
        const rows = db
          .prepare(
            `
            SELECT h.id, h.codigo_renipress_modular
            FROM hospitals h
            WHERE COALESCE(h.codigo_renipress_modular, '') <> ''
              AND COALESCE(h.institucion, '') <> 'MINEDU'
            ORDER BY h.id ASC
          `,
          )
          .all() as Array<{ id?: unknown; codigo_renipress_modular?: unknown }>;

        for (const r of rows) {
          if (processed >= max) break;
          const id = String(r.id || "").trim();
          const code = normalizeIpressCode(r.codigo_renipress_modular);
          if (!id || !code) continue;
          const hit = coords.get(code);
          if (!hit) continue;
          processed += 1;
          db.exec("BEGIN");
          try {
            upsertOverride.run(id, hit.lat, hit.lng, "RENIPRESS", now);
            updateHospital.run(hit.lat, hit.lng, "RENIPRESS", now, id);
            db.exec("COMMIT");
            updated += 1;
          } catch {
            try {
              db.exec("ROLLBACK");
            } catch {
            }
            failed += 1;
          }
        }
      }

      if (strategy === "minedu_import") {
        const coords = loadMineduCoords();
        const rows = db
          .prepare(
            `
            SELECT h.id, h.codigo_renipress_modular
            FROM hospitals h
            WHERE COALESCE(h.institucion, '') = 'MINEDU'
              AND COALESCE(h.codigo_renipress_modular, '') <> ''
            ORDER BY h.id ASC
          `,
          )
          .all() as Array<{ id?: unknown; codigo_renipress_modular?: unknown }>;

        for (const r of rows) {
          if (processed >= max) break;
          const id = String(r.id || "").trim();
          const code = normalizeModularCode(r.codigo_renipress_modular);
          if (!id || !code) continue;
          const hit = coords.get(code);
          if (!hit) continue;
          processed += 1;
          db.exec("BEGIN");
          try {
            upsertOverride.run(id, hit.lat, hit.lng, "MINEDU_PADRON", now);
            updateHospital.run(hit.lat, hit.lng, "MINEDU_PADRON", now, id);
            db.exec("COMMIT");
            updated += 1;
          } catch {
            try {
              db.exec("ROLLBACK");
            } catch {
            }
            failed += 1;
          }
        }
      }

      return NextResponse.json(
        {
          processed,
          updated,
          failed,
          pending_before: null,
          pending_after: null,
          stopped_early: false,
          max_runtime_ms: maxRuntimeMs,
          iterations: 1,
          details: [],
        },
        { status: 200 },
      );
    }

    if (strategy === "validate") {
      const includeOfficialRaw = parseBooleanParam(url.searchParams.get("include_official"));
      const includeOfficial = includeOfficialRaw === true;
      const trustNominatimRaw = parseBooleanParam(url.searchParams.get("trust_nominatim"));
      const trustNominatim = trustNominatimRaw !== false;
      const onlyDepartamento = String(url.searchParams.get("departamento") || "").trim();
      const onlyProvincia = String(url.searchParams.get("provincia") || "").trim();
      const onlyDistrito = String(url.searchParams.get("distrito") || "").trim();
      const maxDistKmRaw = parseNumberParam(url.searchParams.get("max_dist_km"));
      const maxDistKm =
        maxDistKmRaw != null && Number.isFinite(maxDistKmRaw)
          ? Math.min(500, Math.max(5, maxDistKmRaw))
          : 60;

      const upsertOverride = db.prepare(
        `
        INSERT INTO hospital_coord_overrides (hospital_id, lat, lng, source, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(hospital_id) DO UPDATE SET
          lat = excluded.lat,
          lng = excluded.lng,
          source = excluded.source,
          updated_at = excluded.updated_at
      `,
      );
      const updateHospital = db.prepare(
        `
        UPDATE hospitals
        SET lat = ?, lng = ?, coordenadas_fuente = ?, updated_at = ?
        WHERE id = ?
      `,
      );

      const rows = db
        .prepare(
          `
          SELECT
            h.id,
            h.nombre_establecimiento,
            h.institucion,
            h.distrito,
            h.provincia,
            h.departamento,
            COALESCE(h.coordenadas_fuente, '') AS fuente,
            CAST(h.lat AS REAL) AS lat,
            CAST(h.lng AS REAL) AS lng
          FROM hospitals h
          LEFT JOIN hospital_coord_overrides o ON o.hospital_id = h.id
          WHERE
            ${canGeocodeWhere}
            AND CAST(h.lat AS REAL) BETWEEN -20.7 AND 1.2
            AND CAST(h.lng AS REAL) BETWEEN -82.5 AND -67.0
            AND CAST(h.lat AS REAL) != 0
            AND CAST(h.lng AS REAL) != 0
            ${includeOfficial ? "" : "AND COALESCE(h.coordenadas_fuente, '') NOT IN ('RENIPRESS','MINEDU_PADRON')"}
            AND COALESCE(o.source, '') NOT IN (
              'VALIDATED_ANCHOR',
              'VALIDATED_NAME',
              'VALIDATED_TRUST_NOMINATIM',
              'VALIDATE_NOMINATIM',
              'VALIDATE_OVERPASS'
            )
            ${onlyDepartamento ? "AND LOWER(COALESCE(h.departamento,'')) = LOWER(?)" : ""}
            ${onlyProvincia ? "AND LOWER(COALESCE(h.provincia,'')) = LOWER(?)" : ""}
            ${onlyDistrito ? "AND LOWER(COALESCE(h.distrito,'')) = LOWER(?)" : ""}
          ORDER BY h.id ASC
          LIMIT ?
        `,
        )
        .all(
          ...[
            ...(onlyDepartamento ? [onlyDepartamento] : []),
            ...(onlyProvincia ? [onlyProvincia] : []),
            ...(onlyDistrito ? [onlyDistrito] : []),
            max,
          ],
        ) as Array<Record<string, unknown>>;

      let checked = 0;
      let mismatched = 0;
      let fixed = 0;
      let still_bad = 0;
      const anchorCache = new Map<string, { lat: number; lng: number } | null>();
      const details: Array<{
        id: string;
        ok: boolean;
        dept_ok?: boolean;
        prov_ok?: boolean;
        dist_ok?: boolean;
        source?: string;
      }> = [];

      for (const r of rows) {
        if (maxRuntimeMs != null && Date.now() - startedAt >= maxRuntimeMs) {
          stoppedEarly = true;
          break;
        }

        const id = String(r.id || "").trim();
        if (!id) continue;
        const nombre = String(r.nombre_establecimiento || "").trim();
        const institucion = String(r.institucion || "").trim();
        const distrito = String(r.distrito || "").trim();
        const provincia = String(r.provincia || "").trim();
        const departamento = String(r.departamento || "").trim();
        const currentLat = Number(r.lat);
        const currentLng = Number(r.lng);
        const fuente = String(r.fuente || "").trim();
        if (!isValidLatLng(currentLat, currentLng)) continue;

        checked += 1;
        if (!includeOfficial && (fuente === "RENIPRESS" || fuente === "MINEDU_PADRON")) {
          details.push({ id, ok: true, dept_ok: true, prov_ok: true, dist_ok: true, source: fuente });
          continue;
        }

        const cleanedName = cleanNameForGeocoding(nombre);
        const nameNorm = normalizePlace(cleanedName);
        const distNorm = normalizePlace(distrito);
        const provNorm = normalizePlace(provincia);
        if (
          nameNorm &&
          ((distNorm && (nameNorm.includes(distNorm) || distNorm.includes(nameNorm))) ||
            (provNorm && (nameNorm.includes(provNorm) || provNorm.includes(nameNorm))))
        ) {
          db.exec("BEGIN");
          try {
            upsertOverride.run(id, currentLat, currentLng, "VALIDATED_NAME", now);
            db.exec("COMMIT");
          } catch {
            try {
              db.exec("ROLLBACK");
            } catch {
            }
          }
          details.push({ id, ok: true, dept_ok: true, prov_ok: true, dist_ok: true, source: fuente });
          if (delayMs > 0) await sleep(delayMs);
          continue;
        }

        if (trustNominatim && fuente === "NOMINATIM") {
          db.exec("BEGIN");
          try {
            upsertOverride.run(id, currentLat, currentLng, "VALIDATED_TRUST_NOMINATIM", now);
            db.exec("COMMIT");
          } catch {
            try {
              db.exec("ROLLBACK");
            } catch {
            }
          }
          details.push({ id, ok: true, dept_ok: true, prov_ok: true, dist_ok: true, source: fuente });
          if (delayMs > 0) await sleep(delayMs);
          continue;
        }

        const anchorQuery =
          distrito && provincia && departamento
            ? `${distrito}, ${provincia}, ${departamento}, Peru`
            : distrito && provincia
              ? `${distrito}, ${provincia}, Peru`
              : provincia && departamento
                ? `${provincia}, ${departamento}, Peru`
                : departamento
                  ? `${departamento}, Peru`
                  : "Peru";

        const anchorKey = `ANCHOR:${anchorQuery}`;
        let anchor = anchorCache.get(anchorKey);
        if (anchor === undefined) {
          const a = await computeAnchor(distrito, provincia, departamento, 6_000);
          anchor = a && Number.isFinite(a.lat) && Number.isFinite(a.lng) ? { lat: a.lat, lng: a.lng } : null;
          anchorCache.set(anchorKey, anchor);
        }

        if (anchor) {
          const distKm = haversineKm(anchor.lat, anchor.lng, currentLat, currentLng);
          if (Number.isFinite(distKm) && distKm <= maxDistKm) {
            db.exec("BEGIN");
            try {
              upsertOverride.run(id, currentLat, currentLng, "VALIDATED_ANCHOR", now);
              db.exec("COMMIT");
            } catch {
              try {
                db.exec("ROLLBACK");
              } catch {
              }
            }
            details.push({ id, ok: true, dept_ok: true, prov_ok: true, dist_ok: true, source: fuente });
            if (delayMs > 0) await sleep(delayMs);
            continue;
          }
        }

        const direccion = addressByCode.get(id) || "";
        const hints = [distrito, provincia, departamento];
        const refineQueries = [
          direccion && cleanedName ? `${cleanedName}, ${direccion}, ${distrito}, ${provincia}, ${departamento}, Peru` : null,
          direccion ? `${direccion}, ${distrito}, ${provincia}, ${departamento}, Peru` : null,
          cleanedName && distrito && provincia && departamento ? `${cleanedName}, ${distrito}, ${provincia}, ${departamento}, Peru` : null,
          cleanedName && distrito && provincia ? `${cleanedName}, ${distrito}, ${provincia}, Peru` : null,
          cleanedName && provincia && departamento ? `${cleanedName}, ${provincia}, ${departamento}, Peru` : null,
          cleanedName && provincia ? `${cleanedName}, ${provincia}, Peru` : null,
          cleanedName && departamento ? `${cleanedName}, ${departamento}, Peru` : null,
          distrito && provincia && departamento ? `${distrito}, ${provincia}, ${departamento}, Peru` : null,
          distrito && provincia ? `${distrito}, ${provincia}, Peru` : null,
        ].filter((q): q is string => !!q && q.trim().length > 0);

        let repaired = false;
        let deptOk2 = false;
        let provOk2 = false;
        let distOk2 = false;

        if (anchor && cleanedName && institucion.toUpperCase() !== "MINEDU") {
          const namePattern = buildNamePattern(cleanedName);
          if (namePattern) {
            const radii = delayMs === 0 ? [8000] : [2500, 8000];
            for (const radius of radii) {
              const elements = await overpassSearchByNameAround(namePattern, anchor.lat, anchor.lng, radius, 8_000);
              const best = pickBestOverpassMatch(elements, cleanedName, anchor.lat, anchor.lng);
              if (best) {
                const distKm = haversineKm(anchor.lat, anchor.lng, best.lat, best.lng);
                if (!Number.isFinite(distKm) || distKm > maxDistKm) {
                  if (delayMs > 0) await sleep(delayMs);
                  continue;
                }
                db.exec("BEGIN");
                try {
                  upsertOverride.run(id, best.lat, best.lng, "VALIDATE_OVERPASS", now);
                  updateHospital.run(best.lat, best.lng, "VALIDATE_OVERPASS", now, id);
                  db.exec("COMMIT");
                  fixed += 1;
                  repaired = true;
                  deptOk2 = true;
                  provOk2 = true;
                  distOk2 = true;
                  break;
                } catch {
                  try {
                    db.exec("ROLLBACK");
                  } catch {
                  }
                }
              }
              if (delayMs > 0) await sleep(delayMs);
            }
          }
        }

        for (const q of refineQueries) {
          if (repaired) break;
          if (maxRuntimeMs != null && Date.now() - startedAt >= maxRuntimeMs) {
            stoppedEarly = true;
            break;
          }
          const best = pickBestNominatimWithHintsResult(await nominatimSearchPe(q, 6_000), hints);
          if (!best) {
            if (delayMs > 0) await sleep(delayMs);
            continue;
          }

          if (anchor) {
            const distKm = haversineKm(anchor.lat, anchor.lng, best.lat, best.lng);
            if (!Number.isFinite(distKm) || distKm > maxDistKm) {
              if (delayMs > 0) await sleep(delayMs);
              continue;
            }
          }

          if (!withinPeru(best.lat, best.lng)) {
            if (delayMs > 0) await sleep(delayMs);
            continue;
          }

          db.exec("BEGIN");
          try {
            upsertOverride.run(id, best.lat, best.lng, "VALIDATE_NOMINATIM", now);
            updateHospital.run(best.lat, best.lng, "VALIDATE_NOMINATIM", now, id);
            db.exec("COMMIT");
            fixed += 1;
            repaired = true;
            deptOk2 = true;
            provOk2 = true;
            distOk2 = true;
            break;
          } catch {
            try {
              db.exec("ROLLBACK");
            } catch {
            }
          }
        }

        if (!repaired) {
          if (anchor) {
            db.exec("BEGIN");
            try {
              upsertOverride.run(id, anchor.lat, anchor.lng, "DISTRICT_CENTROID", now);
              updateHospital.run(anchor.lat, anchor.lng, "DISTRICT_CENTROID", now, id);
              db.exec("COMMIT");
              fixed += 1;
              repaired = true;
              deptOk2 = true;
              provOk2 = true;
              distOk2 = true;
            } catch {
              try {
                db.exec("ROLLBACK");
              } catch {
              }
              still_bad += 1;
              mismatched += 1;
            }
          } else {
            const deptC = getDeptCentroid(departamento);
            if (deptC) {
              db.exec("BEGIN");
              try {
                upsertOverride.run(id, deptC.lat, deptC.lng, "DEPT_CENTROID", now);
                updateHospital.run(deptC.lat, deptC.lng, "DEPT_CENTROID", now, id);
                db.exec("COMMIT");
                fixed += 1;
                repaired = true;
                deptOk2 = true;
                provOk2 = true;
                distOk2 = true;
              } catch {
                try {
                  db.exec("ROLLBACK");
                } catch {
                }
                still_bad += 1;
                mismatched += 1;
              }
            } else {
              still_bad += 1;
              mismatched += 1;
            }
          }
        }
        details.push({ id, ok: repaired, dept_ok: deptOk2, prov_ok: provOk2, dist_ok: distOk2, source: fuente });
        if (delayMs > 0) await sleep(delayMs);
      }

      return NextResponse.json(
        {
          checked,
          mismatched,
          fixed,
          still_bad,
          stopped_early: stoppedEarly,
          max_runtime_ms: maxRuntimeMs,
          details: details.slice(0, 40),
        },
        { status: 200 },
      );
    }

    const eps = 1e-6;
    const computeRefineCandidates = () => {
      const all = db
        .prepare(
          `
          SELECT
            h.id,
            h.nombre_establecimiento,
            h.institucion,
            h.distrito,
            h.provincia,
            h.departamento,
            COALESCE(h.coordenadas_fuente, '') AS fuente,
            CAST(h.lat AS REAL) AS lat,
            CAST(h.lng AS REAL) AS lng
          FROM hospitals h
          WHERE
            ${canGeocodeWhere}
            ${includeMinedu ? "" : "AND COALESCE(h.institucion, '') <> 'MINEDU'"}
            AND CAST(h.lat AS REAL) BETWEEN -90 AND 90
            AND CAST(h.lng AS REAL) BETWEEN -180 AND 180
            AND CAST(h.lat AS REAL) != 0
            AND CAST(h.lng AS REAL) != 0
        `,
        )
        .all() as Array<Record<string, unknown>>;

      const roundedCount = new Map<string, number>();
      for (const r of all) {
        const lat = Number(r.lat);
        const lng = Number(r.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        roundedCount.set(key, (roundedCount.get(key) || 0) + 1);
      }
      const hotspotKeys = [...roundedCount.entries()]
        .filter(([, n]) => n >= 50)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 40)
        .map(([k]) => k);
      const hotspotSet = new Set(hotspotKeys);

      const filtered = all.filter((r) => {
        const dep = String(r.departamento || "").trim();
        const key = normalizeDepartmentKey(dep);
        const center = (key && DEPARTMENT_CENTERS[key]) || null;
        const lat = Number(r.lat);
        const lng = Number(r.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
        if (center && Math.abs(lat - center.lat) <= eps && Math.abs(lng - center.lng) <= eps) return true;
        if (Math.abs(lat - -9.189967) <= eps && Math.abs(lng - -75.015152) <= eps) return true;
        if (hotspotSet.has(`${lat.toFixed(4)},${lng.toFixed(4)}`)) return true;
        return false;
      });

      filtered.sort((a, b) => {
        const aMinedu = String((a as Record<string, unknown>).institucion || "")
          .trim()
          .toUpperCase() === "MINEDU";
        const bMinedu = String((b as Record<string, unknown>).institucion || "")
          .trim()
          .toUpperCase() === "MINEDU";
        if (aMinedu !== bMinedu) return aMinedu ? 1 : -1;
        return String(a.id || "").localeCompare(String(b.id || ""));
      });
      return filtered;
    };

    const pendingBefore =
      strategy === "refine"
        ? computeRefineCandidates().length
        : (() => {
            const pendingCountRow = db
              .prepare(
                `
                SELECT COUNT(*) AS n
                FROM hospitals h
                WHERE
                  ${invalidWhere}${strategy === "centroid" ? "" : ` AND ${canGeocodeWhere}`}
              `,
              )
              .get() as { n?: unknown } | undefined;
            return pendingCountRow && typeof pendingCountRow.n === "number" ? pendingCountRow.n : Number(pendingCountRow?.n || 0);
          })();

    const upsertOverride = db.prepare(
      `
      INSERT INTO hospital_coord_overrides (hospital_id, lat, lng, source, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(hospital_id) DO UPDATE SET
        lat = excluded.lat,
        lng = excluded.lng,
        source = excluded.source,
        updated_at = excluded.updated_at
    `,
    );
    const updateHospital = db.prepare(
      `
      UPDATE hospitals
      SET lat = ?, lng = ?, coordenadas_fuente = ?, updated_at = ?
      WHERE id = ?
    `,
    );

    let processed = 0;
    let updated = 0;
    let failed = 0;
    const details: Array<{ id: string; ok: boolean; query_used?: string; display_name?: string }> = [];
    const perRecordDelayMs = strategy === "refine" ? Math.min(200, delayMs) : delayMs;

    for (let pass = 0; pass < iterations; pass++) {
      if (maxRuntimeMs != null && Date.now() - startedAt >= maxRuntimeMs) {
        stoppedEarly = true;
        break;
      }
      const rows: Array<Record<string, unknown>> =
        strategy === "refine"
          ? (() => {
              const candidates = computeRefineCandidates();
              const start = pass * max;
              if (start >= candidates.length) return [];
              return candidates.slice(start, start + max);
            })()
          : (db
              .prepare(
                `
                SELECT
                  h.id,
                  h.nombre_establecimiento,
                  h.distrito,
                  h.provincia,
                  h.departamento
                FROM hospitals h
                WHERE
                  ${invalidWhere}${strategy === "centroid" ? "" : ` AND ${canGeocodeWhere}`}
                ORDER BY h.id ASC
                LIMIT ?
              `,
              )
              .all(max) as Array<Record<string, unknown>>);

      if (!rows.length) break;

      for (const r of rows) {
        if (maxRuntimeMs != null && Date.now() - startedAt >= maxRuntimeMs) {
          stoppedEarly = true;
          break;
        }
        const id = String(r.id || "").trim();
        if (!id) continue;
        processed += 1;

        const nombre = String(r.nombre_establecimiento || "").trim();
        const institucion = String((r as Record<string, unknown>).institucion || "").trim();
        const distrito = String(r.distrito || "").trim();
        const provincia = String(r.provincia || "").trim();
        const departamento = String(r.departamento || "").trim();
        const direccion = addressByCode.get(id) || "";
        const fastMode = strategy === "refine" && delayMs === 0;
        const nominatimTimeoutMs = fastMode ? (institucion.toUpperCase() === "MINEDU" ? 6_000 : 2_500) : 6_000;
        const overpassTimeoutMs = fastMode ? 4_000 : 8_000;

        let match: { lat: number; lng: number; display_name: string } | null = null;
        let usedQuery = "";

        if (strategy === "refine") {
          const hints = [distrito, provincia, departamento];
          const cleanedName = cleanNameForGeocoding(nombre);
          const isMinedu = institucion.toUpperCase() === "MINEDU";

          if (!isMinedu && cleanedName) {
            const namePattern = buildNamePattern(cleanedName);
            if (namePattern) {
              const anchorQuery =
                distrito && provincia && departamento
                  ? `${distrito}, ${provincia}, ${departamento}, Peru`
                  : distrito && provincia
                    ? `${distrito}, ${provincia}, Peru`
                    : provincia && departamento
                      ? `${provincia}, ${departamento}, Peru`
                      : provincia
                        ? `${provincia}, Peru`
                        : departamento
                          ? `${departamento}, Peru`
                          : "Peru";
              const anchorKey = `ANCHOR:${anchorQuery}`;
              let anchor = queryCache.get(anchorKey);
              if (anchor === undefined) {
                const a = await computeAnchor(distrito, provincia, departamento, nominatimTimeoutMs);
                anchor = { lat: a.lat, lng: a.lng };
                queryCache.set(anchorKey, anchor);
              }
              if (anchor) {
                const radii = delayMs === 0 ? [8000] : [2500, 8000, 18000];
                for (const radius of radii) {
                  const elements = await overpassSearchByNameAround(
                    namePattern,
                    anchor.lat,
                    anchor.lng,
                    radius,
                    overpassTimeoutMs,
                  );
                  const best = pickBestOverpassMatch(elements, cleanedName, anchor.lat, anchor.lng);
                  if (best) {
                    match = best;
                    usedQuery = "OVERPASS";
                    break;
                  }
                  if (delayMs > 0) await sleep(delayMs);
                }
              }
            }
          }
          const refineQueries = [
            direccion && cleanedName ? `${cleanedName}, ${direccion}, ${distrito}, ${provincia}, ${departamento}, Peru` : null,
            direccion ? `${direccion}, ${distrito}, ${provincia}, ${departamento}, Peru` : null,
            cleanedName && distrito && provincia && departamento ? `${cleanedName}, ${distrito}, ${provincia}, ${departamento}, Peru` : null,
            cleanedName && distrito && provincia ? `${cleanedName}, ${distrito}, ${provincia}, Peru` : null,
            cleanedName && provincia && departamento ? `${cleanedName}, ${provincia}, ${departamento}, Peru` : null,
            cleanedName && provincia ? `${cleanedName}, ${provincia}, Peru` : null,
            cleanedName && departamento ? `${cleanedName}, ${departamento}, Peru` : null,
            null,
          ].filter((q): q is string => !!q && q.trim().length > 0);

          if (!match) {
            const limitedQueries = delayMs === 0 && !isMinedu ? refineQueries.slice(0, 2) : refineQueries;
            for (const q of limitedQueries) {
              const cached = queryCache.get(q);
              if (cached !== undefined) {
                if (cached) {
                  match = { lat: cached.lat, lng: cached.lng, display_name: "" };
                  usedQuery = q;
                  break;
                }
                continue;
              }
              const best = pickBestNominatimWithHints(await nominatimSearchPe(q, nominatimTimeoutMs), hints);
              if (best) {
                queryCache.set(q, { lat: best.lat, lng: best.lng });
                match = best;
                usedQuery = q;
                break;
              }
              queryCache.set(q, null);
              if (delayMs > 0) await sleep(delayMs);
            }
          }
        } else if (strategy !== "centroid") {
          const queries = [
            direccion && nombre ? `${nombre}, ${direccion}, ${distrito}, ${provincia}, ${departamento}, Peru` : null,
            direccion ? `${direccion}, ${distrito}, ${provincia}, ${departamento}, Peru` : null,
            nombre && distrito && provincia && departamento ? `${nombre}, ${distrito}, ${provincia}, ${departamento}, Peru` : null,
            nombre && distrito && provincia ? `${nombre}, ${distrito}, ${provincia}, Peru` : null,
            distrito && provincia && departamento ? `${distrito}, ${provincia}, ${departamento}, Peru` : null,
            distrito && provincia ? `${distrito}, ${provincia}, Peru` : null,
          ].filter((q): q is string => !!q && q.trim().length > 0);

          for (const q of queries) {
            const cached = queryCache.get(q);
            if (cached !== undefined) {
              if (cached) {
                match = { lat: cached.lat, lng: cached.lng, display_name: "" };
                usedQuery = q;
                break;
              }
              continue;
            }
            const results = await nominatimSearchPe(q, nominatimTimeoutMs);
            const best = pickBestNominatim(results);
            if (best) {
              queryCache.set(q, { lat: best.lat, lng: best.lng });
              match = best;
              usedQuery = q;
              break;
            }
            queryCache.set(q, null);
            if (delayMs > 0) await sleep(delayMs);
          }
        }

        let resolvedSource: string | null = null;
        if (match && isValidLatLng(match.lat, match.lng)) {
          resolvedSource = usedQuery === "OVERPASS" ? "OVERPASS" : "NOMINATIM";
        } else if (strategy !== "refine") {
          const deptKey = normalizeDepartmentKey(departamento);
          const center = (deptKey && DEPARTMENT_CENTERS[deptKey]) || null;
          if (center) {
            match = { lat: center.lat, lng: center.lng, display_name: "" };
            resolvedSource = strategy === "centroid" ? "DEPARTAMENTO" : "DEPARTAMENTO_FALLBACK";
          } else if (strategy === "centroid") {
            match = { lat: -9.189967, lng: -75.015152, display_name: "" };
            resolvedSource = "PERU_CENTER";
          }
        }

        if (strategy === "refine" && match && resolvedSource) {
          if (resolvedSource !== "NOMINATIM" && resolvedSource !== "OVERPASS") {
            resolvedSource = null;
          } else {
            const deptKey = normalizeDepartmentKey(departamento);
            const center = (deptKey && DEPARTMENT_CENTERS[deptKey]) || null;
            const sameAsDepartmentCenter =
              !!center && Math.abs(match.lat - center.lat) <= eps && Math.abs(match.lng - center.lng) <= eps;
            const sameAsPeruCenter =
              Math.abs(match.lat - -9.189967) <= eps && Math.abs(match.lng - -75.015152) <= eps;
            const currentLat = Number((r as Record<string, unknown>).lat);
            const currentLng = Number((r as Record<string, unknown>).lng);
            const sameAsCurrent =
              Number.isFinite(currentLat) &&
              Number.isFinite(currentLng) &&
              Math.abs(match.lat - currentLat) <= eps &&
              Math.abs(match.lng - currentLng) <= eps;
            if (sameAsDepartmentCenter || sameAsPeruCenter || sameAsCurrent) {
              resolvedSource = null;
            }
          }
        }

        if (match && resolvedSource && isValidLatLng(match.lat, match.lng)) {
          db.exec("BEGIN");
          try {
            upsertOverride.run(id, match.lat, match.lng, resolvedSource, now);
            updateHospital.run(match.lat, match.lng, resolvedSource, now, id);
            db.exec("COMMIT");
            updated += 1;
            details.push({ id, ok: true, query_used: usedQuery, display_name: match.display_name || undefined });
          } catch {
            try {
              db.exec("ROLLBACK");
            } catch {
            }
            failed += 1;
            details.push({ id, ok: false });
          }
        } else {
          failed += 1;
          details.push({ id, ok: false });
        }

        if (perRecordDelayMs > 0) await sleep(perRecordDelayMs);
      }
      if (stoppedEarly) break;
    }

    const pendingAfter =
      strategy === "refine"
        ? computeRefineCandidates().length
        : (() => {
            const pendingAfterRow = db
              .prepare(
                `
                SELECT COUNT(*) AS n
                FROM hospitals h
                WHERE
                  ${invalidWhere}
                  ${strategy === "centroid" ? "" : `AND ${canGeocodeWhere}`}
              `,
              )
              .get() as { n?: unknown } | undefined;
            return pendingAfterRow && typeof pendingAfterRow.n === "number" ? pendingAfterRow.n : Number(pendingAfterRow?.n || 0);
          })();

    return NextResponse.json(
      {
        processed,
        updated,
        failed,
        pending_before: pendingBefore,
        pending_after: pendingAfter,
        stopped_early: stoppedEarly,
        max_runtime_ms: maxRuntimeMs,
        iterations,
        details: details.slice(0, 20),
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          message: "Error al geocodificar establecimientos.",
          status: 500,
          detail: err instanceof Error ? err.message : String(err),
        },
      },
      { status: 500 },
    );
  } finally {
    try {
      db.close();
    } catch {
    }
  }
}
