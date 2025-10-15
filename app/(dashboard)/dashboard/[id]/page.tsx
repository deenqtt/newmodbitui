"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  PlusCircle,
  Trash2,
  XCircle,
  ArrowLeft,
  ChevronRight,
  LayoutGrid,
  Sparkles,
} from "lucide-react";
import Swal from "sweetalert2";
import _ from "lodash";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { mainWidgets, widgets, getWidgetCount } from "@/lib/widget-data";

import { WidgetRenderer } from "@/components/widgets/WidgetRenderer";
import { SingleValueCardConfigModal } from "@/components/widgets/SingleValueCard/SingleValueCardConfigModal";
import { IconStatusCardConfigModal } from "@/components/widgets/IconStatusCard/IconStatusCardConfigModal";
import { GroupedIconStatusConfigModal } from "@/components/widgets/GroupedIconStatus/GroupedIconStatusConfigModal";
import { AnalogueGaugeConfigModal } from "@/components/widgets/AnalogueGauge/AnalogueGaugeConfigModal";
import { TemperatureIndicatorBarConfigModal } from "@/components/widgets/TemperatureIndicatorBar/TemperatureIndicatorBarConfigModal";
import { CalculatedParameterConfigModal } from "@/components/widgets/CalculatedParameter/CalculatedParameterConfigModal";
import { RunningHoursLogConfigModal } from "@/components/widgets/RunningHoursLog/RunningHoursLogConfigModal";
import { EnergyUsageConfigModal } from "@/components/widgets/EnergyUsage/EnergyUsageConfigModal";
import { EnergyTargetGapConfigModal } from "@/components/widgets/EnergyTargetGap/EnergyTargetGapConfigModal";
import { BreakerStatusConfigModal } from "@/components/widgets/BreakerStatus/BreakerStatusConfigModal";
import { MultiProtocolMonitorConfigModal } from "@/components/widgets/MultiProtocolMonitor/MultiProtocolMonitorConfigModal";
import { ChartLineConfigModal } from "@/components/widgets/ChartLine/ChartLineConfigModal";
import { ChartBarConfigModal } from "@/components/widgets/ChartBar/ChartBarConfigModal";
import { MultiSeriesChartConfigModal } from "@/components/widgets/MultiSeriesChart/MultiSeriesChartConfigModal";
import { BasicTrendChartConfigModal } from "@/components/widgets/BasicTrendChart/BasicTrendChartConfigModal";
import { PowerAnalyzerChartConfigModal } from "@/components/widgets/PowerAnalyzerChart/PowerAnalyzerChartConfigModal";
import { EnergyTargetChartConfigModal } from "@/components/widgets/EnergyTargetChart/EnergyTargetChartConfigModal";
import { PowerGenerateChartConfigModal } from "@/components/widgets/PowerGenerateChart/PowerGenerateChartConfigModal";
import { ButtonControlModbusConfigModal } from "@/components/widgets/ButtonControlModbus/ButtonControlModbusConfigModal";
import { ButtonControlModularConfigModal } from "@/components/widgets/ButtonControlModular/ButtonControlModularConfigModal";
import { AlarmLogListConfigModal } from "@/components/widgets/AlarmLogList/AlarmLogListConfigModal";
import { AlarmSummaryConfigModal } from "@/components/widgets/AlarmSummary/AlarmSummaryConfigModal";
import { DashboardShortcutConfigModal } from "@/components/widgets/DashboardShortcut/DashboardShortcutConfigModal";
import { CameraSnapshotConfigModal } from "@/components/widgets/CameraSnapshot/CameraSnapshotConfigModal";

import { AccessControllerStatusConfigModal } from "@/components/widgets/AccessControllerStatus/AccessControllerStatusConfigModal"; // <-- IMPORT BARU
import { LockAccessControlConfigModal } from "@/components/widgets/LockAccessControl/LockAccessControlConfigModal";
import { Modular3dDeviceViewConfigModal } from "@/components/widgets/Modular3dDeviceView/Modular3dDeviceViewConfigModal";
import { Subrack3dConfigModal } from "@/components/widgets/Subrack3d/Subrack3dConfigModal";
import { Containment3dConfigModal } from "@/components/widgets/Containment3d/Containment3dConfigModal";
import { Container3dConfigModal } from "@/components/widgets/Container3d/Container3dConfigModal";
import { RackServer3dConfigModal } from "@/components/widgets/RackServer3d/RackServer3dConfigModal";
import { LoRaWANDeviceConfigModal } from "@/components/widgets/LoRaWANDevice/LoRaWANDeviceConfigModal";

