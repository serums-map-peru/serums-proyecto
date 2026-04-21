import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type EncapsNoteIndex = { mtimeMs: number; byCode: Map<string, string> };
let encapsCache: EncapsNoteIndex | null = null;

function dbPath() {
  return path.join(process.cwd(), "backend", "src", "data", "serums.db");
}

function encapsCsvPath() {
  return path.join(process.cwd(), "backend", "src", "data", "serums_offers", "Notas-Serums-2025-1.csv");
}

function openDb() {
  const p = dbPath();
  if (!fs.existsSync(p)) return null;
  return new DatabaseSync(p);
}

function cleanString(value: unknown) {
  if (value == null) return "";
  return String(value)
    .replace(/\uFEFF/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value: unknown) {
  return cleanString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function parseDelimited(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === delimiter) {
      row.push(field);
      field = "";
      continue;
    }

    if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      continue;
    }

    if (ch === "\r") continue;
    field += ch;
  }

  row.push(field);
  rows.push(row);
  return rows;
}

function padIpressCode(value: unknown) {
  const raw = cleanString(value);
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.padStart(8, "0");
}

function findHeaderRowIndex(rows: string[][]) {
  for (let i = 0; i < rows.length; i++) {
    for (const cell of rows[i] || []) {
      const k = normalizeKey(cell);
      if (k === "profesion" || k.startsWith("profes")) return i;
    }
  }
  return -1;
}

function buildHeaderIndex(headerRow: string[]) {
  const index = new Map<string, number>();
  for (let i = 0; i < headerRow.length; i++) {
    const k = normalizeKey(headerRow[i]);
    if (!k) continue;
    if (!index.has(k)) index.set(k, i);
  }
  return index;
}

function mustGetIndex(headerIndex: Map<string, number>, keys: string[]) {
  for (const k of keys) {
    const idx = headerIndex.get(k);
    if (typeof idx === "number") return idx;
  }
  return null;
}

function loadEncapsNotes() {
  const p = encapsCsvPath();
  try {
    const stat = fs.statSync(p);
    if (encapsCache && encapsCache.mtimeMs === stat.mtimeMs) return encapsCache;

    const raw = fs.readFileSync(p, "utf8");
    const rows = parseDelimited(raw, ";");
    const headerRowIndex = findHeaderRowIndex(rows);
    if (headerRowIndex < 0) {
      encapsCache = { mtimeMs: stat.mtimeMs, byCode: new Map() };
      return encapsCache;
    }

    const headerRow = (rows[headerRowIndex] || []).map((c) => cleanString(c));
    const headerIndex = buildHeaderIndex(headerRow);
    const idxCodigo = mustGetIndex(headerIndex, ["codigorenipress", "codigorenipressmodular", "renipress", "codigo"]);
    const idxNota = mustGetIndex(headerIndex, ["nota"]);

    const byCode = new Map<string, { bestStr: string; bestNum: number | null }>();
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const codigo = idxCodigo != null && idxCodigo < row.length ? padIpressCode(row[idxCodigo]) : "";
      if (!codigo) continue;
      const notaRaw = idxNota != null && idxNota < row.length ? cleanString(row[idxNota]) : "";
      if (!notaRaw) continue;
      const normalized = notaRaw.replace(",", ".");
      const n = Number.parseFloat(normalized);
      const noteNum = Number.isFinite(n) ? n : null;
      const prev = byCode.get(codigo);
      if (!prev) {
        byCode.set(codigo, { bestStr: notaRaw, bestNum: noteNum });
        continue;
      }
      if (noteNum != null && (prev.bestNum == null || noteNum > prev.bestNum)) {
        prev.bestNum = noteNum;
        prev.bestStr = notaRaw;
      } else if (prev.bestNum == null && noteNum == null && !prev.bestStr) {
        prev.bestStr = notaRaw;
      }
    }

    const final = new Map<string, string>();
    for (const [code, v] of byCode.entries()) final.set(code, v.bestStr);

    encapsCache = { mtimeMs: stat.mtimeMs, byCode: final };
    return encapsCache;
  } catch {
    encapsCache = { mtimeMs: 0, byCode: new Map() };
    return encapsCache;
  }
}

function getEncapsNoteForHospitalCode(code: string) {
  const c = padIpressCode(code);
  if (!c) return null;
  const store = loadEncapsNotes();
  return store.byCode.get(c) || null;
}

function safeJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
  }
  return [];
}

