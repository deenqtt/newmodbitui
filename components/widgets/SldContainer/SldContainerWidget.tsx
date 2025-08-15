// File: components/widgets/SldContainer/SldContainerWidget.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Zap } from "lucide-react";

// Tipe untuk data status dummy
interface SldStatus {
  mainPower: boolean;
  gensetPower: boolean;
  breaker1: boolean;
  breaker2: boolean;
  outputLoad: number;
}

interface Props {
  config: {
    widgetTitle: string;
    // bindings akan berisi: { mainPower: 'log_1', gensetPower: 'log_2', ... }
    bindings: Record<string, string | null>;
  };
}

export const SldContainerWidget = ({ config }: Props) => {
  // --- DATA DUMMY & LOGIKA SIMULASI ---
  const [statuses, setStatuses] = useState<SldStatus>({
    mainPower: true,
    gensetPower: false,
    breaker1: true,
    breaker2: false,
    outputLoad: 15.7,
  });

  useEffect(() => {
    // Timer ini akan mengubah status secara acak setiap 3 detik
    const intervalId = setInterval(() => {
      setStatuses({
        mainPower: Math.random() > 0.3, // 70% chance to be ON
        gensetPower: Math.random() > 0.8, // 20% chance to be ON
        breaker1: Math.random() > 0.5,
        breaker2: Math.random() > 0.5,
        outputLoad: Math.random() * 50, // Beban acak antara 0-50
      });
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);
  // --- AKHIR DATA DUMMY ---

  // Helper untuk menentukan warna berdasarkan status
  const getStatusColor = (isActive: boolean) =>
    isActive ? "#22c55e" : "#ef4444"; // Hijau atau Merah

  return (
    <div className="w-full h-full flex flex-col p-4 cursor-move">
      <div className="flex items-center text-sm font-semibold mb-2">
        <Zap className="h-4 w-4 mr-2" />
        <h3 className="truncate">{config.widgetTitle}</h3>
      </div>
      <div className="w-full flex-1 flex items-center justify-center">
        {/* --- INI ADALAH GAMBAR DIAGRAM SVG --- */}
        <svg
          viewBox="0 0 400 300"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Garis & Teks */}
          <text x="20" y="30" fill="gray" fontSize="12">
            Main Power
          </text>
          <line
            x1="60"
            y1="50"
            x2="60"
            y2="130"
            stroke={getStatusColor(statuses.mainPower)}
            strokeWidth="4"
          />

          <text x="310" y="30" fill="gray" fontSize="12">
            Genset
          </text>
          <line
            x1="340"
            y1="50"
            x2="340"
            y2="130"
            stroke={getStatusColor(statuses.gensetPower)}
            strokeWidth="4"
          />

          {/* Panel Transfer */}
          <rect
            x="100"
            y="130"
            width="200"
            height="40"
            fill="#f1f5f9"
            stroke="#cbd5e1"
          />
          <text x="165" y="155" fill="black" fontSize="14">
            ATS PANEL
          </text>
          <line
            x1="60"
            y1="150"
            x2="100"
            y2="150"
            stroke={getStatusColor(statuses.mainPower)}
            strokeWidth="4"
          />
          <line
            x1="300"
            y1="150"
            x2="340"
            y2="150"
            stroke={getStatusColor(statuses.gensetPower)}
            strokeWidth="4"
          />

          {/* Output dari Panel */}
          <line
            x1="200"
            y1="170"
            x2="200"
            y2="200"
            stroke={getStatusColor(statuses.mainPower || statuses.gensetPower)}
            strokeWidth="4"
          />

          {/* Breakers */}
          <rect
            x="80"
            y="200"
            width="80"
            height="30"
            fill={getStatusColor(statuses.breaker1)}
            rx="5"
          />
          <text x="100" y="220" fill="white" fontSize="12">
            Breaker 1
          </text>

          <rect
            x="240"
            y="200"
            width="80"
            height="30"
            fill={getStatusColor(statuses.breaker2)}
            rx="5"
          />
          <text x="260" y="220" fill="white" fontSize="12">
            Breaker 2
          </text>

          <line
            x1="120"
            y1="200"
            x2="200"
            y2="200"
            stroke={getStatusColor(statuses.mainPower || statuses.gensetPower)}
            strokeWidth="4"
          />
          <line
            x1="200"
            y1="200"
            x2="280"
            y2="200"
            stroke={getStatusColor(statuses.mainPower || statuses.gensetPower)}
            strokeWidth="4"
          />

          {/* Output Load */}
          <rect
            x="150"
            y="260"
            width="100"
            height="30"
            fill="#e2e8f0"
            stroke="#94a3b8"
          />
          <text x="160" y="280" fill="#1e293b" fontSize="14" fontWeight="bold">
            Load: {statuses.outputLoad.toFixed(1)} kW
          </text>
        </svg>
      </div>
    </div>
  );
};
