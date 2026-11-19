# Virtual Phone Center (VPC) — Fase 0: diseño

Este directorio contiene los **15 entregables previos a la programación** del prompt maestro de VPC.
Todavía no hay código de VPC: ningún módulo descrito aquí está funcionando. Todo lo que aparece
como cifra de capacidad o de coste es una **estimación pendiente de benchmark o de cotización**,
y se identifica así.

| # | Entregable | Documento |
|---|---|---|
| 1 | Documento de arquitectura general | [01-arquitectura.md](01-arquitectura.md#1-arquitectura-general) |
| 2 | Diagrama de componentes | [01-arquitectura.md](01-arquitectura.md#2-diagrama-de-componentes) |
| 3 | Diagrama Control Plane / Data Plane | [01-arquitectura.md](01-arquitectura.md#3-control-plane--data-plane) |
| 4 | Arquitectura de infraestructura | [01-arquitectura.md](01-arquitectura.md#4-arquitectura-de-infraestructura) |
| 5 | Modelo de datos | [02-modelo-datos.md](02-modelo-datos.md) |
| 6 | Diagrama de relaciones | [02-modelo-datos.md](02-modelo-datos.md#diagramas-de-relaciones) |
| 7 | Matriz de permisos | [03-permisos.md](03-permisos.md) |
| 8 | Diseño de APIs | [04-apis.md](04-apis.md) |
| 9 | Plan de seguridad (y cumplimiento legal) | [05-seguridad-cumplimiento.md](05-seguridad-cumplimiento.md) |
| 10 | Plan de costos | [06-costos.md](06-costos.md) |
| 11 | Plan de despliegue (y continuidad) | [07-despliegue-continuidad.md](07-despliegue-continuidad.md) |
| 12 | Roadmap de desarrollo | [08-roadmap-pruebas.md](08-roadmap-pruebas.md#roadmap) |
| 13 | Estrategia de pruebas | [08-roadmap-pruebas.md](08-roadmap-pruebas.md#estrategia-de-pruebas) |
| 14 | Plan de escalabilidad | [09-escalabilidad-riesgos.md](09-escalabilidad-riesgos.md#plan-de-escalabilidad) |
| 15 | Análisis de riesgos | [09-escalabilidad-riesgos.md](09-escalabilidad-riesgos.md#análisis-de-riesgos) |

## Decisiones tecnológicas principales (resumen)

Detalle y alternativas descartadas en [01-arquitectura.md §5](01-arquitectura.md#5-decisiones-de-arquitectura-adr).

| Área | Decisión | Motivo corto |
|---|---|---|
| Android virtual | **Cuttlefish (AOSP) sobre KVM**; Android Emulator solo para laboratorio | Diseñado por AOSP para ejecutarse en servidores, varias instancias por host, WebRTC integrado, sin hardware falso |
| Android físico | **ADB por USB + scrcpy** gestionado por el agente del nodo | Estándar, Apache 2.0, H.264 de baja latencia |
| Telefonía | **Asterisk 22 LTS (PJSIP + ARI + Realtime PostgreSQL)**; Kamailio + rtpengine como borde SIP desde la Etapa 3 | Configuración desde base de datos, API REST/WebSocket limpia, WebRTC nativo, mayor disponibilidad de talento |
| Correo | **Stalwart Mail Server** (SMTP, Submission, IMAP, JMAP, DKIM/SPF/DMARC/MTA-STS/DANE, antispam) + **Roundcube** como webmail | Un solo componente coherente con API de administración; evita duplicar Postfix+Dovecot+Rspamd |
| Control plane | **NestJS** (TypeScript, REST + WebSocket + OpenAPI) | Requisito del prompt; módulos por dominio |
| Panel web | **Next.js + TypeScript + Tailwind** | Requisito del prompt |
| App móvil | **Flutter** | Requisito del prompt |
| Base de datos | **Supabase (PostgreSQL + Auth + RLS)** | Metadatos, usuarios, permisos y facturación; nunca como motor de virtualización, correo o telefonía |
| Agente de nodo | **Go** (binario estático, conexión saliente mTLS al control plane) | Integración con libvirt/ADB, bajo consumo, despliegue simple en racks |
| Colas | **Redis + BullMQ** | Requisito del prompt; trabajos idempotentes |
| Observabilidad | **OpenTelemetry → Prometheus / Loki / Grafana / Alertmanager** | Requisito del prompt |

## Bloqueantes y preguntas abiertas (deben resolverse antes o durante la Fase 1)

1. **Dominio `mmail.com`.** Hay que verificar que la empresa es **propietaria** del dominio. Si no lo
   es, no se puede usar (ni siquiera internamente: los correos saldrían a nombre de un tercero).
   Plan B: un dominio propio (por ejemplo `mmail.<dominio-propio>` o una marca registrada nueva).
2. **Repositorio.** VPC es un producto distinto de este panel SMM. Recomendación: un monorepo nuevo
   (`vpc/`) con `apps/web`, `apps/api`, `apps/mobile`, `agents/node-agent`, `infra/`, `database/`.
   Estos documentos pueden moverse allí sin cambios.
3. **Google Play / GMS.** Las imágenes AOSP no incluyen Google Play. Distribuir GMS en dispositivos
   virtuales requiere licencia de Google. Hasta tenerla, los Android virtuales se ofrecen **sin
   Google Play** (instalación de APK autorizados o tiendas alternativas con licencia).
4. **INDOTEL.** Antes de la Fase 7 (telefonía pública) hace falta asesoría legal sobre concesión,
   reventa e interconexión. Las Fases 1–6 no dependen de ello (las extensiones internas no son
   numeración pública).
5. **Hardware del laboratorio (Etapa 1).** Hace falta al menos un servidor con KVM (CPU con VT-x/AMD-V,
   recomendado ≥ 16 núcleos y ≥ 64 GB RAM) para medir la capacidad real por nodo.

## Principios no negociables (del prompt)

- No se presenta un emulador como teléfono físico, ni se falsifican IMEI, SIM, modelo o
  identificadores de hardware.
- No se interceptan códigos de verificación de terceros ni se automatizan verificaciones para
  evadir controles. El Verification Gateway sirve **solo** para la autenticación propia de VPC.
- No se construyen funciones para evadir antifraude, bloqueos o políticas de plataformas externas.
- Ningún estado se muestra como real sin confirmación del sistema que lo produce
  (dispositivo conectado ⇢ confirmado por el agente; correo entregado ⇢ evento del MTA;
  número activo ⇢ asignación real con el operador).
- Lo que no tenga backend se muestra como **Pendiente**, nunca con datos simulados.