function tableExists(db: DatabaseSync, name: string) {
  try {
    const row = db
      .prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1")
      .get(String(name));
    return !!(row && (row as { ok?: number }).ok);
  } catch {
    return false;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> },
) {
  const resolvedParams = await Promise.resolve(params);
  const id = String(resolvedParams?.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: { message: "ID inválido.", status: 400 } }, { status: 400 });
  }

  const db = openDb();
  if (!db) {
    return NextResponse.json(
      { error: { message: "Base de datos no encontrada.", status: 500 } },
      { status: 500 },
    );
  }

  try {
    const row = db
      .prepare(
        `
        SELECT
          h.id,
          h.profesion,
          h.profesiones_json,
          h.institucion,
          h.departamento,
          h.provincia,
          h.distrito,
          h.grado_dificultad,
          h.codigo_renipress_modular,
          h.nombre_establecimiento,
          h.presupuesto,
          h.categoria,
          h.zaf,
          h.ze,
          h.imagenes_json,
          h.lat,
          h.lng,
          h.coordenadas_fuente
        FROM hospitals h
        WHERE h.id = ? OR h.codigo_renipress_modular = ?
        ORDER BY CASE WHEN h.id = ? THEN 0 ELSE 1 END
        LIMIT 1
      `,
      )
      .get(id, id, id) as Record<string, unknown> | undefined;

    if (!row) {
      return NextResponse.json({ error: { message: "Hospital no encontrado", status: 404 } }, { status: 404 });
    }

    const profesiones = safeJsonArray(row.profesiones_json);
    const imagenes = safeJsonArray(row.imagenes_json);

    const base = {
      id: String(row.id || ""),
      profesion: String(row.profesion || ""),
      profesiones: profesiones.length ? profesiones : undefined,
      institucion: String(row.institucion || ""),
      departamento: String(row.departamento || ""),
      provincia: String(row.provincia || ""),
      distrito: String(row.distrito || ""),
      grado_dificultad: String(row.grado_dificultad || ""),
      codigo_renipress_modular: String(row.codigo_renipress_modular || ""),
      nombre_establecimiento: String(row.nombre_establecimiento || ""),
      presupuesto: String(row.presupuesto || ""),
      categoria: String(row.categoria || ""),
      zaf: String(row.zaf || ""),
      ze: String(row.ze || ""),
      lat: Number(row.lat),
      lng: Number(row.lng),
      imagenes: imagenes.length ? imagenes : undefined,
      coordenadas_fuente: row.coordenadas_fuente != null ? String(row.coordenadas_fuente) : undefined,
      encaps_puntaje_2025_i: getEncapsNoteForHospitalCode(String(row.codigo_renipress_modular || row.id || "")),
    } as Record<string, unknown>;

    if (!tableExists(db, "serums_offers")) {
      return NextResponse.json(base, { status: 200 });
    }

    const hospitalId = String(row.id || "");
    const offers = db
      .prepare(
        `
        SELECT
          hospital_id,
          codigo_renipress_modular,
          periodo,
          modalidad,
          profesion,
          plazas,
          sede_adjudicacion,
          updated_at
        FROM serums_offers
        WHERE hospital_id = ?
      `,
      )
      .all(hospitalId)
      .map((r) => {
        const o = r as Record<string, unknown>;
        return {
          hospital_id: String(o.hospital_id || ""),
          codigo_renipress_modular: String(o.codigo_renipress_modular || ""),
          periodo: String(o.periodo || ""),
          modalidad: String(o.modalidad || ""),
          profesion: String(o.profesion || ""),
          plazas: Number(o.plazas),
          sede_adjudicacion: String(o.sede_adjudicacion || ""),
          updated_at: o.updated_at != null ? String(o.updated_at) : null,
        };
      });

    const summaryMap = new Map<string, { periodo: string; modalidad: string; plazas_total: number }>();
    for (const o of offers) {
      const key = `${o.periodo}__${o.modalidad}`;
      const existing = summaryMap.get(key);
      if (!existing) {
        summaryMap.set(key, { periodo: o.periodo, modalidad: o.modalidad, plazas_total: Number.isFinite(o.plazas) ? o.plazas : 0 });
      } else {
        existing.plazas_total += Number.isFinite(o.plazas) ? o.plazas : 0;
      }
    }

    const serums_resumen = Array.from(summaryMap.values()).sort((a, b) => {
      const p = b.periodo.localeCompare(a.periodo);
      if (p !== 0) return p;
      return a.modalidad.localeCompare(b.modalidad);
    });

    return NextResponse.json(
      {
        ...base,
        serums_ofertas: offers,
        serums_resumen,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: { message: "Error al obtener el establecimiento.", status: 500 } },
      { status: 500 },
    );
  } finally {
    try {
      db.close();
    } catch {
    }
  }
}
