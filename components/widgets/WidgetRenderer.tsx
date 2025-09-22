// File: components/widgets/WidgetRenderer.tsx
"use client";

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

  // Pastikan config ada sebelum merender
  if (!config) {
    return <div className="p-4 text-center">Please configure this widget.</div>;
  }

  switch (widgetType) {
    case "Single Value Card":
      return <SingleValueCardWidget config={config} />;
    case "Icon Status Card":
      return <IconStatusCardWidget config={config} />;
    case "Grouped Icon Status":
      return <GroupedIconStatusWidget config={config} />;
    case "Analogue gauges":
      return <AnalogueGaugeWidget config={config} />;
    case "Temperature Indicator Bar":
      return <TemperatureIndicatorBarWidget config={config} />;
    case "Calculated Parameter Card":
      return <CalculatedParameterWidget config={config} />;
    case "Running Hours Log":
      return <RunningHoursLogWidget config={config} />;
    case "Energy Usage – Last Month":
      return <EnergyUsageWidget config={config} />;
    case "Energy Usage – Current Month":
      return <EnergyUsageWidget config={config} />;
    case "Energy Target Gap":
      return <EnergyTargetGapWidget config={config} />;
    case "Breaker Status":
      return <BreakerStatusWidget config={config} />;
    case "Multi-Protocol Monitor":
      return <MultiProtocolMonitorWidget config={config} />;
    case "Chart Line":
      return <ChartLineWidget config={config} />;
    case "Chart Bar":
      return <ChartBarWidget config={config} />;
    case "Multi-Series Chart":
      return <MultiSeriesChartWidget config={config} />;
    case "Basic Trend Chart":
      return <BasicTrendChartWidget config={config} />;
    case "Power Analyzer Chart":
      return <PowerAnalyzerChartWidget config={config} />;
    case "Energy Target Chart":
      return <EnergyTargetChartWidget config={config} />;
    case "Power Generate Chart":
      return <PowerGenerateChartWidget config={config} />;
    case "Button Control Modbus":
      return <ButtonControlModbusWidget config={config} />;
    case "Button Control Modular":
      return <ButtonControlModularWidget config={config} />;
    case "Alarm Log List":
      return <AlarmLogListWidget config={config} />;
    case "Alarm Summary":
      return <AlarmSummaryWidget config={config} />;
    case "Dashboard Shortcut":
      return <DashboardShortcutWidget config={config} />;
    case "Camera Last Snapshot":
      return <CameraSnapshotWidget config={config} />;
    case "Access Controller Status":
      return <AccessControllerStatusWidget config={config} />;
    case "Lock Access Control":
      return <LockAccessControlWidget config={config} />;
    case "3D Subrack View":
      return <Subrack3dWidget config={config} />;
    case "Modular 3D Device View":
      return <Modular3dDeviceViewWidget config={config} />;
    case "3D Containment View":
      return <Containment3dWidget config={config} />;
    case "3D Container View":
      return <Container3dWidget config={config} />;
    case "LoRaWAN Device Data":
      return <LoRaWANDeviceWidget config={config} />;
    case "CCTV Monitor Videos":
      return <CctvMonitorVideosWidget config={config} />;
    case "CCTV Live Stream":
      return <CctvLiveStreamWidget config={config} />;
    case "Maintenance List":
      return <MaintenanceListWidget config={config} />;
    case "Maintenance Calendar":
      return <MaintenanceCalendarWidget config={config} />;
    case "Maintenance Statistics":
      return <MaintenanceStatisticsWidget config={config} />;
    case "3D Rack Server View":
      return <RackServer3dWidget config={config} />;
    case "Zigbee Device":
      return <ZigbeeDeviceWidget config={config} />;
    default:
      return (
        <div className="p-4 text-center italic text-muted-foreground">
          Widget type "{widgetType}" is not implemented yet.
        </div>
      );
  }
};
