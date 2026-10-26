# Calma

**Compatibilidad cosmética para piel con rosácea.**

Calma es un prototipo web que lee la lista de ingredientes de un producto (foto o texto), la compara con una base de ingredientes basada en evidencia dermatológica y devuelve una puntuación de compatibilidad personalizada según el perfil de rosácea de la persona.

No diagnostica, no receta y no sustituye a un dermatólogo. Es una herramienta educativa y de tamizaje.

---

## Inicio rápido

Requisito: **Node.js 18 o superior**. No hace falta instalar dependencias.

1. Haz doble clic en **<code>iniciar.bat</code>** (Windows).
2. Se abrirá el navegador en **http://127.0.0.1:8000**.
3. Crea tu perfil o pulsa **“Probar con un perfil de ejemplo”**.

También puedes iniciar manualmente:

~~~bash
cd app
node server.js
~~~

Y abrir http://127.0.0.1:8000

Para detener el servidor: **Ctrl + C** en la ventana de la terminal.

---

## Despliegue web

### Vercel

1. Sube el repositorio a GitHub/GitLab.
2. Importa el proyecto en Vercel.
3. <code>vercel.json</code> ya define el build (<code>node scripts/build-static.js</code>) y la salida estática (<code>app/public</code>).
4. Despliega. Vercel genera el dominio y el build toma <code>VERCEL_PROJECT_PRODUCTION_URL</code> para el sitemap y las URLs absolutas.

También puedes desplegar desde la terminal:

~~~bash
npx vercel --prod
~~~

El despliegue es **estático**: no se ejecuta <code>server.js</code> ni se necesita Python. El motor de reglas y el OCR corren en el navegador; los datos se leen de <code>/data</code>.

### Firebase Hosting

1. Instala la CLI: <code>npm i -g firebase-tools</code> (o usa <code>npx firebase-tools</code>).
2. Inicia sesión: <code>firebase login</code>.
3. Asocia el proyecto: <code>firebase use --add</code>.
4. Genera los archivos con tu dominio real y despliega:

~~~powershell
$env:SITE_URL="https://tu-proyecto.web.app"
npm run build
$env:SITE_URL=$null
npx firebase-tools deploy --only hosting
~~~

En macOS/Linux:

~~~bash
SITE_URL=https://tu-proyecto.web.app npm run build
npx firebase-tools deploy --only hosting
~~~

<code>firebase.json</code> publica <code>app/public</code>. No hay Functions: el análisis funciona en el cliente.

### Build estático

~~~bash
npm run build
~~~

El build:

