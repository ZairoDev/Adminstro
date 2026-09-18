"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

const ALLOWED_THEMES = ["light", "dark"] as const;

function ThemeMigration() {
  const { theme, setTheme } = useTheme();

  React.useEffect(() => {
    if (!theme) return;
    if (!ALLOWED_THEMES.includes(theme as (typeof ALLOWED_THEMES)[number])) {
      setTheme("light");
    }
  }, [theme, setTheme]);

  return null;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      {...props}
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      themes={[...ALLOWED_THEMES]}
      disableTransitionOnChange
    >
      <ThemeMigration />
      {children}
    </NextThemesProvider>
  );
}
