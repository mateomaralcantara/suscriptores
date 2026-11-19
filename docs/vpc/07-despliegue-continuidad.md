# 07 · Plan de despliegue y continuidad operativa

## Entornos

| Entorno | Propósito | Datos |
|---|---|---|
| `local` | Desarrollo (docker compose: Postgres/Supabase local, Redis, Asterisk, Stalwart, Android Emulator) | Sintéticos de prueba, nunca mostrados como productivos |
| `staging` | Copia reducida de producción, 1 nodo KVM, dominios de prueba | Sintéticos |
| `production` | Clientes reales | Reales |

## Pipeline (GitHub Actions)

1. Lint, typecheck, pruebas unitarias (TS, Go, Dart).
2. Pruebas de integración con servicios en contenedor (Postgres + migraciones + RLS, Redis, Asterisk, Stalwart).
3. Escaneo de dependencias y secretos.
4. Build de imágenes (`vpc-api`, `vpc-worker`, `web`) firmadas (cosign) y binario `vpc-agent` firmado.
5. Despliegue a staging → pruebas E2E y de humo → aprobación manual → producción.
6. Migraciones de base de datos: compatibles hacia atrás (expand → migrate → contract); nunca
   destructivas en el mismo despliegue que el código que deja de usarlas.

## Despliegue por componente

| Componente | Método | Estrategia |
|---|---|---|
| `vpc-api` / `vpc-worker` / `web` | Contenedores (Nomad o compose en Etapa 1) | Rolling, health checks `/healthz` y `/readyz` |
| `vpc-agent` | Paquete firmado + systemd, actualizado por Ansible | Canary: 1 nodo → 10 % → resto; nodo en `drain` antes de actualizar |
| Nodos KVM | Ansible (kernel, KVM, Cuttlefish host packages, LUKS, firewall) | Inmutables: se reconstruyen, no se parchean a mano |
| Asterisk / Kamailio | Ansible + config generada | Azul/verde por servidor; drenado de llamadas antes del corte |
| Stalwart | Contenedor o paquete; datos en volumen + S3 | Ventana de mantenimiento con MX secundario recibiendo |
| Imágenes Android | Repositorio de imágenes versionadas con hash | Plantillas referencian versión exacta |

## RPO / RTO por dominio

| Dominio | RPO | RTO | Mecanismo |
|---|---|---|---|
| Base de datos control plane (clientes, permisos, identidades) | ≤ 5 min | ≤ 1 h | PITR de Supabase + dump diario externo cifrado |
| Facturación y ledger | 0 (transaccional) / ≤ 5 min ante desastre | ≤ 4 h | Mismo Postgres + export diario inmutable; eventos de uso re-enviables desde agentes |
| Correo (buzones) | ≤ 15 min | ≤ 4 h | Replicación de almacenamiento + backups incrementales cada 15 min; MX secundario retiene entrantes hasta 5 días |
| Telefonía (servicio de llamadas) | n/a (en vivo) | ≤ 15 min | Asterisk/Kamailio redundantes desde Etapa 3; configuración en Postgres |
| CDR y buzón de voz | ≤ 15 min | ≤ 4 h | Replicación a Postgres + S3 |
| Grabaciones | ≤ 1 h | ≤ 24 h | S3 con versionado |
| Android virtual (discos de usuario) | ≤ 24 h (o snapshot manual) | ≤ 8 h | Snapshots programados opcionales (producto de pago); las instancias se recrean desde plantilla |
| Android físico | n/a (hardware) | según repuesto | Inventario de reserva; datos de usuario no se garantizan salvo backup contratado |
| Observabilidad | ≤ 24 h | ≤ 24 h | Aceptable perder métricas finas |

## Prácticas

- Backups 3-2-1, cifrados, con **prueba de restauración mensual automatizada** (restaurar a un
  entorno efímero y comparar recuentos/sumas de control).
- Health checks por servicio y por nodo; reinicio controlado por el agente/orquestador.
- Logs centralizados en Loki (sin secretos ni OTP; PII minimizada).
- Plan de contingencia escrito por escenario: caída del control plane, caída de un nodo, IP de correo
  en lista negra, fraude telefónico en curso, fuga de credenciales, caída del operador SIP.
- Simulacro de recuperación semestral.
