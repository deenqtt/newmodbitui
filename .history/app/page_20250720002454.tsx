// app/page.tsx
export default function Home() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Main Field</h2>
      <div className="bg-white p-6 rounded shadow">
        <p>Ini adalah konten utama dari sistem monitoring.</p>
        {/* Nanti bisa ditambah card, table, grafik, dll */}
      </div>
    </div>
  );
}
