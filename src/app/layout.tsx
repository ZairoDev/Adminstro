import { ViewTransitions } from "next-view-transitions";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});
export const metadata: Metadata = {
  title: "Adminstro Portal",
  description: "Created for internal use only",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ViewTransitions>
      <html lang="en">
        <body className={poppins.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            themes={[
              // "orange",
              // "rose",
              "dark",
              // "light",
              // "green",
              // "blue",
              // "violet",
              // "slate",
              // "yellow",
              // "stone",
              "gray",
              // "neutral",
              // "red",
              // "zinc",
            ]}
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
          <Toaster />
          <SonnerToaster position="top-right" richColors />
        </body>
      </html>
    </ViewTransitions>
  );
}
