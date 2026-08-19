"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the app is in dark mode, driven directly by the `dark` class that
 * next-themes toggles on <html>. Built on useSyncExternalStore so it re-renders
 * the instant the theme switches (the header toggle changes this exact class).
 * More reliable than next-themes' resolvedTheme here, which did not re-render
 * consumers in this build.
 */
const subscribe = (callback: () => void) => {
  const el = document.documentElement;
  const mo = new MutationObserver(callback);
  mo.observe(el, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
};

const getSnapshot = () => document.documentElement.classList.contains("dark");

const getServerSnapshot = () => false;

export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
