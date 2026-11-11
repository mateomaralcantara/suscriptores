# AUDITORÍA BÍBLICA Y FILOLÓGICA

## 1. Estado actual

| Capacidad | `bimartin` | `CiDios` | Evidencia |
|---|---|---|---|
| Texto hebreo, arameo, griego | AUSENTE | AUSENTE | Ninguna tabla ni archivo de corpus |
| Septuaginta, Vulgata, Peshitta | AUSENTE | AUSENTE | |
| Morfología y lemas | AUSENTE | AUSENTE | |
| Léxicos y concordancias | AUSENTE | AUSENTE | |
| Manuscritos y testigos | AUSENTE | DEMOSTRACIÓN | `corpus/biblical_transmission/documents/d1…d5`: prosa descriptiva, no datos estructurados |
| Variantes textuales | AUSENTE | AUSENTE | |
| Agentes filológicos | AUSENTE | DOCUMENTADO | `hebrew_specialist` y `hellenist_textual_critic` en estado `registered` |
| Distinción manuscrito / edición crítica | AUSENTE | PARCIAL | Las notas la mencionan; el esquema no la modela |

**Juicio:** la capacidad filológica del proyecto es hoy nula. Además, el embedder por defecto de CiDios
(`HashingEmbedder._norm`) solo conserva `[a-z0-9]`, de modo que un texto en hebreo o griego produce un vector vacío.

Sobre el corpus semilla de CiDios: su propio informe (`docs/PHASE-1-REPORT.md`) reconoce que son notas editoriales
«pendientes de revisión por especialistas» y que las referencias carecen de número de página. Esta auditoría
**no verificó** la exactitud de sus afirmaciones históricas ni la existencia de cada referencia; eso requiere un
especialista con acceso a las obras.

## 2. Principios que el sistema debe imponer

1. **Cuatro capas que no se mezclan nunca**: testimonio (lo que dice un manuscrito), edición (lo que un editor
   reconstruye), traducción e interpretación. Cada dato lleva un campo `layer` obligatorio.
2. **Una lectura manuscrita se cita por testigo** (sigla, folio o columna, línea) y por la transcripción usada.
   Una lectura de edición crítica se cita por edición y año.
3. **Un número de Strong no es un significado.** Es un índice a un lema. La interfaz nunca debe mostrar una glosa
   de léxico como «lo que significa» sin el contexto sintáctico, el campo semántico, la época y el género literario.
4. **Toda afirmación filológica apunta a una fuente identificable.** Sin fuente, no se publica; se marca «sin respaldo».
5. **La IA propone análisis; no fija el texto.** La elección de la lectura base es un acto editorial humano firmado.
6. **La incertidumbre es un dato**, no un defecto: *hapax legomena*, lecturas dudosas y pasajes corruptos se marcan.

## 3. Datos necesarios y fuentes candidatas

Las licencias indicadas son las que recuerdo de cada proyecto y **no se verificaron en línea durante esta
auditoría**. Deben confirmarse en la fuente antes de ingerir nada; ver AUDITORIA_LICENCIAS_Y_FUENTES.md.

| Necesidad | Candidato abierto | Observación |
|---|---|---|
| Texto masorético con morfología | Open Scriptures Hebrew Bible (texto de Leningrado/WLC con morfología) | Texto en dominio público; morfología con licencia abierta de atribución |
| Hebreo y griego etiquetados con glosas | Datos TAHOT/TAGNT de STEPBible (Tyndale House) | Licencia abierta de atribución |
| NT griego crítico abierto | SBLGNT; MorphGNT para morfología | Condiciones propias; revisar |
| NT griego en dominio público | Westcott-Hort 1881, Tischendorf 8.ª, Nestle 1904, Robinson-Pierpont (bizantino) | Útiles para mostrar tradiciones textuales |
| Sintaxis | Árboles Macula Hebrew y Macula Greek (Clear Bible) | Licencia abierta de atribución |
| Septuaginta | Swete (dominio público); Rahlfs 1935 | La situación de Rahlfs depende de la jurisdicción |
| Vulgata | Clementina (dominio público) | La Stuttgartensia tiene derechos |
| Léxicos | Strong, BDB, Abbott-Smith, Dodson (dominio público); LSJ vía Perseus | Antiguos: sirven de punto de partida, no de autoridad final |
| Ediciones críticas de referencia | BHS, BHQ, NA28, UBS5 | **Protegidas** (Deutsche Bibelgesellschaft). Solo citar por referencia o licenciar |
| Manuscritos del Mar Muerto | Biblioteca digital Leon Levy (imágenes) | Las transcripciones publicadas tienen derechos; enlazar, no copiar |
| Manuscritos del NT | Sala virtual de manuscritos del INTF (Münster) | Condiciones de reutilización a confirmar |
| Siríaco, copto, ge'ez | Sin candidato confirmado en esta auditoría | Pendiente de investigación |

