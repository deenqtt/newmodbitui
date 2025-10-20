const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Generate realistic dummy payloads for IoT MQTT topics
 * Based on DeviceExternal and NodeTenantLocation topics
 */
function generateDummyPayload(topic, type = 'sensor') {
  const timestamp = new Date().toISOString();
  const deviceId = topic.split('/').pop() || 'unknown_device';

  // Base structure for all payloads
  const basePayload = {
    timestamp,
    device_id: deviceId,
    topic,
    status: 'online',
    uptime: Math.floor(Math.random() * 86400), // seconds since boot
  };

  switch (type) {
    case 'server':
      return {
        ...basePayload,
        type: 'server_monitor',
        data_center_metrics: {
          temperature: 24 + Math.random() * 8, // 24-32°C
          humidity: 45 + Math.random() * 20, // 45-65%
          cpu_temp: 35 + Math.random() * 25, // 35-60°C
          ram_usage_percent: Math.floor(Math.random() * 80), // 0-80%
          cpu_usage_percent: Math.floor(Math.random() * 90), // 0-90%
          disk_usage_percent: Math.floor(20 + Math.random() * 60), // 20-80%
          network_rx_mbps: Math.random() * 1000, // 0-1000 Mbps
          network_tx_mbps: Math.random() * 500, // 0-500 Mbps
          active_connections: Math.floor(Math.random() * 1000),
        },
        power_metrics: {
          main_voltage: 220 + (Math.random() - 0.5) * 10, // 215-225V
          current_phase_a: 10 + Math.random() * 20, // 10-30A
          current_phase_b: 10 + Math.random() * 20, // 10-30A
          current_phase_c: 10 + Math.random() * 20, // 10-30A
          power_factor: 0.8 + Math.random() * 0.2, // 0.8-1.0
          total_power_kw: 5 + Math.random() * 20, // 5-25kW
        }
      };

    case 'power':
      return {
        ...basePayload,
        type: 'power_distribution',
        ac_metrics: {
          voltage_l1_n: 220 + (Math.random() - 0.5) * 10,
          voltage_l2_n: 220 + (Math.random() - 0.5) * 10,
          voltage_l3_n: 220 + (Math.random() - 0.5) * 10,
          current_l1: Math.random() * 50,
          current_l2: Math.random() * 50,
          current_l3: Math.random() * 50,
          frequency: 49.8 + Math.random() * 0.4, // 49.8-50.2 Hz
          total_active_power: Math.random() * 10000, // 0-10kW
          total_reactive_power: Math.random() * 5000,
          total_apparent_power: Math.random() * 12000,
          power_factor: 0.85 + Math.random() * 0.15,
          total_energy_kwh: Math.random() * 100000,
        },
        dc_metrics: {
          voltage_48v: 48 + (Math.random() - 0.5) * 2,
          current_48v: Math.random() * 30,
          voltage_24v: 24 + (Math.random() - 0.5) * 1,
          current_24v: Math.random() * 15,
          battery_voltage: 12.5 + Math.random() * 0.5,
          battery_current: -5 + Math.random() * 10, // -5 to +5A (charging/discharging)
        }
      };

    case 'thermal':
      return {
        ...basePayload,
        type: 'thermal_monitoring',
        thermal_zones: {
          zone_1_temp: 25 + Math.random() * 10, // 25-35°C
          zone_2_temp: 25 + Math.random() * 10,
          zone_3_temp: 25 + Math.random() * 10,
          zone_4_temp: 25 + Math.random() * 10,
          ambient_temp: 22 + Math.random() * 8, // 22-30°C
          inlet_temp: 20 + Math.random() * 5, // 20-25°C
          outlet_temp: 30 + Math.random() * 10, // 30-40°C
        },
        airflow_metrics: {
          fan_1_rpm: 2000 + Math.random() * 2000,
          fan_2_rpm: 2000 + Math.random() * 2000,
          fan_3_rpm: 2000 + Math.random() * 2000,
          fan_4_rpm: 2000 + Math.random() * 2000,
          airflow_rate_cfm: 500 + Math.random() * 1000,
        },
        cooling_metrics: {
          chiller_status: Math.random() > 0.1 ? 'running' : 'standby',
          chiller_power_kw: Math.random() * 10,
          pump_status: Math.random() > 0.05 ? 'running' : 'fault',
          pump_power_kw: Math.random() * 2,
          valve_position_percent: Math.random() * 100,
        }
      };

    case 'network':
      return {
        ...basePayload,
        type: 'network_gateway',
        network_status: {
          wan_connected: Math.random() > 0.05,
          wan_ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
          lan_connected: true,
          lan_clients: Math.floor(Math.random() * 50),
          wifi_connected: Math.random() > 0.1,
          wifi_clients: Math.floor(Math.random() * 30),
          vpn_active: Math.random() > 0.3,
        },
        network_metrics: {
          wan_download_mbps: Math.random() * 100,
          wan_upload_mbps: Math.random() * 50,
          lan_traffic_rx_mbps: Math.random() * 1000,
          lan_traffic_tx_mbps: Math.random() * 1000,
          signal_strength_dbm: -30 + Math.random() * 20, // -30 to -10 dBm
          ping_ms: 10 + Math.random() * 20,
          packet_loss_percent: Math.random() * 2,
          jitter_ms: Math.random() * 5,
        },
        security_metrics: {
          firewall_active: true,
          intrusion_attempts: Math.floor(Math.random() * 10),
          failed_logins: Math.floor(Math.random() * 5),
          active_connections: Math.floor(Math.random() * 100),
          bandwidth_usage_percent: Math.floor(Math.random() * 80),
        }
      };

    case 'industrial':
      return {
        ...basePayload,
        type: 'industrial_monitor',
        machine_status: {
          conveyor_running: Math.random() > 0.1,
          motor_1_running: Math.random() > 0.05,
          motor_2_running: Math.random() > 0.05,
          pump_active: Math.random() > 0.2,
          valve_open: Math.random() > 0.5,
          emergency_stop: Math.random() < 0.01,
          maintenance_mode: Math.random() < 0.05,
        },
        process_metrics: {
          production_rate_ppm: Math.floor(100 + Math.random() * 200),
          efficiency_percent: 80 + Math.random() * 20,
          cycle_time_seconds: 30 + Math.random() * 30,
          temperature_c: 40 + Math.random() * 20,
          pressure_psi: 50 + Math.random() * 100,
          vibration_mm_s: Math.random() * 10,
          noise_db: 70 + Math.random() * 30,
        },
        equipment_health: {
          bearing_temperature: 50 + Math.random() * 30,
          oil_pressure: 40 + Math.random() * 20,
          oil_temperature: 60 + Math.random() * 20,
          motor_current_a: 5 + Math.random() * 10,
          power_consumption_kw: 10 + Math.random() * 20,
          runtime_hours: Math.random() * 8760, // 1 year
        }
      };

    case 'digital_campus':
      return {
        ...basePayload,
        type: 'campus_monitoring',
        environment: {
          indoor_temp: 23 + Math.random() * 7, // 23-30°C
          humidity_percent: 45 + Math.random() * 25, // 45-70%
          air_quality_ppm: 400 + Math.random() * 600, // CO2 levels
          noise_level_db: 30 + Math.random() * 40,
          light_level_lux: 200 + Math.random() * 800,
          occupancy_count: Math.floor(Math.random() * 100),
        },
        building_systems: {
          hvac_status: Math.random() > 0.1 ? 'running' : 'standby',
          lighting_system: Math.random() > 0.3 ? 'auto' : 'manual',
          security_system: 'armed',
          fire_alarm: Math.random() > 0.99 ? 'active' : 'normal',
          elevator_status: Math.random() > 0.05 ? 'operational' : 'maintenance',
          backup_power: Math.random() > 0.9 ? 'online' : 'battery',
        },
        digital_services: {
          wifi_clients: Math.floor(Math.random() * 200),
          network_devices: Math.floor(Math.random() * 50),
          server_response_ms: 50 + Math.random() * 100,
          uptime_percent: 99 + Math.random() * 1,
          active_sessions: Math.floor(Math.random() * 1000),
          bandwidth_usage_mbps: Math.random() * 100,
        }
      };

    default:
      // General sensor payload
      return {
        ...basePayload,
        type: 'generic_sensor',
        sensors: {
          temperature: 20 + Math.random() * 25, // 20-45°C
          humidity: 30 + Math.random() * 50, // 30-80%
          pressure: 1000 + Math.random() * 50, // 1000-1050 hPa
          voltage: 12 + (Math.random() - 0.5) * 2, // 11-13V
          current: Math.random() * 5, // 0-5A
          light: Math.random() * 1000, // 0-1000 lux
          motion: Math.random() > 0.7, // boolean
          battery_level: Math.floor(20 + Math.random() * 80), // 20-100%
        },
        alerts: {
          temperature_high: false,
          voltage_low: Math.random() > 0.95,
          battery_low: Math.random() > 0.90,
          communication_error: Math.random() > 0.98,
        }
      };
  }
}


