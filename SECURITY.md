# Seguridad

## Implementado

- Contraseñas con `scrypt` y sal por usuario; política mínima de 10 caracteres con letras y números.
- Sesiones en cookie firmada con HMAC-SHA256 (`HttpOnly`, `SameSite=Lax`, `Secure` en producción, 8 horas). `SESSION_SECRET` es obligatorio en producción.
- API keys de 192 bits; solo se almacena su hash SHA-256 y se muestran una vez.
- Autorización por recurso: un pedido ajeno responde 404. `/admin` exige rol administrador en el proxy y en el servidor.
- CSRF: las mutaciones con cookie exigen cabecera `Origin` del propio sitio.
- Límites: 10 intentos de login por IP y correo cada 5 minutos, 5 registros por IP y hora, 120 peticiones por usuario y minuto.
- Validación estricta de entradas (sin valores por defecto silenciosos) y cuerpos limitados a 256 KB.
- Cabeceras: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS.

## Pendiente antes de operar con dinero real

- **Rotar las credenciales que estuvieron en el historial de git** (commit inicial) y limpiar ese historial.
- Persistencia en base de datos; hoy los límites de peticiones y los datos son por proceso y en memoria.
- Revocación de sesiones en servidor, verificación de correo, recuperación de contraseña y 2FA.
- Content-Security-Policy con nonces.
- Pasarela de pago real con verificación de webhooks.

Reporta vulnerabilidades en privado al responsable del repositorio, no en issues públicos.
