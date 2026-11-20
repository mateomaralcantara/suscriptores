# 07 · Inventario de APIs y conectores · matriz de viabilidad legal y comercial

> **Estado de todas las fuentes: NO CONECTADAS.** Ninguna integración está activa en esta versión.
> Las condiciones de acceso de las plataformas cambian con frecuencia (precios, niveles de acceso, programas
> de investigadores). Cada fila debe verificarse contra la documentación oficial vigente, con fecha y responsable,
> antes de construir el conector. Las columnas marcadas «Por verificar» no deben darse por ciertas.

## 1. Ficha de integración (obligatoria por fuente)
1. API oficial disponible · 2. Tipo de datos autorizados · 3. Permisos requeridos · 4. Países y usos elegibles ·
5. Límites de solicitudes · 6. Condiciones de retención · 7. Uso comercial · 8. Restricciones de redistribución ·
9. Costos · 10. Estado operativo · 11. Última comprobación documental · 12. Mecanismo de revocación y eliminación.

## 2. Matriz inicial

| Fuente | Vía prevista | Viabilidad técnica | Viabilidad legal/comercial | Estado |
|---|---|---|---|---|
| YouTube | API oficial de datos (comentarios públicos de videos) | Alta | Cuotas y términos de API; retención limitada — por verificar | Pendiente de verificación |
| Facebook / Instagram | APIs de Meta; acceso a contenido público para investigación mediante programas específicos | Media | Requiere aprobación de Meta; uso comercial restringido — por verificar | Pendiente de autorización |
| Threads | API de Meta | Media | Por verificar | Pendiente de verificación |
| TikTok | API de investigación (elegibilidad académica/regional) | Baja–media | Elegibilidad restringida — por verificar | Pendiente de autorización |
| X | API de pago por niveles | Media | Costo y términos — por verificar | Pendiente de verificación |
| Reddit | API oficial | Media | Términos de uso comercial — por verificar | Pendiente de verificación |
| Bluesky | Protocolo AT abierto | Alta | Respetar términos y preferencias de los usuarios — por verificar | Pendiente de verificación |
| Mastodon | API por instancia | Alta | Política de cada instancia | Pendiente de verificación |
| Medios digitales | RSS + rastreo autorizado + licencias | Alta | Derechos de autor: almacenar metadatos y fragmentos; texto completo solo con licencia | Pendiente |
| Portales institucionales y transparencia | Datos abiertos, rastreo autorizado | Alta | Generalmente públicos; revisar licencia | Pendiente |
| Publicaciones académicas | APIs de índices abiertos (p. ej., Crossref, OpenAlex) | Alta | Licencias abiertas por verificar | Pendiente |
| GDELT | Descarga de datos abiertos | Alta | Términos por verificar | Pendiente |
| Google Trends | Sin API pública general estable — por verificar | Baja | Términos de Google | Restringida |
| Mensajería privada / grupos cerrados | — | — | **Prohibido** | No permitido |

## 3. Reglas del rastreador autorizado
- APIs oficiales primero. Rastreo solo de páginas públicas cuando sea legal y compatible con términos y `robots.txt`.
- Agente de usuario identificable, límites de tasa conservadores por dominio, respeto de `Retry-After`.
- Prohibido eludir autenticación, CAPTCHA, muros de pago, límites técnicos o controles de privacidad.
- Si una fuente no lo permite: estado **restringida** o **pendiente de autorización**, nunca simulación de conexión.

## 4. Componentes (fase 3)
Source Registry · API Connector Manager · Authorized Web Crawler · Rate Limit Manager · Scheduler · Retry Queue · Deduplication Engine (hash de contenido + similitud) · Content Normalizer · Provenance Tracker · Data Retention Controller · Source Health Monitor.
