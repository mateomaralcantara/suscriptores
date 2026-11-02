import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Growth Reseller Lab",
  description: "Plataforma SaaS sandbox para gestión de servicios digitales, pedidos y revendedores.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