async function generateSamplePayloads() {
  console.log('🎯 Generating sample dummy payloads for IoT topics...');

  const sampleTopics = [
    {
      topic: 'iot/server/main/dc',
      type: 'server',
      description: 'Main Jakarta Data Center Server Monitoring'
    },
    {
      topic: 'iot/bandung/digital/campus',
      type: 'digital_campus',
      description: 'Bandung Digital Campus Environment'
    },
    {
      topic: 'iot/bali/tourism/hub',
      type: 'network',
      description: 'Bali Tourism Hub Network Gateway'
    },
    {
      topic: 'iot/batam/industrial/zone',
      type: 'industrial',
      description: 'Batam Industrial Zone Manufacturing'
    }
  ];

  const payloads = [];

  console.log('\n📊 Generating payloads for selected topics...\n');

  for (const topicData of sampleTopics) {
    console.log(`🔸 Topic: ${topicData.topic}`);
    console.log(`   Description: ${topicData.description}`);
    console.log(`   Type: ${topicData.type}`);

    // Generate 3 different payloads for each topic (showing variation)
    for (let i = 1; i <= 3; i++) {
      const payload = generateDummyPayload(topicData.topic, topicData.type);
      payloads.push(payload);

      console.log(`   📦 Payload ${i}:`);
      console.log(`      Status: ${payload.status}`);
      console.log(`      Device ID: ${payload.device_id}`);
      console.log(`      Uptime: ${payload.uptime} seconds`);
      console.log(`      Type: ${payload.type}`);
      console.log(''); // spacer
    }

    console.log('─'.repeat(70));
    console.log('');
  }

  // Save to file as JSON
  const fs = require('fs');
  const outputFile = 'dummy-payloads.json';

  const outputData = {
    generated_at: new Date().toISOString(),
    total_payloads: payloads.length,
    topics_covered: sampleTopics.length,
    payloads: payloads
  };

  fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
  console.log(`✅ Generated ${payloads.length} dummy payloads and saved to ${outputFile}`);

  return payloads;
}

