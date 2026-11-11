import { authenticate, handle, json } from "@/lib/api";
import { getStore } from "@/lib/store";

/** Issues a new API key and invalidates the previous one. The key is shown only once. */
export const POST = handle(async (request) => {
  const user = await authenticate(request);
  return json({ success: true, apiKey: getStore().rotateApiKey(user.id) }, { status: 201 });
});
