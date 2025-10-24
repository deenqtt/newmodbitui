import {
  type LucideIcon,
  AreaChart,
  Gauge,
  Table,
  ToggleRight,
  Box,
  AlertTriangle,
  Camera,
  Zap,
  LayoutPanelLeft,
  HardDrive,
  Bell,
  Video,
  Plug,
  PowerOff,
  SlidersHorizontal,
  Server,
  Container,
  Building,
  CircuitBoard,
  Sigma,
  Clock,
  BatteryCharging,
  TrendingUp,
  ChevronRightSquare,
  Thermometer,
  RadioTower,
  Wind,
  LineChart,
  BarChart,
  PieChart,
  List,
  ShieldCheck,
  Lock,
  Move3D,
  Radio,
  MonitorPlay,
  Wrench,
  Calendar,
} from "lucide-react";

// Tipe untuk memperjelas struktur data
interface Widget {
  name: string;
  category: string;
  icon: LucideIcon;
  description: string;
}

interface MainWidgetCategory {
  name: string;
  category: string;
  icon: LucideIcon;
  description: string;
}

// Main widget categories organized by dashboard priority:
// 1. Critical monitoring (safety, power, temperature - show system health)
// 2. Control systems (buttons, switches - enable active intervention)
// 3. Data visualization (charts, trends - understand system behavior)
// 4. System communication (alarms, cameras - external monitoring)
// 5. Operational management (schedules, maintenance - long-term operations)
// 6. Advanced visualization (3D views - specialized insights)
export const mainWidgets: MainWidgetCategory[] = [
  {
    name: "Critical Monitoring",
    category: "Monitoring",
    icon: Gauge,
    description: "Monitor critical system parameters and real-time status indicators.",
  },
  {
    name: "Control Systems",
    category: "Controls",
    icon: SlidersHorizontal,
    description: "Interactive controls and switches for system management.",
  },
  {
    name: "Data Visualization",
    category: "Charts",
    icon: AreaChart,
    description: "Charts and graphs for data analysis and trend monitoring.",
  },
  {
    name: "System Communication",
    category: "Communication",
    icon: AlertTriangle,
    description: "Alarms, notifications, and camera feeds for system awareness.",
  },
  {
    name: "Network & IoT",
    category: "IoT",
    icon: Zap,
    description: "IoT device monitoring and control across different protocols.",
  },
  {
    name: "Operational Management",
    category: "Management",
    icon: Wrench,
    description: "Maintenance scheduling, logging, and operational oversight.",
  },
  {
    name: "Advanced Visualization",
    category: "Advanced",
    icon: Box,
    description: "3D visualizations and specialized dashboard utilities.",
  },
];

