// app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
import { AppSidebar } from "@/components/ui/app-sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Modbo Monitoring",
  description: "Dashboard Monitoring",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex-1 bg-gray-50 p-6">{children}</div>
        </div>
      </body>
    </html>
  );
}
