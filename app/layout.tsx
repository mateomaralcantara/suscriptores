import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Growth Reseller Lab",
  description: "Plataforma SaaS sandbox para gestión de servicios digitales, pedidos y revendedores.",
};

// Applies the saved theme before first paint to avoid a flash of the wrong theme.
const themeScript = `try{if(localStorage.getItem("growth-theme")==="light")document.documentElement.classList.add("light")}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
