// Lokasi: components/widgets/AccessControllerStatus/AccessControllerStatusWidget.tsx
// (Buat file baru di dalam folder yang sama dengan modal)
"use client";

import { useState, useEffect } from "react";
import { DoorOpen, DoorClosed, Wifi, WifiOff, Loader2 } from "lucide-react";

// Tipe data untuk controller
type Controller = {
  id: string;
  name: string;
  status: string;
  doorStatus: number[];
};

// Tipe untuk props konfigurasi widget yang diterima dari dashboard
type WidgetConfig = {
  title: string;
  controllerId: string;
};

export function AccessControllerStatusWidget({
  config,
}: {
  config: WidgetConfig;
}) {
  const [controller, setController] = useState<Controller | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Efek ini berjalan untuk mengambil dan memperbarui data controller
  useEffect(() => {
    // Jika widget belum dikonfigurasi (belum ada controller ID)
    if (!config?.controllerId) {
      setIsLoading(false);
      setError("Widget not configured.");
      return;
    }

    const fetchControllerData = async () => {
      try {
        // Panggil API untuk mendapatkan data satu controller berdasarkan ID dari config
        const response = await fetch(
          `/api/devices/access-controllers/${config.controllerId}`
        );
        if (!response.ok) {
          throw new Error("Controller not found or server error.");
        }
        const data: Controller = await response.json();
        setController(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setController(null);
      } finally {
        // Pastikan loading berhenti meskipun ada error
        if (isLoading) setIsLoading(false);
      }
    };

    fetchControllerData(); // Ambil data saat pertama kali render
    const interval = setInterval(fetchControllerData, 5000); // Set interval untuk refresh setiap 5 detik

    return () => clearInterval(interval); // Hentikan refresh saat widget tidak lagi ditampilkan
  }, [config.controllerId, isLoading]); // Jalankan ulang efek jika ID controller berubah

  // Fungsi untuk merender tampilan berdasarkan state (loading, error, atau sukses)
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="animate-spin text-gray-400" />
        </div>
      );
    }

    if (error || !controller) {
      return (
        <div className="p-4 text-center text-red-500">
          {error || "Controller data unavailable."}
        </div>
      );
    }

    // *** PERUBAHAN DI SINI ***
    // Buat variabel yang aman untuk di-render, pastikan selalu ada 4 elemen
    const displayDoorStatus =
      Array.isArray(controller.doorStatus) && controller.doorStatus.length > 0
        ? controller.doorStatus
        : [-1, -1, -1, -1];

    return (
      <div className="p-4 h-full flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-lg text-gray-800 break-all">
            {config.title || controller.name}
          </h3>
          <div
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              controller.status === "online"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {controller.status === "online" ? (
              <Wifi size={14} />
            ) : (
              <WifiOff size={14} />
            )}
            <span>{controller.status}</span>
          </div>
        </div>

        <div className="flex-grow grid grid-cols-2 gap-3">
          {/* Tampilkan status untuk 4 pintu */}
          {displayDoorStatus.map((status, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-gray-50 border text-center flex flex-col justify-center"
            >
              <p className="font-semibold text-gray-500">Door {index + 1}</p>
              {status === 1 ? (
                <DoorClosed
                  size={32}
                  className="mx-auto text-gray-700 my-1"
                  title="Closed"
                />
              ) : status === 0 ? (
                <DoorOpen
                  size={32}
                  className="mx-auto text-orange-500 my-1"
                  title="Open"
                />
              ) : (
                <DoorClosed
                  size={32}
                  className="mx-auto text-gray-300 my-1"
                  title="Unknown"
                />
              )}
              <p className="text-sm font-medium">
                {status === 1 ? "Closed" : status === 0 ? "Open" : "N/A"}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return <>{renderContent()}</>;
}
