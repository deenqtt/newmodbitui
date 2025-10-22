// File: components/widgets/CameraSnapshot/CameraSnapshotWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  CameraOff,
  Loader2,
  Camera,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Props {
  config: {
    widgetTitle: string;
    cctvId: string;
  };
}

export const CameraSnapshotWidget = ({ config }: Props) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [connectionStatus] = useState<"Connected" | "Disconnected">(
    "Connected"
  );
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Responsive system - SAMA SEPERTI WIDGET LAIN
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 12,
    iconSize: 48,
    padding: 16,
    headerHeight: 40,
  });

  // RESPONSIVE CALCULATION - SAMA dengan IconStatusCard
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      setDimensions({ width: w, height: h });

      // Calculate header height - SAMA dengan IconStatusCard
      const headerHeight = Math.max(36, Math.min(h * 0.25, 56));
      const availableHeight = h - headerHeight;

      // Dynamic sizing
      const baseSize = Math.sqrt(w * h);

      setDynamicSizes({
        titleFontSize: Math.max(11, Math.min(headerHeight * 0.35, 16)),
        iconSize: Math.max(32, Math.min(baseSize * 0.12, 64)),
        padding: Math.max(12, Math.min(baseSize * 0.05, 20)),
        headerHeight,
      });
    };

    updateLayout();
    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Update image with auto-refresh
  useEffect(() => {
    if (!config.cctvId) {
      setStatus("error");
      return;
    }

    const updateImage = () => {
      setStatus("loading");

      // API endpoint dinamis dengan cache busting
      const newUrl = `/api/cctv/${
        config.cctvId
      }/snapshot?t=${new Date().getTime()}`;

      setImageUrl(newUrl);
      setStatus("ok");
      setLastUpdate(new Date());
    };

    updateImage(); // Initial load

    const intervalId = setInterval(updateImage, 10000); // Refresh setiap 10 detik

    return () => clearInterval(intervalId);
  }, [config.cctvId]);

  // Status styling - KONSISTEN DENGAN WIDGET LAIN
  const getStatusStyles = () => {
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
    };

    switch (status) {
      case "ok":
        return {
          ...baseStyles,
          indicator: "bg-emerald-500 dark:bg-emerald-500",
          pulse: false,
        };
      case "error":
        return {
          ...baseStyles,
          indicator: "bg-red-500 dark:bg-red-500",
          pulse: false,
          title: "text-red-600 dark:text-red-400",
        };
      case "loading":
        return {
          ...baseStyles,
          indicator: "bg-amber-500 dark:bg-amber-500",
          pulse: true,
        };
      default:
        return {
          ...baseStyles,
          indicator: "bg-slate-400 dark:bg-slate-500",
          pulse: false,
        };
    }
  };

  // Format time untuk last update
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 30000) return "now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Render content based on state
  const renderContent = () => {
    // Error state
    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <CameraOff
            className="text-red-500 dark:text-red-400"
            style={{
              width: dynamicSizes.iconSize,
              height: dynamicSizes.iconSize,
            }}
          />
          <p
            className="font-medium text-red-600 dark:text-red-400"
            style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
          >
            Image not available
          </p>
        </div>
      );
    }

    // Loading state (first load only)
    if (status === "loading" && !imageUrl) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <Loader2
            className="animate-spin text-slate-400 dark:text-slate-500"
            style={{
              width: dynamicSizes.iconSize,
              height: dynamicSizes.iconSize,
            }}
          />
          <p
            className="font-medium text-slate-600 dark:text-slate-400"
            style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
          >
            Loading snapshot...
          </p>
        </div>
      );
    }

    // Success state - show image
    if (imageUrl) {
      return (
        <div className="relative w-full h-full">
          <Image
            src={imageUrl}
            alt={config.widgetTitle}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ objectFit: "contain" }}
            onError={() => setStatus("error")}
            unoptimized // Cache busting dengan parameter ?t=
            priority
          />

          {/* Overlay info saat loading refresh */}
          {status === "loading" && (
            <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1.5">
              <RefreshCw
                className="text-white animate-spin"
                style={{ width: 12, height: 12 }}
              />
              <span className="text-white text-xs font-medium">
                Refreshing...
              </span>
            </div>
          )}

          {/* Last update timestamp */}
          {lastUpdate && status === "ok" && (
            <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
              <span className="text-white text-xs font-medium">
                {formatTime(lastUpdate)}
              </span>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const styles = getStatusStyles();

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-card dark:bg-card 
                 border border-border/60 dark:border-border/40 
                 rounded-xl shadow-sm hover:shadow-md 
                 transition-all duration-300 ease-out 
                 overflow-hidden group"
      style={{
        minWidth: 100,
        minHeight: 80,
      }}
    >
      {/* HEADER - Fixed position dengan pattern konsisten (TANPA z-index) */}
      <div
        className="absolute top-0 left-0 right-0 px-4
                   bg-slate-50/50 dark:bg-slate-900/30 backdrop-blur-sm
                   flex items-center justify-between flex-shrink-0
                   border-b border-slate-200/40 dark:border-slate-700/40"
        style={{ height: `${dynamicSizes.headerHeight}px` }}
      >
        {/* Left: Icon + Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Camera
            className="text-slate-500 dark:text-slate-400 flex-shrink-0"
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 1.1, 14),
              height: Math.max(dynamicSizes.titleFontSize * 1.1, 14),
            }}
          />
          <h3
            className={cn(
              "font-medium truncate transition-colors duration-200",
              styles.title
            )}
            style={{
              fontSize: `${dynamicSizes.titleFontSize}px`,
              lineHeight: 1.3,
            }}
            title={config.widgetTitle}
          >
            {config.widgetTitle}
          </h3>
        </div>

        {/* Right: Status indicators - KONSISTEN DENGAN WIDGET LAIN */}
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {/* Wifi status icon */}
          {connectionStatus === "Connected" ? (
            <Wifi
              className="text-slate-400 dark:text-slate-500"
              style={{
                width: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
                height: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
              }}
            />
          ) : (
            <WifiOff
              className="text-slate-400 dark:text-slate-500"
              style={{
                width: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
                height: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
              }}
            />
          )}

          {/* Status indicator dot */}
          <div
            className={cn(
              "rounded-full transition-all duration-300",
              styles.indicator,
              styles.pulse ? "animate-pulse" : ""
            )}
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
              height: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
            }}
          />
        </div>
      </div>

      {/* CONTENT - with proper spacing from header */}
      <div
        className="w-full h-full bg-slate-900/5 dark:bg-slate-950/20"
        style={{
          paddingTop: dynamicSizes.headerHeight,
        }}
      >
        {renderContent()}
      </div>

      {/* Minimal hover effect - KONSISTEN DENGAN WIDGET LAIN */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 dark:from-slate-900/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
