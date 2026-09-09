"use client";

import { FormEvent, useMemo, useState } from "react";
import { services } from "@/lib/demo-data";

export type FormKind = "order" | "bulk" | "funds" | "ticket" | "panel" | "login" | "register" | "forgot" | "settings";

export function SandboxForm({ kind }: { kind: FormKind }) {
  const [message, setMessage] = useState("");
  const [quantity, setQuantity] = useState(100);
  const selected = useMemo(() => services[0], []);
  const cost = ((selected.userPrice * quantity) / 100).toFixed(2);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const labels: Record<FormKind, string> = {
      order: `Pedido sandbox creado por US$${cost}.`,
      bulk: "Lote validado: 3 filas listas para la cola sandbox.",
      funds: "Depósito sandbox registrado como pendiente.",
      ticket: "Ticket de demostración creado correctamente.",
      panel: "Solicitud de panel secundario registrada.",
      login: "Sesión demo iniciada. Usa el enlace al dashboard.",
      register: "Cuenta demo registrada para evaluación.",
      forgot: "Correo de recuperación simulado enviado.",
      settings: "Configuración guardada localmente en modo demo.",
    };
    setMessage(labels[kind]);
  }

  return (
    <form className="card form-card" onSubmit={submit}>
      {kind === "order" ? <div className="form-grid">
        <div className="field full"><label>Servicio</label><select defaultValue={selected.id}>{services.slice(0, 12).map((service) => <option value={service.id} key={service.id}>{service.id} · {service.name}</option>)}</select></div>
        <div className="field full"><label>Objetivo o URL</label><input required type="url" defaultValue="https://example.com/campaign/demo" /></div>
        <div className="field"><label>Cantidad</label><input min={10} max={10000} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} type="number" /></div>
        <div className="field"><label>Costo estimado</label><input readOnly value={`US$${cost}`} /></div>
        <div className="field"><label>Número de publicaciones</label><input defaultValue="1" min="1" type="number" /></div>
        <div className="field"><label>Intervalo</label><select><option>Sin drip-feed</option><option>30 minutos</option><option>1 hora</option></select></div>
        <div className="field full"><label>Comentarios opcionales</label><textarea placeholder="Notas internas del pedido" /></div>
      </div> : null}

      {kind === "bulk" ? <div className="form-grid">
        <div className="field full"><label>Pedidos por línea</label><textarea defaultValue={`demo-service-001,https://example.com/a,100\ndemo-service-002,https://example.com/b,250\ndemo-service-003,https://example.com/c,500`} /></div>
        <div className="field"><label>Formato</label><select><option>CSV manual</option><option>Copiado desde Excel</option><option>Plantilla XLSX</option></select></div>
        <div className="field"><label>Concurrencia</label><input type="number" min="1" max="20" defaultValue="5" /></div>
      </div> : null}

      {kind === "funds" ? <div className="form-grid">
        <div className="field"><label>Monto</label><input type="number" min="10" defaultValue="100" /></div>
        <div className="field"><label>Moneda</label><select><option>USD</option><option>DOP</option><option>EUR</option><option>GBP</option></select></div>
        <div className="field"><label>Método sandbox</label><select><option>Stripe Test Mode</option><option>Tarjeta sandbox</option><option>Transferencia simulada</option><option>Crédito administrativo</option></select></div>
        <div className="field"><label>Bono demo</label><input readOnly value="4% para US$100" /></div>
        <div className="field full"><label>Referencia</label><input defaultValue="PAY-DEMO-0001" /></div>
      </div> : null}

      {kind === "ticket" ? <div className="form-grid">
        <div className="field"><label>Categoría</label><select><option>Pagos</option><option>Pedidos</option><option>API</option><option>Refill</option><option>Seguridad</option></select></div>
        <div className="field"><label>Prioridad</label><select><option>Baja</option><option>Media</option><option>Alta</option></select></div>
        <div className="field full"><label>Asunto</label><input required placeholder="Describe brevemente el problema" /></div>
        <div className="field full"><label>Mensaje</label><textarea required placeholder="Incluye los detalles necesarios" /></div>
      </div> : null}

      {kind === "panel" ? <div className="form-grid">
        <div className="field"><label>Nombre del panel</label><input defaultValue="Mi Growth Lab" /></div>
        <div className="field"><label>Subdominio</label><input defaultValue="mi-panel.demo.local" /></div>
        <div className="field"><label>Idioma</label><select><option>Español</option><option>English</option></select></div>
        <div className="field"><label>Moneda</label><select><option>USD</option><option>DOP</option><option>EUR</option></select></div>
        <div className="field"><label>Margen global</label><input type="number" defaultValue="35" /></div>
        <div className="field"><label>Plan demo</label><select><option>Reseller</option><option>Reseller Pro</option><option>Enterprise</option></select></div>
      </div> : null}

      {kind === "login" ? <div className="form-grid">
        <div className="field full"><label>Correo</label><input type="email" defaultValue="admin@classroom.local" /></div>
        <div className="field full"><label>Contraseña</label><input type="password" defaultValue="DemoAdmin123!" /></div>
      </div> : null}

      {kind === "register" ? <div className="form-grid">
        <div className="field full"><label>Nombre completo</label><input required defaultValue="Usuario Demo" /></div>
        <div className="field full"><label>Correo</label><input required type="email" defaultValue="nuevo@classroom.local" /></div>
        <div className="field full"><label>Contraseña</label><input required type="password" defaultValue="DemoUser123!" /></div>
      </div> : null}

      {kind === "forgot" ? <div className="form-grid"><div className="field full"><label>Correo registrado</label><input required type="email" defaultValue="student@classroom.local" /></div></div> : null}

      {kind === "settings" ? <div className="form-grid">
        <div className="field"><label>Idioma</label><select><option>Español</option><option>English</option></select></div>
        <div className="field"><label>Moneda</label><select><option>USD</option><option>DOP</option><option>EUR</option><option>GBP</option></select></div>
        <div className="field"><label>Zona horaria</label><select><option>America/Santo_Domingo</option><option>UTC</option></select></div>
        <div className="field"><label>Autenticación 2FA</label><select><option>Desactivada en demo</option><option>Solicitar activación</option></select></div>
        <div className="field full"><label>Notificaciones</label><select><option>Todas</option><option>Solo críticas</option><option>Desactivadas</option></select></div>
      </div> : null}

      <div className="form-actions"><button className="btn primary" type="submit">Ejecutar en sandbox</button><button className="btn" type="reset" onClick={() => setMessage("")}>Limpiar</button></div>
      {message ? <div className="toast">✓ {message}</div> : null}
    </form>
  );
}
