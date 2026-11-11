# PLAN DE TRANSFORMACIÓN HACIA 100/100

Punto de partida comprobado: **0/100** (`bimartin` vacío). Las cifras intermedias son proyecciones, no mediciones;
cada hito solo cuenta cuando sus criterios de aceptación se han ejecutado y observado.

## 1. Trayectoria por fase

| Dimensión | Máx. | Hoy | Tras F0 | Tras F2 | Tras F5 | Tras F8 |
|---|---:|---:|---:|---:|---:|---:|
| Arquitectura general | 5 | 0 | 3 | 4 | 4,5 | 5 |
| Corpus, catalogación y licencias | 10 | 0 | 2 | 6 | 8 | 10 |
| Filología y crítica textual | 12 | 0 | 0,5 | 6 | 9 | 12 |
| Traducción y edición original | 10 | 0 | 0 | 0 | 6 | 10 |
| Base de datos e integridad | 10 | 0 | 4 | 7 | 9 | 10 |
| Chat, RAG e IA | 10 | 0 | 2,5 | 3 | 9 | 10 |
| HARNESS y agentes | 10 | 0 | 5 | 5 | 7 | 10 |
| Ciberseguridad y privacidad | 8 | 0 | 4 | 5 | 6,5 | 8 |
| Rendimiento y escalabilidad | 5 | 0 | 1 | 2,5 | 3,5 | 5 |
| UX y accesibilidad | 5 | 0 | 1,5 | 3,5 | 4 | 5 |
| Biblioteca y academia | 5 | 0 | 1 | 1 | 2,5 | 5 |
| Pruebas, DevOps y observabilidad | 5 | 0 | 3 | 3,5 | 4,5 | 5 |
| Sostenibilidad y costes | 5 | 0 | 1,5 | 2 | 3,5 | 5 |
| **Total** | **100** | **0** | **~29** | **~49** | **~77** | **100** |

«Tras F0» coincide con la puntuación provisional de CiDios porque F0 consiste en portar y verificar ese código.
La columna «Tras F5» incluye también F3 y F4.

## 2. Qué da cada punto

| Dimensión | Lo que cierra la brecha | Evidencia exigida para puntuar |
|---|---|---|
| Arquitectura | Módulos de dominio aislados, proveedores intercambiables, caché, objetos | ADR vigentes; prueba de cambio de proveedor de IA sin tocar dominio |
| Corpus y licencias | Derechos por edición aplicados al servir; documentos de licencia archivados | Pruebas de licencia en CI; dictamen legal |
| Filología | Morfología completa; aparato de variantes; 14 casos | Pruebas en verde y firma de un filólogo sobre muestra aleatoria |
| Traducción | Política pública; flujo firmado; libro piloto; luego libro a libro | Auditoría externa del piloto; registro completo por versículo |
| Base de datos | Las 34 entidades; RLS total; restauración ensayada | Migraciones desde cero en CI; informe del simulacro |
| IA | Chat con verificación determinista de citas; conjunto dorado | Umbrales cumplidos dos semanas seguidas; 0 citas inexistentes |
| HARNESS | Fichas completas; contratos validados; topes | Cada familia operativa pasa sus casos; demostración de corte por presupuesto |
| Seguridad | Sin secretos; inyección probada; privacidad | Informe de prueba de penetración sin críticos ni altos |
| Rendimiento | Caché; pruebas de carga | Informe de carga con p95 dentro de objetivo |
| UX | Lector, comparador, RTL, WCAG | Auditoría de accesibilidad y prueba con lector de pantalla |
| Biblioteca y academia | Catálogo interoperable; curso piloto | Exportación validada; evaluación del piloto |
| Pruebas y DevOps | CI completo; observabilidad | Paneles y alertas en uso; cobertura medida |
| Sostenibilidad | Coste por usuario medido; presupuesto editorial | Informe financiero trimestral |

## 3. Condiciones que no dependen del código

Sin estas, el máximo alcanzable se queda alrededor de 75–80:

1. **Especialistas humanos nombrados**: hebraísta, helenista, revisor de estilo, historiador y un comité de
   revisión de varias tradiciones. Afecta a filología (12), traducción (10) y parte de IA.
2. **Asesoría jurídica** en propiedad intelectual y protección de datos. Afecta a licencias (10) y seguridad (8).
3. **Acuerdos de licencia** para cualquier traducción contemporánea que se quiera mostrar.
4. **Financiación sostenida**: la traducción completa dura años.

## 4. Ruta más eficiente

1. **No reescribir lo que existe.** Portar CiDios da ~29 puntos en un mes en lugar de varios.
2. **Datos abiertos antes que IA.** Texto, morfología y versificación abiertos dan filología y comparación reales
   sin coste de modelo y sin riesgo de alucinación. Es el tramo de 29 a 49.
3. **Validación determinista antes que más agentes.** La verificación literal de citas y la guardia de licencias
   eliminan los dos fallos críticos del mandato.
4. **Un libro piloto antes que la Biblia entera.** Demuestra el proceso editorial completo en pequeño.
5. **Medir antes de escalar.** Ningún componente caro (motor de búsqueda dedicado, vectores externos, más
   familias de agentes) hasta que una medición lo justifique.
6. **Contratar a las personas en F0**, no en F3: su disponibilidad es el camino crítico real.

## 5. Gobierno del plan

- Revisión de la matriz de puntuación al cierre de cada fase, por alguien ajeno a quien implementó.
- Cada punto reclamado enlaza a su evidencia: ejecución de CI, informe o firma.
- Registro de riesgos y de decisiones (ADR) en el repositorio.
- Regla: no se declara terminado lo que no se ha ejecutado y observado.

## 6. Señales de alarma

- Documentación que afirma más que el código (ya ocurre: «45 pruebas» en `suscriptores`; «9 agentes» frente a 20 en CiDios).
- Pruebas que no importan el código que dicen probar.
- Contenido académico publicado sin revisor nombrado.
- Texto bíblico en la base de datos sin documento de licencia archivado.
- Coste de IA por consulta creciendo sin mejora en el conjunto dorado.
