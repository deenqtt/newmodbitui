"use client";

import { useState } from "react";
import { Home, Settings, Monitor } from "lucide-react";

export default function Sidebar() {
  const [active, setActive] = useState("Dashboard");

  const navItems = [
    { name: "Dashboard", icon: <Home size={18} /> },
    { name: "Devices", icon: <Monitor size={18} /> },
    { name: "Settings", icon: <Settings size={18} /> },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col p-6">
      <h2 className="text-2xl font-bold mb-8 tracking-tight">MODbit</h2>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => setActive(item.name)}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition ${
              active === item.name
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-800 text-gray-300"
            }`}
          >
            {item.icon}
            {item.name}
          </button>
        ))}
      </nav>
    </aside>
  );
}
