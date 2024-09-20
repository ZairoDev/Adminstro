import type { Metadata } from "next";
import { UserRoleProvider } from "@/context/UserRoleContext";
import { ThemeProvider } from "@/components/theme-provider";
import { Inter, Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Adminsto Dashboard",
  description: "Created for internale use only",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          themes={[
            "orange",
            "rose",
            "dark",
            "light",
            "green",
            "blue",
            "violet",
            "slate",
            "yellow",
            "stone",
            "gray",
            "neutral",
            "red",
            "zinc"
          ]}
          disableTransitionOnChange
        >
          <UserRoleProvider>{children}</UserRoleProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
