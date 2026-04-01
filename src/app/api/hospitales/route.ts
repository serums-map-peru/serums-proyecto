import { GET as getMap } from "./map/route";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return getMap(request);
}
