# 09 · Escalabilidad y riesgos

## Plan de escalabilidad

| Etapa | Dispositivos | Topología | Cambios necesarios |
|---|---|---|---|
| 1 | 5 | 1 nodo KVM + 1 rack mini | Todo en un servidor por rol; benchmark inicial |
| 2 | 10–30 | 2–3 nodos KVM | Scheduler básico (bin-packing por CPU/RAM), Redis dedicado |
| 3 | 100 | 6–10 nodos (cifra a confirmar con benchmark) | Kamailio + rtpengine frente a Asterisk; réplica de lectura Postgres; PgBouncer; Nomad |
| 4 | 300 | 2 zonas | Scheduler con afinidad/antiafinidad por zona y organización; HA de Redis (Sentinel); MX secundario |
| 5 | 500 | 2+ zonas, pool de Asterisk | Particionado de `call_records`, `device_metrics`, `usage_events` por mes; servidores de señalización WebRTC múltiples |
| 6 | 1.000+ | Regiones | Control plane activo-pasivo multirregión; evaluar FreeSWITCH/escala horizontal de media; CDN/TURN regional |

### Scheduler

Entrada: plantilla (vCPU, RAM, disco, arquitectura), política del cliente (zona, nodo dedicado,
antiafinidad), estado real de nodos (último heartbeat < 60 s). Algoritmo inicial:

1. Filtrar nodos `ready`, misma arquitectura, recursos libres ≥ solicitados × factor de seguridad,
   y que cumplan política.
2. Puntuar: menor ocupación proyectada, misma zona que la red del cliente, menos instancias de la
   misma organización (reparto de riesgo).
3. Reservar capacidad en Postgres con transacción (`select … for update` del nodo) antes de enviar
   el job; liberar si el job falla.

La capacidad máxima por nodo **no es fija**: `network_nodes.max_instances` se ajusta por perfil de
hardware a partir del benchmark y de métricas reales, nunca por cifra teórica.

### Gestión de capacidad

- Alertas a 70 % (planificar compra) y 85 % (bloquear ventas nuevas de ese tipo).
- Los productos solo se venden si `capacidad libre probada > reservas confirmadas`.
- VPC AI predice saturación con series de Prometheus (Fase 9).

## Análisis de riesgos

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | `mmail.com` no es propiedad de la empresa | Alta (hasta verificar) | Crítico (MMail inviable con ese dominio) | Verificar ya; plan B con dominio propio |
| R2 | Requisitos regulatorios INDOTEL impiden/retrasan la telefonía pública | Media | Alto | Fases 1–6 independientes; asesoría legal temprana; operar inicialmente solo telefonía interna |
| R3 | Uso de la plataforma para fraude (granjas de cuentas, evasión de verificación, spam) | Alta | Crítico (legal, reputación, bloqueo de IPs y cuentas por operadores) | Políticas y controles del plan de seguridad, KYC para servicios sensibles, límites, sin funciones de evasión, monitorización de abuso, cancelación de cuentas |
| R4 | Fraude telefónico (toll fraud) | Media | Alto (pérdidas económicas directas) | Destinos restringidos por defecto, límites de gasto, corte automático |
| R5 | Mala reputación de IP de correo / entregabilidad baja | Alta al inicio | Alto | Calentamiento de IP, autenticación completa, límites de envío, monitorización de listas, IP separadas para transaccional |
| R6 | Capacidad real por nodo menor a la esperada | Media | Alto (márgenes) | Benchmark antes de fijar precios; nodos ARM si mejora la densidad |
| R7 | Ausencia de Google Play limita el valor comercial del Android virtual | Alta | Medio | Comunicarlo claramente; explorar licencia GMS o Genymotion con licencia comercial |
| R8 | Apps ARM-only no funcionan en hosts x86 | Media | Medio | Nodos ARM64; informar compatibilidad en catálogo |
| R9 | Obligaciones de licencias copyleft (AGPL de Stalwart, GPL de Asterisk) | Media | Medio | Revisión legal; separar procesos; licencia comercial de Stalwart si hace falta |
| R10 | Fuga de datos entre organizaciones | Baja | Crítico | RLS + pruebas automáticas de aislamiento + revisión de seguridad por PR |
| R11 | Caída del control plane | Media | Medio | Data plane autónomo (doc. 01 §3), RTO ≤ 1 h |
| R12 | Alcance excesivo (15 módulos) para el equipo disponible | Alta | Alto | Fases estrictas; módulos paralelos (WA, AI) fuera del camino crítico; no empezar una fase sin cerrar la anterior |
| R13 | Hardware físico: degradación de baterías, calor, fallos USB | Alta | Medio | Monitorización de batería/temperatura, carga limitada, hubs con control de puertos, inventario de reserva |
| R14 | Dependencia de un proveedor de hosting/telefonía | Media | Medio | Interfaces de proveedor sustituibles (`carrier_connections`, almacenamiento S3 compatible, nodos registrables en cualquier proveedor) |
| R15 | Costes de ancho de banda del streaming mayores de lo previsto | Media | Medio | Medir en Fase 2; ajustar bitrate/resolución; precio por consumo |
