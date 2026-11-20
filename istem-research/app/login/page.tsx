import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { Brand } from "@/components/Brand";
import { isSupabaseConfigured } from "@/lib/supabase";

export const metadata: Metadata = { title: "Iniciar sesión" };
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="public">
      <header><Brand /></header>
      <main className="auth-wrap">
        <h1>Iniciar sesión</h1>
        {!isSupabaseConfigured() ? (
          <div className="alert advertencia" role="alert">
            <strong>Servicio no configurado</strong>
            Defina SUPABASE_URL y SUPABASE_ANON_KEY (ver .env.example) para habilitar el acceso.
          </div>
        ) : null}
        <Suspense>
          <AuthForm kind="login" />
        </Suspense>
        <p className="small"><Link href="/forgot-password">¿Olvidaste tu contraseña?</Link> · <Link href="/register">Crear cuenta</Link></p>
      </main>
    </div>
  );
}
