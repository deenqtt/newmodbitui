// File: components/widgets/EnergyTargetGap/EnergyTargetGapWidget.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2, AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    widgetTitle: string;
    loggingConfigId: string;
    targetValue: number;
    units?: string;
    multiply?: number;
    period: "last_month" | "current_month";
  };
}

interface DynamicSizes {
  valueFontSize: number;
  iconSize: number;
  titleFontSize: number;
  progressHeight: number;
}

export const EnergyTargetGapWidget = ({ config }: Props) => {
  const [usage, setUsage] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [layoutMode, setLayoutMode] = useState<"horizontal" | "vertical">(
    "horizontal"
  );
  const [dynamicSizes, setDynamicSizes] = useState<DynamicSizes>({
    valueFontSize: 24,
    iconSize: 40,
    titleFontSize: 14,
    progressHeight: 12,
  });

  const widgetRef = useRef<HTMLDivElement>(null);

  // Responsive sizing dengan ResizeObserver
  useEffect(() => {
    if (!widgetRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const aspectRatio = width / height;

        // Tentukan mode layout berdasarkan aspek rasio
        const currentLayoutMode = aspectRatio > 1.3 ? "horizontal" : "vertical";
        setLayoutMode(currentLayoutMode);

        // Rumus dinamis yang lebih conservative untuk card kecil
        let baseSize;
        if (currentLayoutMode === "horizontal") {
          baseSize = Math.min(width / 15, height / 5);
        } else {
          baseSize = Math.min(width / 6, height / 8);
        }

        setDynamicSizes({
          valueFontSize: Math.max(16, baseSize * 1.5),
          iconSize: Math.max(20, baseSize * 1.6),
          titleFontSize: Math.max(10, baseSize * 0.6),
          progressHeight: Math.max(8, baseSize * 0.4),
        });
      }
    });

    resizeObserver.observe(widgetRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Fetch usage data
  useEffect(() => {
    if (!config.loggingConfigId || !config.period) {
      setStatus("error");
      setErrorMessage("Widget not configured correctly.");
      return;
    }

    const fetchUsageData = async () => {
      setStatus("loading");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/historical/usage?configId=${config.loggingConfigId}&period=${config.period}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch data");
        }
        const data = await response.json();
        const finalUsage = data.usage * (config.multiply || 1);
        setUsage(finalUsage);
        setStatus("ok");
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message);
      }
    };

    fetchUsageData();
  }, [config.loggingConfigId, config.period, config.multiply]);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="w-full px-4">
      <div className="flex justify-between items-baseline mb-2">
        <div
          className="bg-gradient-to-r from-muted/50 via-muted to-muted/50 animate-pulse rounded"
          style={{
            width: `${dynamicSizes.valueFontSize * 2}px`,
            height: `${dynamicSizes.titleFontSize * 1.2}px`,
          }}
        />
        <div
          className="bg-gradient-to-r from-muted/50 via-muted to-muted/50 animate-pulse rounded"
          style={{
            width: `${dynamicSizes.valueFontSize * 3}px`,
            height: `${dynamicSizes.titleFontSize * 1.2}px`,
          }}
        />
      </div>
      <div
        className="bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 animate-pulse rounded-full mb-3"
        style={{
          height: `${dynamicSizes.progressHeight}px`,
        }}
      />
      <div className="flex justify-center">
        <div
          className="bg-gradient-to-r from-muted/50 via-muted to-muted/50 animate-pulse rounded-lg"
          style={{
            width: `${dynamicSizes.valueFontSize * 4}px`,
            height: `${dynamicSizes.valueFontSize * 1.2}px`,
          }}
        />
      </div>
    </div>
  );

  // Render content with animations
  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="flex items-center justify-center w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Loader2
              className="animate-spin text-primary"
              style={{
                width: `${dynamicSizes.iconSize}px`,
                height: `${dynamicSizes.iconSize}px`,
              }}
            />
          </motion.div>
        </div>
      );
    }

    if (status === "error") {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center text-center p-2"
        >
          <AlertTriangle
            className="text-destructive mb-2"
            style={{
              width: `${dynamicSizes.iconSize * 0.8}px`,
              height: `${dynamicSizes.iconSize * 0.8}px`,
            }}
          />
          <p
            className="font-semibold text-destructive text-center"
            style={{
              fontSize: `${Math.max(12, dynamicSizes.titleFontSize)}px`,
            }}
          >
            {errorMessage}
          </p>
        </motion.div>
      );
    }

    const target = config.targetValue || 0;
    const current = usage || 0;
    const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
    const isAchieved = current >= target;
    const gap = Math.max(0, target - current);
    const gapPercentage = target > 0 ? (gap / target) * 100 : 0;

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={`${current}-${target}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full px-4"
        >
          <div className="flex justify-between items-baseline mb-2">
            <span
              className="font-medium text-muted-foreground"
              style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
            >
              Usage
            </span>
            {isAchieved ? (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-bold text-green-600 flex items-center"
                style={{ fontSize: `${dynamicSizes.titleFontSize * 0.9}px` }}
              >
                <CheckCircle2
                  className="mr-1"
                  style={{
                    width: `${dynamicSizes.iconSize * 0.5}px`,
                    height: `${dynamicSizes.iconSize * 0.5}px`,
                  }}
                />
                Achieved
              </motion.span>
            ) : (
              <span
                className="font-medium text-muted-foreground"
                style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
              >
                Target: {target.toLocaleString()} {config.units}
              </span>
            )}
          </div>

          <div className="mb-3">
            <Progress
              value={progress}
              className="w-full transition-all duration-500 ease-out"
              style={{ height: `${dynamicSizes.progressHeight}px` }}
            />
          </div>

          <div className="text-center">
            <p
              className="font-bold text-primary"
              style={{ fontSize: `${dynamicSizes.valueFontSize}px` }}
            >
              {current.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              <span
                className="text-muted-foreground ml-1"
                style={{ fontSize: `${dynamicSizes.valueFontSize * 0.6}px` }}
              >
                {config.units}
              </span>
            </p>

            {!isAchieved && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground mt-1"
                style={{ fontSize: `${dynamicSizes.titleFontSize * 0.85}px` }}
              >
                {gap.toLocaleString(undefined, { maximumFractionDigits: 1 })}{" "}
                {config.units} to target
              </motion.p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div
      ref={widgetRef}
      className="w-full h-full flex flex-col items-center justify-center p-4 cursor-move bg-card/30 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm"
    >
      <motion.div
        className="flex items-center w-full mb-3"
        style={{
          justifyContent: layoutMode === "horizontal" ? "flex-start" : "center",
        }}
      >
        <TrendingUp
          className="text-muted-foreground mr-2 flex-shrink-0"
          style={{
            width: `${dynamicSizes.iconSize * 0.5}px`,
            height: `${dynamicSizes.iconSize * 0.5}px`,
          }}
        />
        <p
          className="font-medium text-muted-foreground truncate"
          style={{ fontSize: `${dynamicSizes.titleFontSize * 0.9}px` }}
        >
          {config.widgetTitle}
        </p>
      </motion.div>

      <div className="w-full flex-1 flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};
