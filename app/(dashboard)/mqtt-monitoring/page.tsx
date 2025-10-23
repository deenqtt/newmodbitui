"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertTriangle, XCircle, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import MQTTConnectionBadge from '@/components/mqtt-status';
import { useMQTTStatus } from '@/hooks/useMQTTStatus';
import { connectMQTTAsync, disconnectMQTT, getConnectionState, isClientConnected, getMQTTClient } from '@/lib/mqttClient';
import { getEnvMQTTBrokerUrl } from '@/lib/mqtt-config';

export default function MQTTMonitoringPage() {
  const status = useMQTTStatus();
  const [brokerUrl, setBrokerUrl] = useState<string>('');
  const [connectionDetails, setConnectionDetails] = useState({
    host: '',
    port: '',
    protocol: '',
    username: '',
    password: '',
  });
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    // Get broker URL from config
    const url = getEnvMQTTBrokerUrl();
    setBrokerUrl(url);

    // Parse connection details from URL
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    const port = urlObj.port || (url.startsWith('wss') || url.startsWith('https') ? '443' : '80');
    const protocol = urlObj.protocol.replace(':', '');

    setConnectionDetails({
      host: host,
      port: port,
      protocol,
      username: '', // Auth not currently implemented
      password: '', // Auth not currently implemented
    });
  }, []);

  const handleManualReconnect = async () => {
    setIsReconnecting(true);
    try {
      disconnectMQTT();
      await new Promise(resolve => setTimeout(resolve, 1000));
      connectMQTTAsync();
    } catch (error) {
      console.error('Manual reconnect failed:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-5 h-5 text-green-500" />;
      case 'connecting':
        return <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <WifiOff className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            MQTT Monitoring
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Real-time monitoring of MQTT broker connection and configuration
          </p>
        </div>
        <Button
          onClick={handleManualReconnect}
          disabled={isReconnecting}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin' : ''}`} />
          Reconnect
        </Button>
      </div>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(status)}
            Connection Status
          </CardTitle>
          <CardDescription>
            Current MQTT broker connection state
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <MQTTConnectionBadge />
            <div>
              <p className={`font-semibold ${getStatusColor(status)}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </p>
              <p className="text-sm text-gray-500">
                {isClientConnected() ? 'Active connection established' : 'Connection not available'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Broker Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Broker Configuration</CardTitle>
          <CardDescription>
            MQTT broker settings loaded from environment configuration (.env)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Broker URL
              </label>
              <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                {brokerUrl}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Connection State
              </label>
              <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                {getConnectionState()}
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Host
              </label>
              <Badge variant="secondary" className="font-mono">
                {connectionDetails.host}
              </Badge>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Port
              </label>
              <Badge variant="secondary" className="font-mono">
                {connectionDetails.port}
              </Badge>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Protocol
              </label>
              <Badge variant="secondary" className="font-mono">
                {connectionDetails.protocol.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Username
              </label>
              <Badge variant="secondary">
                {connectionDetails.username || 'Not configured'}
              </Badge>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <Badge variant="secondary">
                {connectionDetails.password || 'Not configured'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Details</CardTitle>
          <CardDescription>
            Technical information about MQTT connection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Client Connected</span>
              <Badge variant={isClientConnected() ? "default" : "secondary"}>
                {isClientConnected() ? 'Yes' : 'No'}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">WebSocket Connection</span>
              <Badge variant="secondary">
                {brokerUrl.startsWith('ws') ? 'WebSocket' : 'TCP'}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Authentication</span>
              <Badge variant={connectionDetails.username ? "default" : "secondary"}>
                {connectionDetails.username ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MQTT Functions Card */}
      <Card>
        <CardHeader>
          <CardTitle>MQTT System Functions</CardTitle>
          <CardDescription>
            How MQTT connection is used in this IoT dashboard system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Real-time Data Streaming
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  MQTT enables real-time data streaming from IoT devices including temperature sensors, flow meters, pH sensors, air quality monitors, and door access systems.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  System Architecture
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Uses WebSocket connection (ws://) for browser compatibility. Supports both server-side (mqtt library) and client-side (Paho MQTT) connections.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Integration Services
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Connected to multiple services: Alarm notifications, device monitoring, thermal sensors, Zigbee2MQTT bridge, and calculation services.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Broker Configuration
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Broker URL loaded from environment variables (.env file). Supports configurable host, port, authentication, and protocol settings for flexible deployment.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
