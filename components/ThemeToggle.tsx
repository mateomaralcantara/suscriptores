"use client";

import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "growth-theme";
const CHANGE_EVENT = "growth-theme-change";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function isLightStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light";
  } catch {
    return false;
  }
}

export function ThemeToggle() {
  // The stored preference is the source of truth; the server always renders dark.
  const light = useSyncExternalStore(subscribe, isLightStored, () => false);

  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
  }, [light]);

  function toggle() {
    try {
      localStorage.setItem(STORAGE_KEY, light ? "dark" : "light");
    } catch {
      // Storage can be unavailable (private mode); the theme then stays as is.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return <button className="btn small" onClick={toggle} type="button" aria-label="Cambiar tema">{light ? "🌙 Oscuro" : "☀️ Claro"}</button>;
}
