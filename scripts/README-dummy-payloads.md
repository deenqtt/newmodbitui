# Dummy Payload Generator untuk IoT MQTT Topics

Script ini menghasilkan dummy payload yang realistis untuk menguji sistem IoT Dashboard dengan berbagai jenis sensor dan monitoring data.

## 🚀 Penggunaan Cepat

### Generate payloads untuk semua topik
```bash
node scripts/generate-dummy-payloads.js
```

Hasil akan tersimpan di `dummy-payloads.json` dengan 12 contoh payload (3 untuk setiap topik).

## 📊 Topik dan Tipe Payload

### 1. `iot/server/main/dc` - Server Monitoring
**Tipe:** `server_monitor`
**Contoh Data:**
- Data center metrics: temperature, humidity, CPU/RAM usage
- Power metrics: voltage, current per phase, power factor
- Network metrics: bandwidth, active connections

```json
{
  "type": "server_monitor",
  "data_center_metrics": {
    "temperature": 28.9,
    "cpu_usage_percent": 39,
    "ram_usage_percent": 50,
    "network_rx_mbps": 400.8
  },
  "power_metrics": {
    "main_voltage": 215.1,
    "current_phase_a": 17.2,
    "power_factor": 0.82,
    "total_power_kw": 6.85
  }
}
```

### 2. `iot/bandung/digital/campus` - Digital Campus
**Tipe:** `campus_monitoring`
**Contoh Data:**
- Environment monitoring: temperature, humidity, air quality, occupancy
- Building systems: HVAC, lighting, security status
- Digital services: WiFi clients, network devices, server response

```json
{
  "type": "campus_monitoring",
  "environment": {
    "indoor_temp": 25.2,
    "humidity_percent": 53.4,
    "air_quality_ppm": 673,
    "occupancy_count": 80
  },
  "digital_services": {
    "wifi_clients": 153,
    "server_response_ms": 91,
    "bandwidth_usage_mbps": 74.6
  }
}
```

### 3. `iot/bali/tourism/hub` - Network Gateway
**Tipe:** `network_gateway`
**Contoh Data:**
- Network status: WAN/LAN connections, client counts
- Network metrics: bandwidth, ping, packet loss, signal strength
- Security metrics: firewall status, intrusion attempts

```json
{
  "type": "network_gateway",
  "network_metrics": {
    "wan_download_mbps": 69.0,
    "ping_ms": 25.8,
    "signal_strength_dbm": -23.4,
    "packet_loss_percent": 0.1
  },
  "security_metrics": {
    "intrusion_attempts": 7,
    "active_connections": 88,
    "bandwidth_usage_percent": 75
  }
}
```

### 4. `iot/batam/industrial/zone` - Industrial Monitoring
**Tipe:** `industrial_monitor`
**Contoh Data:**
- Machine status: conveyor, motors, pumps, emergency stops
- Process metrics: production rate, efficiency, temperature, pressure
- Equipment health: bearing temperature, oil conditions, runtime

```json
{
  "type": "industrial_monitor",
  "machine_status": {
    "conveyor_running": true,
    "motor_1_running": true,
    "emergency_stop": false
  },
  "process_metrics": {
    "production_rate_ppm": 271,
    "efficiency_percent": 94.5,
    "temperature_c": 48.6,
    "pressure_psi": 78.7
  }
}
```

## 🔧 Penggunaan dalam Development

### Import dalam kode lain
```javascript
const { generateDummyPayload, generateSamplePayloads } = require('./scripts/generate-dummy-payloads');

// Generate single payload
const payload = generateDummyPayload('iot/server/main/dc', 'server');

// Generate batch payloads
const payloads = await generateSamplePayloads();
```

### Integration dengan MQTT Broker
```javascript
// Contoh untuk publish ke MQTT broker
const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  const payload = generateDummyPayload('iot/server/main/dc', 'server');
  client.publish('iot/server/main/dc', JSON.stringify(payload));
});
```

### Testing Dashboard Real-time Updates
Hasilkan payload secara periodik untuk testing UI updates:
```javascript
setInterval(() => {
  const payload = generateDummyPayload('iot/server/main/dc', 'server');
  sendToDashboard(payload);
}, 5000); // Every 5 seconds
```

## 📈 Cara Kerja

### Algoritma Generating
1. **Base Structure**: Setiap payload memiliki struktur dasar dengan timestamp, device_id, topic, status, uptime
2. **Type-Specific Data**: Bergantung pada tipe sensor, data yang berbeda dihasilkan
3. **Realistic Ranges**: Nilai dalam range yang realistis untuk sensor IoT
4. **Random Variation**: Simulasi noise dan variasi normal untuk testing

### Range Nilai Realistis

| Parameter | Unit | Range | Deskripsi |
|-----------|------|-------|-----------|
| Temperature | °C | 20-60 | Berbeda per jenis sensor |
| Humidity | % | 30-80 | Kelembaban relative |
| Voltage | V | 210-230 | AC voltage |
| Current | A | 0-50 | Current consumption |
| Bandwidth | Mbps | 0-1000 | Network throughput |
| CPU Usage | % | 0-100 | System utilization |
| Battery | % | 20-100 | Battery level |
| Signal Strength | dBm | -50 to -10 | WiFi/network signal |

### Payload Structure Standar
```json
{
  "timestamp": "2025-10-20T03:38:25.749Z",
  "device_id": "unique_device_identifier",
  "topic": "iot/location/type/device",
  "status": "online|offline",
  "uptime": 12345,
  "type": "sensor_type_monitor",
  "[data_sections]": {
    // Type-specific data objects
  }
}
```

## 🗃️ Integrasi Database

Script ini juga menguji penyimpanan payload ke database melalui `NodeLocationMqttPayload` model:

```javascript
// Automatic payload insertion test
await testPayloadInsertionToDatabase();
// Menyimpan payload ke DB dengan location reference
```

## 📁 File Output

### dummy-payloads.json
Berisi collection lengkap dari semua generated payloads:
```json
{
  "generated_at": "2025-10-20T03:38:25.820Z",
  "total_payloads": 12,
  "topics_covered": 4,
  "payloads": [/* array of payload objects */]
}
```

## 🔄 Extend untuk Topik Baru

Untuk menambah topik baru, tambahkan case di fungsi `generateDummyPayload`:

```javascript
case 'new_topic_type':
  return {
    ...basePayload,
    type: 'new_monitor_type',
    custom_metrics: {
      // Custom sensor data
    }
  };
```

## 🎯 Use Cases

1. **Development Testing**: Test dashboard tanpa hardware real
2. **UI/UX Testing**: Simulasi data streaming dan real-time updates
3. **Load Testing**: Generate banyak payload untuk performance testing
4. **Demo Preparation**: Siap data untuk presentasi dan demo
5. **API Integration**: Test MQTT broker dan database storage

## 📋 Dependencies

- Node.js runtime
- Prisma ORM (untuk database testing)
- File system access (untuk output JSON)

## ⚠️ Notes Penting

- Payload bersifat **dummy/random** untuk testing saja
- Tidak menggantikan data sensor **real** dari hardware
- Cocok untuk environment **development** dan **staging**
- Range nilai didasarkan pada **realistic expectations** untuk IoT environments
