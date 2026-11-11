# BACKLOG PRIORIZADO

P0: crítico, bloquea seguridad o funcionamiento esencial. P1: necesario antes del lanzamiento. P2: mejora
importante. P3: optimización posterior. «Dep.» indica de qué tareas depende.

## Análisis de brechas

| Componente | Estado actual | Estado objetivo | Brecha | Riesgo | Prioridad |
|---|---|---|---|---|---|
| Repositorio `bimartin` | Vacío | Base ejecutable con CI | Total | Bloquea todo | P0 |
| Credenciales expuestas (`suscriptores`) | En historial público | Rotadas; escaneo activo | Rotación pendiente | Compromiso de cuentas | P0 |
| Licencias y derechos | Tabla básica en CiDios | Derechos por edición aplicados al servir | Alta | Legal | P0 |
| Catálogo y texto bíblico | Ausente | Ediciones abiertas cargadas y versionadas | Total | Sin producto | P0 |
| Versificación y cánones | Ausente | Mapa multiesquema probado | Total | Comparaciones erróneas | P0 |
| Lector | Ausente | Lector accesible con RTL | Total | Sin producto | P1 |
| Comparador | Ausente | Paralelo, diferencias, interlineal | Total | Núcleo de valor | P1 |
| Lemas y morfología | Ausente | AT y NT etiquetados | Total | Sin filología | P1 |
| Manuscritos y variantes | Prosa de demostración | Aparato estructurado con testigos | Alta | Afirmaciones sin base | P1 |
| Edición Biblia de Martín | Ausente | Libro piloto con proceso firmado | Total | Credibilidad | P1 |
| Equipo editorial humano | No consta | Hebraísta, helenista, estilo, comité plural | Total | Sin él no hay edición seria | P0 (decisión) |
| RAG y chat | Recuperación en CiDios; sin chat | Chat con citas verificadas | Alta | Alucinaciones | P1 |
| Embeddings | Hashing léxico solo latino | Multilingüe, tabla por modelo | Alta | Hebreo y griego invisibles | P1 |
| HARNESS | Motor real en CiDios | Fichas completas por familia | Media | Coste y control | P1 |
| 20 familias | Sin diseño | 8 prioritarias operativas | Alta | — | P2 |
| Historiografía | Modelo sólido, corpus sin revisar | Corpus revisado con páginas | Media | Errores históricos | P1 |
| Biblioteca | Parcial | Catálogo interoperable | Media | — | P2 |
| Academia | Demostración | Curso piloto | Alta | — | P2 |
| Seguridad de IA | Regex | Pruebas de inyección en CI | Media | Manipulación | P1 |
| Privacidad | Ausente | Exportar, borrar, retención | Alta | Legal | P1 |
| Pruebas | No reproducidas / tautológicas | CI verde reproducido | Media | Falsa confianza | P0 |
| Observabilidad | Eventos de ejecución | Métricas, alertas | Media | Incidentes invisibles | P1 |
| Backups | Sin evidencia | Restauración ensayada | Alta | Pérdida de datos | P1 |
| Caché y rendimiento | Ausente | Objetivos p95 cumplidos | Media | Coste y latencia | P2 |
| Offline | Service worker básico | Lectura offline de ediciones que lo permitan | Media | — | P3 |

## Tareas

### P0
| ID | Tarea | Dep. |
|---|---|---|
| P0-01 | Rotar todas las credenciales presentes en el commit `c92038e` de `suscriptores` y revisar accesos | — |
| P0-02 | Activar escaneo de secretos y protección de push en todos los repositorios | — |
| P0-03 | Decidir formalmente: `bimartin` se siembra con módulos de CiDios (recomendado) | — |
| P0-04 | Ejecutar la suite de CiDios en limpio y registrar el resultado real | P0-03 |
| P0-05 | Crear la estructura de `bimartin`: `apps/api`, `apps/web`, `packages/contracts`, `supabase/`, CI, `LICENSE` | P0-03 |
| P0-06 | Portar HARNESS, evidencias, ingestión, búsqueda, autenticación y RLS; retirar las áreas temáticas ajenas | P0-04, P0-05 |
| P0-07 | Proyecto Supabase de preproducción propio (no reutilizar el expuesto); migraciones desde cero en CI | P0-01, P0-06 |
| P0-08 | Impedir `dbreset` y tokens de desarrollo fuera de entornos locales, con prueba | P0-06 |
| P0-09 | Modelo de derechos por edición y guardia de licencia al servir | P0-07 |
| P0-10 | Verificar y archivar la licencia de las primeras ediciones abiertas (con asesoría legal) | — |
| P0-11 | Esquema de obras, ediciones, cánones, libros y unidades de pasaje | P0-09 |
| P0-12 | Esquemas de versificación y mapa, con su fuente licenciada | P0-11 |
| P0-13 | Decidir y comprometer el equipo editorial humano y su presupuesto | — |

