A continuación tienes el esquema completo del aplicativo web, las decisiones técnicas clave y el prompt que puedes llevar directamente a \*\*DeepSeek Harness\*\* para que genere el código. La conclusión central sobre tu duda final es: \*\*la capa de compatibilidad debe ser un motor de reglas ponderadas en Python, no una red neuronal\*\*. Más adelante detallo por qué.

\---

\## 🧭 Visión general del sistema

\```

[Frontend Web] → [Backend API] → [Módulo OCR] → [Motor de reglas en Python] → [Respuesta de compatibilidad]

↑

[Base de datos de ingredientes y reglas]

\```

El sistema \*\*no diagnostica rosácea\*\* (eso lo declara el usuario). Su función es \*\*evaluar si un producto cosmético contiene ingredientes que la evidencia asocia con irritación o alergia en piel con rosácea\*\*, y devolver una puntuación de compatibilidad personalizada según el perfil declarado.

\---

\## 📋 Paso a paso del flujo de usuario y técnico

\### 1. Cuestionario inicial (Frontend)

El usuario responde en una interfaz web (React, Vue o incluso HTML/JS simple). Las respuestas se envían al backend como un objeto `perfil\_usuario`.

| Pregunta | Tipo de dato | Uso en el motor de reglas |

\|---|---|---|

| ¿Tienes rosácea? | Booleano (Sí/No) | Si \*\*No\*\*, se muestra un mensaje de cierre y \*\*no se continúa\*\*. |

| ¿Qué tipo de rosácea tienes? | Selección única entre los subtipos del archivo `tipos de piel.md` (Eritematotelangiectásica, Papulopustulosa, Fimatosa, Ocular) + “No estoy seguro” | Ajusta el peso de ciertos ingredientes (ej. en Papulopustulosa se penalizan más los comedogénicos). |

| Tipo de piel | Grasa / Mixta / Seca / Normal / Sensible | Modula la tolerancia a emolientes y surfactantes. |

| Sensibilidad de la piel | Barra deslizante 0–100 (sin números visibles) | Escala la severidad de las penalizaciones. |

| ¿Eres alérgico a algo? | Sí/No | Si \*\*Sí\*\*, se muestra una \*\*barra de selección múltiple\*\* con alérgenos comunes en skincare. |

| Alérgenos seleccionados | Lista de compuestos | Se añaden a la \*\*lista negra personal\*\* del usuario; cualquier producto que los contenga recibe veto directo. |

| ¿Tomas algún medicamento? | Sí/No | Si \*\*Sí\*\*, se muestra una lista de medicamentos con reacciones cutáneas conocidas. |

| Medicamentos seleccionados | Lista | Se añaden \*\*incompatibilidades específicas\*\* (ej. retinoides tópicos → evitar ácidos exfoliantes fuertes). |

\*\*Alérgenos comunes que debes incluir en la barra de selección\*\* (basado en estudios de dermatitis de contacto en rosácea y población general):

- \*\*Metales:\*\* Níquel, Cobalto.
- \*\*Fragancias:\*\* Mezcla I y II de perfumes, Bálsamo del Perú, Linalool, Limoneno.
- \*\*Conservantes:\*\* Metilisotiazolinona (MI), Metilcloroisotiazolinona (MCI/MI), Formaldehído y liberadores.
- \*\*Emolientes/surfactantes:\*\* Propilenglicol, Lanolina, Cocamidopropil betaína.
- \*\*Otros:\*\* Parafenilendiamina (PPDA), Tioxolona.

\*\*Medicamentos que debes incluir\*\* (los que generan reacciones cutáneas relevantes para skincare):

- \*\*Retinoides tópicos:\*\* Tretinoína, Adapaleno, Tazaroteno → \*incompatibles con ácidos exfoliantes fuertes (glicólico, salicílico), peróxido de benzoílo y alcoholes secantes\*.
- \*\*Peróxido de benzoílo\*\* → \*potencia la irritación de retinoides y ácidos\*.
- \*\*Corticoides tópicos\*\* → \*pueden enmascarar irritación; sin incompatibilidad directa, pero requieren vigilancia\*.
- \*\*Isotretinoína oral\*\* → \*piel extremadamente seca y fotosensible; evitar activos secantes y exfoliantes\*.

Estos datos se guardan en el `perfil\_usuario` y el motor de reglas los consulta.

\---

\### 2. Captura de imagen y OCR (Backend)

- El usuario \*\*toma una foto solo a la lista de ingredientes\*\* (parte trasera del envase).
- \*\*Tecnología recomendada: EasyOCR\*\* (gratuito, open-source, funciona en CPU, soporta inglés y español). Es la opción más práctica para fotos de etiquetas reales, con curvaturas y reflejos.
- \*\*Flujo técnico:\*\*
1. El frontend sube la imagen al backend (FastAPI o Flask).
1. EasyOCR extrae el texto con `reader.readtext(image, detail=0)`.
1. Se normaliza el texto: minúsculas, separación por comas/puntos, eliminación de símbolos.
1. Se obtiene una lista de ingredientes en formato INCI aproximado.

\*\*Consideración práctica:\*\* EasyOCR puede confundir caracteres (ej. “alcohol” → “alcoho1”). El motor de reglas debe usar \*\*coincidencia parcial flexible\*\* (por ejemplo, verificar si un término de la lista negra está contenido en el ingrediente extraído).

\---

\### 3. Base de datos y listas de ingredientes (Backend)

No necesitas una base de datos compleja al inicio. Un archivo \*\*JSON estructurado\*\* es suficiente y facilita la iteración. Estructura sugerida:

\```json

{

"lista\_negra\_critica": {

"alcohol": {"peso": 30, "razon": "Irritante reportado por el 63% de pacientes con rosácea (NRS)"},

"fragrance": {"peso": 30, "razon": "57% de pacientes reportan irritación"},

"parfum": {"peso": 30, "razon": "Sinónimo de fragancia"},

"witch hazel": {"peso": 30, "razon": "31% de pacientes reportan irritación"},

"hamamelis": {"peso": 30, "razon": "Nombre INCI de witch hazel"},

"menthol": {"peso": 30, "razon": "30% de pacientes reportan irritación"},

"peppermint": {"peso": 25, "razon": "Reportado por ~25% de pacientes"},

"eucalyptus": {"peso": 25, "razon": "Reportado por ~25% de pacientes"},

"sodium lauryl sulfate": {"peso": 20, "razon": "Surfactante irritante; reportado por ~25%"},

"sls": {"peso": 20, "razon": "Abreviatura de SLS"}

},

"lista\_negra\_secundaria": {

"paraben": {"peso": 10, "razon": "Reportado por ~25% como irritante; evidencia mixta"},

"methylparaben": {"peso": 10, "razon": "Conservante; reportado por algunos pacientes"},

"propylparaben": {"peso": 10, "razon": "Conservante; reportado por algunos pacientes"},

"dye": {"peso": 10, "razon": "Tintes y pigmentos reportados por ~25%"},

"pigment": {"peso": 10, "razon": "Algunos pigmentos pueden irritar"}

},

"lista\_blanca": {

"niacinamide": {"peso": 5, "razon": "Calmante y reparador de barrera"},

"ceramide": {"peso": 5, "razon": "Repara la barrera cutánea"},

"panthenol": {"peso": 5, "razon": "Calmante"},

"allantoin": {"peso": 5, "razon": "Calmante"},

"bisabolol": {"peso": 5, "razon": "Antiinflamatorio suave"},

"zinc oxide": {"peso": 5, "razon": "Protector solar físico, baja irritación"},

"titanium dioxide": {"peso": 5, "razon": "Protector solar físico, baja irritación"},

"azelaic acid": {"peso": 5, "razon": "Activo con evidencia en rosácea papulopustulosa"},

"glycerin": {"peso": 3, "razon": "Humectante seguro"}

},

"alergenos": {

"nickel": {"veto": true},

"cobalt": {"veto": true},

"fragrance mix i": {"veto": true},

"fragrance mix ii": {"veto": true},

"methylisothiazolinone": {"veto": true},

"methylchloroisothiazolinone": {"veto": true},

"propylene glycol": {"veto": true},

"lanolin": {"veto": true},

"cocamidopropyl betaine": {"veto": true}

},

"interacciones\_medicamentos": {

"tretinoin": ["glycolic acid", "salicylic acid", "benzoyl peroxide", "alcohol denat"],

"adapalene": ["glycolic acid", "salicylic acid", "benzoyl peroxide", "alcohol denat"],

"benzoyl peroxide": ["tretinoin", "adapalene", "tazarotene"],

"isotretinoin": ["glycolic acid", "salicylic acid", "alcohol denat", "retinol"]

}

}

\```

\*\*Fuentes de los pesos:\*\* Los porcentajes de irritantes provienen de la encuesta de la National Rosacea Society (NRS) de 2025. Los alérgenos se basan en estudios de dermatitis de contacto en pacientes con rosácea, donde el níquel es el más frecuente (26%), seguido de cobalto, isotiazolinonas y mezclas de fragancias.

\---

\### 4. Motor de reglas y cálculo de compatibilidad (Python puro)

\*\*Sí, la capa final debe ser ponderación por reglas en Python, no una red neuronal.\*\* La razón es determinista: la compatibilidad depende de la \*\*presencia o ausencia de compuestos concretos\*\* en la lista INCI, no de patrones visuales. Una red neuronal requeriría un dataset masivo de “productos etiquetados como compatibles/incompatibles” para aprender lo que ya sabes por evidencia dermatológica. Además, el sistema debe ser \*\*explicable\*\*: el usuario necesita saber \*qué ingrediente\* activó la alerta, y un motor de reglas lo permite de forma transparente.

\*\*Lógica de puntuación (0–100):\*\*

1. \*\*Puntuación base:\*\* 100.
1. \*\*Veto por alérgenos personales:\*\* Si el producto contiene un alérgeno que el usuario seleccionó → \*\*puntuación = 0\*\* (o “No compatible” directo), sin importar el resto.
1. \*\*Penalizaciones por lista negra crítica:\*\* Restar 25–30 puntos por cada coincidencia.
1. \*\*Penalizaciones por lista negra secundaria:\*\* Restar 10–15 puntos por cada coincidencia.
1. \*\*Bonificaciones por lista blanca:\*\* Sumar 3–5 puntos por cada coincidencia (con un tope, por ejemplo, +15).
1. \*\*Ajuste por sensibilidad:\*\* Multiplicar las penalizaciones por `(1 + sensibilidad/100)`. Si la sensibilidad es 100%, las penalizaciones duplican su impacto.
1. \*\*Ajuste por tipo de rosácea:\*\* Si es \*\*Papulopustulosa\*\*, aumentar el peso de ingredientes comedogénicos (si están identificados en la base de datos). Si es \*\*Fimatosa\*\*, priorizar la derivación médica sobre la puntuación cosmética.
1. \*\*Interacciones con medicamentos:\*\* Si el usuario toma un medicamento y el producto contiene un ingrediente de su lista de incompatibilidad → restar 20 puntos adicionales o vetar directamente.

\*\*Salida del motor:\*\*

\```json

{

"puntuacion": 45,

"veredicto": "COMPATIBILIDAD BAJA - Usar con precaución",

"ingredientes\_problematicos": [

{"nombre": "fragrance", "razon": "57% de pacientes con rosácea reportan irritación"}

],

"ingredientes\_beneficiosos": [

{"nombre": "niacinamide", "razon": "Calmante y reparador de barrera"}

],

"alerta\_medicamento": "Contiene alcohol denat, incompatible con tretinoína tópica"

}

\```

\---

\### 5. Salida al usuario (Frontend)

La interfaz muestra:

- \*\*Puntuación numérica\*\* (0–100) con un código de color:
- \*\*80–100:\*\* ✅ Alta compatibilidad.
- \*\*50–79:\*\* 🟡 Compatibilidad media; prueba en parche.
- \*\*<50 o veto:\*\* ❌ No compatible / riesgo alto.
- \*\*Lista de ingredientes problemáticos\*\* con la razón (ej. “Fragancia: irritante reportado por el 57% de pacientes con rosácea”).
- \*\*Lista de ingredientes beneficiosos\*\* si los hay.
- \*\*Recordatorio obligatorio:\*\* \*“Esta evaluación es orientativa y se basa en evidencia poblacional, no en tu tolerancia individual. Realiza una prueba de parche en la muñeca durante 48–72 horas. No sustituye la valoración de un dermatólogo.”\*

\---

\## 🛠 Stack tecnológico recomendado

| Capa | Tecnología | Justificación |

\|---|---|---|

| \*\*Frontend\*\* | React (o HTML/JS + Tailwind) | Interfaz de cuestionario y carga de imagen; React facilita el manejo de estado del perfil. |

| \*\*Backend\*\* | \*\*FastAPI\*\* (Python) | Rápido, tipado, ideal para OCR y reglas en Python; se integra fácilmente con EasyOCR. |

| \*\*OCR\*\* | \*\*EasyOCR\*\* | Gratuito, local, soporta inglés/español, funciona en CPU. |

| \*\*Motor de reglas\*\* | Python puro (diccionarios/JSON) | Transparente, fácil de auditar y modificar; no requiere entrenamiento. |

| \*\*Base de datos\*\* | JSON inicialmente; SQLite si crece | Suficiente para un prototipo; migrar a PostgreSQL solo si hay muchos usuarios. |

| \*\*Dataset de productos (opcional)\*\* | The Beauty API (180k productos con INCI) | Puedes usar su estructura como referencia para tu JSON o para ampliar la base de ingredientes. |

| \*\*Despliegue\*\* | Railway, Render o Fly.io (gratuitos para prototipos) | Backend con Python y OCR en la nube. |

\---

\## 🧠 ¿Por qué NO una red neuronal en la capa final?

1. \*\*Datos insuficientes:\*\* No existe un dataset público etiquetado de “productos compatibles/incompatibles con rosácea” a gran escala. Entrenar una red neuronal con pocos datos llevaría a sobreajuste y predicciones poco fiables.
1. \*\*Falta de explicabilidad:\*\* Un usuario con rosácea necesita saber \*\*por qué\*\* un producto no es compatible. Una red neuronal daría un número sin justificación; el motor de reglas dice “contiene fragancia, que el 57% de pacientes reporta como irritante”.
1. \*\*Mantenibilidad:\*\* La evidencia dermatológica cambia; actualizar un peso en un JSON es trivial. Reentrenar una red neuronal cada vez que se añade un ingrediente es inviable para un prototipo.
1. \*\*La IA sí puede usarse en otras capas:\*\* EasyOCR ya usa deep learning para leer texto. Opcionalmente, un modelo de lenguaje (DeepSeek API) podría \*\*redactar\*\* la respuesta final de forma más conversacional, pero \*\*no debe decidir la puntuación\*\*.

\---

\## 📝 Prompt para DeepSeek Harness

Copia y pega esto en el chat de Harness (después de configurar tu API key y seleccionar un workspace vacío):

\> “Crea un prototipo web funcional para evaluar la compatibilidad de productos de skincare en personas con rosácea. El stack debe ser: backend en \*\*FastAPI\*\* (Python), frontend en \*\*HTML + JavaScript vanilla\*\* (sin frameworks, para mantenerlo simple), OCR con \*\*EasyOCR\*\*.

\>

\> \*\*Estructura del proyecto:\*\*

\> - `backend/main.py`: API FastAPI con endpoints:

\>   - `POST /perfil`: recibe el cuestionario del usuario (rosácea, tipo, sensibilidad, alérgenos, medicamentos) y lo guarda en memoria (diccionario global).

\>   - `POST /analizar`: recibe una imagen, ejecuta EasyOCR, aplica el motor de reglas y devuelve un JSON con puntuación, veredicto e ingredientes problemáticos/beneficiosos.

\> - `backend/ingredientes.json`: base de datos con listas negra (crítica y secundaria), blanca, alérgenos e interacciones medicamentosas. Usa los pesos y razones que están en el documento que te adjunto.

\> - `backend/motor\_reglas.py`: función `calcular\_compatibilidad(ingredientes\_ocr, perfil\_usuario)` que implementa la lógica de puntuación descrita (base 100, vetos por alérgenos, penalizaciones, bonificaciones, ajuste por sensibilidad e interacciones).

\> - `frontend/index.html`: formulario de cuestionario con las preguntas descritas (incluyendo barra deslizante 0–100 y selección múltiple de alérgenos/medicamentos condicional). Al enviar, llama a `/perfil`.

\> - `frontend/analizar.html`: página para subir la foto de ingredientes, llama a `/analizar` y muestra el resultado con colores (verde/amarillo/rojo).

\>

\> \*\*Requisitos específicos:\*\*

\> 1. El cuestionario debe \*\*detener el flujo\*\* si el usuario responde “No” a rosácea, mostrando un mensaje de cierre.

\> 2. La barra de sensibilidad no debe mostrar números, solo las etiquetas “Nada sensible” a “Extremadamente sensible”.

\> 3. El motor de reglas debe hacer \*\*coincidencia parcial flexible\*\* (ej. si el OCR devuelve “alcoho1”, debe detectar “alcohol”).

\> 4. La respuesta del endpoint `/analizar` debe incluir siempre un campo `recordatorio` con el texto de advertencia sobre prueba de parche y derivación médica.

\>

\> Genera todos los archivos, instala las dependencias (`fastapi`, `uvicorn`, `easyocr`, `python-multipart`) y ejecuta el servidor en el puerto 8000. Luego muéstrame la URL para probarlo.”

\---

\## ⚠️ Límites que debes comunicar siempre en la interfaz

- \*\*No es un diagnóstico médico.\*\* La rosácea debe ser diagnosticada por un dermatólogo.
- \*\*La compatibilidad es orientativa.\*\* Se basa en evidencia poblacional (encuestas de la NRS, estudios de alergia de contacto), no en la tolerancia individual.
- \*\*La prueba de parche es obligatoria\*\* antes de usar cualquier producto nuevo, especialmente si el sistema marca “compatibilidad media” o si el usuario tiene alta sensibilidad.
- \*\*Si el sistema detecta que el usuario tiene rosácea fimatosa\*\* (subtipo 3), debe mostrar una alerta de \*\*derivación dermatológica prioritaria\*\*, porque los cambios fimatosos requieren manejo médico/láser, no solo cosmético.

Con este esquema y el prompt para Harness, tienes todo lo necesario para que el agente genere el prototipo funcional de punta a punta.

Para tu prototipo, la decisión de trabajar con \*\*DeepSeek Harness\*\* es acertada porque puedes “enseñarle” habilidades de diseño de interfaces y experiencia de usuario sin tener que programar todo desde cero. A continuación, te recomiendo las \*\*skills (habilidades) específicas\*\* que puedes instalar en Harness para cubrir UX y lo que probablemente querías decir con “CEO” (que en este contexto suele referirse a \*\*SEO\*\* o a \*\*Customer Experience / CX\*\*), y luego te propongo una \*\*paleta de colores\*\* pensada para el grupo demográfico de 18 a 26 años con rosácea.

\---

\## 🛠️ Skills de Harness recomendadas para UX y “CEO” (CX/SEO)

Harness es un framework de agentes basado en plugins; cada “skill” le da al agente un conjunto de reglas y buenas prácticas para una tarea concreta. Para tu caso, no necesitas skills genéricas de programación, sino \*\*skills de diseño de producto digital\*\* que condicionen cómo el agente genera la interfaz.

\### 🎨 Para UX / Diseño de Interfaz

| Skill / Plugin | Qué aporta | Por qué encaja en tu prototipo |

\|---|---|---|

| \*\*`dsh-open-design`\*\* (52 skills nativas) | Incluye `ui-ux-pro-max`, `frontend-design`, `design-review`, `web-design-guidelines`, `impeccable-design-polish` y plantillas como `mobile-onboarding` y `web-prototype`. | Es el paquete más completo para que el agente genere una interfaz con estándares de diseño profesionales, no “páginas genéricas de IA”. La plantilla `mobile-onboarding` es ideal para el cuestionario inicial. |

| \*\*`dsh-commercial-ui-ux`\*\* | Skill enfocada en interfaces de producto, formularios, flujos de trabajo y sistemas de diseño, con “puertas de calidad” (quality gates). | Perfecta para el cuestionario multi‑paso y para la pantalla de resultados; el agente aplicará revisiones de usabilidad automáticamente. |

| \*\*`ui-ux-pro-max`\*\* (o su versión para DSH) | Base de conocimiento de patrones de interacción, jerarquía visual y accesibilidad. | Útil para que el agente decida cómo estructurar la barra de sensibilidad, las listas de alérgenos y los mensajes de advertencia sin que tú tengas que especificarlo todo. |

\*\*Cómo pedírselo a Harness:\*\* al instalar el plugin, el agente ya “sabe” aplicar estas reglas. En el prompt puedes reforzarlo: \*“Usa la skill `ui-ux-pro-max` para que el formulario tenga una progresión clara, mensajes de error accesibles y un flujo que no abrume a usuarios jóvenes.”\*

\### 🔍 Para “CEO” (interpretado como CX / SEO)

Si con “CEO” te referías a \*\*SEO\*\* (posicionamiento en buscadores), Harness no tiene una skill nativa de SEO, pero puedes usar `dsh-doc-standards` o `writing-guidelines` (incluidas en `dsh-open-design`) para que el agente genere textos con estructura semántica correcta (encabezados, metadescripciones, etc.).

Si te referías a \*\*Customer Experience (CX)\*\*, la skill más adecuada es \*\*`design-review`\*\* o \*\*`critique`\*\* dentro de `dsh-open-design`. Estas skills hacen que el agente \*\*audite\*\* el flujo desde la perspectiva del usuario: detecta pasos confusos, falta de feedback y puntos de fricción. Puedes pedirle explícitamente: \*“Después de generar el frontend, ejecuta una revisión de CX con `design-review` y propón mejoras para reducir la tasa de abandono en el cuestionario.”\*

\---

\## 🎨 Paleta de colores para jóvenes (18–26) con rosácea

La paleta debe cumplir tres condiciones: \*\*(1) no usar rojos intensos\*\* que puedan asociarse visualmente con el enrojecimiento de la rosácea, \*\*(2) ser suave y calmada\*\* para no generar ansiedad visual, y \*\*(3) tener un aire fresco y moderno\*\* que conecte con la Generación Z.

\### Opción principal: “Rosacea Calm” (paleta neutra cálida)

Es una paleta ya validada para contextos de rosácea; sus tonos son pastel, cálidos y terrosos, y \*\*evita por completo los rojos agresivos\*\*.

| Rol | Hex | Uso |

\|---|---|---|

| \*\*Fondo\*\* | `#F6F1EE` | Fondo general de la app (crema muy suave). |