async function testPayloadInsertionToDatabase() {
  console.log('\n🗃️ Testing payload insertion to database...');

  try {
    // Get location that has a topic
    const location = await prisma.nodeTenantLocation.findFirst({
      where: { topic: { not: null } },
      select: { id: true, name: true, topic: true, tenant: { select: { name: true } } }
    });

    if (!location) {
      console.log('⚠️ No locations with topics found in database');
      return;
    }

    console.log(`📍 Found location: ${location.name} (${location.tenant?.name || 'No Tenant'})`);
    console.log(`   Topic: ${location.topic}`);

    // Generate a payload for this location's topic
    const payloadData = {
      topic: location.topic,
      payload: generateDummyPayload(location.topic, 'server'),
      receivedAt: new Date()
    };

    // Insert payload to database
    const savedPayload = await prisma.nodeLocationMqttPayload.create({
      data: {
        locationId: location.id,
        topic: payloadData.topic,
        payload: payloadData.payload,
        receivedAt: payloadData.receivedAt,
        messageId: `test-${Date.now()}`
      }
    });

    console.log(`✅ Successfully saved payload to database!`);
    console.log(`   Payload ID: ${savedPayload.id}`);
    console.log(`   Timestamp: ${savedPayload.receivedAt}`);
    console.log(`   Topic: ${savedPayload.topic}`);

  } catch (error) {
    console.error('❌ Error testing payload insertion:', error);
  }
}

// Export functions
module.exports = {
  generateDummyPayload,
  generateSamplePayloads,
  testPayloadInsertionToDatabase,
  default: generateSamplePayloads
};

// Run if called directly
if (require.main === module) {
  generateSamplePayloads()
    .then(() => testPayloadInsertionToDatabase())
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