// All widgets organized by dashboard priority for better user workflow
export const widgets: Widget[] = [
  // === CRITICAL MONITORING (Priority 1: System Health) ===
  // Essential status indicators that show if systems are operating safely
  {
    name: "Access Controller Status",
    category: "Monitoring",
    icon: Lock,
    description: "Monitor real-time status of Access Lock Controller devices.",
  },
  {
    name: "Breaker Status",
    category: "Monitoring",
    icon: PowerOff,
    description: "Circuit breaker on/off status monitoring.",
  },
  {
    name: "Icon Status Card",
    category: "Monitoring",
    icon: ShieldCheck,
    description: "Display values with status icons for quick system overview.",
  },
  {
    name: "Single Value Card",
    category: "Monitoring",
    icon: ChevronRightSquare,
    description: "Display individual sensor readings or critical parameters.",
  },
  {
    name: "Grouped Icon Status",
    category: "Monitoring",
    icon: List,
    description: "Display multiple status icons in a single organized group.",
  },
  {
    name: "Temperature Indicator Bar",
    category: "Monitoring",
    icon: Thermometer,
    description: "Temperature monitoring with visual indicator bars.",
  },
  {
    name: "Analog Gauges",
    category: "Monitoring",
    icon: Gauge,
    description: "Traditional analog-style gauges for pressure, flow, or other metrics.",
  },
  {
    name: "Running Hours Log",
    category: "Monitoring",
    icon: Clock,
    description: "Track total operational hours for equipment monitoring.",
  },
  {
    name: "Calculated Parameter Card",
    category: "Monitoring",
    icon: Sigma,
    description: "Display calculated values derived from multiple sensor inputs.",
  },
  {
    name: "Multi-Protocol Monitor",
    category: "Monitoring",
    icon: RadioTower,
    description: "Monitor devices across multiple communication protocols.",
  },

  // === CONTROL SYSTEMS (Priority 2: Active Intervention) ===
  // Controls that allow operators to actively manage systems
  {
    name: "Button Control Modbus",
    category: "Controls",
    icon: Plug,
    description: "Interactive buttons for Modbus device control.",
  },
  {
    name: "Button Control Modbit",
    category: "Controls",
    icon: Plug,
    description: "Interactive buttons for Modbit device control.",
  },
  {
    name: "Button Control Modular",
    category: "Controls",
    icon: Plug,
    description: "Interactive buttons for modular device control systems.",
  },
  {
    name: "Lock Access Control",
    category: "Controls",
    icon: Plug,
    description: "Access control buttons for lock management systems.",
  },

  // === DATA VISUALIZATION (Priority 3: Understanding Behavior) ===
  // Charts and graphs to understand system performance and trends
  {
    name: "Basic Trend Chart",
    category: "Charts",
    icon: LineChart,
    description: "Simple trending charts for single value analysis.",
  },
  {
    name: "Chart Line",
    category: "Charts",
    icon: LineChart,
    description: "Display data trends over time periods.",
  },
  {
    name: "Chart Bar",
    category: "Charts",
    icon: BarChart,
    description: "Compare values across different categories or time periods.",
  },
  {
    name: "Multi-Series Chart",
    category: "Charts",
    icon: PieChart,
    description: "Display multiple data series on a single chart.",
  },
  {
    name: "Power Analyzer Chart",
    category: "Charts",
    icon: PieChart,
    description: "Specialized charts for Power Analyzer data analysis.",
  },
  {
    name: "Power Generate Chart",
    category: "Charts",
    icon: Wind,
    description: "Real-time power generation monitoring charts.",
  },
  {
    name: "Energy Target Chart",
    category: "Charts",
    icon: TrendingUp,
    description: "Compare energy targets versus actual consumption.",
  },

  // === SYSTEM COMMUNICATION (Priority 4: External Awareness) ===
  // Alarms and notifications that communicate system status externally
  {
    name: "Alarm Summary",
    category: "Communication",
    icon: Bell,
    description: "Summary of active alarm count and priority levels.",
  },
  {
    name: "Alarm Log List",
    category: "Communication",
    icon: HardDrive,
    description: "Historical log of all alarm events and actions.",
  },
  {
    name: "Camera Last Snapshot",
    category: "Communication",
    icon: Video,
    description: "Display the latest camera snapshot image.",
  },
  {
    name: "CCTV Live Stream",
    category: "Communication",
    icon: MonitorPlay,
    description: "Live CCTV streaming with video controls.",
  },
  {
    name: "CCTV Monitor Videos",
    category: "Communication",
    icon: Video,
    description: "Browse recorded CCTV videos with playback controls.",
  },

  // === NETWORK & IOT (Priority 5: Device Management) ===
  // IoT and network device monitoring and control
  {
    name: "Zigbee Device",
    category: "IoT",
    icon: Zap,
    description: "Monitor and control Zigbee network devices.",
  },
  {
    name: "LoRaWAN Device Data",
    category: "IoT",
    icon: Radio,
    description: "Display real-time data from LoRaWAN devices.",
  },
  {
    name: "Thermal Camera",
    category: "IoT",
    icon: Thermometer,
    description: "Real-time thermal camera heatmap with temperature monitoring.",
  },

  // === OPERATIONAL MANAGEMENT (Priority 6: Long-term Operations) ===
  // Maintenance, energy tracking, and operational oversight
  {
    name: "Energy Target Gap",
    category: "Management",
    icon: TrendingUp,
    description: "Track variance between energy targets and actual usage.",
  },
  {
    name: "Energy Usage – Current Month",
    category: "Management",
    icon: BatteryCharging,
    description: "Monitor total energy consumption for the current month.",
  },
  {
    name: "Energy Usage – Last Month",
    category: "Management",
    icon: BatteryCharging,
    description: "Review energy consumption data from the previous month.",
  },
  {
    name: "Maintenance Calendar",
    category: "Management",
    icon: Calendar,
    description: "Calendar view of scheduled maintenance tasks and deadlines.",
  },
  {
    name: "Maintenance List",
    category: "Management",
    icon: Wrench,
    description: "Recent maintenance tasks with status and scheduling information.",
  },
  {
    name: "Maintenance Statistics",
    category: "Management",
    icon: BarChart,
    description: "Overview of maintenance completion rates and performance metrics.",
  },

  // === ADVANCED VISUALIZATION (Priority 7: Specialized Insights) ===
  // 3D views and advanced dashboard utilities
  {
    name: "3D Rack Server View",
    category: "Advanced",
    icon: Server,
    description: "3D visualization of equipment racks and server layouts.",
  },
  {
    name: "3D Containment View",
    category: "Advanced",
    icon: Building,
    description: "3D visualization of server containment with real-time status.",
  },
  {
    name: "3D Subrack View",
    category: "Advanced",
    icon: Server,
    description: "3D visualization of subrack devices with MQTT connectivity.",
  },
  {
    name: "Modular 3D Device View",
    category: "Advanced",
    icon: Move3D,
    description: "3D visualization of modular devices with real-time monitoring.",
  },
  {
    name: "3D Container View",
    category: "Advanced",
    icon: Container,
    description: "3D view of containerized environments and equipment.",
  },
  {
    name: "Dashboard Shortcut",
    category: "Advanced",
    icon: LayoutPanelLeft,
    description: "Quick navigation shortcuts to other dashboard views.",
  },
];

// --- Helper Functions ---

// Function to get widget data by widget ID
export const getWidgetData = (widgetId: string) => {
  const baseName = widgetId.split("-widget-")[0].replace(/-/g, " ");
  return widgets.find((w) => w.name.toLowerCase() === baseName.toLowerCase());
};

// Function to count widgets in a specific category
export const getWidgetCount = (category: string): number => {
  return widgets.filter((w) => w.category === category).length;
};

// Function to get widgets by priority order (for dashboard workflow)
export const getWidgetsByPriority = () => {
  return widgets.slice(); // Priority order already established in export
};

// Function to get widgets filtered by category
export const getWidgetsByCategory = (category: string) => {
  return widgets.filter((w) => w.category === category);
};

// Function to get main categories in priority order
export const getMainCategoriesByPriority = () => {
  return mainWidgets.slice();
};