## 4. Edición original: requisitos

### 4.1 Política de traducción (documento público, previo a traducir)
- Filosofía: grado de equivalencia formal o funcional y cómo se decide por género literario.
- Texto base por libro y criterio para apartarse de él.
- Tratamiento del nombre divino, pesos y medidas, lenguaje inclusivo, términos técnicos y pasajes textualmente dudosos.
- Canon y orden de libros que publica la edición, y cómo trata los deuterocanónicos.
- Declaración del papel de la IA y de quién responde por cada libro.

### 4.2 Registro por unidad de traducción
Texto base y versión; variantes consideradas con sus testigos; análisis morfológico y sintáctico; alternativas
rechazadas con su razón; fuentes consultadas; autor del borrador (humano o modelo y versión); revisores con nombre;
fecha y resultado de cada aprobación.

### 4.3 Equipo humano mínimo
Un hebraísta, un helenista, un revisor de estilo en español y un comité con lectores de al menos tres tradiciones
cristianas. Sin ellos no puede llamarse «edición de estudio seria»: sería un borrador automático.

### 4.4 Viabilidad legal
Traducir desde textos en dominio público o con licencia abierta es legítimo y la traducción resultante es obra
propia. Los riesgos están en: usar como base una edición crítica protegida sin licencia; y que el modelo reproduzca
fraseo de traducciones modernas protegidas que memorizó. Mitigaciones en AUDITORIA_LICENCIAS_Y_FUENTES.md §4.
Esto es un análisis técnico, **no asesoramiento jurídico**; hace falta un abogado de propiedad intelectual.

## 5. Casos de prueba filológicos

Cada caso es una comprobación de que el sistema **representa la dificultad**, no de que la «resuelva».

| # | Pasaje | Qué debe mostrar el sistema |
|---|---|---|
| 1 | Job 38:36 | Dos términos hebreos raros de sentido discutido; las traducciones divergen mucho. Debe marcar incertidumbre léxica y no dar una única glosa |
| 2 | Isaías 7:14 | Diferencia entre el término hebreo y el de la versión griega antigua; separar dato lingüístico de interpretación teológica |
| 3 | Salmo 22:16 (17 en hebreo) | Variante textual célebre y diferencia de numeración entre tradiciones en el mismo versículo |
| 4 | Salmos 9–10 y 51 | Numeración hebrea frente a griega/latina; título como versículo |
| 5 | Marcos 16:9–20 | Final largo: mostrar testigos, sin llamar «omisión» ni «añadido» sin el aparato |
| 6 | Juan 7:53–8:11 | Pasaje con ubicación variable en los manuscritos |
| 7 | 1 Juan 5:7–8 | Texto ausente de los testigos griegos antiguos y presente en ediciones impresas tardías |
| 8 | Romanos 16:24; Hechos 8:37 | Versículos sin texto en ediciones modernas: celda vacía con motivo, no error |
| 9 | Daniel 3 y Ester griego | Adiciones deuterocanónicas: correspondencia parcial entre cánones |
| 10 | Jeremías hebreo frente a griego | Orden de capítulos distinto y extensión diferente |
| 11 | Deuteronomio 32:8 | Lectura masorética frente a la griega y a los manuscritos de Qumrán |
| 12 | Daniel 2:4b–7:28; Esdras 4:8–6:18 | Cambio de hebreo a arameo: el idioma se etiqueta por pasaje, no por libro |
| 13 | Joel 2:28–32 (3:1–5 en hebreo); Malaquías 4 (3:19–24) | División de capítulos distinta |
| 14 | 3 Juan 14–15 | Versículo dividido de forma diferente según la edición |

Las descripciones de la tabla son de conocimiento general de la disciplina; al implementarlos, **cada caso debe
documentarse con la sigla de los testigos y la referencia bibliográfica exacta**, verificada por el filólogo
responsable. No se incluyen aquí citas bibliográficas porque no pude comprobarlas.

## 6. Criterios de aceptación de la dimensión filológica

- 100 % de las palabras del AT hebreo/arameo y del NT griego con lema y morfología de una fuente identificada.
- Los 14 casos anteriores pasan como pruebas automáticas de representación.
- Ninguna pantalla muestra una glosa sin su fuente y sin el aviso de contexto.
- Un filólogo humano firma el control de calidad de una muestra aleatoria por libro.
