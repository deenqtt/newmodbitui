// File: components/widgets/AccessControllerStatus/AccessControllerStatusWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  DoorOpen,
  DoorClosed,
  Wifi,
  WifiOff,
  Loader2,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Tipe data untuk controller
type Controller = {
  id: string;
  name: string;
  status: string;
  doorStatus: number[];
};

// Tipe untuk props konfigurasi widget
type WidgetConfig = {
  title: string;
  controllerId: string;
};

export function AccessControllerStatusWidget({
  config,
  height,
}: {
  config: WidgetConfig;
  height: number;
}) {
  const [controller, setController] = useState<Controller | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Responsive system - SAMA SEPERTI WIDGET LAIN
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [layoutMode, setLayoutMode] = useState<"compact" | "normal" | "wide">(
    "normal"
  );
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 12,
    doorLabelFontSize: 11,
    doorStatusFontSize: 10,
    iconSize: 32,
    padding: 16,
    gap: 12,
    headerHeight: 40,
  });

  // RESPONSIVE CALCULATION - Enhanced version
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      setDimensions({ width: w, height: h });

      // Layout mode detection
      const aspectRatio = w / h;
      const minDimension = Math.min(w, h);

      if (w < 200 || h < 150) {
        setLayoutMode("compact");
      } else if (aspectRatio > 1.8 && w > 400) {
        setLayoutMode("wide");
      } else {
        setLayoutMode("normal");
      }

      // Calculate header height first
      const headerHeight = Math.max(36, Math.min(h * 0.12, 48));
      const availableHeight = h - headerHeight;

      // Dynamic sizing calculations
      const baseSize = Math.sqrt(w * h);

      setDynamicSizes({
        titleFontSize: Math.max(11, Math.min(headerHeight * 0.35, 16)),
        doorLabelFontSize: Math.max(9, Math.min(baseSize * 0.04, 12)),
        doorStatusFontSize: Math.max(8, Math.min(baseSize * 0.035, 11)),
        iconSize: Math.max(24, Math.min(baseSize * 0.12, 48)),
        padding: Math.max(12, Math.min(baseSize * 0.06, 20)),
        gap: Math.max(8, Math.min(baseSize * 0.04, 16)),
        headerHeight,
      });
    };

    updateLayout();
    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Fetch controller data with auto-refresh
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
        if (isLoading) setIsLoading(false);
      }
    };

    fetchControllerData();
    const interval = setInterval(fetchControllerData, 5000);

    return () => clearInterval(interval);
  }, [config.controllerId, isLoading]);

  // Status styling - KONSISTEN DENGAN WIDGET LAIN
  const getStatusStyles = () => {
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
      value: "text-slate-900 dark:text-slate-100",
      unit: "text-slate-500 dark:text-slate-400",
    };

    if (error) {
      return {
        ...baseStyles,
        indicator: "bg-red-500 dark:bg-red-500",
        pulse: false,
        title: "text-red-600 dark:text-red-400",
      };
    }

    if (isLoading) {
      return {
        ...baseStyles,
        indicator: "bg-amber-500 dark:bg-amber-500",
        pulse: true,
      };
    }

    if (controller?.status === "online") {
      return {
        ...baseStyles,
        indicator: "bg-emerald-500 dark:bg-emerald-500",
        pulse: false,
      };
    }

    return {
      ...baseStyles,
      indicator: "bg-red-500 dark:bg-red-500",
      pulse: false,
    };
  };

  // Render content based on state
  const renderContent = () => {
    // Loading state
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2
            className="animate-spin text-slate-400 dark:text-slate-500"
            style={{
              width: dynamicSizes.iconSize * 0.8,
              height: dynamicSizes.iconSize * 0.8,
            }}
          />
        </div>
      );
    }

    // Error state
    if (error || !controller) {
      return (
        <div className="flex items-center justify-center h-full text-center px-4">
          <div>
            <Shield
              className="mx-auto mb-2 text-red-400 dark:text-red-500"
              style={{
                width: dynamicSizes.iconSize * 0.8,
                height: dynamicSizes.iconSize * 0.8,
              }}
            />
            <p
              className="text-red-500 dark:text-red-400 font-medium"
              style={{ fontSize: `${dynamicSizes.doorStatusFontSize}px` }}
            >
              {error || "Controller data unavailable."}
            </p>
          </div>
        </div>
      );
    }

    // Success state - show door cards
    const displayDoorStatus =
      Array.isArray(controller.doorStatus) && controller.doorStatus.length > 0
        ? controller.doorStatus
        : [-0, -0, -0, -0];

    // Grid columns based on layout mode
    const gridCols = layoutMode === "wide" ? "grid-cols-4" : "grid-cols-2";

    return (
      <div
        className={cn("grid w-full h-full", gridCols)}
        style={{
          padding: `${dynamicSizes.padding}px`,
          gap: `${dynamicSizes.gap}px`,
        }}
      >
        {displayDoorStatus.map((status, index) => {
          const isOpen = status === 0;
          const isClosed = status === 1;
          const isNA = status < 0;

          return (
            <div
              key={index}
              className={cn(
                "relative rounded-lg border transition-all duration-300",
                "flex flex-col items-center justify-center",
                "group hover:shadow-md",
                isOpen &&
                  "bg-orange-50/50 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-800/30",
                isClosed &&
                  "bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/30",
                isNA &&
                  "bg-slate-50/50 dark:bg-slate-900/20 border-slate-200/50 dark:border-slate-700/30"
              )}
              style={{ padding: `${dynamicSizes.padding * 0.6}px` }}
            >
              {/* Door Label */}
              <p
                className="font-semibold text-slate-600 dark:text-slate-400 mb-2"
                style={{ fontSize: `${dynamicSizes.doorLabelFontSize}px` }}
              >
                Door {index + 1}
              </p>

              {/* Door Icon */}
              <div className="my-2">
                {isClosed ? (
                  <DoorClosed
                    className="text-green-600 dark:text-green-400 transition-transform group-hover:scale-110"
                    style={{
                      width: dynamicSizes.iconSize,
                      height: dynamicSizes.iconSize,
                    }}
                  />
                ) : isOpen ? (
                  <DoorOpen
                    className="text-orange-500 dark:text-orange-400 transition-transform group-hover:scale-110"
                    style={{
                      width: dynamicSizes.iconSize,
                      height: dynamicSizes.iconSize,
                    }}
                  />
                ) : (
                  <DoorClosed
                    className="text-slate-300 dark:text-slate-600 opacity-50"
                    style={{
                      width: dynamicSizes.iconSize,
                      height: dynamicSizes.iconSize,
                    }}
                  />
                )}
              </div>

              {/* Door Status Text */}
              <p
                className={cn(
                  "font-medium mt-1",
                  isClosed && "text-green-700 dark:text-green-300",
                  isOpen && "text-orange-600 dark:text-orange-400",
                  isNA && "text-slate-400 dark:text-slate-500"
                )}
                style={{ fontSize: `${dynamicSizes.doorStatusFontSize}px` }}
              >
                {isClosed ? "Closed" : isOpen ? "Open" : "N/A"}
              </p>

              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/3 dark:from-slate-900/10 via-transparent to-transparent pointer-events-none rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          );
        })}
      </div>
    );
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
      {/* HEADER - Fixed position dengan pattern konsisten */}
      <div
        className="absolute top-0 left-0 right-0  px-4
                   bg-slate-50/50 dark:bg-slate-900/30 
                   flex items-center justify-between flex-shrink-0
                   border-b border-slate-200/40 dark:border-slate-700/40"
        style={{ height: `${dynamicSizes.headerHeight}px` }}
      >
        {/* Left: Icon + Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Shield
            className="text-slate-500 dark:text-slate-400 flex-shrink-0"
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 1.1, 14),
              height: Math.max(dynamicSizes.titleFontSize * 1.1, 14),
            }}
          />
          <h3
            className={`font-medium truncate transition-colors duration-200 ${styles.title}`}
            style={{
              fontSize: `${dynamicSizes.titleFontSize}px`,
              lineHeight: 1.3,
            }}
            title={config.title || controller?.name || "Access Controller"}
          >
            {config.title || controller?.name || "Access Controller"}
          </h3>
        </div>

        {/* Right: Status indicators - KONSISTEN DENGAN WIDGET LAIN */}
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {/* Wifi status icon */}
          {controller?.status === "online" ? (
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
            className={`rounded-full transition-all duration-300 ${
              styles.indicator
            } ${styles.pulse ? "animate-pulse" : ""}`}
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
              height: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
            }}
          />
        </div>
      </div>

      {/* CONTENT - with proper spacing from header */}
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          paddingTop: dynamicSizes.headerHeight + dynamicSizes.padding * 0.5,
          paddingBottom: dynamicSizes.padding * 0.5,
        }}
      >
        {renderContent()}
      </div>

      {/* Minimal hover effect - KONSISTEN DENGAN WIDGET LAIN */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 dark:from-slate-900/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
}