| \*\*Acento primario\*\* | `#D9C3B8` | Botones secundarios, tarjetas, barras de progreso. |

| \*\*Acento secundario\*\* | `#A88F86` | Iconos, bordes, textos secundarios (solo decorativo). |

| \*\*Texto principal\*\* | `#43382F` | Texto de párrafos y títulos (contraste AAA sobre el fondo). |

\*\*Ventaja:\*\* el contraste `#43382F` sobre `#F6F1EE` es de \*\*10.15:1 (AAA)\*\*, lo que garantiza legibilidad incluso para usuarios con sensibilidad visual.

\### Colores funcionales (para los resultados de compatibilidad)

Necesitas colores que comuniquen “seguro”, “precaución” y “evitar” sin recurrir a rojos puros. Puedes usar:

- \*\*Verde salvia (`#8FBC8F` o `#A3C9A8`):\*\* para “Alta compatibilidad”. Transmite calma y seguridad.
- \*\*Amarillo mostaza suave (`#E8C468`):\*\* para “Compatibilidad media”. Es cálido pero no agresivo.
- \*\*Terracota apagado (`#C97C5D`) en lugar de rojo:\*\* para “No compatible”. Sigue siendo un tono cálido, pero mucho menos alarmante que un rojo saturado y coherente con la paleta terrosa.

