"use strict";

/*
 * Calma · servidor del prototipo
 * Node.js puro, sin dependencias externas.
 * Sirve el frontend, la base de ingredientes y la API de compatibilidad.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const motor = require("./public/js/motor-reglas.js");

const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || "127.0.0.1";
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const MAX_BODY = 2 * 1024 * 1024;

const db = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "ingredientes.json"), "utf8"));
const productos = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "productos.json"), "utf8"));

// Perfiles en memoria, tal como plantea el prototipo. No hay base de datos.
const perfiles = new Map();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".gz": "application/gzip",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".map": "application/json; charset=utf-8"
};

function baseHeaders(extra) {
  return Object.assign({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Perfil-Id",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(self)"
  }, extra || {});
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, baseHeaders({
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  }));
  res.end(body);
}

function sendText(res, status, text, type) {
  res.writeHead(status, baseHeaders({
    "Content-Type": type || "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
    "Cache-Control": "no-store"
  }));
  res.end(text);
}

function safePath(base, relative) {
  const cleaned = String(relative || "").replace(/^[/\\]+/, "");
  const full = path.normalize(path.join(base, cleaned));
  const baseNorm = path.normalize(base);
  if (full !== baseNorm && !full.startsWith(baseNorm + path.sep)) return null;
  return full;
}

function serveStatic(req, res, urlPath) {
  let base = PUBLIC_DIR;
  let relative = urlPath;

  if (urlPath === "/data" || urlPath.startsWith("/data/")) {
    base = DATA_DIR;
    relative = urlPath.replace(/^\/data\/?/, "");
  }
  if (relative === "" || relative === "/") relative = "index.html";

  const filePath = safePath(base, relative);
  if (!filePath) { sendText(res, 403, "Acceso denegado."); return; }

  fs.stat(filePath, function (err, stat) {
    if (err || !stat.isFile()) {
      if (urlPath.startsWith("/api/")) {
        sendJson(res, 404, { ok: false, error: "Endpoint no encontrado." });
      } else {
        sendText(res, 404, "No encontramos esa página. Vuelve a /", "text/plain; charset=utf-8");
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    const isVendor = urlPath.startsWith("/vendor/") || urlPath.startsWith("/assets/fonts/");
    const cache = isVendor ? "public, max-age=31536000, immutable" : "no-cache";

    const headers = baseHeaders({
      "Content-Type": type,
      "Content-Length": stat.size,
      "Cache-Control": cache
    });

    res.writeHead(200, headers);
    if (req.method === "HEAD") { res.end(); return; }
    const stream = fs.createReadStream(filePath);
    stream.on("error", function () {
      if (!res.headersSent) sendText(res, 500, "Error leyendo el archivo.");
      else res.destroy();
    });
    stream.pipe(res);
  });
}

function readJson(req) {
  return new Promise(function (resolve, reject) {
    let total = 0;
    const chunks = [];
    req.on("data", function (chunk) {
      total += chunk.length;
      if (total > MAX_BODY) {
        reject(Object.assign(new Error("El cuerpo de la solicitud es demasiado grande."), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", function () {
      if (!chunks.length) { resolve({}); return; }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (e) {
        reject(Object.assign(new Error("El JSON enviado no es válido."), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function idDePerfil(req, body) {
  const header = req.headers["x-perfil-id"];
  const id = String(body && body.id ? body.id : (header || "")).trim();
  if (!id || id.length < 6 || id.length > 120) return null;
  return id;
}

function errorDeValidacion(mensaje) {
  return Object.assign(new Error(mensaje), { status: 400 });
}

async function manejarApi(req, res, urlPath) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, baseHeaders());
    res.end();
    return true;
  }

  if (urlPath === "/api/health" || urlPath === "/api/salud") {
    sendJson(res, 200, {
      ok: true,
      servicio: "calma",
      version: motor.VERSION,
      ingredientes: db.ingredientes.length,
      uptime: Math.round(process.uptime())
    });
    return true;
  }

  if (urlPath === "/api/ingredientes" && req.method === "GET") {
    sendJson(res, 200, db);
    return true;
  }

  if (urlPath === "/api/productos" && req.method === "GET") {
    sendJson(res, 200, productos);
    return true;
  }

  if (urlPath === "/api/perfil" && req.method === "POST") {
    const body = await readJson(req);
    const id = idDePerfil(req, body) || crypto.randomUUID();
    const perfil = motor.sanearPerfil(body.perfil || body, db);
    perfiles.set(id, { id: id, perfil: perfil, actualizadoEn: new Date().toISOString() });
    sendJson(res, 200, { ok: true, id: id, perfil: perfil });
    return true;
  }

  if (urlPath === "/api/perfil" && req.method === "GET") {
    const id = idDePerfil(req, {});
    const guardado = id ? perfiles.get(id) : null;
    if (!guardado) { sendJson(res, 404, { ok: false, error: "No hay un perfil guardado para esta sesión." }); return true; }
    sendJson(res, 200, { ok: true, id: id, perfil: guardado.perfil, actualizadoEn: guardado.actualizadoEn });
    return true;
  }

  if (urlPath === "/api/analizar" && req.method === "POST") {
    const body = await readJson(req);
    const id = idDePerfil(req, body);
    let texto = typeof body.texto === "string" ? body.texto : "";
    if (!texto && Array.isArray(body.ingredientes)) texto = body.ingredientes.join(", ");
    if (!texto || texto.trim().length < 3) throw errorDeValidacion("Falta la lista de ingredientes.");

    let perfil = body.perfil;
    if (!perfil) {
      const guardado = id ? perfiles.get(id) : null;
      if (guardado) perfil = guardado.perfil;
    }
    if (!perfil || typeof perfil !== "object") throw errorDeValidacion("Falta el perfil de piel. Crea tu perfil antes de analizar.");

    const resultado = motor.analizarProducto(texto, perfil, db);
    const nombre = String(body.productoNombre || "").slice(0, 120).trim();
    const analisisId = crypto.randomUUID();
    sendJson(res, 200, Object.assign({
      ok: true,
      id: analisisId,
      productoNombre: nombre || "Producto sin nombre"
    }, resultado));
    return true;
  }

  return false;
}

const server = http.createServer(function (req, res) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch (e) {
    sendJson(res, 400, { ok: false, error: "URL no válida." });
    return;
  }

  if (urlPath.startsWith("/api/")) {
    manejarApi(req, res, urlPath).then(function (atendido) {
      if (!atendido) sendJson(res, 404, { ok: false, error: "Endpoint no encontrado." });
    }).catch(function (err) {
      const status = err.status || 500;
      if (status >= 500) console.error("Error API:", err);
      sendJson(res, status, { ok: false, error: err.message || "Error interno." });
    });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendText(res, 405, "Método no permitido.");
    return;
  }
  serveStatic(req, res, urlPath);
});

server.on("error", function (err) {
  if (err.code === "EADDRINUSE") {
    console.error("El puerto " + PORT + " está ocupado. Cierra el otro proceso o usa PORT=8001.");
  } else {
    console.error("No se pudo iniciar el servidor:", err.message);
  }
  process.exitCode = 1;
});

server.listen(PORT, HOST, function () {
  console.log("");
  console.log("  Calma · compatibilidad cosmética para rosácea");
  console.log("  http://" + HOST + ":" + PORT);
  console.log("  Ingredientes cargados: " + db.ingredientes.length + " · perfiles en memoria: " + perfiles.size);
  console.log("  Detén el servidor con Ctrl+C.");
  console.log("");
});

process.on("SIGINT", function () {
  console.log("\nCerrando Calma…");
  server.close(function () { process.exit(0); });
});
