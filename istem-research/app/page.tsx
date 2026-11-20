import Link from "next/link";
import { Brand } from "@/components/Brand";

const PRINCIPLES = [
  ["Cada dato tiene una fuente", "Toda cifra conserva su origen, fecha, licencia y método de obtención."],
  ["Cada conclusión tiene una metodología", "No se publica un margen de error probabilístico para una muestra voluntaria, ni se presenta la conversación digital como opinión de toda una población."],
  ["Cada agente tiene supervisión", "La IA amplía la capacidad de investigación, pero no fabrica entrevistas ni sustituye la evidencia. Las acciones sensibles requieren aprobación humana."],
  ["Cada resultado puede auditarse", "Las acciones quedan en un registro encadenado con SHA-256 que permite detectar alteraciones."],
];

export default function Home() {
  return (
    <div className="public">
      <header>
        <Brand />
        <div className="form-actions">
          <Link className="btn" href="/login">Iniciar sesión</Link>
          <Link className="btn primary" href="/register">Crear cuenta</Link>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="eyebrow">Inteligencia · Investigación · Estudios de opinión · Tecnología</div>
          <h1>Investigamos la realidad. Transformamos los datos en conocimiento.</h1>
          <p className="lead">
            Plataforma para diseñar, ejecutar y auditar investigaciones científicas: encuestas, muestreo, inteligencia digital autorizada,
            encuesta de encuestas y análisis estadístico, con trazabilidad completa.
          </p>
          <div className="form-actions">
            <Link className="btn primary" href="/register">Comenzar</Link>
            <Link className="btn" href="/login">Ya tengo cuenta</Link>
          </div>
        </section>
        <section className="principles grid cols-2" aria-label="Principios">
          {PRINCIPLES.map(([title, text]) => (
            <article className="card" key={title}>
              <h2>{title}</h2>
              <p className="muted">{text}</p>
            </article>
          ))}
        </section>
      </main>
      <footer>
        <span>ISTEM RESEARCH · versión 0.1 (fase 1: fundamentos)</span>
        <span>Datos de demostración, si los hay, se identifican como ficticios.</span>
      </footer>
    </div>
  );
}
