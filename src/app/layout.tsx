import { ViewTransitions } from "next-view-transitions";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});
export const metadata: Metadata = {
  title: "VacationSaga Dashboard",
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
              "light",
              // "green",
              // "blue",
              // "violet",
              // "slate",
              // "yellow",
              // "stone",
              // "gray",
              // "neutral",
              // "red",
              // "zinc",
            ]}
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
          <Toaster />
        </body>
      </html>
    </ViewTransitions>
  );
}
