# 08 · Roadmap y estrategia de pruebas

## Roadmap

No se pasa a la siguiente fase con errores críticos abiertos en la anterior.

| Fase | Objetivo | Entregables principales | Criterios de aceptación |
|---|---|---|---|
| **0 — Diseño** | Estos documentos | `docs/vpc/*` | Revisado y aprobado; bloqueantes del README con responsable |
| **1 — Fundación** | Base multi-tenant segura | Monorepo, CI, Supabase con esquema `core` + RLS, `vpc-api` (auth, organizaciones, miembros, roles, permisos, auditoría, API keys), panel Next.js con menú lateral y módulos no implementados marcados "Pendiente", OpenAPI | Pruebas de aislamiento entre organizaciones pasan en todos los endpoints; MFA obligatorio para roles admin; toda mutación auditada; `validate` verde |
| **2 — VPhone** | Primer Android virtual real | `vpc-agent` (registro mTLS, heartbeat, jobs), nodo KVM con Cuttlefish, plantillas, encendido/apagado/reinicio, sesión WebRTC desde el panel, métricas, benchmark de capacidad | Crear→encender→controlar→apagar→borrar desde el panel con estado confirmado por el agente; benchmark documentado con N instancias estables por nodo |
| **3 — VPhone Physical** | Teléfonos USB | Detección ADB, inventario, batería/temperatura, scrcpy→WebRTC, control de puertos USB, detección de desconexión | Desconectar un cable se refleja como `disconnected` en < 30 s; ningún teléfono físico aparece como virtual ni viceversa |
| **4 — MPhone** | Telefonía interna | Asterisk 22 + PJSIP Realtime, extensiones desde el panel, softphone WebRTC en panel/app, buzón de voz, CDR, límites anti-fraude | Llamada entre dos extensiones de la misma organización; imposible marcar a otra organización; CDR registrado con duración real |
| **5 — MMail** | Correo propio | Dominio verificado, Stalwart, Roundcube, cuentas/alias/cuotas desde el panel, SPF/DKIM/DMARC/MTA-STS, eventos de entrega | Puntuación ≥ 9/10 en pruebas de entregabilidad tipo mail-tester; DMARC alineado; prueba de open relay negativa; "entregado" solo con evento del MTA |
| **6 — VPC Identity** | Vínculos y OTP | Identidades, vínculos con historial, OTP por correo, recuperación con aprobación, revocación de sesiones en cascada | Revocar una identidad cierra sesiones de panel, IMAP y SIP vinculadas; OTP con hash, expiración y límite |
| **7 — Telefonía pública** | PSTN autorizada | Evaluación legal y de operadores, SIP trunk, numeración con contrato, tarifas, facturación por minuto | Dictamen legal favorable; número activo solo tras confirmación del operador; límites de gasto probados |
| **8 — Comercialización** | Cobrar | Planes, suscripciones, uso, facturas, pasarela de pago, portal comercial, panel de consumo | Ledger cuadrado en pruebas; ningún precio bajo coste sin aprobación; facturación fiscal válida |
| **9 — Escalabilidad** | Crecer | Scheduler multi-nodo, balanceo, HA de Postgres/Redis/Kamailio, autoescalado de capacidad, optimización de costes | Prueba de carga de la etapa objetivo; caída de un nodo no afecta a otras organizaciones |

Los módulos **WhatsApp Business Platform**, **Network Manager** avanzado y **VPC AI** se planifican
como épicas paralelas a partir de la Fase 6, sin bloquear el camino crítico.

### Detalle de la Fase 1 (siguiente paso)

- **Archivos que se crearán:** `apps/api/src/{auth,organizations,members,rbac,audit,api-keys}/*`,
  `apps/web/app/(console)/*`, `database/migrations/0001_core.sql`, `0002_rbac_seed.sql`,
  `packages/contracts/openapi.yaml`, `.github/workflows/ci.yml`, `infra/compose/dev.yml`.
- **Dependencias:** NestJS 11, `@nestjs/swagger`, `zod`, `pg`, `ioredis`, `bullmq`, Next.js 16,
  Tailwind 4, Supabase CLI.
- **Migraciones:** esquema `core` completo (ver [02-modelo-datos.md](02-modelo-datos.md)) con RLS
  y funciones auditadas.
- **Pruebas:** unitarias de RBAC (matriz completa generada desde [03-permisos.md](03-permisos.md)),
  integración SQL de RLS, E2E de login con MFA y aislamiento.
- **Evidencias:** salida de CI, capturas del panel, informe de pruebas de aislamiento.

## Estrategia de pruebas

| Nivel | Herramienta | Qué cubre |
|---|---|---|
| Unitarias | Vitest/Jest (TS), `go test`, `flutter test` | Reglas puras: permisos, precios, cálculo de uso, máquinas de estado de dispositivos/llamadas |
| SQL | pgTAP o `node --test` contra Postgres desechable | RLS por tabla, funciones atómicas (idempotencia, concurrencia), permisos `grant/revoke` |
| Integración | Testcontainers: Postgres, Redis, Asterisk, Stalwart | Aprovisionar extensión ⇒ registro SIP real; crear buzón ⇒ login IMAP real |
| Contrato | Validación contra OpenAPI; protobuf del agente | Compatibilidad API ↔ panel/app/agente |
| E2E | Playwright (web), `integration_test` (Flutter) | Flujos completos por rol |
| Hardware/infra | Laboratorio con nodo KVM y rack real | Ciclo de vida de dispositivos, desconexiones, benchmark |
| Seguridad | Pruebas de aislamiento automáticas, OWASP ZAP, SIPVicious contra staging, prueba de open relay, revisión de dependencias, pentest externo antes de la Fase 8 | |
| Carga | k6 (API), SIPp (llamadas), smtp-source/Postal (correo), arranque masivo de instancias | Capacidad real por etapa |
| Recuperación | Restauraciones programadas, caos controlado (matar nodo, cortar control plane) | RPO/RTO del documento 07 |

Reglas: sin datos simulados en funciones productivas; las pruebas usan organizaciones y recursos
de prueba aislados. Cobertura mínima de líneas en lógica de dominio: 80 %; las funciones de dinero
y permisos, 100 % de ramas.
