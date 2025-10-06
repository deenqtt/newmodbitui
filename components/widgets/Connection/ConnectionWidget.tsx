"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Loader2, AlertTriangle } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    deviceUniqId: string;
    selectedKey: string;
    name: string;
    desc: string;
    connectionType: string; // pipe, line, arrow, etc.
    flowDirection: "forward" | "reverse" | "bidirectional";
    animated: boolean;
    animationSpeed: number;
    color: string;
    thickness: number;
    showFlow: boolean;
  };
}

export const ConnectionWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [displayValue, setDisplayValue] = useState<string | number | null>(
    null
  );
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [topic, setTopic] = useState<string | null>(null);

  // Responsive sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      setDimensions({ width, height });
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);
    updateDimensions();

    return () => resizeObserver.disconnect();
  }, []);

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
        let dataObject = payload;

        // Check if payload has 'value' property
        if (payload.hasOwnProperty("value")) {
          // Handle different value formats
          if (typeof payload.value === "string") {
            try {
              dataObject = JSON.parse(payload.value);
            } catch (e) {
              // If parsing fails, use the string directly as value
              if (config.selectedKey === "value") {
                setDisplayValue(payload.value);
                setStatus("ok");
                return;
              }
              dataObject = payload;
            }
          } else if (
            typeof payload.value === "object" &&
            payload.value !== null
          ) {
            dataObject = payload.value;
          } else {
            // value is a primitive, use it directly if selectedKey is "value"
            if (config.selectedKey === "value") {
              setDisplayValue(payload.value);
              setStatus("ok");
              return;
            }
            dataObject = payload;
          }
        }

        // Extract value from data object
        if (
          dataObject &&
          typeof dataObject === "object" &&
          dataObject.hasOwnProperty(config.selectedKey)
        ) {
          const rawValue = dataObject[config.selectedKey];
          setDisplayValue(rawValue);
          setStatus("ok");
        } else if (
          config.selectedKey === "value" &&
          payload.hasOwnProperty("value")
        ) {
          // Special case for when selectedKey is "value"
          setDisplayValue(payload.value);
          setStatus("ok");
        }
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      }
    },
    [config.selectedKey]
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

  const getStatusColor = () => {
    switch (status) {
      case "ok":
        return "stroke-emerald-500 fill-emerald-100";
      case "error":
        return "stroke-red-500 fill-red-100";
      case "loading":
      case "waiting":
        return "stroke-amber-500 fill-amber-100";
      default:
        return "stroke-slate-400 fill-slate-100";
    }
  };

  const formatValue = (value: string | number | null) => {
    if (value === null) return "—";
    if (typeof value === "number") {
      return value.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: value % 1 === 0 ? 0 : 1,
      });
    }
    return String(value);
  };

  const renderConnectionShape = () => {
    const shapeColor = getStatusColor();
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const length = Math.min(dimensions.width * 0.8, 200); // Max length
    const startX = centerX - length / 2;
    const endX = centerX + length / 2;
    const y = centerY;

    switch (config.connectionType) {
      case "pipe":
        return (
          <g>
            {/* Pipe body */}
            <rect
              x={startX}
              y={y - config.thickness / 2}
              width={length}
              height={config.thickness}
              className={shapeColor}
              strokeWidth="1"
              rx="4"
            />
            {/* Pipe ends */}
            <circle
              cx={startX}
              cy={y}
              r={config.thickness / 2}
              className={shapeColor}
              strokeWidth="1"
            />
            <circle
              cx={endX}
              cy={y}
              r={config.thickness / 2}
              className={shapeColor}
              strokeWidth="1"
            />
          </g>
        );

      case "line":
        return (
          <line
            x1={startX}
            y1={y}
            x2={endX}
            y2={y}
            className={shapeColor}
            strokeWidth={config.thickness}
            strokeLinecap="round"
          />
        );

      case "arrow":
        const arrowSize = config.thickness * 2;
        return (
          <g>
            {/* Arrow line */}
            <line
              x1={startX}
              y1={y}
              x2={endX - arrowSize}
              y2={y}
              className={shapeColor}
              strokeWidth={config.thickness}
              strokeLinecap="round"
            />
            {/* Arrow head */}
            <polygon
              points={`${endX - arrowSize},${y - arrowSize / 2} ${endX},${y} ${
                endX - arrowSize
              },${y + arrowSize / 2}`}
              className={shapeColor}
              strokeWidth="1"
            />
          </g>
        );

      case "double-arrow":
        const doubleArrowSize = config.thickness * 2;
        return (
          <g>
            {/* Arrow line */}
            <line
              x1={startX + doubleArrowSize}
              y1={y}
              x2={endX - doubleArrowSize}
              y2={y}
              className={shapeColor}
              strokeWidth={config.thickness}
              strokeLinecap="round"
            />
            {/* Left arrow head */}
            <polygon
              points={`${startX + doubleArrowSize},${
                y + doubleArrowSize / 2
              } ${startX},${y} ${startX + doubleArrowSize},${
                y - doubleArrowSize / 2
              }`}
              className={shapeColor}
              strokeWidth="1"
            />
            {/* Right arrow head */}
            <polygon
              points={`${endX - doubleArrowSize},${
                y - doubleArrowSize / 2
              } ${endX},${y} ${endX - doubleArrowSize},${
                y + doubleArrowSize / 2
              }`}
              className={shapeColor}
              strokeWidth="1"
            />
          </g>
        );

      default:
        return (
          <line
            x1={startX}
            y1={y}
            x2={endX}
            y2={y}
            className={shapeColor}
            strokeWidth={config.thickness}
            strokeLinecap="round"
          />
        );
    }
  };

  const renderFlowAnimation = () => {
    if (!config.animated || !config.showFlow || status !== "ok") return null;

    const particles = [];
    const particleCount = 3;
    const length = Math.min(dimensions.width * 0.8, 200);

    for (let i = 0; i < particleCount; i++) {
      const delay = i * (1 / config.animationSpeed);
      const startX = dimensions.width / 2 - length / 2;
      const endX = dimensions.width / 2 + length / 2;

      particles.push(
        <circle
          key={i}
          r={config.thickness / 3}
          fill="#ffffff"
          opacity="0.8"
          style={{
            animation: `flow-${config.flowDirection} ${
              2 / config.animationSpeed
            }s linear ${delay}s infinite`,
          }}
        >
          <animateMotion
            dur={`${2 / config.animationSpeed}s`}
            begin={`${delay}s`}
            repeatCount="indefinite"
            path={`M ${startX} ${dimensions.height / 2} L ${endX} ${
              dimensions.height / 2
            }`}
          />
        </circle>
      );
    }

    return <g>{particles}</g>;
  };

  const renderContent = () => {
    const isLoading =
      status === "loading" || (status === "waiting" && displayValue === null);

    if (isLoading) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Loader2 className="animate-spin text-slate-400 w-8 h-8" />
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-2">
          <AlertTriangle className="text-red-500 w-8 h-8" />
          <p className="text-xs text-red-600 break-words">{errorMessage}</p>
        </div>
      );
    }

    return (
      <div className="absolute inset-0 flex flex-col">
        {/* Header */}
        <div className="p-1 bg-white/90 backdrop-blur-sm border-b border-slate-200">
          <h3
            className="text-xs font-medium text-slate-700 truncate"
            title={config.name}
            style={{ fontSize: Math.max(dimensions.width / 20, 10) }}
          >
            {config.name}
          </h3>
          {config.desc && dimensions.height > 90 && (
            <p
              className="text-xs text-slate-500 truncate"
              title={config.desc}
              style={{ fontSize: Math.max(dimensions.width / 25, 8) }}
            >
              {config.desc}
            </p>
          )}
        </div>

        {/* Connection shape and value */}
        <div className="flex-1 relative">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="absolute inset-0"
          >
            {renderConnectionShape()}
            {renderFlowAnimation()}
          </svg>

          {/* Value overlay */}
          <div className="absolute bottom-1 left-1">
            <div
              className="font-bold text-slate-900 drop-shadow-sm bg-white/80 px-1 rounded"
              style={{
                fontSize: Math.max(dimensions.width / 16, 8),
              }}
            >
              {formatValue(displayValue)}
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="absolute top-1 right-1">
          <div
            className={`rounded-full ${
              status === "ok"
                ? "bg-emerald-500"
                : status === "error"
                ? "bg-red-500"
                : "bg-amber-500 animate-pulse"
            }`}
            style={{
              width: Math.max(dimensions.width / 20, 6),
              height: Math.max(dimensions.width / 20, 6),
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden cursor-move bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ease-out group hover:scale-[1.01] transform-gpu"
      style={{
        minHeight: 30,
      }}
    >
      {renderContent()}
    </div>
  );
};
