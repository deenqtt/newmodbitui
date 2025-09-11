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

// Kategori utama widget dengan ikon dan deskripsi yang lebih spesifik
export const mainWidgets: MainWidgetCategory[] = [
  {
    name: "Chart Widgets",
    category: "Chart",
    icon: AreaChart,
    description: "Visualisasi data dalam bentuk grafik dan chart.",
  },
  {
    name: "Monitoring Cards",
    category: "Monitoring",
    icon: Gauge,
    description: "Kartu untuk memonitor nilai dan status.",
  },

  {
    name: "Control Widgets",
    category: "Toggle Control",
    icon: SlidersHorizontal,
    description: "Tombol interaktif dan saklar kontrol.",
  },
  {
    name: "3D Visualization",
    category: "3Dimensi",
    icon: Box,
    description: "Widget untuk visualisasi objek 3D.",
  },
  {
    name: "Alarm & Events",
    category: "Alarms",
    icon: AlertTriangle,
    description: "Notifikasi dan log untuk alarm.",
  },
  {
    name: "Camera Feeds",
    category: "Camera",
    icon: Camera,
    description: "Tampilan gambar dan snapshot dari CCTV.",
  },
  {
    name: "Dashboard Utilities",
    category: "Dashboard",
    icon: LayoutPanelLeft,
    description: "Grup dan pintasan antar dashboard.",
  },
  {
    name: "Maintenance Management",
    category: "Maintenance",
    icon: Wrench,
    description: "Widget untuk manajemen dan monitoring maintenance tasks.",
  },
  {
    name: "IoT Devices",
    category: "IoT",
    icon: Zap, // atau Zap
    description: "Monitor and control IoT devices across different protocols.",
  },
];

