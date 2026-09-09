"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("growth-theme");
    if (stored === "light") {
      document.documentElement.classList.add("light");
      setLight(true);
    }
  }, []);
  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("growth-theme", next ? "light" : "dark");
  }
  return <button className="btn small" onClick={toggle} type="button" aria-label="Cambiar tema">{light ? "🌙 Oscuro" : "☀️ Claro"}</button>;
}
