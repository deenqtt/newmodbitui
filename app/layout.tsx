import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { MenuProvider } from "@/contexts/MenuContext";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Modbo Monitoring",
  description: "Enterprise monitoring system for MODbit",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* AuthProvider membungkus semua halaman agar status login bisa diakses di mana saja */}
          <AuthProvider>
            <MenuProvider>
              {children}
            </MenuProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
