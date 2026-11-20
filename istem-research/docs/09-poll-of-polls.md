# 09 · Diseño del motor Poll of Polls (fase 4)

## 1. Ficha obligatoria (21 campos)
Encuestadora · país · institución contratante · institución publicadora · fuente original · fecha de campo (inicio/fin) · fecha de publicación · tema · población objetivo · tamaño muestral · método de selección · modalidad · ponderaciones documentadas · preguntas originales (texto literal) · resultados · incertidumbre declarada · restricciones metodológicas · enlace al informe · versión y fecha de verificación · estado de revisión · información faltante (calculada).

## 2. Ingesta y revisión
`descubierta → registrada → verificada (doble revisión) → incluible | excluida (motivo)`. Cada estudio guarda `sample_lineage_id`: republicaciones, extractos periodísticos y reanálisis de la misma muestra comparten linaje y **cuentan una sola vez**.

## 3. Índice de transparencia metodológica
Puntuación 0–100 por presencia y calidad de los campos de divulgación (al estilo de las recomendaciones de divulgación de AAPOR): patrocinador, fechas de campo, población, marco, método de selección, modalidad, n, ponderación, texto de preguntas, incertidumbre. **Mide transparencia, no exactitud**; la interfaz lo dice junto a la cifra.

## 4. Modelos de agregación
| # | Modelo | Uso |
|---|---|---|
| 1 | Promedio simple | Solo descriptivo, rotulado como tal |
| 2 | Promedio ponderado (n efectivo, transparencia) | Con justificación registrada |
| 3 | Ponderación temporal (decaimiento por fecha **de campo**) | Vida media configurable y documentada |
| 4 | Efectos de encuestadora | Estimación de sesgo de casa con historial suficiente |
| 5 | Bayesiano jerárquico | Servicio Python (PyMC o Stan), semillas fijadas |
| 6 | Series temporales | Suavizado con intervalos |
| 7 | Tendencia latente | Espacio de estados |
| 8 | Dispersión entre estudios | Heterogeneidad (I², τ²) |
| 9 | Intervalos de incertidumbre | Siempre presentes |
| 10 | Sensibilidad | Inclusión/exclusión de fuentes, deja-uno-fuera |

**Regla de suficiencia:** si hay menos de un mínimo de estudios independientes en la ventana, o la información metodológica no alcanza el umbral, el sistema responde «no es posible producir una agregación defendible» y no muestra cifra agregada.

## 5. Visualización
Líneas por encuestadora ubicadas en el **punto medio del periodo de campo** (con barra del periodo), serie agregada con banda de incertidumbre, marcas de publicación, y comparador de encuestas propias frente a externas. Leyenda fija: «Agregación estadística de encuestas publicadas. No es un resultado oficial ni un pronóstico cierto».
