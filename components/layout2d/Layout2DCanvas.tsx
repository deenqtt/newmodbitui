"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { useMqtt } from "@/contexts/MqttContext";
import { Button } from "@/components/ui/button";
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
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowRight,
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

  // Debug state changes
  useEffect(() => {
    console.log("deviceDetailModalOpen changed:", deviceDetailModalOpen);
  }, [deviceDetailModalOpen]);

  useEffect(() => {
    console.log(
      "selectedDataPointForDetail changed:",
      selectedDataPointForDetail
    );
  }, [selectedDataPointForDetail]);

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

  // Image size handler - determine canvas size based on image
  useEffect(() => {
    if (backgroundImage) {
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
      };
      img.src = backgroundImage;
    } else {
      // Use container size for grid if no image
      setActualCanvasSize(canvasSize);
    }
  }, [backgroundImage, canvasSize]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, actualCanvasSize.width, actualCanvasSize.height);

    // Draw background image if provided
    if (backgroundImage) {
      const img = new Image();
      img.onload = () => {
        // Draw image scaled to fit the canvas dimensions (fixed width, proportional height)
        ctx.drawImage(
          img,
          0,
          0,
          actualCanvasSize.width,
          actualCanvasSize.height
        );
      };
      img.src = backgroundImage;
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
  }, [backgroundImage, actualCanvasSize]);

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
      console.log("Data point clicked:", clickedDataPoint);
      console.log("Is manage mode:", isManageMode);
      setSelectedDataPoint(clickedDataPoint.id);
      setSelectedFlowIndicator(null); // Clear flow indicator selection
      // If not in manage mode, show device detail modal
      if (!isManageMode) {
        console.log(
          "Opening device detail modal for:",
          clickedDataPoint.customName
        );
        setSelectedDataPointForDetail(clickedDataPoint);
        setDeviceDetailModalOpen(true);
      }
    } else if (clickedFlowIndicator) {
      console.log("Flow indicator clicked:", clickedFlowIndicator);
      setSelectedFlowIndicator(clickedFlowIndicator.id);
      setSelectedDataPoint(null); // Clear data point selection
      // Flow indicators don't show detail modal in non-manage mode
    } else {
      setSelectedDataPoint(null);
      setSelectedFlowIndicator(null);
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

  // Evaluate flow indicator logic condition
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
      return {
        state: "false" as const,
        color: indicator.falseColor,
        animation: indicator.falseAnimation,
      };
    }

    const currentValue = topicData[indicator.selectedKey];
    const state = evaluateFlowCondition(indicator, currentValue);

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
    if (!isManageMode) return;

    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dataPoint = dataPoints.find((dp) => dp.id === dataPointId);
    if (!dataPoint) return;

    const dataPointX = (dataPoint.positionX / 100) * actualCanvasSize.width;
    const dataPointY = (dataPoint.positionY / 100) * actualCanvasSize.height;

    setIsDragging(true);
    setDraggedDataPoint(dataPointId);
    setSelectedDataPoint(dataPointId);
    setDragOffset({
      x: e.clientX - rect.left - dataPointX,
      y: e.clientY - rect.top - dataPointY,
    });
  };

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

  // Global mouse move and up handlers
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !draggedDataPoint || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const newX =
      ((e.clientX - rect.left - dragOffset.x) / actualCanvasSize.width) * 100;
    const newY =
      ((e.clientY - rect.top - dragOffset.y) / actualCanvasSize.height) * 100;

    // Constrain to canvas bounds
    const constrainedX = Math.max(0, Math.min(100, newX));
    const constrainedY = Math.max(0, Math.min(100, newY));

    // Update position immediately for smooth dragging
    setDataPoints((prev) =>
      prev.map((dp) =>
        dp.id === draggedDataPoint
          ? { ...dp, positionX: constrainedX, positionY: constrainedY }
          : dp
      )
    );
  };

  const handleMouseUp = () => {
    if (isDragging && draggedDataPoint) {
      const draggedDataPointData = dataPoints.find(
        (dp) => dp.id === draggedDataPoint
      );
      if (draggedDataPointData) {
        updateDataPointPosition(
          draggedDataPoint,
          draggedDataPointData.positionX,
          draggedDataPointData.positionY
        );
      }
    }

    setIsDragging(false);
    setDraggedDataPoint(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Add global event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, draggedDataPoint, dragOffset, actualCanvasSize]);

  // Update data point position
  const updateDataPointPosition = async (
    dataPointId: string,
    x: number,
    y: number
  ) => {
    try {
      const dataPoint = dataPoints.find((dp) => dp.id === dataPointId);
      if (!dataPoint) return;

      const response = await fetch(
        `${API_BASE_URL}/api/layout2d/${layoutId}/datapoints/${dataPointId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...dataPoint,
            positionX: x,
            positionY: y,
          }),
        }
      );

      if (!response.ok) {
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
        console.error("Failed to update data point position");
      }
    } catch (error) {
      console.error("Failed to update data point position:", error);
    }
  };

  // Flow indicator handlers
  const handleFlowIndicatorMouseDown = (
    e: React.MouseEvent,
    indicatorId: string
  ) => {
    if (!isManageMode) return;

    e.preventDefault();
    e.stopPropagation();

    const indicator = flowIndicators.find((fi) => fi.id === indicatorId);
    if (!indicator) return;

    setSelectedFlowIndicator(indicatorId);
    setIsDragging(true);
    setDraggedFlowIndicator(indicatorId);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const indicatorX = (indicator.positionX / 100) * actualCanvasSize.width;
      const indicatorY = (indicator.positionY / 100) * actualCanvasSize.height;
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
  const updateFlowIndicatorPosition = async (
    indicatorId: string,
    x: number,
    y: number
  ) => {
    try {
      const indicator = flowIndicators.find((fi) => fi.id === indicatorId);
      if (!indicator) return;

      const response = await fetch(
        `${API_BASE_URL}/api/layout2d/${layoutId}/flowindicators/${indicatorId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...indicator,
            positionX: x,
            positionY: y,
          }),
        }
      );

      if (!response.ok) {
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
        console.error("Failed to update flow indicator position");
      }
    } catch (error) {
      console.error("Failed to update flow indicator position:", error);
    }
  };

  // Updated global mouse handlers to support both data points and flow indicators
  const handleMouseMoveUpdated = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const newX =
      ((e.clientX - rect.left - dragOffset.x) / actualCanvasSize.width) * 100;
    const newY =
      ((e.clientY - rect.top - dragOffset.y) / actualCanvasSize.height) * 100;

    // Constrain to canvas bounds
    const constrainedX = Math.max(0, Math.min(100, newX));
    const constrainedY = Math.max(0, Math.min(100, newY));

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
  };

  const handleMouseUpUpdated = () => {
    if (isDragging && draggedDataPoint) {
      const draggedDataPointData = dataPoints.find(
        (dp) => dp.id === draggedDataPoint
      );
      if (draggedDataPointData) {
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
  };

  // Update the existing useEffect to use the new handlers
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMoveUpdated);
      document.addEventListener("mouseup", handleMouseUpUpdated);
      return () => {
        document.removeEventListener("mousemove", handleMouseMoveUpdated);
        document.removeEventListener("mouseup", handleMouseUpUpdated);
      };
    }
  }, [
    isDragging,
    draggedDataPoint,
    draggedFlowIndicator,
    dragOffset,
    actualCanvasSize,
  ]);

  return (
    <Card className={className}>
      <div
        ref={containerRef}
        className="relative w-full overflow-auto"
        style={{
          height: backgroundImage ? `${actualCanvasSize.height}px` : "600px",
          minHeight: "400px",
        }}
      >
        <canvas
          ref={canvasRef}
          width={actualCanvasSize.width}
          height={actualCanvasSize.height}
          className="block cursor-pointer w-full h-auto"
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
              onMouseDown={(e) => handleDataPointMouseDown(e, dataPoint.id)}
              onClick={(e) => handleDataPointClick(e, dataPoint)}
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
                return ArrowLeft;
              case "up":
                return ArrowUp;
              case "down":
                return ArrowDown;
              case "right":
              default:
                return ArrowRight;
            }
          })();

          return (
            <div
              key={indicator.id}
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
                  ${visualState.animation ? "animate-pulse" : ""}
                `}
                style={{
                  backgroundColor: `${visualState.color}20`, // 20% opacity background
                  border: `2px solid ${visualState.color}`,
                }}
                title={`${indicator.customName} (${indicator.device.name}: ${indicator.selectedKey})`}
              >
                <ArrowIcon
                  className={`h-6 w-6 ${
                    visualState.animation ? "animate-pulse" : ""
                  }`}
                  style={{
                    color: visualState.color,
                    filter: visualState.animation
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
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex gap-1">
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
                    variant="destructive"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFlowIndicator?.(indicator.id);
                    }}
                    title="Delete Flow Indicator"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
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
      </div>
    </Card>
  );
}
