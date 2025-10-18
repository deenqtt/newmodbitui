// File: components/widgets/SingleValueCard/SingleValueCardWidget.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { useMqtt } from "@/contexts/MqttContext";
import {
  Loader2,
  AlertTriangle,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    customName: string;
    deviceUniqId: string;
    selectedKey: string;
    multiply?: number;
    units?: string;
    responsiveSettings?: import("@/hooks/useResponsiveWidget").ResponsiveWidgetSettings;
  };
}

export const SingleValueCardWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [displayValue, setDisplayValue] = useState<string | number | null>(
    null
  );
  const [previousValue, setPreviousValue] = useState<string | number | null>(
    null
  );
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [topic, setTopic] = useState<string | null>(null);
  const [trend, setTrend] = useState<"up" | "down" | "stable" | null>(null);

  // Responsive sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [titleFontSize, setTitleFontSize] = useState(14);
  const [valueFontSize, setValueFontSize] = useState(24);
  const [unitFontSize, setUnitFontSize] = useState(12);

  // Use responsive settings for sizing
  useLayoutEffect(() => {
    if (!config.responsiveSettings) return;

    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      setDimensions({ width, height });

      const responsive = config.responsiveSettings!;

      // Use responsive settings for font scaling
      const baseFontSize = responsive.isMobile
        ? responsive.fontSizeScale * 20
        : responsive.isTablet
        ? responsive.fontSizeScale * 26
        : responsive.fontSizeScale * 32;

      // Responsive font sizes based on device type
      const valueSize = responsive.isMobile
        ? Math.min(baseFontSize * 0.7, width * 0.25)
        : responsive.isTablet
        ? Math.min(baseFontSize * 0.9, width * 0.3)
        : Math.min(baseFontSize, width * 0.35);

      const titleSize = responsive.isMobile
        ? Math.max(valueSize * 0.5, 11)
        : responsive.isTablet
        ? Math.max(valueSize * 0.55, 14)
        : Math.max(valueSize * 0.6, 16);

      const unitSize = responsive.isMobile
        ? Math.max(valueSize * 0.4, 9)
        : responsive.isTablet
        ? Math.max(valueSize * 0.45, 11)
        : Math.max(valueSize * 0.5, 13);

      setValueFontSize(Math.round(Math.max(valueSize, responsive.isMobile ? 18 : 20)));
      setTitleFontSize(Math.round(Math.max(titleSize, responsive.isMobile ? 10 : 12)));
      setUnitFontSize(Math.round(Math.max(unitSize, responsive.isMobile ? 8 : 10)));
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);
    updateDimensions();

    return () => resizeObserver.disconnect();
  }, [config.responsiveSettings]);

  useEffect(() => {
    if (!config.deviceUniqId) {
      setStatus("error");
      setErrorMessage("Device not configured.");
      return;
    }

    const fetchDeviceTopic = async () => {
      setStatus("loading");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/devices/external/${config.deviceUniqId}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Device not found`);
        }
        const deviceData = await response.json();
        setTopic(deviceData.topic || null);
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message);
      }
    };

    fetchDeviceTopic();
  }, [config.deviceUniqId]);

  const handleMqttMessage = useCallback(
    (receivedTopic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};

        if (innerPayload.hasOwnProperty(config.selectedKey)) {
          const rawValue = innerPayload[config.selectedKey];
          const finalValue =
            typeof rawValue === "number"
              ? rawValue * (config.multiply || 1)
              : rawValue;

          // Calculate trend
          if (
            previousValue !== null &&
            typeof finalValue === "number" &&
            typeof previousValue === "number"
          ) {
            const diff = finalValue - previousValue;
            const threshold = Math.abs(previousValue * 0.01); // 1% threshold

            if (Math.abs(diff) <= threshold) {
              setTrend("stable");
            } else if (diff > 0) {
              setTrend("up");
            } else {
              setTrend("down");
            }
          }

          setPreviousValue(displayValue);
          setDisplayValue(finalValue);
          setStatus("ok");
        }
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      }
    },
    [config.selectedKey, config.multiply, displayValue, previousValue]
  );

  useEffect(() => {
    if (topic && isReady && connectionStatus === "Connected") {
      setStatus("waiting");
      subscribe(topic, handleMqttMessage);
      return () => {
        unsubscribe(topic, handleMqttMessage);
      };
    }
  }, [
    topic,
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  const getStatusStyles = () => {
    // Clean minimal approach - always white background, hanya status di indicator dan text
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
      value: "text-slate-900 dark:text-slate-100",
      unit: "text-slate-500 dark:text-slate-400",
    };

    switch (status) {
      case "ok":
        return {
          ...baseStyles,
          indicator: "bg-emerald-500 dark:bg-emerald-400",
          pulse: false,
        };
      case "error":
        return {
          ...baseStyles,
          indicator: "bg-red-500 dark:bg-red-400",
          pulse: false,
          // Sedikit hint warna di text untuk error
          title: "text-red-600 dark:text-red-400",
          value: "text-red-700 dark:text-red-300",
        };
      case "loading":
      case "waiting":
        return {
          ...baseStyles,
          indicator: "bg-amber-500 dark:bg-amber-400",
          pulse: true,
          title: "text-slate-600 dark:text-slate-400",
          value: "text-slate-700 dark:text-slate-300",
        };
      default:
        return {
          ...baseStyles,
          indicator: "bg-slate-400 dark:bg-slate-500",
          pulse: false,
        };
    }
  };

  const formatValue = (value: string | number | null) => {
    if (value === null) return "—";

    if (typeof value === "number") {
      if (Math.abs(value) >= 1000000) {
        return (
          (value / 1000000).toLocaleString(undefined, {
            maximumFractionDigits: 1,
            minimumFractionDigits: 0,
          }) + "M"
        );
      }
      if (Math.abs(value) >= 1000) {
        return (
          (value / 1000).toLocaleString(undefined, {
            maximumFractionDigits: 1,
            minimumFractionDigits: 0,
          }) + "K"
        );
      }
      return value.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: value % 1 === 0 ? 0 : 1,
      });
    }

    return String(value);
  };

  const renderTrendIndicator = () => {
    if (!trend || status !== "ok") return null;

    const trendConfig = {
      up: { icon: TrendingUp, color: "text-emerald-500" },
      down: { icon: TrendingDown, color: "text-red-500" },
      stable: { icon: Minus, color: "text-slate-400" },
    };

    const { icon: Icon, color } = trendConfig[trend];

    return (
      <div
        className="flex items-center justify-center p-1.5 rounded-full bg-white shadow-sm border border-slate-200/50"
        style={{
          width: Math.max(titleFontSize * 1.8, 20),
          height: Math.max(titleFontSize * 1.8, 20),
        }}
      >
        <Icon
          className={color}
          style={{
            width: Math.max(titleFontSize * 0.9, 12),
            height: Math.max(titleFontSize * 0.9, 12),
          }}
        />
      </div>
    );
  };

  const renderContent = () => {
    const styles = getStatusStyles();
    const isLoading =
      status === "loading" || (status === "waiting" && displayValue === null);

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <Loader2
              className="animate-spin text-slate-400"
              style={{
                width: Math.max(dimensions.width / 8, 28),
                height: Math.max(dimensions.width / 8, 28),
              }}
            />
          </div>
          <p
            className={`font-medium ${styles.title}`}
            style={{ fontSize: `${titleFontSize}px` }}
          >
            Loading data...
          </p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center gap-3 text-center px-2">
          <AlertTriangle
            className="text-red-500"
            style={{
              width: Math.max(dimensions.width / 8, 28),
              height: Math.max(dimensions.width / 8, 28),
            }}
          />
          <p
            className={`font-semibold break-words ${styles.value}`}
            style={{ fontSize: `${Math.max(titleFontSize * 0.9, 11)}px` }}
          >
            {errorMessage}
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center text-center w-full gap-1">
        <div className="flex items-baseline justify-center gap-2 w-full">
          <span
            className={`font-bold tracking-tight transition-all duration-300 ${styles.value}`}
            style={{
              fontSize: `${valueFontSize}px`,
              lineHeight: 0.9,
            }}
          >
            {formatValue(displayValue)}
          </span>
          {config.units && (
            <span
              className={`font-medium transition-colors duration-200 ${styles.unit}`}
              style={{
                fontSize: `${unitFontSize}px`,
                lineHeight: 1,
              }}
            >
              {config.units}
            </span>
          )}
        </div>
      </div>
    );
  };

  const styles = getStatusStyles();

  // Get responsive padding and styling
  const responsivePadding = config.responsiveSettings?.paddingClass || "p-4";
  const responsiveCursor = config.responsiveSettings ? "cursor-pointer" : "cursor-move";
  const responsiveHover = config.responsiveSettings?.isMobile ? "" : "group hover:scale-[1.01] hover:shadow-md";

  const responsive = config.responsiveSettings!;
  const isSmallMobile = responsive.isSmallMobile;
  const isTouchOnly = responsive.isSmallMobile || responsive.isMobile || responsive.isLargeMobile;

  // Enhanced responsive sizing
  useLayoutEffect(() => {
    if (!responsive) return;

    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      setDimensions({ width, height });

      // More sophisticated font scaling based on device capabilities
      const baseFontSize = responsive.isSmallMobile
        ? responsive.fontSizeScale * 16
        : responsive.isMobile
        ? responsive.fontSizeScale * 18
        : responsive.isLargeMobile
        ? responsive.fontSizeScale * 20
        : responsive.isSmallTablet
        ? responsive.fontSizeScale * 22
        : responsive.fontSizeScale * 24;

      const valueSize = responsive.isSmallMobile
        ? Math.min(baseFontSize * 0.6, width * 0.2)
        : responsive.isMobile
        ? Math.min(baseFontSize * 0.7, width * 0.22)
        : responsive.isLargeMobile
        ? Math.min(baseFontSize * 0.75, width * 0.25)
        : Math.min(baseFontSize * 0.85, width * 0.28);

      const titleSize = responsive.isSmallMobile
        ? Math.max(valueSize * 0.45, 8)
        : responsive.isMobile
        ? Math.max(valueSize * 0.5, 10)
        : responsive.isLargeMobile
        ? Math.max(valueSize * 0.55, 11)
        : Math.max(valueSize * 0.6, 12);

      const unitSize = responsive.isSmallMobile
        ? Math.max(valueSize * 0.35, 7)
        : responsive.isMobile
        ? Math.max(valueSize * 0.4, 8)
        : Math.max(valueSize * 0.45, 10);

      setValueFontSize(Math.round(Math.max(valueSize, responsive.isSmallMobile ? 14 : responsive.isMobile ? 16 : 18)));
      setTitleFontSize(Math.round(Math.max(titleSize, responsive.isSmallMobile ? 8 : responsive.isMobile ? 9 : 10)));
      setUnitFontSize(Math.round(Math.max(unitSize, responsive.isSmallMobile ? 6 : responsive.isMobile ? 7 : 8)));
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);
    updateDimensions();

    return () => resizeObserver.disconnect();
  }, [responsive]);

  return (
    <div
      ref={containerRef}
      className={`
        w-full h-full relative overflow-hidden ${responsive.touchMode ? 'cursor-pointer' : 'cursor-move'}
        bg-card
        border border-border/60 rounded-xl
        shadow-sm transition-all duration-300 ease-out transform-gpu
        ${!isTouchOnly ? 'group hover:scale-[1.01] hover:shadow-md' : ''}
        ${responsive.layoutDensity === 'ultra-compact' ? 'rounded-lg' : ''}
        ${responsive.compactMode ? 'shadow-none border-border/40' : ''}
      `}
      style={{
        minWidth: responsive.isSmallMobile ? 80 : responsive.isMobile ? 100 : responsive.isLargeMobile ? 110 : 120,
        minHeight: responsive.isSmallMobile ? 50 : responsive.isMobile ? 60 : responsive.isLargeMobile ? 65 : 80,
      }}
    >
      {/* Enhanced status indicators */}
      <div className={`absolute ${isSmallMobile ? 'top-0.5 right-0.5' : responsive.isMobile ? 'top-1 right-1' : 'top-2 right-2'} z-10`}>
        <div className={`flex items-center ${responsive.gapClass}`}>
          {responsive.showIcons && responsive.enableAnimations !== false && renderTrendIndicator()}
          <div
            className={`rounded-full transition-all duration-300 ${
              styles.indicator
            } ${styles.pulse && responsive.enableAnimations !== false ? "animate-pulse" : ""}`}
            style={{
              width: Math.max(titleFontSize * 0.5, isSmallMobile ? 4 : responsive.isMobile ? 6 : 8),
              height: Math.max(titleFontSize * 0.5, isSmallMobile ? 4 : responsive.isMobile ? 6 : 8),
            }}
          />
        </div>
      </div>

      {/* Responsive header with enhanced touch targets */}
      <div className={`absolute top-0 left-0 right-0 ${responsive.paddingClass} ${
        isSmallMobile ? `pr-8 ${responsive.compactMode ? 'py-1' : 'py-1'}` :
        responsive.isMobile ? 'pr-10' : 'pr-12'
      }`}>
        {responsive.showLabels && (
          <h3
            className={`font-medium ${responsive.truncateText ? 'truncate' : ''} text-left transition-colors duration-200 ${styles.title} ${responsive.fontSizeClass}`}
            style={{
              fontSize: isSmallMobile ? `${Math.max(titleFontSize * 0.9, 8)}px` :
                        responsive.isMobile ? `${Math.max(titleFontSize * 0.95, 9)}px` : `${titleFontSize}px`,
              lineHeight: responsive.lineHeightScale,
            }}
            title={config.customName}
          >
            {config.customName}
          </h3>
        )}
      </div>

      {/* Enhanced content area with responsive padding */}
      <div
        className={`absolute inset-0 flex items-center justify-center ${
          responsive.layoutDirection === 'vertical' ? 'flex-col justify-center' : 'justify-center'
        }`}
        style={{
          paddingTop: responsive.showLabels ? (titleFontSize * responsive.spacingScale * 2.8) : '0.5rem',
          paddingBottom: responsive.isSmallMobile ? 4 : responsive.isMobile ? 8 : responsive.isLargeMobile ? 10 : 16,
          paddingLeft: responsive.isSmallMobile ? 4 : responsive.isMobile ? 8 : responsive.isLargeMobile ? 10 : 16,
          paddingRight: responsive.isSmallMobile ? 4 : responsive.isMobile ? 8 : responsive.isLargeMobile ? 10 : 16,
        }}
      >
        {renderContent()}
      </div>

      {/* Conditional hover effects - only on non-touch devices */}
      {!isTouchOnly && responsive.enableAnimations !== false && (
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/3 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}

      {/* Touch feedback for touch devices */}
      {responsive.touchMode && responsive.enableAnimations !== false && (
        <div className="absolute inset-0 bg-slate-900/5 active:bg-slate-900/10 pointer-events-none rounded-xl opacity-0 active:opacity-100 transition-opacity duration-150" />
      )}
    </div>
  );
};
