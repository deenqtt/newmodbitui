"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { useMqtt } from "@/contexts/MqttContext";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import DeviceDetailModal from "./DeviceDetailModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Move,
  LayoutGrid,
  // Common icons used in IoT/monitoring
  Thermometer,
  Droplets,
  Zap,
  Activity,
  Battery,
  Wifi,
  Signal,
  Power,
  Gauge,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Settings,
  Clock,
  Calendar,
  MapPin,
  Home,
  Building,
  Factory,
  Car,
  Truck,
  Plane,
  Ship,
  Train,
  Lightbulb,
  Fan,
  Wind,
  Sun,
  Moon,
  CloudRain,
  Snowflake,
  Flame,
  Eye,
  Camera,
  Lock,
  Unlock,
  Shield,
  Key,
  User,
  Users,
  Phone,
  Mail,
  MessageSquare,
  Bell,
  Volume2,
  VolumeX,
  Circle,
  Square,
  Triangle,
  Star,
  Heart,
  Target,
  Crosshair,
  Navigation,
  Compass,
  Radar,
  Radio,
  ArrowBigLeft,
  ArrowBigUp,
  ArrowBigDown,
  ArrowBigRight,
} from "lucide-react";

// Icon resolver function
const getIconComponent = (iconName?: string | null) => {
  if (!iconName) return null;

  const iconMap: Record<string, any> = {
    Thermometer,
    Droplets,
    Zap,
    Activity,
    Battery,
    Wifi,
    Signal,
    Power,
    Gauge,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Info,
    Settings,
    Clock,
    Calendar,
    MapPin,
    Home,
    Building,
    Factory,
    Car,
    Truck,
    Plane,
    Ship,
    Train,
    Lightbulb,
    Fan,
    Wind,
    Sun,
    Moon,
    CloudRain,
    Snowflake,
    Flame,
    Eye,
    Camera,
    Lock,
    Unlock,
    Shield,
    Key,
    User,
    Users,
    Phone,
    Mail,
    MessageSquare,
    Bell,
    Volume2,
    VolumeX,
    Circle,
    Square,
    Triangle,
    Star,
    Heart,
    Target,
    Crosshair,
    Navigation,
    Compass,
    Radar,
    Radio,
  };

  return iconMap[iconName] || null;
};

interface KeyConfig {
  key: string;
  units?: string;
  multiply?: number;
  customName?: string;
}

interface Layout2DDataPoint {
  id: string;
  layoutId: string;
  deviceUniqId: string;
  selectedKeys?: KeyConfig[]; // New multi-key format
  selectedKey?: string; // Legacy single-key format
  units?: string | null;
  multiply?: number;
  customName: string;
  positionX: number;
  positionY: number;
  fontSize?: number;
  color?: string;
  iconName?: string | null;
  iconColor?: string | null;
  showIcon?: boolean | null;
  displayLayout?: "vertical" | "horizontal" | "grid";
  device: {
    uniqId: string;
    name: string;
    topic: string;
    lastPayload?: string | null;
  };
}

interface Layout2DFlowIndicator {
  id: string;
  layoutId: string;
  deviceUniqId: string;
  selectedKey: string;
  customName: string;
  positionX: number;
  positionY: number;
  arrowDirection: string;
  logicOperator: string;
  compareValue: string;
  valueType: string;
  trueColor: string;
  trueAnimation: boolean;
  falseColor: string;
  falseAnimation: boolean;
  warningColor: string;
  warningAnimation: boolean;
  warningEnabled: boolean;
  warningOperator?: string;
  warningValue?: string;
  // NEW: Multi-logic fields
  useMultiLogic?: boolean;
  multiLogicConfig?: string;
  device: {
    uniqId: string;
    name: string;
    topic: string;
    lastPayload?: string | null;
  };
}

interface Layout2DCanvasProps {
  layoutId?: string;
  backgroundImage?: string | null;
  className?: string;
  isManageMode?: boolean;
  onAddDataPoint?: (x: number, y: number) => void;
  onEditDataPoint?: (dataPoint: Layout2DDataPoint) => void;
  onDeleteDataPoint?: (dataPointId: string) => void;
  onAddFlowIndicator?: (x: number, y: number) => void;
  onEditFlowIndicator?: (indicator: Layout2DFlowIndicator) => void;
  onCopyFlowIndicator?: (indicator: Layout2DFlowIndicator) => void;
  onDeleteFlowIndicator?: (indicatorId: string) => void;
  refreshTrigger?: string; // Trigger untuk refresh data points
}

