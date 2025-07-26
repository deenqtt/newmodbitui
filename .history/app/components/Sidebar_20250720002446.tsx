// app/components/Sidebar.tsx
export default function Sidebar() {
  return (
    <aside className="w-64 bg-blue-800 text-white h-screen p-4">
      <h2 className="text-2xl font-bold mb-6">Modbo</h2>
      <nav className="space-y-2">
        <a href="#" className="block px-2 py-1 hover:bg-blue-700 rounded">
          Dashboard
        </a>
        <a href="#" className="block px-2 py-1 hover:bg-blue-700 rounded">
          Devices
        </a>
        <a href="#" className="block px-2 py-1 hover:bg-blue-700 rounded">
          Settings
        </a>
      </nav>
    </aside>
  );
}