import { CctvMonitorVideosConfigModal } from "@/components/widgets/CctvMonitorVideos/CctvMonitorVideosConfigModal";
import { CctvLiveStreamConfigModal } from "@/components/widgets/CctvLiveStream/CctvLiveStreamConfigModal";
import { MaintenanceListConfigModal } from "@/components/widgets/MaintenanceList/MaintenanceListConfigModal";
import { MaintenanceCalendarConfigModal } from "@/components/widgets/MaintenanceCalendar/MaintenanceCalendarConfigModal";
import { MaintenanceStatisticsConfigModal } from "@/components/widgets/MaintenanceStatistics/MaintenanceStatisticsConfigModal";
import { ZigbeeDeviceConfigModal } from "@/components/widgets/ZigbeeDevice/ZigbeeDeviceConfigModal";

import { ThermalCameraConfigModal } from "@/components/widgets/ThermalCamera/ThermalCameraConfigModal";

import { ProcessConfigModal } from "@/components/widgets/Process/ProcessConfigModal";
import { ProcessConnectionConfigModal } from "@/components/widgets/Process/ProcessConnectionConfigModal";
import { ConnectionWidgetConfigModal } from "@/components/widgets/Connection/ConnectionWidgetConfigModal";

const ResponsiveGridLayout = WidthProvider(Responsive);
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface WidgetLayout extends Layout {
  widgetType: string;
  config: any;
}

interface DashboardData {
  id: string;
  name: string;
  layout: WidgetLayout[] | string; // ✅ Can be either string or array
}

