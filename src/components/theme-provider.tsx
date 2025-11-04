"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class" // 👈 Required for Tailwind's dark mode
      defaultTheme="light" // 👈 Light theme will always be default
      enableSystem={true} // 👈 Keep system theme option
      themes={["light", "dark", "system"]} // 👈 Explicitly define available themes
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
