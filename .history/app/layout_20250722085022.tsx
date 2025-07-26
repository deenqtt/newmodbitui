import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext"; // Impor AuthProvider
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
    <html lang="en">
      <body className={inter.className}>
        {/* AuthProvider membungkus semua halaman agar status login bisa diakses di mana saja */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
