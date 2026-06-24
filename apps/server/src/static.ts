import { join } from "node:path";

const DIST_DIR = process.env.STATIC_DIR ?? join(import.meta.dir, "../../web/dist");

export async function serveStatic(pathname: string, method: string): Promise<Response | null> {
  if (method !== "GET" && method !== "HEAD") return null;

  const indexPath = join(DIST_DIR, "index.html");
  const indexFile = Bun.file(indexPath);
  if (!(await indexFile.exists())) return null;

  let relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  if (relativePath.includes("..")) relativePath = "index.html";

  const file = Bun.file(join(DIST_DIR, relativePath));
  if (await file.exists()) {
    return new Response(method === "HEAD" ? null : file, {
      headers: { "Content-Type": file.type || "application/octet-stream" },
    });
  }

  return new Response(method === "HEAD" ? null : indexFile, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