\*\*Nota:\*\* evita el rojo `#FF0000` o rosas intensos. La literatura sobre rosácea indica que los tonos rojos y anaranjados pueden \*\*acentuar visualmente el enrojecimiento\*\* y generar rechazo en usuarios con esta condición.

\### Toque “Gen Z” sin romper la calma

Para que la app no se sienta clínica o aburrida para el grupo de 18–26, puedes introducir \*\*un acento fresco y tecnológico\*\* en elementos puntuales (no en fondos grandes):

- \*\*Azul polvo (`#A8C0F0`)\*\* o \*\*verde azulado suave (`#A6ECF2`)\*\* para enlaces, iconos de navegación o el botón de “Tomar foto”. El azul se asocia con confianza y objetividad, valores importantes en una herramienta de salud.
- \*\*Tipografía sans‑serif redondeada\*\* (ej. \*\*Outfit\*\*, \*\*Inter\*\* o \*\*DM Sans\*\*) en pesos regular y semibold. Los jóvenes prefieren tipografías limpias y modernas para este tipo de apps.

\### Ejemplo de combinación lista para usar

| Elemento | Color |

\|---|---|

| Fondo de pantalla | `#F6F1EE` |

| Tarjetas / contenedores | `#FFFFFF` (blanco puro para contraste) |

