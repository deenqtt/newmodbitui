import { useState, useEffect, useCallback } from 'react';
import mqtt, { MqttClient } from "mqtt";
import { getMQTTConfig } from "@/lib/mqtt-config";

interface AlarmData {
  nodeName: string;
  baseTopic: string;
  publishedAt: string;
  totalRecords: number;
  alarmLogs: Array<{
    id: string;
    status: 'ACTIVE' | 'ACKNOWLEDGED' | 'CLEARED';
    triggeringValue: string;
    timestamp: number;
    clearedAt?: number | null;
    alarmConfigId: string;
    alarmConfig: {
      customName: string;
      alarmType: 'CRITICAL' | 'MAJOR' | 'MINOR';
      keyType: 'THRESHOLD' | 'BIT_VALUE';
      key: string;
      deviceUniqId: string;
      minValue?: number;
      maxValue?: number;
      maxOnly: number;
    };
  }>;
}

interface LocationAlarmCount {
  locationId: string;
  locationName: string;
  totalAlarms: number;
  activeAlarms: number;
  clearedAlarms: number;
}

export const useMQTTAlarms = (locations: Array<{ id: string; name: string; topic?: string | null }>) => {
  const [alarmCounts, setAlarmCounts] = useState<Record<string, LocationAlarmCount>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const processAlarmData = useCallback((topic: string, alarmData: AlarmData) => {
    // Topic format: iot/{location_node_name}/Alarm
    // Need to match with location.topic (without /Alarm suffix)
    const originalTopic = topic.replace('/Alarm', '');

    const location = locations.find(loc => loc.topic === originalTopic);

    if (!location) {
      console.warn(`[MQTT] No location found for topic: ${originalTopic}`);
      return;
    }

    // Create alarm counts only for this specific location
    // Include all alarm statuses: ACTIVE, ACKNOWLEDGED, CLEARED
    const counts: LocationAlarmCount = {
      locationId: location.id,
      locationName: location.name,
      totalAlarms: alarmData.totalRecords,
      activeAlarms: alarmData.alarmLogs.filter(log => log.status === 'ACTIVE' || log.status === 'ACKNOWLEDGED').length,
      clearedAlarms: alarmData.alarmLogs.filter(log => log.status === 'CLEARED').length,
    };

    // Only update this specific location's alarm counts
    setAlarmCounts(prev => ({
      ...prev,
      [location.id]: counts
    }));

    setLastUpdate(new Date());
  }, [locations]);

  useEffect(() => {
    if (typeof window === 'undefined' || !locations.length) {
      return;
    }

    let client: any = null;
    let reconnectTimeout: NodeJS.Timeout | undefined;

    const initializeMQTT = () => {
      try {
        // Subscribe to all location alarm topics: {LOCATION_TOPIC}/Alarm
        const topics = locations
          .filter(loc => loc.topic) // Only locations with topics
          .map(loc => `${loc.topic}/Alarm`);

        // Get MQTT broker URL from config
        const mqttBrokerUrl = getMQTTConfig();

        client = mqtt.connect(mqttBrokerUrl, {
          clientId: `alarm-monitor-${Math.random().toString(16).substring(2, 8)}`,
          clean: true,
          connectTimeout: 4000,
          reconnectPeriod: 1000,
        });

        client.on('connect', () => {
          console.log('MQTT connected for alarm monitoring');
          setConnectionStatus('connected');

          // Subscribe to all alarm topics
          client.subscribe([...new Set(topics)], { qos: 1 }, (err: any) => {
            if (err) {
              console.error('MQTT subscription error:', err);
            } else {
              console.log('Subscribed to alarm topics:', topics);
            }
          });
        });

        client.on('message', (topic: string, message: Buffer) => {
          try {
            const alarmData: AlarmData = JSON.parse(message.toString());
            processAlarmData(topic, alarmData);
          } catch (error) {
            console.error('Error parsing MQTT message:', error);
          }
        });

        client.on('disconnect', () => {
          console.log('MQTT disconnected');
          setConnectionStatus('disconnected');
        });

        client.on('error', (error: any) => {
          console.error('MQTT connection error:', error);
          setConnectionStatus('disconnected');
        });

      } catch (error) {
        console.error('Failed to initialize MQTT:', error);
        setConnectionStatus('disconnected');
      }
    };

    initializeMQTT();

    // Cleanup function
    return () => {
      if (client) {
        client.end();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [locations, processAlarmData]);

  const refreshAlarms = useCallback(() => {
    // Optional: Trigger manual refresh if needed
    console.log('Manual alarm refresh requested');
  }, []);

  return {
    alarmCounts,
    connectionStatus,
    lastUpdate,
    refreshAlarms,
  };
};
