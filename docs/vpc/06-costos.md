# 06 · Plan de costos

> **Todas las cifras son estimaciones de orden de magnitud (USD/mes, noviembre 2026) para planificar.**
> Deben sustituirse por cotizaciones reales y por los resultados del benchmark de la Fase 2 antes de
> fijar precios. Ningún precio comercial se publica sin ese dato.

## Coste de infraestructura por etapa (estimado)

| Partida | Etapa 1 (5 disp.) | Etapa 3 (100 disp.) | Etapa 5 (500 disp.) |
|---|---|---|---|
| Supabase (plan Pro + cómputo) | 25–60 | 100–300 | 400–1.000 |
| VPS control plane (API, workers, Redis) | 20–50 | 150–300 | 600–1.200 |
| Nodos KVM dedicados | 1 × 80–150 | 6–10 × 80–200 | 25–40 × 100–250 |
| Rack físico (amortización 24 meses + energía) | 30–60 | 150–400 | según demanda |
| Telefonía (Asterisk/Kamailio/rtpengine) | 10–20 | 60–150 | 300–600 |
| Correo (Stalwart + IP dedicadas) | 20–40 | 60–150 | 200–500 |
| Observabilidad | 0–20 (autohospedado) | 50–150 | 200–500 |
| Almacenamiento S3 + backups externos | 5–20 | 50–200 | 300–1.000 |
| Ancho de banda (streaming WebRTC) | incluido | 50–300 | 500–2.000 |
| **Total infraestructura** | **~200–450** | **~1.200–3.500** | **~6.000–13.000** |

Costes no incluidos que pueden dominar: personal, asesoría legal/regulatoria, licencias GMS o
Genymotion, minutos y numeración con operadores, facturación electrónica, seguros.

## Coste unitario (fórmulas, a calibrar con benchmark)

```
coste_hora_android_virtual = (coste_mensual_nodo / 730) / instancias_estables_por_nodo
                             + almacenamiento_GB × coste_GB_hora + tráfico_estimado
coste_mes_extensión        = coste_PBX_mensual / extensiones_activas + soporte
coste_min_saliente         = tarifa_operador_destino + coste_PBX_por_minuto
coste_mes_buzón            = (coste_servidor_correo + IP) / buzones + cuota_GB × coste_GB
```

`instancias_estables_por_nodo` sale del benchmark (Fase 2), con criterios: latencia de entrada
< 100 ms, ≥ 25 fps en streaming, sin OOM durante 24 h con carga típica, CPU host < 80 %.

## Regla de precios

- `pricing_rules` guarda `unit_cost_cents` y `unit_price_cents`. El sistema **rechaza** un precio
  menor que el coste salvo que exista `below_cost_approved_by` (decisión comercial explícita de SA),
  registrada en auditoría.
- Margen objetivo inicial sugerido: ≥ 40 % sobre coste para cómputo, ≥ 20 % para minutos.
- Plan gratuito: límites estrictos (p. ej. 1 h/día de Android virtual, 1 extensión interna, 1 buzón
  con 500 MB) y verificación anti-abuso; su coste se presupuesta como adquisición.
- Revisión trimestral de costes reales vs. precios con el informe de VPC AI.