| Texto principal | `#43382F` |

| Texto secundario | `#A88F86` |

| Botón primario (“Continuar”, “Analizar”) | `#A8C0F0` (azul polvo) con texto `#43382F` |

| Indicador “Alta compatibilidad” | `#A3C9A8` (verde salvia) |

| Indicador “Media” | `#E8C468` (mostaza suave) |

| Indicador “No compatible” | `#C97C5D` (terracota) |

\---

\## 📝 Cómo introducir estas skills y la paleta en el prompt de Harness

Una vez que tengas instalado el plugin `dsh-open-design` (o `dsh-commercial-ui-ux`), puedes añadir al final de tu prompt de generación de código algo como:

\> \*“Aplica la skill `ui-ux-pro-max` para el diseño del cuestionario y la pantalla de resultados. Usa la paleta de colores ‘Rosacea Calm’: fondo `#F6F1EE`, texto `#43382F`, acento primario `#D9C3B8`. Para los veredictos usa verde salvia (`#A3C9A8`), mostaza (`#E8C468`) y terracota (`#C97C5D`) en lugar de rojo. La tipografía debe ser sans‑serif, moderna (Outfit o Inter), con tamaños generosos para lectura en móvil. Después de generar el frontend, ejecuta `design-review` y `critique` para detectar puntos de fricción en el flujo y propón mejoras.”\*

Con esto, Harness no solo generará el código funcional, sino que lo hará con una \*\*capa de diseño coherente con las necesidades visuales de las personas con rosácea\*\* y con las preferencias estéticas de los jóvenes de 18 a 26 años.
