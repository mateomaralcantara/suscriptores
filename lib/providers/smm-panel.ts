const API_URL = process.env.SMM_PANEL_API_URL!;
const API_KEY = process.env.SMM_PANEL_API_KEY!;

async function callSmmPanel(params: Record<string, string | number>) {
  const body = new URLSearchParams();

  body.set("key", API_KEY);

  for (const [key, value] of Object.entries(params)) {
    body.set(key, String(value));
  }

  const res = await fetch(API_URL, {
    method: "POST",
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`SMM Panel API error: ${res.status}`);
  }

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