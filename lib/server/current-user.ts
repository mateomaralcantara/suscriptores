import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { SESSION_COOKIE, sessionSecret } from "@/lib/config";
import { getStore, toPublicUser, type PublicUser } from "@/lib/store";

/** Current user for server components, or null when there is no valid session. */
export async function currentUser(): Promise<PublicUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token, sessionSecret());
  const user = session ? getStore().getUser(session.uid) : undefined;
  return user ? toPublicUser(user) : null;
}

/** Same as currentUser, but sends anonymous visitors to the login page. */
export async function requireUser(): Promise<PublicUser> {
  return (await currentUser()) ?? redirect("/login");
}

/** Defence in depth for admin pages, on top of the proxy check. */
export async function requireAdmin(): Promise<PublicUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