// Daftar semua widget dengan ikon dan deskripsi unik untuk setiap widget
export const widgets: Widget[] = [
  // --- Chart ---
  {
    name: "Power Generate Chart",
    category: "Chart",
    icon: Wind,
    description: "Grafik real-time produksi daya.",
  },
  {
    name: "Energy Target Chart",
    category: "Chart",
    icon: TrendingUp,
    description: "Perbandingan target dan realisasi energi.",
  },
  {
    name: "Chart Line",
    category: "Chart",
    icon: LineChart,
    description: "Menampilkan data tren dari waktu ke waktu.",
  },
  {
    name: "Chart Bar",
    category: "Chart",
    icon: BarChart,
    description: "Membandingkan nilai antar kategori.",
  },
  {
    name: "Multi-Series Chart",
    category: "Chart",
    icon: PieChart,
    description: "Grafik dengan beberapa set data.",
  },
  {
    name: "Basic Trend Chart",
    category: "Chart",
    icon: LineChart,
    description: "Grafik tren sederhana untuk satu nilai.",
  },
  {
    name: "Power Analyzer Chart",
    category: "Chart",
    icon: PieChart,
    description: "Chart khusus untuk data dari Power Analyzer.",
  },

  // --- Monitoring ---
  {
    name: "Single Value Card",
    category: "Monitoring",
    icon: ChevronRightSquare,
    description: "Menampilkan satu nilai penting dari sensor.",
  },
  {
    name: "Icon Status Card",
    category: "Monitoring",
    icon: ShieldCheck,
    description: "Menampilkan nilai dengan sebuah ikon status.",
  },
  {
    name: "Grouped Icon Status",
    category: "Monitoring",
    icon: List,
    description: "Menampilkan beberapa status ikon dalam satu grup.",
  },
  {
    name: "Breaker Status",
    category: "Monitoring",
    icon: PowerOff,
    description: "Status on/off untuk pemutus sirkuit.",
  },
  {
    name: "Running Hours Log",
    category: "Monitoring",
    icon: Clock,
    description: "Mencatat total jam operasional perangkat.",
  },
  {
    name: "Energy Usage – Last Month",
    category: "Monitoring",
    icon: BatteryCharging,
    description: "Total konsumsi energi bulan lalu.",
  },
  {
    name: "Energy Usage – Current Month",
    category: "Monitoring",
    icon: BatteryCharging,
    description: "Total konsumsi energi bulan berjalan.",
  },
  {
    name: "Energy Target Gap",
    category: "Monitoring",
    icon: TrendingUp,
    description: "Selisih antara target dan realisasi energi.",
  },
  {
    name: "Analogue gauges",
    category: "Monitoring",
    icon: Gauge,
    description: "Indikator jarum untuk nilai analog.",
  },
  {
    name: "Temperature Indicator Bar",
    category: "Monitoring",
    icon: Thermometer,
    description: "Bar indikator untuk memantau suhu.",
  },
  {
    name: "Multi-Protocol Monitor",
    category: "Monitoring",
    icon: RadioTower,
    description: "Monitor perangkat dengan berbagai protokol.",
  },
  {
    name: "Calculated Parameter Card",
    category: "Monitoring",
    icon: Sigma,
    description: "Menampilkan hasil kalkulasi dari beberapa nilai.",
  },
  {
    name: "Access Controller Status",
    category: "Monitoring",
    icon: Lock,
    description: "Monitor status real-time dari  Access Lock Controller.",
  },
  {
    name: "Zigbee Device",
    category: "IoT", // atau tetap "Monitoring" kalau mau di grup monitoring
    icon: Zap,
    description:
      "Monitor and control Zigbee devices connected to your network.",
  },

  {
    name: "Button Control Modbus",
    category: "Toggle Control",
    icon: Plug,
    description: "Tombol kontrol untuk perangkat Modbus.",
  },
  {
    name: "Button Control Modular",
    category: "Toggle Control",
    icon: Plug,
    description: "Tombol kontrol untuk perangkat modular.",
  },
  {
    name: "Button Control Modbit",
    category: "Toggle Control",
    icon: Plug,
    description: "Tombol kontrol untuk perangkat Modbit.",
  },
  {
    name: "Lock Access Control",
    category: "Toggle Control",
    icon: Plug,
    description: "Tombol kontrol untuk Lock Access.",
  },

  // --- 3Dimensi ---
  {
    name: "3D Rack Server View",
    category: "3Dimensi",
    icon: Server,
    description: "Visualisasi 3D dari rak server.",
  },
  {
    name: "Modular 3D Device View",
    category: "3Dimensi",
    description: "3D visualization of modular devices with real-time status",
    icon: Move3D, // atau icon lain yang sesuai
  },
  {
    name: "3D Container View",
    category: "3Dimensi",
    icon: Container,
    description: "Tampilan 3D dari sebuah kontainer.",
  },
  {
    name: "3D Containment View",
    category: "3Dimensi",
    icon: Building,
    description: "3D visualization of server containment with real-time status",
  },

  {
    name: "3D Subrack View",
    category: "3Dimensi",
    description:
      "3D visualization of subrack devices with real-time status via MQTT",
    icon: Server, // atau icon lain yang sesuai
  },

  // --- Alarms ---
  {
    name: "Alarm Summary",
    category: "Alarms",
    icon: Bell,
    description: "Ringkasan jumlah alarm aktif.",
  },
  {
    name: "Alarm Log List",
    category: "Alarms",
    icon: HardDrive,
    description: "Daftar log historis kejadian alarm.",
  },

  // --- Camera ---
  {
    name: "Camera Last Snapshot",
    category: "Camera",
    icon: Video,
    description: "Menampilkan gambar terakhir dari kamera.",
  },
  {
    name: "CCTV Monitor Videos",
    category: "Camera",
    icon: Video,
    description:
      "Tampilkan daftar video recorded dari monitor CCTV dengan kontrol playback.",
  },
  {
    name: "CCTV Live Stream",
    category: "Camera",
    icon: MonitorPlay,
    description:
      "Tampilkan live streaming dari monitor CCTV dengan kontrol video.",
  },

  // --- Dashboard ---
  {
    name: "Dashboard Shortcut",
    category: "Dashboard",
    icon: Table,
    description: "Pintasan untuk navigasi ke dashboard lain.",
  },
  {
    name: "LoRaWAN Device Data",
    category: "Monitoring",
    icon: Radio,
    description: "Displays real-time data from a selected LoRaWAN device.",
  },

  // --- Maintenance ---
  {
    name: "Maintenance List",
    category: "Maintenance",
    icon: Wrench,
    description:
      "Displays recent maintenance tasks with status and scheduling information.",
  },
  {
    name: "Maintenance Calendar",
    category: "Maintenance",
    icon: Calendar,
    description: "Calendar view of scheduled maintenance tasks and deadlines.",
  },
  {
    name: "Maintenance Statistics",
    category: "Maintenance",
    icon: BarChart,
    description:
      "Statistical overview of maintenance completion rates and performance metrics.",
  },
];

// --- Helper Functions ---

// Fungsi untuk mendapatkan data widget berdasarkan nama widget dari ID uniknya
export const getWidgetData = (widgetId: string) => {
  const baseName = widgetId.split("-widget-")[0].replace(/-/g, " ");
  return widgets.find((w) => w.name.toLowerCase() === baseName.toLowerCase());
};

// Fungsi untuk menghitung jumlah widget dalam satu kategori
export const getWidgetCount = (category: string): number => {
  return widgets.filter((w) => w.category === category).length;
};