### P1
| ID | Tarea | Dep. |
|---|---|---|
| P1-01 | Importadores USFM y OSIS con invariantes de corpus | P0-11 |
| P1-02 | Analizador de referencias bíblicas (español e inglés) | P0-11 |
| P1-03 | Lector web accesible, con RTL y tipografías | P1-01 |
| P1-04 | Columna de búsqueda normalizada y FTS por idioma | P1-01 |
| P1-05 | Ingestión de morfología y lemas abiertos (AT y NT) | P1-01, P0-10 |
| P1-06 | Comparador paralelo con celdas vacías explicadas | P0-12, P1-03 |
| P1-07 | Vista interlineal y diff por palabras | P1-05, P1-06 |
| P1-08 | Tablas de manuscritos, testigos y variantes | P0-11 |
| P1-09 | Los 14 casos filológicos como pruebas automáticas | P1-06, P1-08 |
| P1-10 | Política de traducción redactada y publicada | P0-13 |
| P1-11 | Flujo editorial con aprobaciones humanas impuestas en BD | P0-11, P1-10 |
| P1-12 | Control de similitud frente a traducciones protegidas | P1-11 |
| P1-13 | Libro piloto traducido, revisado y publicado | P1-11, P1-12, P1-05 |
| P1-14 | Interfaz `LLMProvider` con dos proveedores | P0-06 |
| P1-15 | Embeddings multilingües en tabla por modelo | P0-06 |
| P1-16 | Chat con conversaciones, modos y citas que abren la fuente | P1-14, P1-15, P1-04 |
| P1-17 | Verificador de citas en la respuesta y límites de cita por licencia | P1-16, P0-09 |
| P1-18 | Conjunto dorado y evaluación en CI | P1-16 |
| P1-19 | Pruebas de inyección (8 casos) en CI | P1-16 |
| P1-20 | Contratos validados, plazos y topes por tarea en el HARNESS | P0-06 |
| P1-21 | Revisión experta del corpus semilla, con números de página | P0-06 |
| P1-22 | Conectores bibliográficos probados contra servicios reales | P0-06 |
| P1-23 | Exportación y borrado de datos personales; política de retención | P0-07 |
| P1-24 | Métricas, trazas, alertas | P0-06 |
| P1-25 | Backups fuera del proveedor y simulacro de restauración | P0-07 |
| P1-26 | Límite de peticiones distribuido | P0-06 |
| P1-27 | Auditoría WCAG 2.2 AA del lector y el comparador | P1-06 |
| P1-28 | Prueba de penetración externa y revisión legal previa al lanzamiento | todo P1 |

### P2
| ID | Tarea | Dep. |
|---|---|---|
| P2-01 | Almacenamiento de objetos e imágenes de manuscritos por IIIF | P1-08 |
| P2-02 | Cartografía real y tabla de lugares con geografía | P0-06 |
| P2-03 | Catálogo bibliográfico con materias, identificadores y exportación | P0-06 |
| P2-04 | Grafo de conocimiento navegable | P2-03 |
| P2-05 | Fichas y puesta en marcha de las 8 familias de agentes prioritarias | P1-20 |
| P2-06 | LMS: cursos, lecciones, inscripciones, evaluaciones, certificados de participación | P0-07 |
| P2-07 | Tutor IA y curso piloto | P2-06, P1-16 |
| P2-08 | Caché por versión y CDN; pruebas de carga | P1-03 |
| P2-09 | Notas y anotaciones de usuario; exportación de estudios | P1-03 |
| P2-10 | Reordenamiento y recuperación jerárquica | P1-16 |
| P2-11 | Más lenguas: latín, siríaco, copto, ge'ez (según fuentes confirmadas) | P1-01 |
| P2-12 | Investigación de cursos externos y condiciones de uso | — |

### P3
| ID | Tarea | Dep. |
|---|---|---|
| P3-01 | Lectura offline de ediciones que lo permitan | P1-03, P0-09 |
| P3-02 | Las 12 familias de agentes restantes, solo si aportan mejora medida | P2-05 |
| P3-03 | Motor de búsqueda o vectorial dedicado, si las mediciones lo exigen | P2-08 |
| P3-04 | Multitenencia para instituciones | — |
| P3-05 | Particionamiento de tablas de eventos y costes | P1-24 |
| P3-06 | Limpiar `suscriptores`: archivos `.backup`, handlers muertos en `lib/providers/smm/`, pruebas tautológicas | — |

## Primer sprint sugerido (dos semanas)

P0-01, P0-02, P0-03, P0-04, P0-05, P0-10 (inicio) y P0-13 (inicio).
