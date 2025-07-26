// app/components/Header.tsx
export default function Header() {
  return (
    <header className="bg-white shadow p-4 flex justify-between items-center">
      <h1 className="text-xl font-semibold text-gray-800">Modbo Monitoring</h1>
      <div className="text-sm text-gray-500">Welcome, Admin</div>
    </header>
  );
}
