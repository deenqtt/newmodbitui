// File: components/widgets/WidgetRenderer.tsx
"use client";

import { useResponsiveWidget } from "@/hooks/useResponsiveWidget";
import { SingleValueCardWidget } from "./SingleValueCard/SingleValueCardWidget";
import { IconStatusCardWidget } from "./IconStatusCard/IconStatusCardWidget";
import { GroupedIconStatusWidget } from "./GroupedIconStatus/GroupedIconStatusWidget";
import { AnalogueGaugeWidget } from "./AnalogueGauge/AnalogueGaugeWidget";
import { TemperatureIndicatorBarWidget } from "./TemperatureIndicatorBar/TemperatureIndicatorBarWidget";
import { CalculatedParameterWidget } from "./CalculatedParameter/CalculatedParameterWidget";
import { RunningHoursLogWidget } from "./RunningHoursLog/RunningHoursLogWidget";
import { EnergyUsageWidget } from "./EnergyUsage/EnergyUsageWidget";
import { EnergyTargetGapWidget } from "./EnergyTargetGap/EnergyTargetGapWidget";
import { BreakerStatusWidget } from "./BreakerStatus/BreakerStatusWidget";
import { MultiProtocolMonitorWidget } from "./MultiProtocolMonitor/MultiProtocolMonitorWidget";
import { ChartLineWidget } from "./ChartLine/ChartLineWidget";
import { ChartBarWidget } from "./ChartBar/ChartBarWidget";
import { MultiSeriesChartWidget } from "./MultiSeriesChart/MultiSeriesChartWidget";
import { BasicTrendChartWidget } from "./BasicTrendChart/BasicTrendChartWidget";
import { PowerAnalyzerChartWidget } from "./PowerAnalyzerChart/PowerAnalyzerChartWidget";
import { EnergyTargetChartWidget } from "./EnergyTargetChart/EnergyTargetChartWidget";
import { PowerGenerateChartWidget } from "./PowerGenerateChart/PowerGenerateChartWidget";
import { ButtonControlModbusWidget } from "./ButtonControlModbus/ButtonControlModbusWidget";
import { ButtonControlModularWidget } from "./ButtonControlModular/ButtonControlModularWidget";
import { AlarmLogListWidget } from "./AlarmLogList/AlarmLogListWidget";
import { AlarmSummaryWidget } from "./AlarmSummary/AlarmSummaryWidget";
import { DashboardShortcutWidget } from "./DashboardShortcut/DashboardShortcutWidget";
import { CameraSnapshotWidget } from "./CameraSnapshot/CameraSnapshotWidget";

import { AccessControllerStatusWidget } from "./AccessControllerStatus/AccessControllerStatusWidget"; // <-- IMPORT BARU
import { LockAccessControlWidget } from "./LockAccessControl/LockAccessControlWidget";
import { Modular3dDeviceViewWidget } from "./Modular3dDeviceView/Modular3dDeviceViewWidget";
import { Subrack3dWidget } from "./Subrack3d/Subrack3dWidget";
import { Containment3dWidget } from "./Containment3d/Containment3dWidget";
import { Container3dWidget } from "./Container3d/Container3dWidget";

import { LoRaWANDeviceWidget } from "./LoRaWANDevice/LoRaWANDeviceWidget"; // <-- IMPORT BARU

import { CctvMonitorVideosWidget } from "./CctvMonitorVideos/CctvMonitorVideosWidget";
import { CctvLiveStreamWidget } from "./CctvLiveStream/CctvLiveStreamWidget";
import { MaintenanceListWidget } from "./MaintenanceList/MaintenanceListWidget";
import { MaintenanceCalendarWidget } from "./MaintenanceCalendar/MaintenanceCalendarWidget";
import { MaintenanceStatisticsWidget } from "./MaintenanceStatistics/MaintenanceStatisticsWidget";
import { RackServer3dWidget } from "./RackServer3d/RackServer3dWidget";
import { ZigbeeDeviceWidget } from "./ZigbeeDevice/ZigbeeDeviceWidget";
import { ThermalCameraWidget } from "./ThermalCamera/ThermalCameraWidget";

interface Props {
  item: {
    i: string;
    widgetType: string;
    config: any;
  };
}

