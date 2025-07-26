import "./globals.css";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

export const metadata = {
  title: "Modbo Monitoring",
  description: "Monitoring System for MODbit",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-gray-100 text-gray-800">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
