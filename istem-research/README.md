# ISTEM RESEARCH

**Sistema Integral de Inteligencia, Investigación, Estudios de Opinión y Tecnología.**
*«Investigamos la realidad. Transformamos los datos en conocimiento».*

Versión 0.1 · **Fase 1: Fundamentos** — funcional y probada.

## Qué funciona hoy
- Registro e inicio de sesión (Supabase Auth, cookies httpOnly, renovación automática).
- Organizaciones aisladas entre sí (RLS en PostgreSQL), 11 roles y 19 permisos.
- Miembros: agregar, cambiar rol, retirar (siempre queda un director).
- **Centro de investigaciones:** asistente de proyecto guiado por objetivos (pregunta, objetivo, población,
  31 provincias + DN, métodos, diseño muestral), ciclo de vida validado, equipo por proyecto, edición con control de concurrencia.
- **Auditoría** de cada acción, inmutable y encadenada con SHA-256, con verificación de integridad desde la interfaz.
- **Simulador muestral:** tamaño de muestra, margen alcanzable, efecto de diseño, población finita, asignación por estratos,
  días de campo y advertencias. Nunca calcula margen de error para muestras no probabilísticas.
- Núcleo estadístico probado: cuantiles normales, tamaño muestral, margen, n efectivo de Kish, **raking (IPF)**,
  asignación proporcional y supresión de celdas pequeñas.
- Menú completo de 18 módulos: los no implementados muestran su fase real, sin datos de ejemplo ni conexiones simuladas.

## Qué no existe todavía
Encuestas y trabajo de campo (fase 2), conectores de redes y web (3), encuesta de encuestas (4), agentes de IA y chat (5),
mapas y modelos avanzados (6), facturación y API pública (7). **Ninguna fuente externa está conectada.**

## Uso
```bash
npm ci
cp .env.example .env.local      # SUPABASE_URL y SUPABASE_ANON_KEY de un proyecto dedicado
# aplicar database/migrations/*.sql en Supabase, en orden
npm run dev                     # http://localhost:3010
```

## Calidad
```bash
npm run validate                # typecheck + lint + 52 pruebas + build + 17 pruebas HTTP
DATABASE_URL=postgres://… npm run test:db   # 70 aserciones SQL (aislamiento, permisos, auditoría)
```

## Documentación
| # | Documento |
|---|---|
| 01 | [Requisitos funcionales y no funcionales](docs/01-requisitos.md) |
| 02 | [Referentes internacionales](docs/02-referentes.md) |
| 03 | [Arquitectura C4, servicios, flujos de datos y ADR](docs/03-arquitectura.md) |
| 04 | [Modelo de base de datos](docs/04-base-de-datos.md) |
| 05 | [Permisos, privacidad y cumplimiento](docs/05-seguridad-privacidad.md) |
| 06 | [HARNESS agéntico](docs/06-harness-agentico.md) |
| 07 | [APIs, conectores y viabilidad legal](docs/07-fuentes-conectores.md) |
| 08 | [Muestreo y estadística](docs/08-muestreo-estadistica.md) |
| 09 | [Poll of Polls](docs/09-poll-of-polls.md) |
| 10 | [Interfaces, pruebas, presupuesto, fases y riesgos](docs/10-plan-fases-pruebas-riesgos.md) |
| 11 | [Instalación, despliegue, administración y checklist de producción](docs/11-operaciones.md) |
| — | [Referencia de la API](docs/API.md) |

## Estructura
```
app/(portal)/        portal (inicio, proyectos, muestras, administración, configuración, módulos)
app/api/             auth, sesión y API v1
lib/                 supabase (token del usuario), sesión, datos, reglas, metodología, simulador
components/          interfaz
database/migrations/ 001 fundamentos (RLS, RPC, auditoría) · 002 geografía RD
tests/               unit · e2e (estructura) · api (HTTP) · db (SQL)
docs/                entregables de planificación
```
