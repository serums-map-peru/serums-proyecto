export const runtime = "nodejs";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET() {
  try {
    const filePath = join(process.cwd(), "public", "Lisa personaje.png");
    const body = await readFile(filePath);
    return new Response(body, {
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=0, must-revalidate",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}

