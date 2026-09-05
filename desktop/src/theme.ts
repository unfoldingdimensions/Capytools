/**
 * Theme, in ten lines instead of a dependency.
 *
 * next-themes is a React package that wants a provider and reads/writes its own
 * storage key; the app only needs to toggle one class and remember the choice.
 */
export type Theme = "light" | "dark" | "system";

const KEY = "capyexpense:theme";

export function readTheme(): Theme {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === "light" || raw === "dark" ? raw : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(theme: Theme): void {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode, disabled storage: the class is already set, which is what matters */
  }
}

/** Follow the OS while the user is on "system". Returns an unsubscribe. */
export function watchSystemTheme(get: () => Theme): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (get() === "system") applyTheme("system");
  };
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
