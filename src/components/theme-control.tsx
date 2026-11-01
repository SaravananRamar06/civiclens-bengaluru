"use client";
import { useLayoutEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  isThemePreference,
  THEME_KEY,
  type ThemePreference,
} from "@/lib/theme";

const options = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;
function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return isThemePreference(value) ? value : "system";
  } catch {
    return "system";
  }
}
function applyPreference(preference: ThemePreference) {
  const root = document.documentElement;
  const resolved =
    preference === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preference;
  root.dataset.themePreference = preference;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
}
export default function ThemeControl() {
  const [preference, setPreference] = useState<ThemePreference>("system");
  useLayoutEffect(() => {
    const sync = () => {
      const next = readPreference();
      setPreference(next);
      applyPreference(next);
    };
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (document.documentElement.dataset.themePreference === "system")
        applyPreference("system");
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) sync();
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const choose = (value: ThemePreference) => {
    setPreference(value);
    applyPreference(value);
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch {
      /* Theme still works when storage is unavailable. */
    }
  };
  const Current = options.find((option) => option.value === preference)!.Icon;
  return (
    <>
      <div className="theme-control" role="group" aria-label="Appearance">
        {options.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            className="theme-option"
            aria-label={`${label} theme`}
            aria-pressed={preference === value}
            title={`${label} theme`}
            onClick={() => choose(value)}
          >
            <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
          </button>
        ))}
      </div>
      <label className="theme-compact">
        <span className="sr-only">Appearance</span>
        <Current size={18} strokeWidth={1.7} aria-hidden="true" />
        <select
          value={preference}
          onChange={(event) => choose(event.target.value as ThemePreference)}
        >
          {options.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
