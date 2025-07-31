// File: lib/icon-library.ts
import {
  type LucideIcon,
  Zap,
  Thermometer,
  Wind,
  Server,
  Database,
  Gauge,
  Activity,
  ShieldCheck,
  Power,
  Clock,
  BatteryCharging,
  BarChart,
  Droplets,
  Fan,
} from "lucide-react";

export interface SelectableIcon {
  name: string;
  icon: LucideIcon;
}

// Daftar ikon yang bisa dipilih oleh pengguna
export const iconLibrary: SelectableIcon[] = [
  { name: "Zap", icon: Zap },
  { name: "Thermometer", icon: Thermometer },
  { name: "Wind", icon: Wind },
  { name: "Server", icon: Server },
  { name: "Database", icon: Database },
  { name: "Gauge", icon: Gauge },
  { name: "Activity", icon: Activity },
  { name: "ShieldCheck", icon: ShieldCheck },
  { name: "Power", icon: Power },
  { name: "Clock", icon: Clock },
  { name: "BatteryCharging", icon: BatteryCharging },
  { name: "BarChart", icon: BarChart },
  { name: "Droplets", icon: Droplets },
  { name: "Fan", icon: Fan },
];

// Fungsi helper untuk mendapatkan komponen ikon berdasarkan namanya
export const getIconComponent = (name: string): LucideIcon | null => {
  const found = iconLibrary.find((i) => i.name === name);
  return found ? found.icon : null;
};
