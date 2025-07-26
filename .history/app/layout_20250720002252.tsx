// app/layout.tsx
import './globals.css'
import Sidebar from './components/Sidebar'
import Header from './components/Header'

export const metadata = {
  title: 'Modbo Monitoring',
  description: 'Monitoring System for MODbit',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-col flex-1 bg-gray-50">
          <Header />
          <main className="p-6">{children}</main>
        </div>
      </body>
    </html>
  )
}
