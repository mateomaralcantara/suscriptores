"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "growth-theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const isLight = () => document.documentElement.classList.contains("light");

export function ThemeToggle() {
  const light = useSyncExternalStore(subscribe, isLight, () => false);

  function toggle() {
    const next = !light;
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "light" : "dark");
    } catch {
      // Storage may be unavailable (private mode); the theme still applies for this visit.
    }
  }

  return (
    <button className="btn small" onClick={toggle} type="button" aria-label="Cambiar tema">
      {light ? "🌙 Oscuro" : "☀️ Claro"}
    </button>
  );
}
