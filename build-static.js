#!/usr/bin/env node
"use strict";

/**
 * Calma · build estático
 * - Copia la base de datos a app/public/data para hosting estático.
 * - Genera robots.txt, sitemap.xml y llms.txt con el dominio de producción.
 *
 * Uso local:
 *   node scripts/build-static.js
 *   SITE_URL=https://mi-dominio.com node scripts/build-static.js
 *
 * En Vercel, SITE_URL se toma de VERCEL_PROJECT_PRODUCTION_URL.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_SITE = "https://calma-rosacea.vercel.app";
const PUBLIC_DIR = path.join(ROOT, "app", "public");
const DATA_DIR = path.join(ROOT, "app", "data");
const PUBLIC_DATA_DIR = path.join(PUBLIC_DIR, "data");

function normalizarSitio(valor) {
  var url = String(valor || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  return url.replace(/\/+$/, "");
}

function sitio() {
  return normalizarSitio(
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    DEFAULT_SITE
  );
}

function escaparXml(valor) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const BASE = sitio();
const HOY = new Date().toISOString().slice(0, 10);

fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
for (const archivo of ["ingredientes.json", "productos.json"]) {
  const origen = path.join(DATA_DIR, archivo);
  const destino = path.join(PUBLIC_DATA_DIR, archivo);
  if (!fs.existsSync(origen)) throw new Error("Falta el archivo de datos: " + origen);
  fs.copyFileSync(origen, destino);
  console.log("  datos → app/public/data/" + archivo);
}

const robots = [
  "# Calma · compatibilidad cosmética para rosácea",
  "# Prototipo educativo. No es un dispositivo médico.",
  "User-agent: *",
  "Allow: /",
  "Disallow: /api/",
  "Disallow: /data/",
  "",
  "Sitemap: " + BASE + "/sitemap.xml",
  ""
].join("\n");
fs.writeFileSync(path.join(PUBLIC_DIR, "robots.txt"), robots, "utf8");
console.log("  robots.txt");

const paginas = [
  { ruta: "/", prioridad: "1.0", frecuencia: "weekly" },
  { ruta: "/perfil.html", prioridad: "0.8", frecuencia: "monthly" },
  { ruta: "/analizar.html", prioridad: "0.9", frecuencia: "weekly" },
  { ruta: "/metodo.html", prioridad: "0.8", frecuencia: "monthly" }
];

const urls = paginas.map(function (p) {
  return [
    "  <url>",
    "    <loc>" + escaparXml(BASE + p.ruta) + "</loc>",
    "    <lastmod>" + HOY + "</lastmod>",
    "    <changefreq>" + p.frecuencia + "</changefreq>",
    "    <priority>" + p.prioridad + "</priority>",
    "  </url>"
  ].join("\n");
}).join("\n");

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  urls,
  "</urlset>",
  ""
].join("\n");
fs.writeFileSync(path.join(PUBLIC_DIR, "sitemap.xml"), sitemap, "utf8");
console.log("  sitemap.xml (" + paginas.length + " URLs)");

const llms = [
  "# Calma",
  "",
  "> Calma es un prototipo web educativo que evalúa la compatibilidad de productos cosméticos con la piel con rosácea a partir de la lista INCI y de un perfil declarado por la persona. No diagnostica ni prescribe.",
  "",
  "Calma está pensada para personas con rosácea que quieren entender si un producto contiene ingredientes que la evidencia asocia con irritación. La evaluación es orientativa y se basa en evidencia poblacional, no en la tolerancia individual. No sustituye la valoración de un dermatólogo.",
  "",
  "## Páginas principales",
  "",
  "- [Inicio](" + BASE + "/): presentación del proyecto, cómo funciona y límites.",
  "- [Crear perfil](" + BASE + "/perfil.html): cuestionario de rosácea, tipo de piel, sensibilidad, alergias y tratamientos.",
  "- [Analizar producto](" + BASE + "/analizar.html): carga de hasta 4 fotos de la etiqueta, OCR local y resultado de compatibilidad.",
  "- [El método](" + BASE + "/metodo.html): fórmula de puntuación, base de ingredientes, evidencia, privacidad y fuentes.",
  "",
  "## Qué hace",
  "",
  "- Lee la lista INCI con Tesseract.js en el navegador; no requiere Python ni subir fotos a un servidor.",
  "- Permite combinar hasta 4 fotos de la misma etiqueta y corrige el texto antes de analizar.",
  "- Aplica reglas deterministas: ingredientes críticos, secundarios, activos de apoyo, sensibilidad, alergias, interacciones con medicamentos y subtipo de rosácea.",
  "- Devuelve una puntuación de 0 a 100, ingredientes problemáticos, activos de apoyo, alertas y un recordatorio de prueba de parche.",
  "",
  "## Qué no hace",
  "",
  "- No diagnostica rosácea ni otras enfermedades de la piel.",
  "- No receta medicamentos ni recomienda marcas.",
  "- No mide grasa, textura ni luz UV; no analiza el rostro con visión artificial en esta versión.",
  "- No conoce la concentración real de cada ingrediente ni la formulación completa.",
  "",
  "## Privacidad",
  "",
  "El perfil y el historial se guardan en localStorage. Las fotos se procesan en el navegador y no se envían. En la versión estática no hay backend; el motor de reglas también se ejecuta en el navegador.",
  "",
  "## Límites",
  "",
  "La compatibilidad es orientativa. Antes de usar un producto nuevo, realiza una prueba de parche de 48–72 horas. Si hay lesiones inflamadas, cambios en la nariz o síntomas oculares, consulta a un dermatólogo.",
  "",
  "## Fuentes",
  "",
  "- American Academy of Dermatology (AAD) — Rosacea.",
  "- National Rosacea Society (NRS) — Triggers and skin care.",
  "- ROSCO 2017 — clasificación por fenotipos.",
  "- AEDV — guía para pacientes con rosácea.",
  "",
  "## Recursos técnicos",
  "",
  "- [Sitemap](" + BASE + "/sitemap.xml)",
  "- [robots.txt](" + BASE + "/robots.txt)",
  ""
].join("\n");
fs.writeFileSync(path.join(PUBLIC_DIR, "llms.txt"), llms, "utf8");
console.log("  llms.txt");

// Ajusta solo las URLs absolutas de canonical/OG/Twitter/sitemap.
// Así el build se puede repetir con dominios distintos sin tocar enlaces de contenido.
const htmlFiles = ["index.html", "perfil.html", "analizar.html", "metodo.html", "404.html"];
const patronesUrl = [
  /(<link rel="canonical" href=")https?:\/\/[^"\/]+/g,
  /(<link rel="sitemap" type="application\/xml" href=")https?:\/\/[^"\/]+/g,
  /(<meta property="og:url" content=")https?:\/\/[^"\/]+/g,
  /(<meta property="og:image" content=")https?:\/\/[^"\/]+/g,
  /(<meta property="og:image:secure_url" content=")https?:\/\/[^"\/]+/g,
  /(<meta name="twitter:image" content=")https?:\/\/[^"\/]+/g
];
let htmlAjustados = 0;
for (const archivo of htmlFiles) {
  const ruta = path.join(PUBLIC_DIR, archivo);
  if (!fs.existsSync(ruta)) continue;
  let html = fs.readFileSync(ruta, "utf8");
  const original = html;
  for (const patron of patronesUrl) html = html.replace(patron, "$1" + BASE);
  if (html !== original) {
    fs.writeFileSync(ruta, html, "utf8");
    htmlAjustados++;
  }
}
console.log("  HTML → " + htmlAjustados + " páginas con URLs de " + BASE);

console.log("");
console.log("Build estático listo.");
console.log("  Sitio: " + BASE);
console.log("  Salida: app/public");
console.log("  Fecha: " + HOY);
console.log("");
