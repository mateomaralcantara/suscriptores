// Menú principal y estado real de cada módulo. Sin imports de runtime.
// "disponible" = implementado y probado en esta versión; el resto muestra su fase planificada.

export type ModuleStatus = "disponible" | "parcial" | "planificado";

export type PlatformModule = {
  slug: string;
  label: string;
  href: string;
  status: ModuleStatus;
  phase: number;
  engine?: string;
  summary: string;
};

export const MODULES: readonly PlatformModule[] = [
  { slug: "inicio", label: "Inicio", href: "/inicio", status: "disponible", phase: 1, summary: "Resumen de la organización con indicadores reales." },
  { slug: "investigaciones", label: "Centro de investigaciones", href: "/proyectos", status: "disponible", phase: 1, summary: "Proyectos guiados por objetivos, estados, equipo y auditoría." },
  { slug: "encuestas", label: "Encuestas", href: "/modulos/encuestas", status: "planificado", phase: 2, engine: "Motor A · ISTEM POLLS", summary: "Editor visual de cuestionarios, versiones inmutables, lógica, cuotas, consentimiento y multilingüe." },
  { slug: "muestras", label: "Participantes y muestras", href: "/muestras", status: "parcial", phase: 2, engine: "Motor A · Muestreo", summary: "Simulador muestral disponible. Marcos muestrales, paneles y cuotas en la fase 2." },
  { slug: "campo", label: "Trabajo de campo", href: "/modulos/campo", status: "planificado", phase: 2, engine: "Motor A · PWA de campo", summary: "PWA sin conexión para CAPI, asignación de entrevistadores, sincronización con control de conflictos." },
  { slug: "redes", label: "Inteligencia de redes", href: "/modulos/redes", status: "planificado", phase: 3, engine: "Motor B · SOCIAL INTELLIGENCE", summary: "Análisis agregado de conversaciones públicas obtenidas por APIs oficiales autorizadas." },
  { slug: "web", label: "Investigación web", href: "/modulos/web", status: "planificado", phase: 3, engine: "Motor C · WEB INTELLIGENCE", summary: "Rastreo autorizado (robots.txt, términos), documentos, RSS y fuentes abiertas con trazabilidad." },
  { slug: "poll-of-polls", label: "Encuesta de encuestas", href: "/modulos/poll-of-polls", status: "planificado", phase: 4, engine: "Motor D · POLL OF POLLS", summary: "Archivo de encuestas publicadas, fichas metodológicas, índice de transparencia y agregación con incertidumbre." },
  { slug: "estadistica", label: "Análisis estadístico", href: "/modulos/estadistica", status: "planificado", phase: 6, engine: "Motor E · ANALYTICS", summary: "Ponderación, modelos multinivel, MRP, series temporales y registro versionado de modelos." },
  { slug: "geo", label: "Inteligencia geográfica", href: "/modulos/geo", status: "parcial", phase: 6, engine: "ISTEM GEO", summary: "Catálogo de las 31 provincias y el Distrito Nacional disponible. Mapas (MapLibre + PostGIS) en la fase 6." },
  { slug: "evidencias", label: "Laboratorio de evidencias", href: "/modulos/evidencias", status: "planificado", phase: 6, engine: "Research Data Fusion", summary: "Triangulación de fuentes sin mezclarlas en una cifra única." },
  { slug: "agentes", label: "Agentes de IA", href: "/modulos/agentes", status: "planificado", phase: 5, engine: "Motor F · AGENTIC HARNESS", summary: "36 agentes en 12 familias, con presupuestos, aprobación humana y detención inmediata." },
  { slug: "chat", label: "Chat de investigación", href: "/modulos/chat", status: "planificado", phase: 5, engine: "ISTEM RESEARCH AI", summary: "Consultas en lenguaje natural con citas, filtros y advertencias de cobertura." },
  { slug: "informes", label: "Informes", href: "/modulos/informes", status: "planificado", phase: 5, summary: "Generador editorial y científico con aprobación humana previa a la publicación." },
  { slug: "publicaciones", label: "Publicaciones", href: "/modulos/publicaciones", status: "planificado", phase: 7, engine: "Motor G · RESEARCH CLOUD", summary: "Publicaciones públicas revisadas y comprobación de la regulación electoral vigente." },
  { slug: "fuentes", label: "Fuentes y conectores", href: "/modulos/fuentes", status: "planificado", phase: 3, summary: "Fichas de integración por plataforma. Ninguna fuente está conectada en esta versión." },
  { slug: "administracion", label: "Administración", href: "/administracion", status: "disponible", phase: 1, summary: "Miembros, roles, permisos y auditoría verificable." },
  { slug: "configuracion", label: "Configuración", href: "/configuracion", status: "disponible", phase: 1, summary: "Perfil, organización y suscripción." },
];

export const PHASES: Record<number, string> = {
  1: "Fundamentos",
  2: "Encuestas",
  3: "Inteligencia digital",
  4: "Encuesta de encuestas",
  5: "IA agéntica",
  6: "Analítica avanzada",
  7: "SaaS comercial",
};

export function moduleBySlug(slug: string) {
  return MODULES.find((m) => m.slug === slug) ?? null;
}
