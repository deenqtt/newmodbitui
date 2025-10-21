TASK
1. Analisa fungsi pada NodeTenantLocation
2. Buatkan sebuah fungsi untuk cek apakah pada field topic dimodel table NodeTenantLocation terdapat payload nya menggunakan MQTT?
3. Lakukan pengecekan pada topicnya jika ada payload atau tidak ada
4. Jika ada maka buatkan fitur agar bisa otomatis update status menjadi true, dan jika ternyata tidak ada payload selama 1 menit maka ubah menjadi false
5. Fungsi untuk update status tersebut otomatis berdasarkan fungsi pengecekan topic apakah ada payloadnya atu tidak.

# Widgets Checklist
- [ ] WidgetRenderer.tsx
- [ ] AccessControllerStatus
- [ ] AlarmLogList
- [ ] AlarmSummary
- [ ] AnalogueGauge
- [ ] BasicTrendChart
- [ ] BreakerStatus
- [ ] ButtonControlModbus
- [ ] ButtonControlModular
- [ ] CalculatedParameter
- [ ] CameraSnapshot
- [ ] CctvLiveStream
- [ ] CctvMonitorVideos
- [ ] ChartBar
- [ ] ChartLine
- [ ] Connection
- [ ] Container3d
- [ ] Containment3d
- [ ] DashboardShortcut
- [ ] EnergyTargetChart
- [ ] EnergyTargetGap
- [ ] EnergyUsage
- [ ] GroupedIconStatus
- [ ] IconStatusCard
- [ ] LockAccessControl
- [ ] LoRaWANDevice
- [ ] MaintenanceCalendar
- [ ] MaintenanceList
- [ ] MaintenanceStatistics
- [ ] Modular3dDeviceView
- [ ] MultiProtocolMonitor
- [ ] MultiSeriesChart
- [ ] PowerAnalyzerChart
- [ ] PowerGenerateChart
- [ ] Process
- [ ] RackServer3d
- [ ] RunningHoursLog
- [ ] SingleValueCard
- [ ] Subrack3d
- [ ] TemperatureIndicatorBar
- [ ] ThermalCamera
- [ ] ZigbeeDevice

# Widgets menggunakan custom icon selection
- GroupedIconStatus (halaman konfigurasi: GroupedIconStatusConfigModal.tsx - menggunakan iconList grid dari IconPicker)
- IconStatusCard (halaman konfigurasi: IconStatusCardConfigModal.tsx - menggunakan iconList grid dari IconPicker)
- DashboardShortcut (halaman konfigurasi: DashboardShortcutConfigModal.tsx - menggunakan Select dropdown dengan opsi ikon terbatas)
