# 03 · Matriz de permisos (RBAC)

Roles de sistema (configurables por organización copiando y editando un rol base):

| Rol | Ámbito | Resumen |
|---|---|---|
| **SA** Superadministrador | Plataforma | Todo, incluida la gestión de administradores de plataforma. Cuenta de emergencia con MFA físico (WebAuthn). |
| **PA** Administrador de plataforma | Plataforma | Opera nodos, telefonía, correo y clientes. No modifica a SA ni borra auditoría. |
| **OA** Administrador de organización | Su organización | Gestiona usuarios, recursos y facturación de su organización. |
| **SU** Supervisor | Su organización | Ve todo en su organización, opera dispositivos y llamadas, no gestiona usuarios ni pagos. |
| **OP** Operador | Recursos asignados | Usa los dispositivos/extensiones que se le asignan. |
| **US** Usuario | Lo propio | Su buzón, su extensión, sus sesiones. |
| **AU** Auditor | Organización o plataforma | Solo lectura, incluida auditoría. Ninguna acción. |

Leyenda: ✅ permitido · 👁 solo lectura · 🔸 solo recursos asignados/propios · ⚠ requiere MFA reciente
(≤ 10 min) · — denegado. Para OA/SU/OP/US/AU todo se limita a **su organización**.

| Permiso | SA | PA | OA | SU | OP | US | AU |
|---|---|---|---|---|---|---|---|
| `org.create` / `org.suspend` | ✅⚠ | ✅⚠ | — | — | — | — | — |
| `org.read` | ✅ | ✅ | 👁 | 👁 | — | — | 👁 |
| `member.invite` / `member.role.change` | ✅ | ✅ | ✅⚠ | — | — | — | — |
| `role.edit` | ✅⚠ | ✅⚠ | ✅⚠ (roles propios) | — | — | — | — |
| `audit.read` | ✅ | ✅ | ✅ | 👁 | — | — | ✅ |
| `node.register` / `node.drain` | ✅⚠ | ✅⚠ | — | — | — | — | — |
| `node.read` (capacidad, salud) | ✅ | ✅ | — | — | — | — | 👁 |
| `device.create` / `device.delete` | ✅ | ✅ | ✅ (⚠ borrar) | — | — | — | — |
| `device.read` | ✅ | ✅ | ✅ | ✅ | 🔸 | 🔸 | 👁 |
| `device.power` (encender/apagar/reiniciar) | ✅ | ✅ | ✅ | ✅ | 🔸 | — | — |
| `device.session.control` | ✅ | ✅ | ✅ | ✅ | 🔸 | 🔸 | — |
| `device.app.install` | ✅ | ✅ | ✅ | ✅ | — | — | — |
| `device.app.approve` (catálogo APK) | ✅ | ✅ | ✅⚠ | — | — | — | — |
| `device.snapshot.restore` | ✅ | ✅ | ✅⚠ | — | — | — | — |
| `device.lock` / `device.assign` | ✅ | ✅ | ✅ | ✅ | — | — | — |
| `extension.create` / `extension.delete` | ✅ | ✅ | ✅ | — | — | — | — |
| `extension.read` | ✅ | ✅ | ✅ | ✅ | 🔸 | 🔸 | 👁 |
| `call_route.edit` | ✅ | ✅ | ✅⚠ | — | — | — | — |
| `outbound.international.enable` | ✅⚠ | ✅⚠ | — (lo solicita) | — | — | — | — |
| `call_records.read` | ✅ | ✅ | ✅ | ✅ | 🔸 | 🔸 | 👁 |
| `recording.listen` | ✅⚠ | — | ✅⚠ | ✅⚠ | — | — | — |
| `trunk.manage` / `number.assign` | ✅⚠ | ✅⚠ | — | — | — | — | — |
| `mail_domain.add` | ✅ | ✅ | ✅ | — | — | — | — |
| `mailbox.create` / `suspend` / `delete` | ✅ | ✅ | ✅ (⚠ borrar) | — | — | — | — |
| `mailbox.password.reset` | ✅⚠ | ✅⚠ | ✅⚠ | — | — | 🔸⚠ | — |
| `mailbox.read_content` | — | — | — | — | — | 🔸 | — |
| `identity.create` / `identity.link` | ✅ | ✅ | ✅ | ✅ | — | — | — |
| `identity.recovery.approve` | ✅⚠ | ✅⚠ | ✅⚠ | — | — | — | — |
| `identity.sessions.revoke` | ✅ | ✅ | ✅ | ✅ | — | 🔸 | — |
| `network.profile.edit` | ✅ | ✅ | ✅ | — | — | — | — |
| `network.dedicated_ip.assign` | ✅⚠ | ✅⚠ | — | — | — | — | — |
| `billing.read` | ✅ | ✅ | ✅ | — | — | — | 👁 |
| `billing.plan.change` / `payment.method` | ✅ | ✅ | ✅⚠ | — | — | — | — |
| `pricing.edit` | ✅⚠ | ✅⚠ | — | — | — | — | — |
| `pricing.below_cost.approve` | ✅⚠ | — | — | — | — | — | — |
| `api_key.create` / `revoke` | ✅ | ✅ | ✅⚠ | — | — | — | — |
| `whatsapp_biz.manage` | ✅ | ✅ | ✅ | ✅ | 🔸 (conversaciones asignadas) | — | 👁 |
| `ai.action.execute` | según permiso de la acción subyacente + confirmación humana en acciones sensibles | | | | | | |

Notas:

- **Nadie** (ni SA) lee el contenido de buzones ajenos desde el panel. El acceso a contenido por
  requerimiento legal es un procedimiento fuera de banda, con doble aprobación y registro.
- Las **API keys** heredan un subconjunto explícito de permisos (`scopes`), nunca más que el creador.
- El agente de IA actúa con la identidad y permisos de quien lo invoca, nunca con service role.
- Toda acción ✅ que cambie estado queda en `audit_logs`.
