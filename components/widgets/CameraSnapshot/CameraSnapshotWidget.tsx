// File: components/widgets/CameraSnapshot/CameraSnapshotWidget.tsx
"use client";

import React, { useState, useEffect } from "react";
import { CameraOff, Loader2 } from "lucide-react"; // Tambahkan Loader2 untuk loading state
import Image from "next/image";

interface Props {
  config: {
    widgetTitle: string;
    cctvId: string;
  };
}

export const CameraSnapshotWidget = ({ config }: Props) => {
  // Ganti initial state menjadi null untuk menandakan "belum loading"
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!config.cctvId) {
      setError(true);
      return;
    }

    const updateImage = () => {
      // --- PERUBAHAN UTAMA DI SINI ---
      // Arahkan ke API endpoint dinamis, bukan ke file statis.
      const newUrl = `/api/cctv/${
        config.cctvId
      }/snapshot?t=${new Date().getTime()}`;

      setImageUrl(newUrl);
      setError(false); // Reset error state setiap kali mencoba refresh
    };

    updateImage(); // Panggil sekali saat komponen dimuat

    const intervalId = setInterval(updateImage, 10000); // Refresh setiap 10 detik

    return () => clearInterval(intervalId);
  }, [config.cctvId]);

  const renderContent = () => {
    if (error) {
      return (
        <div className="text-center text-muted-foreground">
          <CameraOff className="h-8 w-8 mx-auto mb-2 text-red-400" />
          <p className="text-xs">Image not available</p>
        </div>
      );
    }

    if (!imageUrl) {
      return (
        <div className="text-center text-muted-foreground">
          <Loader2 className="h-8 w-8 mx-auto animate-spin" />
        </div>
      );
    }

    return (
      <Image
        src={imageUrl}
        alt={config.widgetTitle}
        layout="fill"
        objectFit="contain"
        onError={() => setError(true)}
        unoptimized // Penting agar parameter '?t=' berfungsi untuk cache busting
      />
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-900/50 cursor-move rounded-lg overflow-hidden border border-white/10">
      <div className="p-2 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <p className="text-white text-sm font-semibold truncate">
          {config.widgetTitle}
        </p>
      </div>
      <div className="flex-1 relative flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};
