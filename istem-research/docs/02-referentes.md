# 02 · Análisis de referentes internacionales

> **Advertencia de método.** Esta matriz se construyó con información pública general sobre cada organización.
> **No se ha hecho aún la verificación documental fechada** que exige la plataforma (enlace a fuente oficial,
> fecha de consulta y responsable). Ninguna fila debe citarse externamente hasta completarla. No se incluyen
> precios: dependen de contratos privados y deben cotizarse. No se afirma superioridad de ninguna tecnología.

Columnas: **Capacidad pública conocida** · **Dependencia** (qué requiere datos o redes propias del referente) ·
**Reproducible con tecnología propia** · **Oportunidad para ISTEM**.

## Encuestas, paneles y opinión

| Referente | Capacidad pública conocida | Dependencia | Reproducible | Oportunidad para ISTEM |
|---|---|---|---|---|
| Morning Consult | Seguimiento continuo de alta frecuencia, inteligencia de marcas y política | Panel en línea propio a gran escala | Parcial: la plataforma sí; el volumen de panel no | Seguimiento continuo con trazabilidad metodológica pública en RD/LatAm |
| YouGov | Paneles en línea, MRP, perfiles de audiencia | Panel propio de gran tamaño | Métodos (MRP) sí; panel no | MRP con datos censales oficiales de RD y fichas de supuestos visibles |
| Ipsos | Investigación multicanal y multipaís | Red de campo internacional | Herramientas sí; red no | Integración de campo CAPI/CATI propio con auditoría completa |
| Gallup | Estudios longitudinales comparativos internacionales | Series históricas propias | Diseño longitudinal sí | Series nacionales con metadatos de cambio de cobertura |
| Pew Research Center | Documentación metodológica exhaustiva, paneles probabilísticos | Panel probabilístico propio | La práctica de transparencia sí | Ficha metodológica obligatoria en cada resultado |
| NORC | Panel probabilístico basado en marco de direcciones | Marco muestral y panel | Diseño sí; marco depende de fuentes oficiales | Marcos a partir de cartografía censal oficial (con licencia) |
| Qualtrics | Plataforma de encuestas y experiencia, automatización | Software propietario | Sí (editor, lógica, flujos) | Enfoque científico + demoscopia, no solo experiencia de cliente |
| quantilope | Automatización de métodos avanzados (MaxDiff, conjoint) | Software propietario | Sí | Métodos avanzados en español con revisión humana obligatoria |
| Toluna | Paneles digitales y herramientas DIY | Panel propio | Plataforma sí | Panel propio con consentimiento granular (fase 2) |
| Dynata | Infraestructura de muestra y control de calidad | Red de paneles | Controles de calidad sí | Antifraude explicable y reversible |
| AtlasIntel | Reclutamiento digital aleatorizado y calibración | Método propio | Calibración sí; su método de reclutamiento no se conoce en detalle | Comparar calibraciones de forma pública y reproducible |
| Survation | Encuestas electorales y modelado territorial | Experiencia y datos propios | Modelado sí | ISTEM GEO con supresión estadística |
| Harris Poll | Estudios de opinión y plataformas de inteligencia | Paneles | Parcial | — |
| QuestionPro | Diseño de encuestas, flujos, multicanal | Software | Sí | — |
| Prolific | Reclutamiento verificado de participantes | Base de participantes | Controles sí; base no | Verificación de autenticidad sin datos excesivos |

## Inteligencia digital y medios

| Referente | Capacidad pública conocida | Dependencia | Reproducible | Oportunidad para ISTEM |
|---|---|---|---|---|
| Brandwatch | Escucha social y análisis de consumidores | **Acuerdos de acceso a datos de plataformas** | Análisis sí; el acceso a datos no | Separar con rigor participación digital y opinión poblacional |
| Meltwater | Seguimiento de medios y redes | Licencias de contenido de medios | Análisis sí; contenido requiere licencias | Fuentes licenciadas y RSS con procedencia |
| Sprinklr | Escucha y gestión multicanal | Acuerdos con plataformas | Parcial | — |
| Talkwalker | Escucha social multimodal | Acuerdos con plataformas | Parcial | Análisis multimodal sin reconocimiento facial |
| Remesh | Conversaciones colectivas moderadas en vivo | Software propietario | Sí | Entrevistas colectivas con consentimiento (fase 5) |
| Cint | Intercambio programático de muestra | Red de proveedores de panel | No sin acuerdos | Integración vía API si se contrata |
| GDELT | Base abierta de eventos y noticias globales | Datos abiertos | Consumo sí (revisar términos) | Contexto internacional en Laboratorio de evidencias |
| Google Trends | Interés relativo de búsqueda | Acceso según términos de Google | Consumo condicionado | Indicador auxiliar, nunca opinión |

## Conclusiones para el diseño

1. **El software es reproducible; los datos no.** Paneles, acuerdos con plataformas y licencias de medios son la barrera real. ISTEM no debe prometer cobertura de redes sociales sin acuerdos verificados (ver `07-fuentes-conectores.md`).
2. **Diferenciación viable:** transparencia metodológica verificable por máquina (fichas obligatorias, auditoría encadenada, advertencias automáticas), foco en República Dominicana y español dominicano, y Poll of Polls con fecha de campo e índice de transparencia.
3. **Siguiente paso:** completar la verificación documental de cada fila (fuente, fecha, responsable) en una tabla `benchmark_entries` con la misma trazabilidad que el resto de la plataforma.