- Copia <code>app/data/*.json</code> a <code>app/public/data/</code> para que el hosting estático pueda leerlos.
- Genera <code>robots.txt</code>, <code>sitemap.xml</code> y <code>llms.txt</code> con el dominio de <code>SITE_URL</code>.
- Ajusta las URLs absolutas de canonical y Open Graph al mismo dominio.

Si cambias ingredientes o productos, vuelve a ejecutar <code>npm run build</code> antes de desplegar.

---

## SEO

El SEO base ya existía: títulos y descripciones únicos, <code>lang="es"</code>, jerarquía de encabezados, diseño mobile-first y etiquetas Open Graph básicas. Se completó con:

- **Canonical** por página y <code>robots</code> meta (<code>index, follow, max-image-preview:large</code>).
- **Open Graph y Twitter Cards** con imagen 1200 × 630 (<code>/assets/og-image.png</code>).
- **JSON-LD**: <code>WebApplication</code>, <code>WebSite</code>, <code>WebPage</code> y <code>MedicalCondition</code>; sin promesas médicas.
- **<code>robots.txt</code>** con referencia al sitemap y bloqueo de <code>/api/</code> y <code>/data/</code>.
- **<code>sitemap.xml</code>** con las cuatro páginas públicas.
- **<code>llms.txt</code>** con resumen, páginas, alcance, privacidad, límites y fuentes para agentes/LLM.
- **<code>404.html</code>** con <code>noindex</code>.
- **Datos estructurados y metadatos** insertados en las cuatro páginas.

Archivos:

- <code>app/public/robots.txt</code>
- <code>app/public/sitemap.xml</code>
- <code>app/public/llms.txt</code>
- <code>app/public/404.html</code>
- <code>app/public/assets/og-image.png</code>
- <code>scripts/build-static.js</code>

El dominio por defecto del repo es <code>https://calma-rosacea.vercel.app</code>. Si despliegas en otro dominio, ejecuta el build con <code>SITE_URL</code> (Vercel lo hace automático con su URL de producción). El SEO técnico no garantiza posiciones: falta trabajo de contenidos, enlaces y validación con Search Console.

---

## Qué incluye

- **Perfil guiado en 6 pasos:** rosácea, subtipo, tipo de piel, sensibilidad (barra 0–100 sin números visibles), alergias y tratamientos.
- **Cierre ético:** si la persona responde que no tiene rosácea, el flujo se detiene y no se crea un perfil.
- **Análisis por foto o texto:** OCR local con Tesseract.js, hasta **4 fotos** de la misma etiqueta, texto editable y productos ficticios de ejemplo.
- **Puntuación 0–100 explicable:** ingredientes críticos, secundarios, activos de apoyo, sensibilidad, alergias, interacciones medicamentosas y ajustes por subtipo.
- **Topes de seguridad:** un alérgeno anula la compatibilidad; un irritante crítico limita la puntuación a 49; un secundario a 96.
- **Alertas específicas:** fimatosa (derivación prioritaria), ocular, alérgenos y tratamientos.
- **Historial local:** últimos 12 análisis en el navegador, recuperables.
- **Diseño accesible y mobile-first:** paleta “Rosacea Calm”, sin rojos saturados, con navegación inferior en móvil.
- **Página de método:** evidencia, fórmula, límites y fuentes.

---

## Flujo de usuario

1. **Inicio:** landing con explicación y demo.
2. **Perfil:** cuestionario; se guarda en <code>localStorage</code> y se envía a la API local en memoria.
3. **Analizar:** subir/tomar hasta 4 fotos, OCR local, revisar texto combinado, analizar.
4. **Resultado:** puntuación, veredicto, ingredientes en alerta, activos de apoyo, cálculo, recordatorio de parche y rutina base.
5. **Historial:** volver a abrir análisis anteriores.

---

## Arquitectura

~~~
package.json                 Scripts raíz y metadatos
vercel.json                  Configuración de Vercel
firebase.json                Configuración de Firebase Hosting
scripts/build-static.js      Copia datos y genera SEO
app/
├─ server.js                 API y servidor estático (Node, sin dependencias)
├─ package.json
├─ data/
│  ├─ ingredientes.json      Base de ingredientes, alérgenos, medicamentos y reglas
│  └─ productos.json         Productos ficticios + perfil de demo
├─ public/
│  ├─ index.html             Landing
│  ├─ perfil.html            Cuestionario
│  ├─ analizar.html          Analizador y resultados
│  ├─ metodo.html            Método, evidencia y límites
│  ├─ 404.html               Página de error
│  ├─ robots.txt             SEO
│  ├─ sitemap.xml            SEO
│  ├─ llms.txt               Resumen para agentes/LLM
│  ├─ data/                  Copia generada para hosting estático
│  ├─ css/
│  │  ├─ fuentes.css
│  │  └─ estilos.css
│  ├─ js/
│  │  ├─ motor-reglas.js     Motor determinista (UMD: Node y navegador)
│  │  ├─ comun.js            Perfil, historial, API y UI base
│  │  ├─ inicio.js
│  │  ├─ perfil.js
│  │  └─ analizar.js         OCR, cámara, análisis y render
│  ├─ assets/                Marca, fuentes, etiqueta demo y og-image
│  └─ vendor/tesseract/      OCR local (JS, core wasm y modelos eng/spa)
└─ tests/
   └─ motor.test.js
~~~

### API

| Método | Ruta | Función |
|---|---|---|
| GET | <code>/api/health</code> | Estado del servicio |
| GET | <code>/api/ingredientes</code> | Base de ingredientes |
| GET | <code>/api/productos</code> | Productos de ejemplo |
| POST | <code>/api/perfil</code> | Guarda un perfil en memoria |
| GET | <code>/api/perfil</code> | Recupera el perfil por <code>X-Perfil-Id</code> |
| POST | <code>/api/analizar</code> | Analiza texto INCI y devuelve la puntuación |

Ejemplo de análisis:

~~~json
{
  "texto": "Aqua, Glycerin, Niacinamide, Ceramide NP, Panthenol",
  "perfil": {
    "tipoRosacea": "ppr",
    "tipoPiel": "mixta",
    "sensibilidad": 62,
    "alergias": ["fragancia"],
    "medicamentos": ["tretinoina"]
  },
  "productoNombre": "Crema de ejemplo"
}
~~~

La respuesta incluye siempre <code>recordatorio</code>, <code>puntuacion</code>, <code>veredicto</code>, <code>problematicos</code>, <code>beneficiosos</code>, <code>alertas</code>, <code>perfilUsado</code> y <code>desglose</code>.

---

## Cómo se calcula

- Base: **100**.
- Irritante crítico: resta su peso multiplicado por el factor de sensibilidad. Tope final: **49**.
- Irritante secundario: resta su peso con el mismo factor. Tope final: **96**.
- Activo de apoyo: suma 2–5 puntos, con tope de **+15**.
- Sensibilidad: factor <code>1 + sensibilidad/100</code>; +0.1 si la piel es sensible; +15% en ingredientes secantes si la piel es seca.
- Alérgeno personal: **veto**, puntuación 0.
- Interacción con tratamiento: **−20** y alerta.
- PPR: penalización extra por comedogénicos.
- Fimatosa: alerta prioritaria; la puntuación cosmética no sustituye la consulta.
- Ocular: ajuste y aviso periocular.

Veredictos: **80–100 alta**, **50–79 media**, **0–49 no compatible**.

El detalle completo está en **<code>/metodo.html</code>**.

---

## OCR local

- Motor: **Tesseract.js 5.1.1**, servido desde <code>public/vendor/tesseract</code>. No requiere Python ni servicios externos.
- Idiomas: inglés + español. Los INCI suelen estar en inglés/latín.
- Hasta **4 fotos** por producto: se leen una por una y el texto se combina, eliminando duplicados exactos.
- Las imágenes se procesan en el navegador; **no se suben**.
- Se puede corregir el texto antes de analizar o pegar la lista a mano.
- La etiqueta de ejemplo está en <code>public/assets/etiqueta-demo.png</code> y se puede probar desde el analizador.
- La primera lectura tarda más porque carga el modelo de idioma. Las siguientes fotos reutilizan el mismo lector.
- Si una foto no se puede leer, se marca como error y puedes reintentarla sin perder el texto de las demás.

> El OCR no es perfecto. Una foto borrosa, un reflejo o una etiqueta curvada pueden omitir ingredientes. Revisa siempre el texto detectado.

---

## Pruebas

~~~bash
npm test
~~~

o

~~~bash
node app/tests/motor.test.js
~~~

Hay **24 pruebas** del motor de reglas.

Cubre: productos seguros, irritantes críticos, alérgenos, interacciones, sensibilidad, PPR, fimatosa, errores típicos del OCR, alcoholes grasos, “fragrance-free”, urea, zinc PCA y saneamiento del perfil.

---

## Decisión de stack

Los documentos de diseño proponían **FastAPI + EasyOCR**. En este equipo no hay Python instalado y el entorno solo garantiza Node.js. Para que el prototipo funcione sin instalar un runtime adicional se implementó:

- **Backend:** Node.js puro (sin Express ni dependencias).
- **Frontend:** HTML, CSS y JavaScript vanilla.
- **OCR:** Tesseract.js local en el navegador (en lugar de EasyOCR).
- **Motor de reglas:** JavaScript determinista, compartido entre servidor y navegador.

La lógica, los datos y la salida son los mismos que plantea el documento. El motor está aislado en <code>public/js/motor-reglas.js</code> y la base en <code>data/ingredientes.json</code>, así que se puede portar a Python/FastAPI sin reescribir la interfaz. La razón completa está en **<code>/metodo.html#evidencia</code>**.

---

## Privacidad

- Perfil e historial: <code>localStorage</code> del navegador.
- Fotos: procesadas localmente; no se envían.
- En local, el texto y el perfil se envían al servidor Node para aplicar las reglas; los perfiles viven en memoria y se pierden al reiniciar.
- En Vercel/Firebase no hay backend: el perfil y el motor de reglas se ejecutan en el navegador y los datos se cargan de <code>/data</code>.
- Sin cuentas, analítica, cookies publicitarias ni servicios externos.
- Fuentes y OCR servidos desde el propio proyecto.

---

## Límites

- **No es un dispositivo médico.**
- No detecta rosácea en el rostro, no mide grasa/textura y no usa luz UV. Esas funciones requieren hardware, dataset y validación clínica.
- No conoce concentraciones ni el vehículo completo de la fórmula.
- La tolerancia es individual: **prueba de parche de 48–72 horas** antes de usar un producto nuevo.
- Fimatosa y ocular requieren valoración profesional.
- Embarazo, lactancia y población pediátrica quedan fuera del alcance.

---

## Fuentes

- American Academy of Dermatology (AAD) — Rosacea.
- National Rosacea Society (NRS) — Triggers and skin care.
- ROSCO 2017 — clasificación por fenotipos.
- AEDV — guía para pacientes con rosácea.

Los enlaces están en <code>/metodo.html#fuentes</code>.

---

## Créditos

Prototipo académico. Productos de ejemplo ficticios. Tipografías Outfit y DM Sans (SIL Open Font License). Tesseract.js (Apache 2.0).