export default function Layout2DCanvas({
  layoutId,
  backgroundImage,
  className = "w-full h-full",
  isManageMode = false,
  onAddDataPoint,
  onEditDataPoint,
  onDeleteDataPoint,
  onAddFlowIndicator,
  onEditFlowIndicator,
  onCopyFlowIndicator,
  onDeleteFlowIndicator,
  refreshTrigger,
}: Layout2DCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [actualCanvasSize, setActualCanvasSize] = useState({
    width: 800,
    height: 600,
  });
  const [dataPoints, setDataPoints] = useState<Layout2DDataPoint[]>([]);
  const [flowIndicators, setFlowIndicators] = useState<Layout2DFlowIndicator[]>(
    []
  );
  const [dataValues, setDataValues] = useState<Record<string, any>>({});
  const [selectedDataPoint, setSelectedDataPoint] = useState<string | null>(
    null
  );
  const [selectedFlowIndicator, setSelectedFlowIndicator] = useState<
    string | null
  >(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggedDataPoint, setDraggedDataPoint] = useState<string | null>(null);
  const [draggedFlowIndicator, setDraggedFlowIndicator] = useState<
    string | null
  >(null);
  const [deviceDetailModalOpen, setDeviceDetailModalOpen] = useState(false);
  const [selectedDataPointForDetail, setSelectedDataPointForDetail] =
    useState<Layout2DDataPoint | null>(null);
  const [deleteDataPointId, setDeleteDataPointId] = useState<string | null>(
    null
  );
  const [deleteFlowIndicatorId, setDeleteFlowIndicatorId] = useState<
    string | null
  >(null);

  // Image loading states for optimization
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isImageError, setIsImageError] = useState(false);
  const [cachedImage, setCachedImage] = useState<HTMLImageElement | null>(null);

  // DataPoint Tooltip states
  const [dataPointTooltip, setDataPointTooltip] = useState<{
    visible: boolean;
    dataPoint: Layout2DDataPoint | null;
    position: { x: number; y: number };
  }>({
    visible: false,
    dataPoint: null,
    position: { x: 0, y: 0 }
  });

  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  // Fetch data points dan flow indicators untuk layout ini
  useEffect(() => {
    if (!layoutId) return;

    const fetchLayoutData = async () => {
      try {
        // Fetch data points
        const dataPointsResponse = await fetch(
          `${API_BASE_URL}/api/layout2d/${layoutId}/datapoints`
        );
        if (dataPointsResponse.ok) {
          const dataPointsData = await dataPointsResponse.json();
          setDataPoints(dataPointsData);
        }

        // Fetch flow indicators
        const flowIndicatorsResponse = await fetch(
          `${API_BASE_URL}/api/layout2d/${layoutId}/flowindicators`
        );
        if (flowIndicatorsResponse.ok) {
          const flowIndicatorsData = await flowIndicatorsResponse.json();
          setFlowIndicators(flowIndicatorsData);
        }
      } catch (error) {
        console.error("Failed to fetch layout data:", error);
      }
    };

    fetchLayoutData();
  }, [layoutId, refreshTrigger]);

  // Fetch data points untuk layout ini (legacy support)
  useEffect(() => {
    if (!layoutId) return;

    const fetchDataPoints = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/layout2d/${layoutId}/datapoints`
        );
        if (response.ok) {
          const data = await response.json();
          // setDataPoints(data); // Commented out since handled in fetchLayoutData

          // Load initial data values dari lastPayload device
          const initialValues: Record<string, any> = {};
          data.forEach((dp: Layout2DDataPoint) => {
            if (dp.device.lastPayload) {
              try {
                const payload = JSON.parse(dp.device.lastPayload);
                const innerPayload =
                  typeof payload.value === "string"
                    ? JSON.parse(payload.value)
                    : payload.value || {};
                initialValues[dp.device.topic] = innerPayload;
              } catch (error) {
                console.error("Failed to parse initial payload:", error);
              }
            }
          });

          if (Object.keys(initialValues).length > 0) {
            setDataValues((prev) => ({
              ...prev,
              ...initialValues,
            }));
          }
        }
      } catch (error) {
        console.error("Failed to fetch data points:", error);
      }
    };

    fetchDataPoints();
  }, [layoutId, refreshTrigger]); // Tambahkan refreshTrigger sebagai dependency

  // MQTT message handler
  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};

        // Update data values untuk semua data points yang menggunakan topic ini
        setDataValues((prev) => ({
          ...prev,
          [topic]: innerPayload,
        }));
      } catch (error) {
        console.error("Failed to parse MQTT payload:", error);
      }
    },
    []
  );

  // Subscribe ke MQTT topics
  useEffect(() => {
    if (!isReady || connectionStatus !== "Connected") return;

    const topics = new Set(dataPoints.map((dp) => dp.device.topic));

    topics.forEach((topic) => {
      if (topic) {
        subscribe(topic, handleMqttMessage);
      }
    });

    return () => {
      topics.forEach((topic) => {
        if (topic) {
          unsubscribe(topic, handleMqttMessage);
        }
      });
    };
  }, [
    dataPoints,
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  // Canvas resize handler - set container dimensions with full width
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: rect.width,
          height: backgroundImage ? 600 : rect.height, // Use 600px min height for images, or container height for grid
        });
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [backgroundImage]);

  // Optimized image loading with caching and loading states
  useEffect(() => {
    if (backgroundImage) {
      // Check if image is already cached
      if (cachedImage && cachedImage.src === backgroundImage) {
        // Use cached image immediately
        setImageSize({
          width: cachedImage.width,
          height: cachedImage.height,
        });

        const aspectRatio = cachedImage.height / cachedImage.width;
        const scaledHeight = canvasSize.width * aspectRatio;

        setActualCanvasSize({
          width: canvasSize.width,
          height: scaledHeight,
        });
        setIsImageLoading(false);
        setIsImageError(false);
        return;
      }

      // Start loading new image
      setIsImageLoading(true);
      setIsImageError(false);

      const img = new Image();

      img.onload = () => {
        setImageSize({
          width: img.width,
          height: img.height,
        });

        // Use fixed width (container width) and calculate height proportionally
        const aspectRatio = img.height / img.width;
        const scaledHeight = canvasSize.width * aspectRatio;

        setActualCanvasSize({
          width: canvasSize.width,
          height: scaledHeight,
        });

        // Cache the loaded image
        setCachedImage(img);
        setIsImageLoading(false);
        setIsImageError(false);
      };

      img.onerror = () => {
        console.error("Failed to load background image:", backgroundImage);
        setIsImageLoading(false);
        setIsImageError(true);
        // Fall back to container size
        setActualCanvasSize(canvasSize);
      };

      // Add loading optimization
      img.loading = "eager";
      img.src = backgroundImage;
    } else {
      // Use container size for grid if no image
      setActualCanvasSize(canvasSize);
      setIsImageLoading(false);
      setIsImageError(false);
      setCachedImage(null);
    }
  }, [backgroundImage, canvasSize, cachedImage]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, actualCanvasSize.width, actualCanvasSize.height);

    // Draw background image if provided and cached
    if (backgroundImage && cachedImage && cachedImage.src === backgroundImage) {
      // Use cached image immediately - no need to reload
      ctx.drawImage(
        cachedImage,
        0,
        0,
        actualCanvasSize.width,
        actualCanvasSize.height
      );
    } else {
      // Draw default grid pattern
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;

      for (let x = 0; x <= actualCanvasSize.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, actualCanvasSize.height);
        ctx.stroke();
      }

      for (let y = 0; y <= actualCanvasSize.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(actualCanvasSize.width, y);
        ctx.stroke();
      }
    }
  }, [backgroundImage, actualCanvasSize, cachedImage]);

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / actualCanvasSize.width) * 100; // Convert to percentage
    const y = ((e.clientY - rect.top) / actualCanvasSize.height) * 100;

    // Check if clicking on existing data point
    const clickedDataPoint = dataPoints.find((dp) => {
      const dpX = (dp.positionX / 100) * actualCanvasSize.width;
      const dpY = (dp.positionY / 100) * actualCanvasSize.height;
      const distance = Math.sqrt(
        Math.pow(e.clientX - rect.left - dpX, 2) +
          Math.pow(e.clientY - rect.top - dpY, 2)
      );
      return distance < 30; // 30px tolerance
    });

    // Check if clicking on existing flow indicator
    const clickedFlowIndicator = flowIndicators.find((fi) => {
      const fiX = (fi.positionX / 100) * actualCanvasSize.width;
      const fiY = (fi.positionY / 100) * actualCanvasSize.height;
      const distance = Math.sqrt(
        Math.pow(e.clientX - rect.left - fiX, 2) +
          Math.pow(e.clientY - rect.top - fiY, 2)
      );
      return distance < 25; // 25px tolerance for flow indicators
    });

    if (clickedDataPoint) {
      setSelectedDataPoint(clickedDataPoint.id);
      setSelectedFlowIndicator(null); // Clear flow indicator selection
      // If not in manage mode, show device detail modal
      if (!isManageMode) {
        setSelectedDataPointForDetail(clickedDataPoint);
        setDeviceDetailModalOpen(true);
      }
    } else if (clickedFlowIndicator) {
      setSelectedFlowIndicator(clickedFlowIndicator.id);
      setSelectedDataPoint(null); // Clear data point selection
      // Flow indicators don't show detail modal in non-manage mode
    } else {
      setSelectedDataPoint(null);
      setSelectedFlowIndicator(null);
      // Hide tooltip when clicking on empty area
      hideDataPointTooltip();
      // Only add new items if not clicking on existing ones and in manage mode
      if (isManageMode) {
        // For now, default to adding data points
        // Later we can add a mode selector for data points vs flow indicators
        onAddDataPoint?.(x, y);
      }
    }
  };

  // Format value dengan multiply dan units - support both single and multi-key formats
  const formatValue = (
    dataPoint: Layout2DDataPoint
  ): { value: string; isBoolean: boolean; booleanValue?: boolean } => {
    const topicData = dataValues[dataPoint.device.topic];

    // Handle multi-key format (new)
    if (dataPoint.selectedKeys && dataPoint.selectedKeys.length > 0) {
      const values: string[] = [];

      for (const keyConfig of dataPoint.selectedKeys) {
        if (!topicData || !topicData.hasOwnProperty(keyConfig.key)) {
          values.push(`${keyConfig.customName || keyConfig.key}: —`);
          continue;
        }

        const rawValue = topicData[keyConfig.key];
        const processedValue = processRawValue(rawValue, keyConfig);
        const displayName = keyConfig.customName || keyConfig.key;
        values.push(`${displayName}: ${processedValue.value}`);
      }

      return {
        value: values.join("\n"),
        isBoolean: false,
      };
    }

    // Handle single-key format (legacy)
    if (dataPoint.selectedKey) {
      if (!topicData || !topicData.hasOwnProperty(dataPoint.selectedKey)) {
        return { value: "—", isBoolean: false };
      }

      const rawValue = topicData[dataPoint.selectedKey];
      const processed = processRawValue(rawValue, {
        key: dataPoint.selectedKey,
        units: dataPoint.units || undefined,
        multiply: dataPoint.multiply || 1,
      });
      return processed;
    }

    return { value: "—", isBoolean: false };
  };

  // NEW: Define types for multi-logic configuration
  type LogicCondition = {
    operator: string;
    value: any;
    valueType: "number" | "string" | "boolean";
  };

  type LogicState = {
    name: string;
    color: string;
    animation: boolean;
    conditions: LogicCondition[];
    conditionLogic: "AND" | "OR"; // How to combine multiple conditions
  };

  type MultiLogicConfig = {
    states: LogicState[];
    defaultState: string;
  };

  // NEW: Evaluate multi-logic configuration
  const evaluateMultiLogicCondition = (
    indicator: Layout2DFlowIndicator,
    currentValue: any
  ): { state: string; color: string; animation: boolean } => {
    // More robust validation before attempting multi-logic evaluation
    if (
      !indicator.useMultiLogic ||
      !indicator.multiLogicConfig ||
      indicator.multiLogicConfig.trim() === "" ||
      indicator.multiLogicConfig === "null" ||
      indicator.multiLogicConfig === "undefined"
    ) {
      // Fallback to legacy system
      const legacyState = evaluateFlowCondition(indicator, currentValue);
      return getLegacyVisualState(indicator, legacyState);
    }

    try {
      const config: MultiLogicConfig = JSON.parse(indicator.multiLogicConfig);

      // Check if config and states are valid with more comprehensive validation
      if (
        !config ||
        typeof config !== "object" ||
        !config.states ||
        !Array.isArray(config.states) ||
        config.states.length === 0 ||
        !config.defaultState ||
        typeof config.defaultState !== "string"
      ) {
        // Silently fall back to legacy system instead of logging warnings
        const legacyState = evaluateFlowCondition(indicator, currentValue);
        return getLegacyVisualState(indicator, legacyState);
      }

      // Evaluate each state's conditions
      for (const state of config.states) {
        const conditionResults = state.conditions.map((condition) => {
          const convertedValue = convertValueByType(
            currentValue,
            condition.valueType
          );
          const convertedCompareValue = convertValueByType(
            condition.value,
            condition.valueType
          );
          return evaluateCondition(
            convertedValue,
            condition.operator,
            convertedCompareValue
          );
        });

        // Apply condition logic (AND/OR)
        const stateMatches =
          state.conditionLogic === "AND"
            ? conditionResults.every((result) => result)
            : conditionResults.some((result) => result);

        if (stateMatches) {
          return {
            state: state.name,
            color: state.color,
            animation: state.animation,
          };
        }
      }

      // No conditions matched, return default state
      if (config.states && Array.isArray(config.states)) {
        const defaultState = config.states.find(
          (s) => s.name === config.defaultState
        );
        if (defaultState) {
          return {
            state: defaultState.name,
            color: defaultState.color,
            animation: defaultState.animation,
          };
        }
      }

      // Fallback if no default state found
      return { state: "unknown", color: "#666666", animation: false };
    } catch (error) {
      // Silently fall back to legacy system on JSON parse errors
      const legacyState = evaluateFlowCondition(indicator, currentValue);
      return getLegacyVisualState(indicator, legacyState);
    }
  };

  // Helper function to convert values by type
  const convertValueByType = (value: any, valueType: string): any => {
    try {
      switch (valueType) {
        case "number":
          return Number(value);
        case "boolean":
          return Boolean(value === "true" || value === true || value === 1);
        case "string":
        default:
          return String(value);
      }
    } catch (error) {
      return value;
    }
  };

  // Helper function to get legacy visual state
  const getLegacyVisualState = (
    indicator: Layout2DFlowIndicator,
    state: "true" | "false" | "warning"
  ) => {
    switch (state) {
      case "true":
        return {
          state,
          color: indicator.trueColor,
          animation: indicator.trueAnimation,
        };
      case "warning":
        return {
          state,
          color: indicator.warningColor,
          animation: indicator.warningAnimation,
        };
      case "false":
      default:
        return {
          state,
          color: indicator.falseColor,
          animation: indicator.falseAnimation,
        };
    }
  };

  // Evaluate flow indicator logic condition (Legacy - kept for backward compatibility)
  const evaluateFlowCondition = (
    indicator: Layout2DFlowIndicator,
    currentValue: any
  ): "true" | "false" | "warning" => {
    const {
      logicOperator,
      compareValue,
      valueType,
      warningEnabled,
      warningOperator,
      warningValue,
    } = indicator;

    // Convert values based on type
    let actualValue: any = currentValue;
    let comparisonValue: any = compareValue;
    let warningComparisonValue: any = warningValue;

    try {
      if (valueType === "number") {
        actualValue = Number(currentValue);
        comparisonValue = Number(compareValue);
        if (warningValue) warningComparisonValue = Number(warningValue);
      } else if (valueType === "boolean") {
        actualValue = Boolean(
          currentValue === "true" || currentValue === true || currentValue === 1
        );
        comparisonValue = compareValue === "true" || compareValue === "1";
        if (warningValue)
          warningComparisonValue =
            warningValue === "true" || warningValue === "1";
      }
      // For string type, keep as is
    } catch (error) {
      console.error("Error converting values for comparison:", error);
      return "false";
    }

    // Check warning condition first (if enabled)
    if (warningEnabled && warningOperator && warningValue) {
      const warningResult = evaluateCondition(
        actualValue,
        warningOperator,
        warningComparisonValue
      );
      if (warningResult) return "warning";
    }

    // Check main condition
    const mainResult = evaluateCondition(
      actualValue,
      logicOperator,
      comparisonValue
    );
    return mainResult ? "true" : "false";
  };

  // Helper function to evaluate individual condition
  const evaluateCondition = (
    value: any,
    operator: string,
    compareWith: any
  ): boolean => {
    switch (operator) {
      case ">":
        return value > compareWith;
      case ">=":
        return value >= compareWith;
      case "<":
        return value < compareWith;
      case "<=":
        return value <= compareWith;
      case "==":
        return value == compareWith;
      case "!=":
        return value != compareWith;
      default:
        return false;
    }
  };

  // Get flow indicator visual state
  const getFlowIndicatorState = (indicator: Layout2DFlowIndicator) => {
    const topicData = dataValues[indicator.device.topic];
    if (!topicData || !topicData.hasOwnProperty(indicator.selectedKey)) {
      // Return default state when no data available
      if (
        indicator.useMultiLogic &&
        indicator.multiLogicConfig &&
        indicator.multiLogicConfig.trim() !== "" &&
        indicator.multiLogicConfig !== "null" &&
        indicator.multiLogicConfig !== "undefined"
      ) {
        try {
          const config: MultiLogicConfig = JSON.parse(
            indicator.multiLogicConfig
          );
          if (
            config &&
            typeof config === "object" &&
            config.states &&
            Array.isArray(config.states) &&
            config.states.length > 0 &&
            config.defaultState &&
            typeof config.defaultState === "string"
          ) {
            const defaultState = config.states.find(
              (s) => s.name === config.defaultState
            );
            if (defaultState) {
              return {
                state: defaultState.name,
                color: defaultState.color,
                animation: defaultState.animation,
              };
            }
          }
        } catch (error) {
          // Silently fall through to legacy fallback
        }
      }

      // Fallback to legacy default
      return {
        state: "false" as const,
        color: indicator.falseColor,
        animation: indicator.falseAnimation,
      };
    }

    const currentValue = topicData[indicator.selectedKey];

    // Use new multi-logic system if enabled, otherwise fallback to legacy
    return evaluateMultiLogicCondition(indicator, currentValue);
  };

  // Helper function to process raw values
  const processRawValue = (
    rawValue: any,
    config: { key: string; units?: string; multiply?: number }
  ): { value: string; isBoolean: boolean; booleanValue?: boolean } => {
    // Handle boolean values (0/1 -> False/True)
    if (typeof rawValue === "boolean") {
      return {
        value: rawValue ? "True" : "False",
        isBoolean: true,
        booleanValue: rawValue,
      };
    }

    // Handle numeric boolean values (0/1 -> False/True)
    if (typeof rawValue === "number" && (rawValue === 0 || rawValue === 1)) {
      // Check if this should be treated as boolean (no units and multiply = 1)
      const isBoolean =
        !config.units && (config.multiply === 1 || !config.multiply);
      if (isBoolean) {
        const boolValue = rawValue === 1;
        return {
          value: boolValue ? "True" : "False",
          isBoolean: true,
          booleanValue: boolValue,
        };
      }
    }

    const finalValue =
      typeof rawValue === "number"
        ? rawValue * (config.multiply || 1)
        : rawValue;

    if (typeof finalValue === "number") {
      const formatted = finalValue.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: finalValue % 1 === 0 ? 0 : 1,
      });
      return {
        value: config.units ? `${formatted} ${config.units}` : formatted,
        isBoolean: false,
      };
    }

    return {
      value: String(finalValue),
      isBoolean: false,
    };
  };

  // Handle data point mouse events for drag & drop
  const handleDataPointMouseDown = (
    e: React.MouseEvent,
    dataPointId: string
  ) => {
    if (!isManageMode) {
      console.log('🔧 [Drag&Drop] Not in manage mode, ignoring mouse down');
      return;
    }

    console.log('🔧 [Drag&Drop] Data point mouse down:', { dataPointId, isManageMode });

    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      console.error('🔧 [Drag&Drop] Container ref not available');
      return;
    }

    const dataPoint = dataPoints.find((dp) => dp.id === dataPointId);
    if (!dataPoint) {
      console.error('🔧 [Drag&Drop] Data point not found:', dataPointId);
      return;
    }

    const dataPointX = (dataPoint.positionX / 100) * actualCanvasSize.width;
    const dataPointY = (dataPoint.positionY / 100) * actualCanvasSize.height;

    console.log('🔧 [Drag&Drop] Starting data point drag:', {
      dataPointName: dataPoint.customName,
      currentPosition: { x: dataPoint.positionX, y: dataPoint.positionY },
      pixelPosition: { x: dataPointX, y: dataPointY },
      mousePosition: { x: e.clientX - rect.left, y: e.clientY - rect.top }
    });

    setIsDragging(true);
    setDraggedDataPoint(dataPointId);
    setSelectedDataPoint(dataPointId);
    setDragOffset({
      x: e.clientX - rect.left - dataPointX,
      y: e.clientY - rect.top - dataPointY,
    });

    // No tooltip in manage mode during drag
  };

  // Handler untuk manage mode
  const handleDataPointClick = (
    e: React.MouseEvent,
    dataPoint: Layout2DDataPoint
  ) => {
    if (!isManageMode) return;

    e.stopPropagation();
    if (!isDragging) {
      setSelectedDataPoint(dataPoint.id);

      // Double click to edit
      if (e.detail === 2) {
        onEditDataPoint?.(dataPoint);
      }
    }
  };

  // Handler untuk view mode (non-manage mode)
  const handleDataPointViewClick = (
    e: React.MouseEvent,
    dataPoint: Layout2DDataPoint
  ) => {
    if (isManageMode) return;

    e.stopPropagation();

    // Show tooltip on click in view mode
    showDataPointTooltip(dataPoint, e);
  };

  // Removed duplicate mouse handlers - using updated handlers below

  // Removed duplicate drag handlers - using updated handlers below

  // Update data point position
  const updateDataPointPosition = useCallback(async (
    dataPointId: string,
    x: number,
    y: number
  ) => {
    console.log('🔧 [Drag&Drop] Updating data point position:', { dataPointId, x, y });
    console.log('🔧 [Drag&Drop] Current dataPoints count:', dataPoints.length);
    console.log('🔧 [Drag&Drop] Layout ID:', layoutId);
    console.log('🔧 [Drag&Drop] API Base URL:', API_BASE_URL);

    try {
      const dataPoint = dataPoints.find((dp) => dp.id === dataPointId);
      if (!dataPoint) {
        console.error('🔧 [Drag&Drop] Data point not found:', dataPointId);
        return;
      }

      console.log('🔧 [Drag&Drop] Found data point:', dataPoint.customName);

      // Prepare update data with all required fields
      const updateData = {
        deviceUniqId: dataPoint.device.uniqId,
        selectedKeys: dataPoint.selectedKeys,
        selectedKey: dataPoint.selectedKey,
        units: dataPoint.units,
        multiply: dataPoint.multiply,
        customName: dataPoint.customName,
        positionX: x,
        positionY: y,
        fontSize: dataPoint.fontSize,
        color: dataPoint.color,
        iconName: dataPoint.iconName,
        iconColor: dataPoint.iconColor,
        showIcon: dataPoint.showIcon,
        displayLayout: dataPoint.displayLayout,
      };

      const apiUrl = `${API_BASE_URL}/api/layout2d/${layoutId}/datapoints/${dataPointId}`;
      console.log('🔧 [Drag&Drop] Making API call to:', apiUrl);
      console.log('🔧 [Drag&Drop] Update data:', updateData);

      const response = await fetch(apiUrl, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      console.log('🔧 [Drag&Drop] API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔧 [Drag&Drop] API error:', errorText);

        // Revert position if update fails
        setDataPoints((prev) =>
          prev.map((dp) =>
            dp.id === dataPointId
              ? {
                  ...dp,
                  positionX: dataPoint.positionX,
                  positionY: dataPoint.positionY,
                }
              : dp
          )
        );
        throw new Error(`Failed to update data point position: ${errorText}`);
      }

      const responseData = await response.json();
      console.log('🔧 [Drag&Drop] API success response:', responseData);
      console.log('✅ [Drag&Drop] Data point position updated successfully');
    } catch (error) {
      console.error('❌ [Drag&Drop] Failed to update data point position:', error);

      // Revert on error - use current dataPoints state
      const originalDataPoint = dataPoints.find((dp) => dp.id === dataPointId);
      if (originalDataPoint) {
        console.log('🔧 [Drag&Drop] Reverting to original position:', {
          x: originalDataPoint.positionX,
          y: originalDataPoint.positionY
        });

        setDataPoints((prev) =>
          prev.map((dp) =>
            dp.id === dataPointId
              ? {
                  ...dp,
                  positionX: originalDataPoint.positionX,
                  positionY: originalDataPoint.positionY,
                }
              : dp
          )
        );
      }
    }
  }, [dataPoints, layoutId, API_BASE_URL]);

  // Flow indicator handlers
  const handleFlowIndicatorMouseDown = (
    e: React.MouseEvent,
    indicatorId: string
  ) => {
    if (!isManageMode) {
      console.log('🔧 [Drag&Drop] Not in manage mode, ignoring flow indicator mouse down');
      return;
    }

    console.log('🔧 [Drag&Drop] Flow indicator mouse down:', { indicatorId, isManageMode });

    e.preventDefault();
    e.stopPropagation();

    const indicator = flowIndicators.find((fi) => fi.id === indicatorId);
    if (!indicator) {
      console.error('🔧 [Drag&Drop] Flow indicator not found:', indicatorId);
      return;
    }

    setSelectedFlowIndicator(indicatorId);
    setIsDragging(true);
    setDraggedFlowIndicator(indicatorId);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const indicatorX = (indicator.positionX / 100) * actualCanvasSize.width;
      const indicatorY = (indicator.positionY / 100) * actualCanvasSize.height;

      console.log('🔧 [Drag&Drop] Starting flow indicator drag:', {
        indicatorName: indicator.customName,
        currentPosition: { x: indicator.positionX, y: indicator.positionY },
        pixelPosition: { x: indicatorX, y: indicatorY },
        mousePosition: { x: e.clientX - rect.left, y: e.clientY - rect.top }
      });

      setDragOffset({
        x: e.clientX - rect.left - indicatorX,
        y: e.clientY - rect.top - indicatorY,
      });
    }
  };

  const handleFlowIndicatorClick = (
    e: React.MouseEvent,
    indicator: Layout2DFlowIndicator
  ) => {
    e.stopPropagation();
    if (!isDragging) {
      setSelectedFlowIndicator(indicator.id);
      // Double click to edit
      if (e.detail === 2) {
        onEditFlowIndicator?.(indicator);
      }
    }
  };

  // Update flow indicator position
  const updateFlowIndicatorPosition = useCallback(async (
    indicatorId: string,
    x: number,
    y: number
  ) => {
    console.log('🔧 [Drag&Drop] Updating flow indicator position:', { indicatorId, x, y });
    console.log('🔧 [Drag&Drop] Current flowIndicators count:', flowIndicators.length);
    console.log('🔧 [Drag&Drop] Layout ID:', layoutId);
    console.log('🔧 [Drag&Drop] API Base URL:', API_BASE_URL);

    try {
      const indicator = flowIndicators.find((fi) => fi.id === indicatorId);
      if (!indicator) {
        console.error('🔧 [Drag&Drop] Flow indicator not found:', indicatorId);
        return;
      }

      console.log('🔧 [Drag&Drop] Found flow indicator:', indicator.customName);

      // Prepare update data with all required fields
      const updateData = {
        deviceUniqId: indicator.device.uniqId,
        selectedKey: indicator.selectedKey,
        customName: indicator.customName,
        positionX: x,
        positionY: y,
        arrowDirection: indicator.arrowDirection,
        logicOperator: indicator.logicOperator,
        compareValue: indicator.compareValue,
        valueType: indicator.valueType,
        trueColor: indicator.trueColor,
        trueAnimation: indicator.trueAnimation,
        falseColor: indicator.falseColor,
        falseAnimation: indicator.falseAnimation,
        warningColor: indicator.warningColor,
        warningAnimation: indicator.warningAnimation,
        warningEnabled: indicator.warningEnabled,
        warningOperator: indicator.warningOperator,
        warningValue: indicator.warningValue,
        useMultiLogic: indicator.useMultiLogic,
        multiLogicConfig: indicator.multiLogicConfig,
      };

      const apiUrl = `${API_BASE_URL}/api/layout2d/${layoutId}/flowindicators/${indicatorId}`;
      console.log('🔧 [Drag&Drop] Making API call to:', apiUrl);
      console.log('🔧 [Drag&Drop] Update data:', updateData);

      const response = await fetch(apiUrl, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      console.log('🔧 [Drag&Drop] API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔧 [Drag&Drop] API error:', errorText);

        // Revert position if update fails
        setFlowIndicators((prev) =>
          prev.map((fi) =>
            fi.id === indicatorId
              ? {
                  ...fi,
                  positionX: indicator.positionX,
                  positionY: indicator.positionY,
                }
              : fi
          )
        );
        throw new Error(`Failed to update flow indicator position: ${errorText}`);
      }

      const responseData = await response.json();
      console.log('🔧 [Drag&Drop] API success response:', responseData);
      console.log('✅ [Drag&Drop] Flow indicator position updated successfully');
    } catch (error) {
      console.error('❌ [Drag&Drop] Failed to update flow indicator position:', error);

      // Revert on error - use current flowIndicators state
      const originalIndicator = flowIndicators.find((fi) => fi.id === indicatorId);
      if (originalIndicator) {
        console.log('🔧 [Drag&Drop] Reverting to original position:', {
          x: originalIndicator.positionX,
          y: originalIndicator.positionY
        });

        setFlowIndicators((prev) =>
          prev.map((fi) =>
            fi.id === indicatorId
              ? {
                  ...fi,
                  positionX: originalIndicator.positionX,
                  positionY: originalIndicator.positionY,
                }
              : fi
          )
        );
      }
    }
  }, [flowIndicators, layoutId, API_BASE_URL]);

  // Tooltip helper function - moved here to be available for handleMouseMoveUpdated
  const updateTooltipPosition = useCallback((mouseEvent: MouseEvent) => {
    if (!dataPointTooltip.visible || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setDataPointTooltip(prev => ({
      ...prev,
      position: {
        x: mouseEvent.clientX - rect.left,
        y: mouseEvent.clientY - rect.top
      }
    }));
  }, [dataPointTooltip.visible]);

  // Updated global mouse handlers to support both data points and flow indicators
  const handleMouseMoveUpdated = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const newX =
      ((e.clientX - rect.left - dragOffset.x) / actualCanvasSize.width) * 100;
    const newY =
      ((e.clientY - rect.top - dragOffset.y) / actualCanvasSize.height) * 100;

    // Constrain to canvas bounds
    const constrainedX = Math.max(0, Math.min(100, newX));
    const constrainedY = Math.max(0, Math.min(100, newY));

    console.log('🔧 [Drag&Drop] Mouse move - new position:', {
      constrainedX: constrainedX.toFixed(2),
      constrainedY: constrainedY.toFixed(2),
      draggedDataPoint,
      draggedFlowIndicator
    });

    // Update tooltip position during drag
    updateTooltipPosition(e);

    if (draggedDataPoint) {
      // Update data point position
      setDataPoints((prev) =>
        prev.map((dp) =>
          dp.id === draggedDataPoint
            ? { ...dp, positionX: constrainedX, positionY: constrainedY }
            : dp
        )
      );
    } else if (draggedFlowIndicator) {
      // Update flow indicator position
      setFlowIndicators((prev) =>
        prev.map((fi) =>
          fi.id === draggedFlowIndicator
            ? { ...fi, positionX: constrainedX, positionY: constrainedY }
            : fi
        )
      );
    }
  }, [isDragging, dragOffset, actualCanvasSize, draggedDataPoint, draggedFlowIndicator, updateTooltipPosition]);

  const handleMouseUpUpdated = useCallback(() => {
    console.log('🔧 [Drag&Drop] Mouse up - ending drag operation', {
      isDragging,
      draggedDataPoint,
      draggedFlowIndicator
    });

    if (isDragging && draggedDataPoint) {
      const draggedDataPointData = dataPoints.find(
        (dp) => dp.id === draggedDataPoint
      );
      if (draggedDataPointData) {
        console.log('🔧 [Drag&Drop] Calling updateDataPointPosition with final position:', {
          x: draggedDataPointData.positionX,
          y: draggedDataPointData.positionY
        });
        updateDataPointPosition(
          draggedDataPoint,
          draggedDataPointData.positionX,
          draggedDataPointData.positionY
        );
      }
    } else if (isDragging && draggedFlowIndicator) {
      const draggedIndicatorData = flowIndicators.find(
        (fi) => fi.id === draggedFlowIndicator
      );
      if (draggedIndicatorData) {
        console.log('🔧 [Drag&Drop] Calling updateFlowIndicatorPosition with final position:', {
          x: draggedIndicatorData.positionX,
          y: draggedIndicatorData.positionY
        });
        updateFlowIndicatorPosition(
          draggedFlowIndicator,
          draggedIndicatorData.positionX,
          draggedIndicatorData.positionY
        );
      }
    }

    setIsDragging(false);
    setDraggedDataPoint(null);
    setDraggedFlowIndicator(null);
    setDragOffset({ x: 0, y: 0 });
    console.log('🔧 [Drag&Drop] Drag operation completed');
  }, [
    isDragging,
    draggedDataPoint,
    draggedFlowIndicator,
    dataPoints,
    flowIndicators,
    updateDataPointPosition,
    updateFlowIndicatorPosition
  ]);

  // Update the existing useEffect to use the new handlers
  useEffect(() => {
    console.log('🔧 [Drag&Drop] Setting up event listeners', { isDragging });

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMoveUpdated);
      document.addEventListener("mouseup", handleMouseUpUpdated);
      console.log('🔧 [Drag&Drop] Event listeners added');

      return () => {
        document.removeEventListener("mousemove", handleMouseMoveUpdated);
        document.removeEventListener("mouseup", handleMouseUpUpdated);
        console.log('🔧 [Drag&Drop] Event listeners removed');
      };
    }
  }, [isDragging, handleMouseMoveUpdated, handleMouseUpUpdated]);

  // Tooltip helper functions - only show tooltip when NOT in manage mode
  const showDataPointTooltip = useCallback((dataPoint: Layout2DDataPoint, mouseEvent: React.MouseEvent) => {
    if (!containerRef.current || isManageMode) return; // ← ADDED isManageMode check

    const rect = containerRef.current.getBoundingClientRect();
    setDataPointTooltip({
      visible: true,
      dataPoint,
      position: {
        x: mouseEvent.clientX - rect.left,
        y: mouseEvent.clientY - rect.top
      }
    });
  }, [isManageMode]); // ← ADDED isManageMode dependency

  const hideDataPointTooltip = useCallback(() => {
    setDataPointTooltip({
      visible: false,
      dataPoint: null,
      position: { x: 0, y: 0 }
    });
  }, []);

  // Auto-hide tooltip when not dragging or when entering manage mode
  useEffect(() => {
    if (isManageMode && dataPointTooltip.visible) {
      // Immediately hide tooltip when entering manage mode
      hideDataPointTooltip();
    } else if (!isDragging && dataPointTooltip.visible && !isManageMode) {
      const timer = setTimeout(() => {
        hideDataPointTooltip();
      }, 3000); // Hide after 3 seconds in view mode

      return () => clearTimeout(timer);
    }
  }, [isDragging, dataPointTooltip.visible, isManageMode, hideDataPointTooltip]);

  return (
    <TooltipProvider>
      <Card className={className}>
      <div
        ref={containerRef}
        className="relative w-full overflow-auto"
        style={{
          height: backgroundImage ? `${actualCanvasSize.height}px` : "600px",
          minHeight: "400px",
        }}
      >
        {/* Skeleton Loading State */}
        {isImageLoading && backgroundImage && (
          <div
            className="absolute inset-0 z-30 bg-gray-50 animate-pulse"
            style={{
              width: actualCanvasSize.width,
              height: actualCanvasSize.height,
            }}
          >
            <div className="w-full h-full bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 relative overflow-hidden">
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />

              {/* Grid pattern placeholder */}
              <div className="absolute inset-0 opacity-30">
                {Array.from({
                  length: Math.ceil(actualCanvasSize.height / 50),
                }).map((_, rowIndex) =>
                  Array.from({
                    length: Math.ceil(actualCanvasSize.width / 50),
                  }).map((_, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className="absolute border border-gray-300/30"
                      style={{
                        left: colIndex * 50,
                        top: rowIndex * 50,
                        width: 50,
                        height: 50,
                      }}
                    />
                  ))
                )}
              </div>

              {/* Loading indicator */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-sm text-gray-600 font-medium">
                      Loading background image...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {isImageError && backgroundImage && (
          <div className="absolute inset-0 z-30 bg-red-50 border-2 border-red-200 border-dashed">
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-medium text-red-800 mb-2">
                  Failed to load image
                </h3>
                <p className="text-red-600 text-sm">
                  The background image could not be loaded.
                </p>
              </div>
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={actualCanvasSize.width}
          height={actualCanvasSize.height}
          className={`block cursor-pointer w-full h-auto ${
            isImageLoading ? "opacity-0" : "opacity-100"
          } transition-opacity duration-300`}
          onClick={handleCanvasClick}
          style={{
            maxWidth: "100%",
            height: "auto",
            display: "block",
          }}
        />

        {/* Data Points Overlay */}
        {dataPoints.map((dataPoint) => {
          const x = (dataPoint.positionX / 100) * actualCanvasSize.width;
          const y = (dataPoint.positionY / 100) * actualCanvasSize.height;
          const valueData = formatValue(dataPoint);
          const isSelected = selectedDataPoint === dataPoint.id;
          const IconComponent = getIconComponent(dataPoint.iconName);

          return (
            <div
              key={dataPoint.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
                isManageMode ? "cursor-move" : "cursor-default"
              } ${
                isDragging && draggedDataPoint === dataPoint.id ? "z-50" : ""
              }`}
              style={{
                left: x,
                top: y,
                fontSize: `${dataPoint.fontSize || 14}px`,
                color: dataPoint.color || "#000000",
                zIndex: isSelected ? 20 : 10,
              }}
              onMouseDown={(e) => isManageMode && handleDataPointMouseDown(e, dataPoint.id)}
              onClick={(e) => {
                if (isManageMode) {
                  handleDataPointClick(e, dataPoint);
                } else {
                  handleDataPointViewClick(e, dataPoint);
                }
              }}
            >
              <div
                className={`
        bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border
        ${isSelected ? "ring-2 ring-blue-500" : ""}
        ${
          isDragging && draggedDataPoint === dataPoint.id
            ? "shadow-2xl scale-105"
            : ""
        }
        transition-all duration-200 hover:shadow-xl
        ${isManageMode ? "hover:ring-1 hover:ring-blue-300" : ""}
      `}
              >
                {/* Header with icon and name */}
                <div className="flex items-center gap-2 mb-1">
                  {dataPoint.showIcon && IconComponent && (
                    <IconComponent
                      size={(dataPoint.fontSize || 14) * 1.2}
                      style={{ color: dataPoint.iconColor || "#666666" }}
                    />
                  )}
                  <div
                    className="font-medium text-gray-600"
                    style={{
                      fontSize: `${(dataPoint.fontSize || 14) * 0.7}px`,
                    }}
                  >
                    {dataPoint.customName}
                  </div>
                </div>

                {/* Value display */}
                <div className="font-bold leading-tight whitespace-pre-line">
                  {valueData.isBoolean ? (
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        valueData.booleanValue
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : "bg-red-100 text-red-800 border border-red-200"
                      }`}
                    >
                      {valueData.booleanValue ? "✓ True" : "✗ False"}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: `${(dataPoint.fontSize || 14) * 0.8}px`,
                      }}
                    >
                      {valueData.value}
                    </span>
                  )}
                </div>
              </div>

              {/* Manage mode controls */}
              {isManageMode && isSelected && (
                <div className="absolute -right-16 top-1/2 transform -translate-y-1/2 flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 bg-white shadow-md hover:bg-gray-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditDataPoint?.(dataPoint);
                    }}
                    title="Edit Data Point"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 w-8 p-0 shadow-md hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteDataPointId(dataPoint.id);
                    }}
                    title="Delete Data Point"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {/* Flow Indicators Overlay */}
        {flowIndicators.map((indicator) => {
          const x = (indicator.positionX / 100) * actualCanvasSize.width;
          const y = (indicator.positionY / 100) * actualCanvasSize.height;
          const visualState = getFlowIndicatorState(indicator);
          const isSelected = selectedFlowIndicator === indicator.id;

          // Get arrow icon based on direction
          const ArrowIcon = (() => {
            switch (indicator.arrowDirection) {
              case "left":
                return ArrowBigLeft;
              case "up":
                return ArrowBigUp;
              case "down":
                return ArrowBigDown;
              case "right":
              default:
                return ArrowBigRight;
            }
          })();

          return (
            <Tooltip key={indicator.id}>
              <TooltipTrigger asChild>
                <div
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
                    isManageMode ? "cursor-move" : "cursor-default"
                  } ${
                    isDragging && draggedFlowIndicator === indicator.id
                      ? "z-50"
                      : ""
                  }`}
                  style={{
                    left: x,
                    top: y,
                    zIndex: isSelected ? 25 : 15,
                  }}
                  onMouseDown={(e) =>
                    isManageMode && handleFlowIndicatorMouseDown(e, indicator.id)
                  }
                  onClick={(e) =>
                    isManageMode && handleFlowIndicatorClick(e, indicator)
                  }
                >
              <div
                className={`
                  flex items-center justify-center p-2 rounded-full
                  ${isSelected ? "ring-2 ring-blue-500" : ""}
                  ${
                    isDragging && draggedFlowIndicator === indicator.id
                      ? "shadow-2xl scale-110"
                      : ""
                  }
                  transition-all duration-200
                  ${isManageMode ? "hover:ring-1 hover:ring-blue-300" : ""}
                  ${
                    visualState.animation && !isManageMode
                      ? "animate-pulse"
                      : ""
                  }
                `}
                style={{
                  backgroundColor: `${visualState.color}20`, // 20% opacity background
                  border: `2px solid ${visualState.color}`,
                }}
              >
                <ArrowIcon
                  className={`h-6 w-6 ${
                    visualState.animation && !isManageMode
                      ? "animate-pulse"
                      : ""
                  }`}
                  style={{
                    color: visualState.color,
                    filter:
                      visualState.animation && !isManageMode
                        ? "drop-shadow(0 0 4px currentColor)"
                        : "none",
                  }}
                />
              </div>

              {/* Indicator name tooltip (only in manage mode) */}
              {isManageMode && isSelected && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {indicator.customName}
                </div>
              )}

              {/* Edit/Delete buttons for selected indicator in manage mode */}
              {isManageMode && isSelected && (
                <div className="absolute -top-12 -right-4 flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 bg-white hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditFlowIndicator?.(indicator);
                    }}
                    title="Edit Flow Indicator"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 bg-white hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyFlowIndicator?.(indicator);
                    }}
                    title="Copy Flow Indicator"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteFlowIndicatorId(indicator.id);
                    }}
                    title="Delete Flow Indicator"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <div className="font-semibold">{indicator.customName}</div>
                  <div className="text-muted-foreground">
                    Device: {indicator.device.name}
                  </div>
                  <div className="text-muted-foreground">
                    Key: {indicator.selectedKey}
                  </div>
                  <div className="text-muted-foreground">
                    State: {visualState.state}
                  </div>
                  {/* Show current value if available */}
                  {(() => {
                    const topicData = dataValues[indicator.device.topic];
                    const currentValue = topicData?.[indicator.selectedKey];
                    if (currentValue !== undefined) {
                      return (
                        <div className="text-muted-foreground">
                          Value: {String(currentValue)}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Manage mode instructions */}
        {isManageMode && (
          <div className="absolute top-4 left-4 bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-sm">
            <h4 className="font-medium text-blue-900 text-sm mb-1">
              Manage Mode Active
            </h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Click empty area to add new data point</li>
              <li>• Click data point to select</li>
              <li>• Drag data points to move them</li>
              <li>• Double-click data point to edit</li>
              <li>• Use edit/delete buttons on selected points</li>
            </ul>
          </div>
        )}

        {/* Default state */}
        {!backgroundImage && dataPoints.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center max-w-md mx-auto px-8">
              {/* Animated Background Elements */}
              <div className="relative">
                {/* Central icon with glow effect */}
                <div className="relative mx-auto w-20 h-20 mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl animate-pulse"></div>
                  <div className="relative w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center border border-primary/20">
                    <LayoutGrid className="h-8 w-8 text-primary" />
                  </div>
                </div>

                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 w-3 h-3 bg-blue-500/40 rounded-full animate-bounce delay-300"></div>
                <div className="absolute -bottom-4 -left-4 w-2 h-2 bg-purple-500/40 rounded-full animate-bounce delay-700"></div>
                <div className="absolute top-1/2 -left-8 w-1.5 h-1.5 bg-green-500/40 rounded-full animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 -right-8 w-1.5 h-1.5 bg-orange-500/40 rounded-full animate-pulse delay-500"></div>
              </div>

              {/* Title with gradient */}
              <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent mb-3">
                Empty Canvas
              </h3>

              {/* Description */}
              <p className="text-muted-foreground mb-4 leading-relaxed">
                {isManageMode
                  ? "Click anywhere on the canvas to place your first data point and start building your process flow"
                  : "This canvas is ready for data visualization. Upload a background image and add real-time data points to get started"}
              </p>

              {/* Action hints with icons */}
              <div className="space-y-2 text-sm">
                {isManageMode ? (
                  <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                    <Plus className="h-4 w-4" />
                    <span>Click to add data points</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                      <Settings className="h-4 w-4" />
                      <span>Switch to Manage Mode to edit</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
                      <Eye className="h-4 w-4" />
                      <span>
                        Upload background image for better visualization
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Device Detail Modal */}
        <DeviceDetailModal
          dataPoint={selectedDataPointForDetail}
          isOpen={deviceDetailModalOpen}
          onClose={() => {
            setDeviceDetailModalOpen(false);
            setSelectedDataPointForDetail(null);
          }}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteDataPointId !== null}
          onOpenChange={() => setDeleteDataPointId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Data Point</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus data point ini? Tindakan ini
                tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteDataPointId) {
                    onDeleteDataPoint?.(deleteDataPointId);
                    setDeleteDataPointId(null);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Flow Indicator Confirmation Dialog */}
        <AlertDialog
          open={deleteFlowIndicatorId !== null}
          onOpenChange={() => setDeleteFlowIndicatorId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Flow Indicator</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus flow indicator ini? Tindakan
                ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteFlowIndicatorId) {
                    onDeleteFlowIndicator?.(deleteFlowIndicatorId);
                    setDeleteFlowIndicatorId(null);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* DataPoint Tooltip */}
        {dataPointTooltip.visible && dataPointTooltip.dataPoint && (
          <div
            className="absolute z-50 pointer-events-none animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
            style={{
              left: Math.min(dataPointTooltip.position.x + 15, window.innerWidth - 320),
              top: Math.max(dataPointTooltip.position.y - 10, 10),
              transform: dataPointTooltip.position.y > 100 ? 'translateY(-100%)' : 'translateY(0)'
            }}
          >
            <div className="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg shadow-xl px-4 py-3 max-w-xs backdrop-blur-sm">
              <div className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                {dataPointTooltip.dataPoint.iconName && (
                  <div className="text-blue-500">
                    {(() => {
                      const IconComponent = getIconComponent(dataPointTooltip.dataPoint.iconName);
                      return IconComponent ? <IconComponent size={16} /> : null;
                    })()}
                  </div>
                )}
                <span className="truncate">{dataPointTooltip.dataPoint.customName}</span>
              </div>
              <div className="text-gray-600 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 min-w-[50px]">Device:</span>
                  <span className="font-medium text-gray-700 truncate">{dataPointTooltip.dataPoint.device.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 min-w-[50px]">Value:</span>
                  <span className="font-mono text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">
                    {(() => {
                      const valueData = formatValue(dataPointTooltip.dataPoint);
                      return valueData.value;
                    })()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 min-w-[50px]">Position:</span>
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {dataPointTooltip.dataPoint.positionX.toFixed(1)}%, {dataPointTooltip.dataPoint.positionY.toFixed(1)}%
                  </span>
                </div>
                {dataPointTooltip.dataPoint.units && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 min-w-[50px]">Units:</span>
                    <span className="text-blue-600 font-medium">{dataPointTooltip.dataPoint.units}</span>
                  </div>
                )}
                {dataPointTooltip.dataPoint.multiply && dataPointTooltip.dataPoint.multiply !== 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 min-w-[50px]">Multiply:</span>
                    <span className="text-orange-600 font-medium">×{dataPointTooltip.dataPoint.multiply}</span>
                  </div>
                )}
                {dataPointTooltip.dataPoint.selectedKeys && dataPointTooltip.dataPoint.selectedKeys.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400 min-w-[50px]">Keys:</span>
                    <div className="flex flex-wrap gap-1">
                      {dataPointTooltip.dataPoint.selectedKeys.map((k, index) => (
                        <span key={index} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-mono">
                          {k.key}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {dataPointTooltip.dataPoint.selectedKey && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 min-w-[50px]">Key:</span>
                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-mono">
                      {dataPointTooltip.dataPoint.selectedKey}
                    </span>
                  </div>
                )}
              </div>
              {/* Tooltip arrow */}
              <div
                className="absolute w-2 h-2 bg-white border-l border-t border-gray-200 transform rotate-45"
                style={{
                  top: dataPointTooltip.position.y > 100 ? '100%' : '-4px',
                  left: '16px',
                  marginTop: dataPointTooltip.position.y > 100 ? '-4px' : '0'
                }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </Card>
    </TooltipProvider>
  );
}
