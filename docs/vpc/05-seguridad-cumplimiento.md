# 05 · Plan de seguridad y cumplimiento

## Modelo de amenazas (resumen)

| Activo | Amenaza principal | Control principal |
|---|---|---|
| Datos de clientes | Fuga entre organizaciones | RLS + verificación de organización en API + pruebas de aislamiento automáticas |
| Dispositivos | Toma de control por sesión robada | Tokens de sesión de un solo uso, cortos, ligados al usuario; registro de comandos |
| Telefonía | **Fraude de tarificación** (toll fraud, IRSF) | Destinos restringidos por defecto, límites de gasto y canales, detección de anomalías, Kamailio `pike` |
| Correo | Cuenta comprometida usada para spam; open relay | Límites de envío, detección de envío anómalo, MFA/contraseñas de aplicación, pruebas de open relay en CI |
| Plataforma | Uso para fraude/evasión (granjas de cuentas, bypass de verificación) | Política de uso aceptable, sin falsificación de hardware, KYC proporcional, detección de abuso |
| Facturación | Doble cobro / cobro perdido | Ledger idempotente, `usage_events.event_id` único, funciones SQL atómicas |
| Secretos | Exposición de credenciales SIP/correo/proveedores | Gestor de secretos, nunca en el cliente, rotación |

## Controles de plataforma

- **Autenticación:** Supabase Auth; **MFA obligatorio** para roles SA/PA/OA/SU/AU (TOTP o WebAuthn;
  WebAuthn obligatorio para SA). Tokens de acceso ≤ 15 min, refresh rotativo con detección de reuso.
- **RBAC** según [03-permisos.md](03-permisos.md) + **MFA reciente** para acciones ⚠.
- **Aislamiento multi-tenant:** RLS en todas las tablas expuestas; pruebas automáticas que crean dos
  organizaciones e intentan leer/escribir cruzado por cada endpoint (deben dar 404).
- **Cifrado en tránsito:** TLS 1.2+ en todo; mTLS entre agentes y control plane; SIP-TLS + SRTP;
  IMAPS/Submission con TLS obligatorio.
- **Cifrado en reposo:** discos de nodos con LUKS; buckets S3 con cifrado; backups cifrados con
  clave del cliente (age/restic) fuera del proveedor de almacenamiento.
- **Secretos:** HashiCorp Vault u OpenBao (autohospedado) o el gestor del proveedor cloud. Las tablas
  solo guardan `secret_ref`. Rotación: SIP a demanda y tras incidente; credenciales de servicio cada
  90 días; certificados de agente cada 30 días.
- **Rate limiting y fuerza bruta:** Redis token bucket por IP, usuario y API key; bloqueo progresivo
  en login, OTP (máx. 5 intentos, expiración 10 min), SIP REGISTER (fail2ban/Kamailio) e IMAP/SMTP
  AUTH (Stalwart).
- **OTP:** código de 6 dígitos generado con CSPRNG; se guarda `HMAC-SHA256(pepper, código)`;
  nunca en logs; comparación en tiempo constante; un solo uso.
- **Auditoría:** `audit_logs` de solo inserción; exportación diaria a almacenamiento inmutable
  (object lock).
- **Detección de anomalías:** reglas iniciales (picos de llamadas internacionales, envío masivo de
  correo, logins desde países nuevos, creación masiva de dispositivos) → `abuse_detection_events`
  → alerta; VPC AI añade puntuación más adelante.
- **Seguridad de la cadena de suministro:** dependencias fijadas, `npm audit`/`govulncheck` en CI,
  imágenes Android y APK con hash SHA-256 verificado antes de instalarlas.

## Telefonía

- Por defecto **solo llamadas internas**. Nacional/internacional se habilita por organización,
  con lista de prefijos permitidos y límite diario de gasto.
- Límite de canales concurrentes por extensión y por organización.
- Bloqueo de destinos de alto riesgo (prefijos premium/IRSF) mantenido como lista.
- Alerta y corte automático si el gasto horario supera N× la media.
- Credenciales SIP largas aleatorias, nunca elegidas por el usuario; registro solo vía TLS/WSS.
- Grabaciones solo con base legal registrada (`consent_basis`) y aviso al interlocutor.

## Correo

- SPF `-all`, DKIM 2048 bits con rotación anual, DMARC empezando en `p=none` con reportes →
  `quarantine` → `reject`.
- MTA-STS + TLS-RPT; DANE si el DNS del dominio soporta DNSSEC.
- Submission solo autenticado; prueba de open relay automática tras cada despliegue.
- Límites de envío por buzón y por organización; cuarentena automática ante tasa de rebote/quejas.
- Antispam integrado de Stalwart; antimalware con ClamAV.
- Detección de cuenta comprometida: envío anómalo, logins geográficamente imposibles.

## Dispositivos

- Sesiones remotas temporales (expiran por inactividad) y registradas.
- Instalación solo desde catálogo aprobado por la organización (APK con hash).
- Almacenamiento de cada instancia aislado (disco propio por VM); borrado seguro al liberar.
- Red de cada dispositivo en su propio perfil; sin tráfico lateral entre organizaciones.
- Registro de comandos administrativos ejecutados por el agente.
- **Prohibido por diseño:** modificación de IMEI/serie/modelo, ocultación de emulador, SIM falsa,
  rotación de IP para evadir antifraude. No existen endpoints ni opciones para ello.

## Cumplimiento legal (a investigar con asesoría antes de comercializar)

| Tema | Acción | Bloquea fase |
|---|---|---|
| INDOTEL (Ley 153-98 de Telecomunicaciones, RD) | Determinar si VPC necesita concesión/licencia o registro como proveedor de servicios de valor agregado; requisitos para reventa e interconexión | 7 |
| Numeración telefónica | Solo números obtenidos de un operador autorizado con contrato; no comercializar sin derechos | 7 |
| Interconexión con PSTN | Contrato con operador o proveedor SIP trunk autorizado | 7 |
| Protección de datos (Ley 172-13 RD y, si hay clientes UE, RGPD) | Registro de tratamientos, política de privacidad, contratos de encargado, derechos ARCO | 1 |
| Registros de llamadas (CDR) | Plazos de conservación y acceso por requerimiento judicial | 4 |
| Antispam | Política de uso aceptable, baja obligatoria, consentimiento | 5 |
| Dominio `mmail.com` | Confirmar propiedad (ver README) | 5 |
| WhatsApp Business Platform | Cumplir políticas de Meta (opt-in, plantillas, comercio) | módulo WA |
| Licencias de software | Inventario SPDX: AOSP Apache 2.0; Asterisk GPLv2 (no modificar sin publicar o usar como servicio separado); Stalwart AGPL-3.0/licencia comercial (evaluar obligaciones al ofrecerlo como SaaS); Roundcube GPLv3; Kamailio GPLv2 | 2, 4, 5 |
| Android/GMS | Sin licencia GMS no se incluye Google Play | 2 |
| Facturación fiscal (DGII, comprobantes NCF/e-CF) | Integración con proveedor de facturación electrónica autorizado | 8 |
