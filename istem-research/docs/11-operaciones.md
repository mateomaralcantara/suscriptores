# 11 · Instalación, despliegue, administración, seguridad y checklist de producción

## 1. Instalación local
Requisitos: Node ≥ 22.18, PostgreSQL 16 (o Docker) y un proyecto Supabase **dedicado** a ISTEM.

```bash
cd istem-research
npm ci
cp .env.example .env.local   # completar SUPABASE_URL y SUPABASE_ANON_KEY
```

Aplicar las migraciones en el proyecto Supabase (editor SQL o CLI), en orden:
`database/migrations/001_fundamentos.sql`, `002_geografia_do.sql`. Son idempotentes.

```bash
npm run dev        # http://localhost:3010
```

Primer uso: crear cuenta en `/register` → crear organización → crear proyecto.

## 2. Pruebas
```bash
npm run validate                      # typecheck, lint, unitarias, build y pruebas HTTP
docker compose up -d db               # PostgreSQL desechable (o use uno propio)
DATABASE_URL=postgres://postgres:postgres@localhost:54329/postgres npm run test:db
```

## 3. Despliegue
- **Frontend/API:** Vercel, con el directorio raíz `istem-research`. Variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`.
- **Base de datos:** Supabase. Activar confirmación de correo en Auth. Configurar la URL del sitio y redirecciones permitidas (`/login`).
- **Entornos:** desarrollo, pruebas (staging) y producción con proyectos Supabase separados.
- **CI:** `.github/workflows/istem-research.yml` ejecuta `validate` y `test:db` en cada cambio dentro de `istem-research/`.

## 4. Manual de administración
| Tarea | Cómo |
|---|---|
| Nombrar superadministrador de plataforma | SQL con service role: `update users_profiles set is_platform_admin = true where email = '…';` (queda fuera del alcance de la UI a propósito) |
| Activar un plan de pago | `select admin_set_subscription(org, plan, 'activa', admin_id, 'constancia de autorización');` — exige superadministrador y motivo; queda auditado |
| Agregar miembros | `/administracion` (la persona debe registrarse primero) |
| Verificar la auditoría | `/administracion` → «Verificar integridad de la cadena», o `GET /api/v1/organizations/{id}/audit?verify=1` |
| Archivar proyectos | Ficha del proyecto (requiere `project.archive`) |

## 5. Informe de seguridad (fase 1)
- Revisado: aislamiento por RLS (70 pruebas), mínimo privilegio, auditoría inmutable, CSRF por origen, cookies httpOnly, cabeceras, errores genéricos, enumeración de usuarios, dependencias (`npm audit`: 0 vulnerabilidades con next 16.4.6).
- Riesgos abiertos: límite de intentos en memoria (R10), MFA pendiente, sin escaneo automático de dependencias en CI, sin prueba de penetración externa, prueba de extremo a extremo con Supabase real pendiente.

## 6. Checklist de producción
- [ ] Proyecto Supabase dedicado, plan con copias de seguridad diarias y PITR
- [ ] Restauración de copia probada y documentada
- [ ] Confirmación de correo activada; política de contraseñas; MFA para directores
- [ ] `NEXT_PUBLIC_APP_URL` con HTTPS; dominio propio
- [ ] Límite de intentos con almacén compartido
- [ ] Monitoreo de errores y disponibilidad; alertas
- [ ] Prueba E2E con Supabase real en staging
- [ ] Revisión legal de términos, política de privacidad (Ley 172-13) y consentimiento
- [ ] Verificación del catálogo geográfico contra la ONE (`verified_at`)
- [ ] Revisión de seguridad externa
