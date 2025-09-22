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
// Urutan disusun berdasarkan logika aplikasi: monitoring dasar, visualisasi, kontrol, notifikasi, feeds, IoT, 3D, utilities, management, process
export const mainWidgets: MainWidgetCategory[] = [
  {
    name: "Monitoring Cards",
    category: "Monitoring",
    icon: Gauge,
    description: "Kartu untuk memonitor nilai dan status.",
  },
  {
    name: "Chart Widgets",
    category: "Chart",
    icon: AreaChart,
    description: "Visualisasi data dalam bentuk grafik dan chart.",
  },
  {
    name: "Control Widgets",
    category: "Toggle Control",
    icon: SlidersHorizontal,
    description: "Tombol interaktif dan saklar kontrol.",
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
    name: "IoT Devices",
    category: "IoT",
    icon: Zap,
    description: "Monitor and control IoT devices across different protocols.",
  },
  {
    name: "3D Visualization",
    category: "3Dimensi",
    icon: Box,
    description: "Widget untuk visualisasi objek 3D.",
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
];

// Daftar semua widget dengan ikon dan deskripsi unik untuk setiap widget
// Urutan kategori disesuaikan dengan mainWidgets untuk konsistensi
export const widgets: Widget[] = [
  // --- Monitoring ---
  {
    name: "Access Controller Status",
    category: "Monitoring",
    icon: Lock,
    description: "Monitor status real-time dari Access Lock Controller.",
  },
  {
    name: "Analog Gauges",
    category: "Monitoring",
    icon: Gauge,
    description: "Indikator jarum untuk nilai analog.",
  },
  {
    name: "Breaker Status",
    category: "Monitoring",
    icon: PowerOff,
    description: "Status on/off untuk pemutus sirkuit.",
  },
  {
    name: "Calculated Parameter Card",
    category: "Monitoring",
    icon: Sigma,
    description: "Menampilkan hasil kalkulasi dari beberapa nilai.",
  },
  {
    name: "Energy Target Gap",
    category: "Monitoring",
    icon: TrendingUp,
    description: "Selisih antara target dan realisasi energi.",
  },
  {
    name: "Energy Usage – Current Month",
    category: "Monitoring",
    icon: BatteryCharging,
    description: "Total konsumsi energi bulan berjalan.",
  },
  {
    name: "Energy Usage – Last Month",
    category: "Monitoring",
    icon: BatteryCharging,
    description: "Total konsumsi energi bulan lalu.",
  },
  {
    name: "Grouped Icon Status",
    category: "Monitoring",
    icon: List,
    description: "Menampilkan beberapa status ikon dalam satu grup.",
  },
  {
    name: "Icon Status Card",
    category: "Monitoring",
    icon: ShieldCheck,
    description: "Menampilkan nilai dengan sebuah ikon status.",
  },
  {
    name: "Multi-Protocol Monitor",
    category: "Monitoring",
    icon: RadioTower,
    description: "Monitor perangkat dengan berbagai protokol.",
  },
  {
    name: "Running Hours Log",
    category: "Monitoring",
    icon: Clock,
    description: "Mencatat total jam operasional perangkat.",
  },
  {
    name: "Single Value Card",
    category: "Monitoring",
    icon: ChevronRightSquare,
    description: "Menampilkan satu nilai penting dari sensor.",
  },
  {
    name: "Temperature Indicator Bar",
    category: "Monitoring",
    icon: Thermometer,
    description: "Bar indikator untuk memantau suhu.",
  },

  // --- Chart ---
  {
    name: "Basic Trend Chart",
    category: "Chart",
    icon: LineChart,
    description: "Grafik tren sederhana untuk satu nilai.",
  },
  {
    name: "Chart Bar",
    category: "Chart",
    icon: BarChart,
    description: "Membandingkan nilai antar kategori.",
  },
  {
    name: "Chart Line",
    category: "Chart",
    icon: LineChart,
    description: "Menampilkan data tren dari waktu ke waktu.",
  },
  {
    name: "Energy Target Chart",
    category: "Chart",
    icon: TrendingUp,
    description: "Perbandingan target dan realisasi energi.",
  },
  {
    name: "Multi-Series Chart",
    category: "Chart",
    icon: PieChart,
    description: "Grafik dengan beberapa set data.",
  },
  {
    name: "Power Analyzer Chart",
    category: "Chart",
    icon: PieChart,
    description: "Chart khusus untuk data dari Power Analyzer.",
  },
  {
    name: "Power Generate Chart",
    category: "Chart",
    icon: Wind,
    description: "Grafik real-time produksi daya.",
  },

  // --- Toggle Control ---
  {
    name: "Button Control Modbus",
    category: "Toggle Control",
    icon: Plug,
    description: "Tombol kontrol untuk perangkat Modbus.",
  },
  {
    name: "Button Control Modbit",
    category: "Toggle Control",
    icon: Plug,
    description: "Tombol kontrol untuk perangkat Modbit.",
  },
  {
    name: "Button Control Modular",
    category: "Toggle Control",
    icon: Plug,
    description: "Tombol kontrol untuk perangkat modular.",
  },
  {
    name: "Lock Access Control",
    category: "Toggle Control",
    icon: Plug,
    description: "Tombol kontrol untuk Lock Access.",
  },

  // --- Alarms ---
  {
    name: "Alarm Log List",
    category: "Alarms",
    icon: HardDrive,
    description: "Daftar log historis kejadian alarm.",
  },
  {
    name: "Alarm Summary",
    category: "Alarms",
    icon: Bell,
    description: "Ringkasan jumlah alarm aktif.",
  },

  // --- Camera ---
  {
    name: "Camera Last Snapshot",
    category: "Camera",
    icon: Video,
    description: "Menampilkan gambar terakhir dari kamera.",
  },
  {
    name: "CCTV Live Stream",
    category: "Camera",
    icon: MonitorPlay,
    description:
      "Tampilkan live streaming dari monitor CCTV dengan kontrol video.",
  },
  {
    name: "CCTV Monitor Videos",
    category: "Camera",
    icon: Video,
    description:
      "Tampilkan daftar video recorded dari monitor CCTV dengan kontrol playback.",
  },

  // --- IoT ---
  {
    name: "LoRaWAN Device Data",
    category: "IoT",
    icon: Radio,
    description: "Displays real-time data from a selected LoRaWAN device.",
  },
  {
    name: "Zigbee Device",
    category: "IoT",
    icon: Zap,
    description:
      "Monitor and control Zigbee devices connected to your network.",
  },

  // --- 3Dimensi ---
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
    description:
      "3D visualization of server containment with real-time status.",
  },
  {
    name: "3D Rack Server View",
    category: "3Dimensi",
    icon: Server,
    description: "Visualisasi 3D dari rak server.",
  },
  {
    name: "3D Subrack View",
    category: "3Dimensi",
    icon: Server,
    description:
      "3D visualization of subrack devices with real-time status via MQTT.",
  },
  {
    name: "Modular 3D Device View",
    category: "3Dimensi",
    icon: Move3D,
    description: "3D visualization of modular devices with real-time status.",
  },

  // --- Dashboard ---
  {
    name: "Dashboard Shortcut",
    category: "Dashboard",
    icon: Table,
    description: "Pintasan untuk navigasi ke dashboard lain.",
  },

  // --- Maintenance ---
  {
    name: "Maintenance Calendar",
    category: "Maintenance",
    icon: Calendar,
    description: "Calendar view of scheduled maintenance tasks and deadlines.",
  },
  {
    name: "Maintenance List",
    category: "Maintenance",
    icon: Wrench,
    description:
      "Displays recent maintenance tasks with status and scheduling information.",
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
