# 08 · Arquitectura de muestreo y estadística

## 1. Principios aplicados por el sistema
1. **Margen de error solo para diseños probabilísticos.** Aplicado en tres capas: restricción SQL (`projects_moe_requires_probability`), validación (`lib/project-rules.ts`) y cálculo (`marginOfError` devuelve `applicable: false` sin número).
2. **Advertencias explícitas** cuando una inferencia poblacional no está sustentada (`assessInference`).
3. **Conversaciones digitales ≠ población.** Cualquier proyecto con escucha social recibe la advertencia correspondiente.
4. **Celdas pequeñas suprimidas** (`suppressSmallCells`).
5. **Causalidad** solo con diseño apropiado; el laboratorio causal (fase 6) exige declarar diseño (experimento, discontinuidad, diferencias en diferencias…) y supuestos.

## 2. Núcleo implementado (`lib/methodology.ts`, 52 pruebas unitarias en total)

| Función | Qué hace | Verificación |
|---|---|---|
| `normalQuantile`, `zForConfidence` | Inversa normal (Acklam) | Valores tabulados con 1e-8 |
| `sampleSizeForProportion` | n = z²p(1−p)/e² × deff, con corrección por población finita y contactos por tasa de respuesta | ±3 pts/95 % → 1068; N=10 000 → 965 |
| `marginOfError` | Margen con deff y FPC; **no aplica** a diseños no probabilísticos | Censo completo → 0 |
| `kishEffectiveSampleSize`, `weightingDesignEffect` | n efectivo y deff por ponderación | Casos analíticos |
| `rake` | IPF a márgenes poblacionales, pesos de media 1, diagnóstico (iteraciones, desviación, n efectivo, deff); rechaza categorías vacías | Converge a 1e-6 |
| `allocateProportional` | Asignación por estratos con mínimo (mayor residuo, suma exacta) | Casos límite |
| `fieldworkDays` | Duración del campo | — |
| `suppressSmallCells` | Supresión de celdas n < umbral | — |
| `assessInference` | Advertencias metodológicas | Por código |
| `simulate` | Simulador combinado usado en `/muestras` | 3 escenarios |

## 3. Planificado
- **Fase 2:** diseños estratificado, por conglomerados y multietápico con probabilidades de selección registradas en `sampling_frames`; pesos base = 1/π; ajuste por no respuesta; raking sobre respuestas reales; varianza por linealización de Taylor y réplicas (jackknife/bootstrap) — implementadas en Python (servicio de estadística) y validadas contra el paquete R `survey` con conjuntos de referencia.
- **Fase 6:** modelos multinivel, MRP (posestratificación con tablas censales oficiales), modelos de propensión para muestras no probabilísticas (con advertencia permanente), series temporales, Monte Carlo, validación cruzada; registro versionado de modelos (`statistical_models`, `model_versions`, `model_evaluations`) con conjunto de evaluación, parámetros, métricas y responsable.

## 4. Simulador (disponible)
Entradas: diseño, margen y confianza (solo probabilístico), población, efecto de diseño, tasa de respuesta, estratos (introducidos por el usuario desde una fuente oficial citada; el sistema no inventa poblaciones), mínimo por estrato, encuestadores y productividad. Salidas: entrevistas, contactos, margen alcanzable o «No aplica», asignación por estrato, días de campo y advertencias.
