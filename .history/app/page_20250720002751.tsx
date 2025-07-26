export default function Home() {
  return (
    <section>
      <h2 className="text-2xl font-bold mb-6">Main Field</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow hover:shadow-md transition">
          <h3 className="text-lg font-semibold mb-2">Total Devices</h3>
          <p className="text-3xl font-bold text-blue-600">42</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow hover:shadow-md transition">
          <h3 className="text-lg font-semibold mb-2">Active Alerts</h3>
          <p className="text-3xl font-bold text-red-500">3</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow hover:shadow-md transition">
          <h3 className="text-lg font-semibold mb-2">Uptime</h3>
          <p className="text-3xl font-bold text-green-500">99.98%</p>
        </div>
      </div>
    </section>
  );
}