export default function DashboardEditorPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const dashboardId = params.id;
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [layout, setLayout] = useState<WidgetLayout[]>([]);
  const [initialLayout, setInitialLayout] = useState<WidgetLayout[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<"categories" | "widgets">(
    "categories"
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configuringWidget, setConfiguringWidget] = useState<{
    name: string;
  } | null>(null);

  const hasUnsavedChanges = useMemo(
    () => !_.isEqual(initialLayout, layout),
    [initialLayout, layout]
  );

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!dashboardId) return;
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/dashboards/${dashboardId}`
        );
        if (!response.ok) throw new Error("Dashboard not found");
        const data: DashboardData = await response.json();

        // ✅ Better parsing with error handling
        let parsedLayout: WidgetLayout[] = [];
        if (typeof data.layout === "string") {
          try {
            parsedLayout = JSON.parse(data.layout);
          } catch (e) {
            console.error("Failed to parse layout:", e);
            parsedLayout = [];
          }
        } else if (Array.isArray(data.layout)) {
          parsedLayout = data.layout;
        }

        setDashboardData({ ...data, layout: parsedLayout });
        setLayout(parsedLayout);
        setInitialLayout(_.cloneDeep(parsedLayout));
      } catch (error: any) {
        Swal.fire("Error", error.message, "error");
        router.push("/manage-dashboard");
      }
    };
    fetchDashboard();
  }, [dashboardId, router]);

  const handleLayoutChange = (newLayout: Layout[]) => {
    const updatedLayout = newLayout.map((newItem) => {
      const oldItem = layout.find((l) => l.i === newItem.i);
      return {
        ...newItem,
        widgetType: oldItem?.widgetType || "Unknown",
        config: oldItem?.config || {},
      } as WidgetLayout;
    });
    setLayout(updatedLayout);
  };
  const handleSaveLayout = async () => {
    setIsSaving(true);
    try {
      // ✅ Send layout directly - don't stringify it here if backend handles it
      await fetch(`${API_BASE_URL}/api/dashboards/${dashboardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }), // ✅ Send as array, let backend handle stringification
      });
      setInitialLayout(_.cloneDeep(layout));
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Layout saved successfully!",
        showConfirmButton: false,
        timer: 2000,
      });
    } catch (error: any) {
      console.error("Save error:", error);
      Swal.fire("Error", error.message || "Failed to save layout", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddWidgetClick = (widgetName: string) => {
    const widgetData = widgets.find((w) => w.name === widgetName);
    if (widgetData) {
      setConfiguringWidget(widgetData);
      if (
        [
          "Single Value Card",
          "Icon Status Card",
          "Grouped Icon Status",
          "Analogue gauges",
          "Temperature Indicator Bar",
          "Calculated Parameter Card",
          "Running Hours Log",
          "Energy Usage – Last Month",
          "Energy Usage – Current Month",
          "Energy Target Gap",
          "Breaker Status",
          "Multi-Protocol Monitor",
          "Chart Line",
          "Chart Bar",
          "Multi-Series Chart",
          "Basic Trend Chart",
          "Power Analyzer Chart",
          "Energy Target Chart",
          "Power Generate Chart",
          "Button Control Modbus",
          "Button Control Modular",
          "Alarm Log List",
          "Alarm Summary",
          "Dashboard Shortcut",
          "Camera Last Snapshot",

          "Access Controller Status",
          "Lock Access Control",
          "Modular 3D Device View",
          "3D Subrack View",
          "3D Containment View",
          "3D Container View",

          "LoRaWAN Device Data",

          "CCTV Monitor Videos",
          "CCTV Live Stream",
          "Maintenance List",
          "Maintenance Calendar",
          "Maintenance Statistics",
          "3D Rack Server View",
          "Zigbee Device",
          "Thermal Camera",

          "Process Box",
          "Process Cylinder",
          "Process Circle",
          "Process Triangle",
          "Process Connection",
        ].includes(widgetData.name)
      ) {
        setIsConfigModalOpen(true);
      } else {
        Swal.fire(
          "Info",
          `Configuration for "${widgetName}" is not implemented yet.`,
          "info"
        );
      }
    }
    setIsSheetOpen(false);
  };

  const handleSaveWidgetConfig = (configData: any) => {
    if (!configuringWidget) return;

    // --- PERBAIKAN: Atur ukuran default dan minimal di sini ---
    let defaultWidth = 4;
    let defaultHeight = 4;
    let minW = 2;
    let minH = 2;

    switch (configuringWidget.name) {
      case "Access Controller Status":
        defaultWidth = 4;
        defaultHeight = 6;
        minW = 3;
        minH = 5;
        break;
      case "Single Value Card":
        defaultWidth = 2;
        defaultHeight = 2;
        break;
      case "Icon Status Card":
        defaultWidth = 3;
        defaultHeight = 2;
        break;
      case "Grouped Icon Status":
        defaultWidth = 4;
        defaultHeight = 5;
        minW = 3;
        minH = 4;
        break;
      case "Basic Trend Chart":
        defaultWidth = 3;
        defaultHeight = 3;
        break;
      // Chart besar bisa punya minimal lebih besar
      case "Power Generate Chart":
      case "Multi-Series Chart":
        defaultWidth = 6;
        defaultHeight = 5;
        minW = 4;
        minH = 4;
        break;
      case "CCTV Monitor Videos":
        defaultWidth = 4;
        defaultHeight = 8;
        minW = 3;
        minH = 6;
        break;
      case "CCTV Live Stream":
        defaultWidth = 6;
        defaultHeight = 6;
        minW = 4;
        minH = 4;
        break;
      case "Maintenance List":
        defaultWidth = 6;
        defaultHeight = 8;
        minW = 4;
        minH = 6;
        break;
      case "Maintenance Calendar":
        defaultWidth = 8;
        defaultHeight = 8;
        minW = 6;
        minH = 6;
        break;
      case "Maintenance Statistics":
        defaultWidth = 6;
        defaultHeight = 6;
        minW = 4;
        minH = 4;
        break;

      case "Thermal Camera":
        defaultWidth = 4;
        defaultHeight = 6;
        minW = 3;
        minH = 4;

      case "Process":
        defaultWidth = 3;
        defaultHeight = 3;
        minW = 1;
        minH = 1;

        break;
    }

    // Ensure minW and minH are not larger than w and h
    const safeMinW = Math.min(minW, defaultWidth);
    const safeMinH = Math.min(minH, defaultHeight);

    const newItem: WidgetLayout = {
      i: `${configuringWidget.name.replace(/\s+/g, "-")}-widget-${Date.now()}`,
      x: (layout.length * defaultWidth) % 12,
      y: Infinity,
      w: defaultWidth,
      h: defaultHeight,
      minW: safeMinW,
      minH: safeMinH,
      widgetType: configuringWidget.name,
      config: configData,
    };

    setLayout([...layout, newItem]);
    setIsConfigModalOpen(false);
    setConfiguringWidget(null);
  };

  const removeWidget = (widgetId: string) =>
    setLayout(layout.filter((item) => item.i !== widgetId));

  const handleCancel = () => {
    if (!hasUnsavedChanges) {
      router.push("/manage-dashboard");
      return;
    }
    Swal.fire({
      title: "You have unsaved changes!",
      icon: "warning",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "Save & Exit",
      denyButtonText: `Discard & Exit`,
      cancelButtonText: "Stay on Page",
    }).then(async (result) => {
      if (result.isConfirmed) {
        await handleSaveLayout();
        router.push("/manage-dashboard");
      } else if (result.isDenied) {
        router.push("/manage-dashboard");
      }
    });
  };

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setTimeout(() => {
        setSidebarView("categories");
        setSelectedCategory(null);
      }, 300);
    }
  };

  const filteredWidgets = selectedCategory
    ? widgets.filter((w) => w.category === selectedCategory)
    : [];
  const currentCategoryData = selectedCategory
    ? mainWidgets.find((c) => c.category === selectedCategory)
    : null;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      {isConfigModalOpen && configuringWidget?.name === "Single Value Card" && (
        <SingleValueCardConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}
      {isConfigModalOpen && configuringWidget?.name === "Icon Status Card" && (
        <IconStatusCardConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Grouped Icon Status" && (
          <GroupedIconStatusConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen && configuringWidget?.name === "Analogue gauges" && (
        <AnalogueGaugeConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Temperature Indicator Bar" && (
          <TemperatureIndicatorBarConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Calculated Parameter Card" && (
          <CalculatedParameterConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen && configuringWidget?.name === "Running Hours Log" && (
        <RunningHoursLogConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Energy Usage – Last Month" && (
          <EnergyUsageConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
            period="last_month"
            title="Configure Last Month Usage"
          />
        )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Energy Usage – Current Month" && (
          <EnergyUsageConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
            period="current_month"
            title="Configure Current Month Usage"
          />
        )}
      {isConfigModalOpen && configuringWidget?.name === "Energy Target Gap" && (
        <EnergyTargetGapConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}
      {isConfigModalOpen && configuringWidget?.name === "Breaker Status" && (
        <BreakerStatusConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Multi-Protocol Monitor" && (
          <MultiProtocolMonitorConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen && configuringWidget?.name === "Chart Line" && (
        <ChartLineConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}
      {isConfigModalOpen && configuringWidget?.name === "Chart Bar" && (
        <ChartBarConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Multi-Series Chart" && (
          <MultiSeriesChartConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen && configuringWidget?.name === "Basic Trend Chart" && (
        <BasicTrendChartConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Power Analyzer Chart" && (
          <PowerAnalyzerChartConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Energy Target Chart" && (
          <EnergyTargetChartConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Power Generate Chart" && (
          <PowerGenerateChartConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Button Control Modbus" && (
          <ButtonControlModbusConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Button Control Modular" && (
          <ButtonControlModularConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen && configuringWidget?.name === "Alarm Log List" && (
        <AlarmLogListConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}
      {isConfigModalOpen && configuringWidget?.name === "Alarm Summary" && (
        <AlarmSummaryConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Dashboard Shortcut" && (
          <DashboardShortcutConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Camera Last Snapshot" && (
          <CameraSnapshotConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Access Controller Status" && (
          <AccessControllerStatusConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Lock Access Control" && (
          <LockAccessControlConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Modular 3D Device View" && (
          <Modular3dDeviceViewConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen && configuringWidget?.name === "3D Subrack View" && (
        <Subrack3dConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}
      {isConfigModalOpen &&
        configuringWidget?.name === "3D Containment View" && (
          <Containment3dConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen && configuringWidget?.name === "3D Container View" && (
        <Container3dConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}
      {isConfigModalOpen &&
        configuringWidget?.name === "LoRaWAN Device Data" && (
          <LoRaWANDeviceConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen &&
        configuringWidget?.name === "CCTV Monitor Videos" && (
          <CctvMonitorVideosConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen && configuringWidget?.name === "CCTV Live Stream" && (
        <CctvLiveStreamConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}
      {isConfigModalOpen && configuringWidget?.name === "Maintenance List" && (
        <MaintenanceListConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Maintenance Calendar" && (
          <MaintenanceCalendarConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen &&
        configuringWidget?.name === "Maintenance Statistics" && (
          <MaintenanceStatisticsConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}
      {isConfigModalOpen &&
        configuringWidget?.name === "3D Rack Server View" && (
          <RackServer3dConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}

      {isConfigModalOpen && configuringWidget?.name === "Zigbee Device" && (
        <ZigbeeDeviceConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}

      {isConfigModalOpen && configuringWidget?.name === "Thermal Camera" && (
        <ThermalCameraConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}

      {isConfigModalOpen && configuringWidget?.name === "Process" && (
        <ProcessConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}

      {isConfigModalOpen && configuringWidget?.name === "Process Box" && (
        <ProcessConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}

      {isConfigModalOpen && configuringWidget?.name === "Process Cylinder" && (
        <ProcessConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}

      {isConfigModalOpen && configuringWidget?.name === "Process Circle" && (
        <ProcessConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}

      {isConfigModalOpen && configuringWidget?.name === "Process Triangle" && (
        <ProcessConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}

      {isConfigModalOpen &&
        configuringWidget?.name === "Process Connection" && (
          <ProcessConnectionConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveWidgetConfig}
          />
        )}

      {isConfigModalOpen && configuringWidget?.name === "Connection" && (
        <ConnectionWidgetConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveWidgetConfig}
        />
      )}

      <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
          {dashboardData?.name}
        </h1>
        <div className="flex items-center gap-2">
          <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
            <SheetTrigger asChild>
              <Button variant="outline">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center text-lg">
                  {sidebarView === "widgets" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mr-2 h-8 w-8"
                      onClick={() => {
                        setSidebarView("categories");
                        setSelectedCategory(null);
                      }}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  )}
                  {sidebarView === "categories"
                    ? "Widget Categories"
                    : currentCategoryData?.name}
                </SheetTitle>
                <SheetDescription className="pl-12 -mt-2">
                  {sidebarView === "categories"
                    ? "Select a category to see available widgets."
                    : currentCategoryData?.description}
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sidebarView === "categories"
                  ? mainWidgets.map((cat) => {
                      const Icon = cat.icon || Sparkles;
                      return (
                        <button
                          key={cat.category}
                          onClick={() => {
                            setSelectedCategory(cat.category);
                            setSidebarView("widgets");
                          }}
                          className="w-full flex items-center text-left p-3 rounded-lg bg-background hover:bg-muted border transition-all group"
                        >
                          <div className="mr-4 bg-primary/10 text-primary p-3 rounded-md">
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">
                              {cat.name}
                            </p>
                            <Badge
                              variant="secondary"
                              className="mt-1 font-normal"
                            >
                              {getWidgetCount(cat.category)} widgets
                            </Badge>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </button>
                      );
                    })
                  : filteredWidgets.map((widget) => {
                      const Icon = widget.icon || Sparkles;
                      return (
                        <button
                          key={widget.name}
                          onClick={() => handleAddWidgetClick(widget.name)}
                          className="w-full flex items-start text-left p-3 rounded-lg bg-background hover:bg-muted border transition-colors"
                        >
                          <div className="mr-3 mt-1 bg-primary/10 text-primary p-2 rounded-md">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">
                              {widget.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {widget.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
              </div>
            </SheetContent>
          </Sheet>
          <Button
            onClick={handleSaveLayout}
            disabled={isSaving || !hasUnsavedChanges}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {hasUnsavedChanges && !isSaving && (
              <span className="mr-2 flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
              </span>
            )}
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Layout"}
          </Button>
          <Button variant="ghost" onClick={handleCancel}>
            <XCircle className="h-4 w-4 mr-2" />
            Exit
          </Button>
        </div>
      </header>
      <main className="p-4 md:p-6">
        <div className="relative">
          <ResponsiveGridLayout
            className="layout rounded-xl min-h-[80vh] bg-muted/40"
            layouts={{ lg: Array.isArray(layout) ? layout : [] }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={30}
            onLayoutChange={handleLayoutChange}
            isDraggable
            isResizable
            draggableCancel=".no-drag"
          >
            {Array.isArray(layout) &&
              layout.map((item) => {
                return (
                  <div
                    key={item.i}
                    className="bg-background rounded-lg shadow-sm border flex flex-col group overflow-hidden relative"
                  >
                    <div className="absolute top-1 right-1 z-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="no-drag h-6 w-6 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity bg-background/50 hover:bg-background/80 rounded-full"
                        onClick={() => removeWidget(item.i)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex-1 w-full h-full">
                      <WidgetRenderer item={item} />
                    </div>
                  </div>
                );
              })}
          </ResponsiveGridLayout>

          {layout.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <div className="p-6 rounded-full bg-muted mb-4">
                <LayoutGrid className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Empty Dashboard
              </h3>
              <p className="text-muted-foreground mt-1 mb-4 max-w-sm">
                Start building your dashboard by adding your first widget
                from the library.
              </p>
              <Button size="lg" onClick={() => setIsSheetOpen(true)}>
                <PlusCircle className="h-5 w-5 mr-2" />
                Add First Widget
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