export const WidgetRenderer = ({ item }: Props) => {
  if (!item || !item.widgetType) {
    return (
      <div className="p-4 text-center text-destructive">
        Error: Widget data is missing or invalid.
      </div>
    );
  }

  const { widgetType, config } = item;

  // Use responsive hook for all widgets
  const responsiveSettings = useResponsiveWidget(widgetType);

  // Pastikan config ada sebelum merender
  if (!config) {
    return <div className="p-4 text-center">Please configure this widget.</div>;
  }

  // Pass responsive settings to all widgets via config
  const configWithResponsive = {
    ...config,
    responsiveSettings,
  };

  // Use responsive config for all widgets
  switch (widgetType) {
    case "Single Value Card":
      return <SingleValueCardWidget config={configWithResponsive} />;
    case "Icon Status Card":
      return <IconStatusCardWidget config={configWithResponsive} />;
    case "Grouped Icon Status":
      return <GroupedIconStatusWidget config={configWithResponsive} />;
    case "Analogue gauges":
      return <AnalogueGaugeWidget config={configWithResponsive} />;
    case "Temperature Indicator Bar":
      return <TemperatureIndicatorBarWidget config={configWithResponsive} />;
    case "Calculated Parameter Card":
      return <CalculatedParameterWidget config={configWithResponsive} />;
    case "Running Hours Log":
      return <RunningHoursLogWidget config={configWithResponsive} />;
    case "Energy Usage – Last Month":
      return <EnergyUsageWidget config={configWithResponsive} />;
    case "Energy Usage – Current Month":
      return <EnergyUsageWidget config={configWithResponsive} />;
    case "Energy Target Gap":
      return <EnergyTargetGapWidget config={configWithResponsive} />;
    case "Breaker Status":
      return <BreakerStatusWidget config={configWithResponsive} />;
    case "Multi-Protocol Monitor":
      return <MultiProtocolMonitorWidget config={configWithResponsive} />;
    case "Chart Line":
      return <ChartLineWidget config={configWithResponsive} />;
    case "Chart Bar":
      return <ChartBarWidget config={configWithResponsive} />;
    case "Multi-Series Chart":
      return <MultiSeriesChartWidget config={configWithResponsive} />;
    case "Basic Trend Chart":
      return <BasicTrendChartWidget config={configWithResponsive} />;
    case "Power Analyzer Chart":
      return <PowerAnalyzerChartWidget config={configWithResponsive} />;
    case "Energy Target Chart":
      return <EnergyTargetChartWidget config={configWithResponsive} />;
    case "Power Generate Chart":
      return <PowerGenerateChartWidget config={configWithResponsive} />;
    case "Button Control Modbus":
      return <ButtonControlModbusWidget config={configWithResponsive} />;
    case "Button Control Modular":
      return <ButtonControlModularWidget config={configWithResponsive} />;
    case "Alarm Log List":
      return <AlarmLogListWidget config={configWithResponsive} />;
    case "Alarm Summary":
      return <AlarmSummaryWidget config={configWithResponsive} />;
    case "Dashboard Shortcut":
      return <DashboardShortcutWidget config={configWithResponsive} />;
    case "Camera Last Snapshot":
      return <CameraSnapshotWidget config={configWithResponsive} />;
    case "Access Controller Status":
      return <AccessControllerStatusWidget config={configWithResponsive} />;
    case "Lock Access Control":
      return <LockAccessControlWidget config={configWithResponsive} />;
    case "3D Subrack View":
      return <Subrack3dWidget config={configWithResponsive} />;
    case "Modular 3D Device View":
      return <Modular3dDeviceViewWidget config={configWithResponsive} />;
    case "3D Containment View":
      return <Containment3dWidget config={configWithResponsive} />;
    case "3D Container View":
      return <Container3dWidget config={configWithResponsive} />;
    case "LoRaWAN Device Data":
      return <LoRaWANDeviceWidget config={configWithResponsive} />;
    case "CCTV Monitor Videos":
      return <CctvMonitorVideosWidget config={configWithResponsive} />;
    case "CCTV Live Stream":
      return <CctvLiveStreamWidget config={configWithResponsive} />;
    case "Maintenance List":
      return <MaintenanceListWidget config={configWithResponsive} />;
    case "Maintenance Calendar":
      return <MaintenanceCalendarWidget config={configWithResponsive} />;
    case "Maintenance Statistics":
      return <MaintenanceStatisticsWidget config={configWithResponsive} />;
    case "3D Rack Server View":
      return <RackServer3dWidget config={configWithResponsive} />;
    case "Zigbee Device":
      return <ZigbeeDeviceWidget config={configWithResponsive} />;
    case "Thermal Camera":
      return <ThermalCameraWidget config={configWithResponsive} />;
    default:
      return (
        <div className="p-4 text-center italic text-muted-foreground">
          Widget type "{widgetType}" is not implemented yet.
        </div>
      );
  }
};
