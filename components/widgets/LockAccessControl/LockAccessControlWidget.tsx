// Lokasi: components/widgets/LockAccessControl/LockAccessControlWidget.tsx
"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, Loader2, KeyRound, Lock } from "lucide-react";
import Swal from "sweetalert2";
import { Toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";

// Tipe data untuk controller, tidak ada perubahan
type Controller = {
  id: string;
  name: string;
  status: string;
  doorStatus: number[]; // Tetap ada, tapi tidak kita gunakan di UI
  lockAddresses: number[]; // e.g., [2, 4]
};

// Tipe untuk props konfigurasi widget, tidak ada perubahan
type WidgetConfig = {
  title: string;
  controllerId: string;
};

export function LockAccessControlWidget({ config }: { config: WidgetConfig }) {
  const [controller, setController] = useState<Controller | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config?.controllerId) {
      setIsLoading(false);
      setError("Widget not configured.");
      return;
    }

    const fetchControllerData = async () => {
      try {
        const response = await fetch(
          `/api/devices/access-controllers/${config.controllerId}`
        );
        if (!response.ok) throw new Error("Controller not found.");
        const data: Controller = await response.json();
        setController(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setController(null);
      } finally {
        if (isLoading) setIsLoading(false);
      }
    };

    fetchControllerData();
    const interval = setInterval(fetchControllerData, 5000);
    return () => clearInterval(interval);
  }, [config.controllerId, isLoading]);

  // --- FUNGSI BARU UNTUK REMOTE OPEN LANGSUNG ---
  // Fungsi ini lebih sederhana dan dipanggil oleh setiap tombol
  const handleDirectRemoteOpen = async (lockAddress: number) => {
    if (!controller) return;

    // Tampilkan dialog konfirmasi sebelum mengirim perintah
    const confirmation = await Swal.fire({
      title: "Confirm Unlock",
      text: `Are you sure you want to open Lock Address ${lockAddress}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Open It!",
      cancelButtonText: "Cancel",
    });

    if (confirmation.isConfirmed) {
      try {
        const response = await fetch(
          `/api/devices/access-controllers/${controller.id}/remote-open`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lockAddress }), // Langsung gunakan alamat dari parameter
          }
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Failed to send command");
        Toast.fire({ icon: "success", title: "Unlock command sent!" });
      } catch (err: any) {
        Toast.fire({ icon: "error", title: `Error: ${err.message}` });
      }
    }
  };

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

    return (
      <div className="p-4 h-full flex flex-col">
        {/* Header Widget (Tidak berubah) */}
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

        {/* --- BAGIAN YANG DIUBAH --- */}
        {/* Sekarang menampilkan daftar tombol unlock, bukan status pintu */}
        <div className="flex-grow space-y-2 overflow-y-auto">
          <p className="text-sm font-medium text-gray-600 mb-2">
            Detected Locks:
          </p>
          {controller.lockAddresses && controller.lockAddresses.length > 0 ? (
            controller.lockAddresses.map((address) => (
              <Button
                key={address}
                onClick={() => handleDirectRemoteOpen(address)}
                disabled={controller.status !== "online"}
                variant="outline"
                className="w-full justify-start text-left"
              >
                <KeyRound size={16} className="mr-3 flex-shrink-0" />
                <span className="flex-grow">Unlock Lock Address {address}</span>
              </Button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-4 bg-gray-50 rounded-lg h-full">
              <Lock size={24} className="text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-500">
                No locks detected on this controller.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return <>{renderContent()}</>;
}
