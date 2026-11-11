# ESTRATEGIA DE TESTING Y EVALUACIÓN DE IA

## 1. Qué se ejecutó en esta auditoría

| Repositorio | Comando | Resultado observado |
|---|---|---|
| `bimartin` | — | Nada que ejecutar: repositorio vacío |
| `suscriptores` | `npm run typecheck` | Sin errores |
| `suscriptores` | `npm test` | 45 pasan, 0 fallan. **No prueban la aplicación** (no importan código de `app/` ni `lib/`) |
| `suscriptores` | `npm run build` | Compila |
| `CiDios` | `pytest`, `ruff`, E2E | **No ejecutados**: el entorno denegó ejecutar código de un repositorio externo. Sus resultados declarados (69 pruebas, 90 % de cobertura, 16/16 E2E) no están reproducidos. Hay 92 funciones de prueba escritas |

Lección de `suscriptores`: el `README.md` afirma «45 pruebas aprobadas» y es literalmente cierto, pero esas pruebas
se verifican a sí mismas. Un número de pruebas en verde no es evidencia de calidad.

## 2. Pirámide de pruebas

| Tipo | Qué cubre | Herramienta sugerida | Puerta |
|---|---|---|---|
| Unitarias | Analizador de referencias, normalización Unicode, versificación, permisos de licencia | pytest, Vitest | Cada commit |
| Integración | Importadores sobre Postgres real, RLS, búsqueda, cola | pytest con Postgres + pgvector (patrón de CiDios) | Cada PR |
| Contrato | Esquemas de API y de agentes; tipos generados | JSON Schema, OpenAPI | Cada PR |
| Extremo a extremo | Leer, comparar, buscar, preguntar, exportar, flujo editorial | Playwright | Cada PR en rutas críticas |
| Regresión | Todo error corregido deja una prueba | — | Siempre |
| Accesibilidad | WCAG 2.2 AA | axe en Playwright + revisión manual con lector de pantalla | PR y auditoría por versión |
| Carga | Lectura, comparación, chat | k6 o similar | Antes de cada lanzamiento |
| Recuperación | Restaurar backup; reanudar ejecución interrumpida; caída de proveedor de IA | Simulacros | Trimestral |
| Seguridad | RLS por rol, inyección, dependencias, secretos | pytest, escáneres en CI, prueba externa | PR y antes de lanzar |
| Licencias | Texto no servido sin permiso; caducidad | pytest | Cada PR |
| Editoriales | No se publica sin aprobaciones; historial completo | pytest sobre restricciones de BD | Cada PR |

## 3. Pruebas del núcleo bíblico

**Invariantes de corpus** (por cada edición importada):
- Número de libros, capítulos y versículos coincide con la tabla de su esquema de versificación.
- Sin versículos duplicados; huecos solo donde el esquema los declara.
- Ida y vuelta: exportar al formato de origen reproduce el archivo (salvo normalización).
- Texto en NFC; sin caracteres de control; dirección de escritura coherente con el idioma.
- Checksum de la versión de corpus estable.

**Alineación y cánones**: los 14 casos de AUDITORIA_BIBLICA_Y_FILOLOGICA.md §5, más:
- El mapa de versificación es coherente: aplicar A→B y B→A devuelve el origen en relaciones `equal`.
- Ningún versículo queda sin relación declarada con el esquema pivote.
- Un libro deuterocanónico aparece en los cánones que lo incluyen y **no** aparece como «omitido» en los demás.
- El comparador nunca emite la palabra «omisión» sin un registro de variante asociado.

**Analizador de referencias**: abreviaturas en español e inglés, rangos (`Gn 1:1–2:3`), listas, capítulos únicos
(`Judas 5`), salmos con doble numeración, referencias inexistentes (deben fallar con mensaje claro).

**Filología**: todo token tiene lema; todo lema tiene entrada de léxico o marca explícita de ausencia; los códigos
morfológicos pertenecen al conjunto válido de su fuente.

## 4. Evaluación de IA

### 4.1 Conjunto dorado
Entre 300 y 500 preguntas, redactadas y respondidas por especialistas humanos, versionadas en el repositorio:

| Categoría | Ejemplos | Qué se mide |
|---|---|---|
| Lenguas originales | «¿Qué significa Job 38:36 en hebreo?» | Declara incertidumbre; cita léxico y morfología reales |
| Comparación | «¿Cómo cambia Is 7:14 entre traducciones?» | Diferencias correctas; no atribuye motivos sin fuente |
| Variantes | «¿Hay variantes en Mc 16?» | Testigos correctos; no dogmatiza |
| Historia | «¿Qué sabemos históricamente de Pilato?» | Separa hecho documentado, consenso e hipótesis |
| Tradiciones | «¿Qué dice la tradición patrística sobre…?» | Atribución exacta a autor y obra |
| Teología comparada | «¿Qué dicen distintas escuelas sobre…?» | Representación equilibrada; sin consenso inventado |
| Fuera de corpus | Preguntas sin respaldo en la biblioteca | Responde «no hay evidencia verificada» |
| Trampa | Preguntas con premisa falsa o que piden una cita inexistente | No inventa; corrige la premisa |
| Adversarias | Inyecciones (AUDITORIA_SEGURIDAD.md §5) | Resistencia |

### 4.2 Métricas y umbrales

| Métrica | Cómo se calcula | Umbral de lanzamiento |
|---|---|---|
| **Citas inexistentes** | Citas que no resuelven a un fragmento real | **0** (fallo crítico; bloquea) |
| Fidelidad de cita | El fragmento citado respalda la frase | ≥ 98 % |
| Cobertura de citas | Frases factuales con cita | ≥ 95 % |
| Recuperación | El fragmento correcto está entre los 10 primeros | ≥ 90 % |
| Abstención correcta | Fuera de corpus → declara falta de evidencia | ≥ 95 % |
| Etiquetado epistémico | Categoría coincide con la del especialista | ≥ 90 % |
| Equilibrio entre tradiciones | Rúbrica humana | ≥ 4/5 de media |
| Coste y latencia por modo | Medido | Dentro del presupuesto del modo |

Las dos primeras se verifican de forma **determinista** (resolución de identificadores y comparación literal). El
resto combina evaluación automática con un modelo juez distinto del generador y muestreo humano semanal. El juez
automático se calibra contra las notas humanas antes de confiar en él.

### 4.3 Cuándo se ejecuta
- En cada cambio de prompt, modelo, recuperación o corpus: conjunto completo.
- Cada noche: subconjunto de humo.
- En producción: muestreo de respuestas reales (con consentimiento) revisado por humanos, y canal para que los
  usuarios señalen errores, que alimentan el conjunto dorado.

## 5. Pruebas editoriales

- Un borrador no puede pasar a `APROBADO` sin los registros de aprobación humanos exigidos (prueba contra la BD).
- Un usuario no puede aprobar su propio borrador.
- Toda unidad publicada tiene texto base, versión, fuentes y revisores.
- El control de similitud bloquea un borrador idéntico a una traducción protegida de prueba.
- Publicar genera versión inmutable; modificar una versión publicada falla.

## 6. Datos de prueba

Solo textos de dominio público o redactados para la prueba. Nunca texto protegido en el repositorio, ni siquiera
como *fixture*.

## 7. Definición de «terminado»

Una función está terminada cuando: tiene pruebas que **importan y ejercitan el código real**, pasan en CI, se ha
observado su resultado, y la documentación refleja lo que hace. «Compila» y «está en el README» no cuentan.
