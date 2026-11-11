# AUDITORÍA DE LICENCIAS Y FUENTES

Aviso: análisis técnico, no asesoramiento jurídico. Ninguna licencia citada se verificó en línea durante esta
auditoría; cada una debe confirmarse en la fuente y archivarse antes de ingerir el contenido.

## 1. Estado actual

| Elemento | `bimartin` | `suscriptores` | `CiDios` |
|---|---|---|---|
| Biblias incorporadas | Ninguna | Ninguna | Ninguna |
| Texto protegido reproducido | No (vacío) | No | No se detectó: el corpus son 5 notas redactadas por el proyecto |
| Registro de licencias | AUSENTE | AUSENTE | IMPLEMENTADO: tabla `licenses` |
| Bloqueo por licencia al ingerir | AUSENTE | AUSENTE | IMPLEMENTADO: `check_license()` en `cdd/library/ingest.py` |
| Procedencia por documento | AUSENTE | AUSENTE | IMPLEMENTADO: `provenance`, `rights_statement`, `content_sha256`, `consulted_at` |
| Permiso de uso en IA | AUSENTE | AUSENTE | AUSENTE |
| Estado de verificación de referencias | AUSENTE | AUSENTE | IMPLEMENTADO: `identifier_check` (`unverified_offline` por defecto) |
| Licencia del propio repositorio | Sin archivo `LICENSE` | Sin archivo `LICENSE` | No verificado |

No hay hoy ninguna infracción que corregir, porque no hay corpus. El riesgo está por delante.

## 2. Cinco estados de disponibilidad por edición

El catálogo puede ser universal; la lectura no. Cada edición tiene exactamente uno:

| Estado | Qué se muestra | Qué puede hacer la IA |
|---|---|---|
| `CATALOG_ONLY` | Ficha bibliográfica | Nada con el texto |
| `EXTERNAL_API` | Texto servido por la API del titular, sin almacenarlo más allá de lo que permitan sus términos | Lo que permitan los términos; por defecto nada |
| `LICENSED` | Texto según contrato: límites de versículos, atribución, territorios, vigencia | Solo lo que el contrato diga expresamente |
| `OPEN_LICENSE` | Texto completo con atribución y, si aplica, compartir igual | Recuperación y embeddings; derivadas según licencia |
| `PUBLIC_DOMAIN` | Texto completo | Todo, registrando la jurisdicción evaluada |

Más un estado transitorio `PENDING`, que equivale a `CATALOG_ONLY` hasta que haya documento que lo respalde.

## 3. Metadatos de derechos obligatorios

Además de los 18 campos del mandato (§5): jurisdicciones evaluadas; fecha de caducidad de la licencia; límite de
cita (versículos por respuesta y porcentaje de libro); texto de atribución exigido; permisos separados de
**mostrar, citar, almacenar, transformar, generar embeddings, usar en respuestas de IA, entrenar modelos, exportar
y uso offline**; enlace al documento de licencia archivado con su hash; responsable de la verificación y fecha.

Regla de aplicación: los permisos se comprueban **al servir** cada respuesta, no solo al ingerir. Una licencia
caducada debe retirar el texto sin intervención manual.

## 4. La nueva traducción y el riesgo de reproducción

Riesgos concretos:
1. **Texto base protegido.** Las ediciones críticas modernas (BHS, BHQ, NA28, UBS5) tienen titular. Traducir desde
   ellas sin licencia es un riesgo. Alternativa: textos base abiertos (ver AUDITORIA_BIBLICA_Y_FILOLOGICA.md §3) y
   citar las ediciones críticas solo por referencia.
2. **Memorización del modelo.** Un LLM puede devolver casi literal una traducción moderna protegida al pedirle
   «traduce Juan 3:16».
3. **Contaminación por contexto.** Si se le dan traducciones protegidas como ejemplo, tenderá a copiarlas.

Controles:
- El borrador se genera **solo** a partir del texto en lengua original, su análisis morfosintáctico y léxicos
  abiertos. Las traducciones protegidas no entran en ese contexto.
- Control automático de similitud de cada borrador frente a las traducciones protegidas del catálogo (n-gramas
  largos y distancia de edición por versículo), con umbral que bloquea y obliga a reescritura humana. Para poder
  comparar hace falta disponer legalmente de esos textos para ese fin; si no, se compara contra las de dominio público
  y se confía el resto a la revisión humana.
- La comparación con traducciones autorizadas que pide el mandato se hace **después**, en revisión, por humanos.
- Registro de procedencia por versículo: modelo, versión, entradas y revisores.

Los versículos muy breves coinciden inevitablemente entre traducciones; el umbral debe calibrarse por longitud.

## 5. Punto de partida realista

Candidatos habituales que suelen ser de dominio público o de licencia abierta (a confirmar uno por uno):

- Español: Reina-Valera 1909 y anteriores. **Reina-Valera 1960 y posteriores tienen titular.**
- Inglés: King James (con la particularidad de la patente de la Corona en el Reino Unido), American Standard 1901,
  World English Bible, y otras publicadas expresamente como abiertas.
- Lenguas originales y antiguas: ver la tabla del documento filológico.
- Repositorios de traducciones abiertas en muchas lenguas: eBible.org y los proyectos de unfoldingWord son los más
  conocidos; cada traducción trae su propia licencia.

Cualquier traducción contemporánea de gran difusión en español debe asumirse **protegida** hasta demostrar lo contrario.

## 6. Otros contenidos

- **Comentarios, diccionarios, atlas**: los modernos casi siempre están protegidos. Catálogo sí; contenido solo
  con licencia. Las obras patrísticas en traducciones antiguas suelen estar en dominio público; las traducciones
  modernas de esas mismas obras no.
- **Imágenes de manuscritos**: el manuscrito es antiguo, pero la fotografía y el sitio tienen términos de uso.
  Preferir enlaces IIIF a copias.
- **Cursos externos**: enlazar. No se investigaron condiciones concretas en esta auditoría.
- **Tipografías**: tienen licencia propia; revisar antes de incrustarlas.

## 7. Procedencia de las referencias

Regla: una referencia bibliográfica solo se muestra como verificada si se resolvió contra un registro externo
(DOI, ISBN, catálogo) o si un humano la cotejó. El campo `identifier_check` de CiDios ya modela esto; hoy todo está
en `unverified_offline`. Una referencia generada por un modelo que no se pueda resolver es un **fallo crítico**.

## 8. Criterios de aceptación

1. Ninguna edición sin estado de disponibilidad, titular, fuente y documento de licencia archivado.
2. Prueba automática: pedir un capítulo de una edición `CATALOG_ONLY` devuelve la ficha, nunca texto.
3. Prueba automática: el RAG no recupera fragmentos de ediciones sin permiso de uso en IA.
4. Prueba automática: una licencia con caducidad vencida retira el texto.
5. Revisión por un abogado de propiedad intelectual antes del lanzamiento público.
6. Archivo `LICENSE` en el repositorio y política pública de derechos y retirada de contenido.
