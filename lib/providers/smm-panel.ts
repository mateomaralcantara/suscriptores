// External provider client. NOT wired into any route: the app runs in sandbox mode.
// Do not connect it without explicit approval (see CLAUDE.md).

function getConfig() {
  const url = process.env.SMM_PANEL_API_URL;
  const key = process.env.SMM_PANEL_API_KEY;
  if (!url || !key) throw new Error("SMM_PANEL_API_URL y SMM_PANEL_API_KEY no están configuradas.");
  return { url, key };
}

async function callSmmPanel(params: Record<string, string | number>) {
  const { url, key } = getConfig();
  const body = new URLSearchParams({ key });
  for (const [name, value] of Object.entries(params)) body.set(name, String(value));

  const res = await fetch(url, { method: "POST", body, cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`SMM Panel API error: ${res.status}`);
  return res.json();
}
export async function getSmmServices() {
  return callSmmPanel({
    action: "services",
  });
}

export async function createSmmOrder(input: {
  service: number;
  link: string;
  quantity: number;
}) {
  return callSmmPanel({
    action: "add",
    service: input.service,
    link: input.link,
    quantity: input.quantity,
  });
}

export async function getSmmOrderStatus(order: number) {
  return callSmmPanel({
    action: "status",
    order,
  });
}

export async function getSmmBalance() {
  return callSmmPanel({
    action: "balance",
  });
}