"use client";

import { useState, useEffect, useCallback } from "react";
import { useMqtt } from "@/contexts/MqttContext";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import MqttStatus from "@/components/ui/mqtt-status";
import {
  Compass,
  Zap,
  Plus,
  Minus,
  MessageSquare,
  Search,
  Settings,
  RefreshCw,
  Database,
  Activity,
  Wifi,
  WifiOff,
  MapPin, Eye,
} from "lucide-react";

// MQTT Message Interface
interface MQTTMessage {
  topic: string;
  payload: string;
  timestamp: Date;
}

// Discovered Node Interface
interface DiscoveredNode {
  topic: string;
  lastPayload: any;
  messageCount: number;
  lastSeen: Date;
  isActive: boolean;
}

// Parsed Node Interface for table display
interface ParsedNode {
  name: string;
  ipWlan: string;
  ipEth: string;
  macAddress: string;
  macAddressEth: string;
  macAddressWlan: string;
  deviceCount: number;
  deviceDetails: {
    modbus: any[];
    modular: any[];
  };
  timestamp: string;
}

const NodeInfoDiscoverPage = () => {
  const { isReady, subscribe, unsubscribe } = useMqtt();

  // Base topic state
  const [baseTopic, setBaseTopic] = useState("");
  const [currentSubscription, setCurrentSubscription] = useState<string | null>(null);
  const [autoWildcard, setAutoWildcard] = useState(true);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Messages and nodes
  const [messages, setMessages] = useState<MQTTMessage[]>([]);
  const [discoveredNodes, setDiscoveredNodes] = useState<Map<string, DiscoveredNode>>(new Map());
  const [messageFilter, setMessageFilter] = useState("");

  // NodeTenantLocation registration modal
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<DiscoveredNode | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [registerFormData, setRegisterFormData] = useState({
    name: "",
    longitude: "",
    latitude: "",
    url: "",
    description: "",
    tenantId: "",
  });
  const [registering, setRegistering] = useState(false);

  // Device details modal
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [selectedNodeForDevices, setSelectedNodeForDevices] = useState<DiscoveredNode | null>(null);

  // Activity timeout for nodes (5 minutes)
  const NODE_TIMEOUT = 5 * 60 * 1000;

  // Filter messages based on topic filter
  const filteredMessages = messageFilter
    ? messages.filter(msg => msg.topic.toLowerCase().includes(messageFilter.toLowerCase()))
    : messages;

  // MQTT subscription effect
  useEffect(() => {
    if (!isReady || !currentSubscription) return;

    const handleMessage = (topic: string, payload: string) => {
      const newMessage: MQTTMessage = {
        topic,
        payload,
        timestamp: new Date(),
      };

      setMessages(prev => {
        const newMessages = [...prev, newMessage];
        // Keep only last 500 messages
        return newMessages.length > 500 ? newMessages.slice(-500) : newMessages;
      });

      // Update discovered nodes
      setDiscoveredNodes(prev => {
        const existing = prev.get(topic) || {
          topic,
          lastPayload: null,
          messageCount: 0,
          lastSeen: new Date(),
          isActive: true,
        };

        const updated: DiscoveredNode = {
          ...existing,
          lastPayload: payload,
          messageCount: existing.messageCount + 1,
          lastSeen: new Date(),
          isActive: true,
        };

        const newMap = new Map(prev);
        newMap.set(topic, updated);
        return newMap;
      });

      if (!isDiscovering) {
        setIsDiscovering(true);
        setTimeout(() => setIsDiscovering(false), 1000);
      }
    };

    subscribe(currentSubscription, handleMessage);

    return () => {
      unsubscribe(currentSubscription, handleMessage);
    };
  }, [currentSubscription, isReady, subscribe, unsubscribe, isDiscovering]);

  // Start discovery
  const startDiscovery = useCallback(() => {
    if (!baseTopic.trim()) {
      toast.error("Please enter a base topic");
      return;
    }

    if (!isReady) {
      toast.error("MQTT connection not ready");
      return;
    }

    const subscriptionTopic = autoWildcard ? `${baseTopic.trim()}/#` : baseTopic.trim();

    setCurrentSubscription(subscriptionTopic);
    setMessages([]);
    setDiscoveredNodes(new Map());
    setIsDiscovering(false);
    toast.success(`Started discovery for topic: ${subscriptionTopic}`);
  }, [baseTopic, autoWildcard, isReady]);

  // Stop discovery
  const stopDiscovery = useCallback(() => {
    if (currentSubscription) {
      setCurrentSubscription(null);
      setIsDiscovering(false);
      toast.success("Discovery stopped");
    }
  }, [currentSubscription]);

  // Clear results
  const clearResults = useCallback(() => {
    setMessages([]);
    setDiscoveredNodes(new Map());
  }, []);

  // Format payload for display
  const formatPayload = (payload: string): string => {
    try {
      const parsed = JSON.parse(payload);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return payload;
    }
  };

  // Parse payload to extract node information
  const parsePayload = (payload: string): Partial<ParsedNode> => {
    try {
      const data = JSON.parse(payload);
      return {
        name: data.name || "N/A",
        ipWlan: data.ip_wlan || "N/A",
        ipEth: data.ip_eth || "N/A",
        macAddress: data.mac_address || "N/A",
        macAddressEth: data.mac_address_eth || "N/A",
        macAddressWlan: data.mac_address_wlan || "N/A",
        deviceCount: (data.data?.modbus?.length || 0) + (data.data?.modular?.length || 0),
        deviceDetails: {
          modbus: data.data?.modbus || [],
          modular: data.data?.modular || [],
        },
        timestamp: data.time_stamp || new Date().toISOString(),
      };
    } catch {
      return {
        name: "N/A",
        ipWlan: "N/A",
        ipEth: "N/A",
        macAddress: "N/A",
        macAddressEth: "N/A",
        macAddressWlan: "N/A",
        deviceCount: 0,
        deviceDetails: { modbus: [], modular: [] },
        timestamp: new Date().toISOString(),
      };
    }
  };

  // Check node activity
  const isNodeActive = (lastSeen: Date): boolean => {
    return Date.now() - lastSeen.getTime() < NODE_TIMEOUT;
  };

  // Render IP address as clickable link if valid
  const renderIPAddress = (ipAddress: string) => {
    if (!ipAddress || ipAddress === "N/A") {
      return <span className="text-muted-foreground">{ipAddress}</span>;
    }

    // Check if it's a valid IP address (basic validation)
    const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (ipRegex.test(ipAddress)) {
      return (
        <a
          href={`http://${ipAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm text-blue-600 hover:text-blue-800 underline"
        >
          {ipAddress}
        </a>
      );
    }

    return <span className="font-mono text-sm">{ipAddress}</span>;
  };

  // Get unique topics from discovered nodes
  const uniqueTopics = Array.from(discoveredNodes.keys());
  const activeNodes = Array.from(discoveredNodes.values()).filter(node =>
    node.isActive && isNodeActive(node.lastSeen)
  ).length;

  // Fetch tenants for registration modal
  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/tenants");
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      }
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
    }
  };

  // Handle opening device details modal
  const handleViewDevices = (node: DiscoveredNode) => {
    setSelectedNodeForDevices(node);
    setDeviceModalOpen(true);
  };

  // Handle opening registration modal
  const handleRegisterLocation = (node: DiscoveredNode) => {
    setSelectedNode(node);
    const parsed = parsePayload(node.lastPayload);
    setRegisterFormData({
      name: (parsed.name && parsed.name !== "N/A") ? parsed.name : `Location-${node.topic.replace(/\//g, '-').replace(/#/g, '')}`,
      longitude: "",
      latitude: "",
      url: `mqtt://${parsed.ipWlan !== "N/A" ? parsed.ipWlan : "localhost"}:1883`,
      description: `Discovered via MQTT topic: ${node.topic}\nIP: ${parsed.ipWlan}\nMAC: ${parsed.macAddress}\nDevices: ${parsed.deviceCount}`,
      tenantId: "",
    });
    setRegisterModalOpen(true);
    fetchTenants(); // Fetch tenants when modal opens
  };

  // Handle creating NodeTenantLocation
  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerFormData.name || !selectedNode) {
      toast.error("Location name is required");
      return;
    }

    // Validate coordinates if provided
    if (registerFormData.longitude && registerFormData.latitude) {
      const longitude = parseFloat(registerFormData.longitude);
      const latitude = parseFloat(registerFormData.latitude);

      if (longitude < -180 || longitude > 180) {
        toast.error("Longitude must be between -180 and 180");
        return;
      }
      if (latitude < -90 || latitude > 90) {
        toast.error("Latitude must be between -90 and 90");
        return;
      }
    }

    setRegistering(true);

    try {
      const response = await fetch("/api/node-tenant-locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: registerFormData.name,
          longitude: registerFormData.longitude ? parseFloat(registerFormData.longitude) : 0,
          latitude: registerFormData.latitude ? parseFloat(registerFormData.latitude) : 0,
          url: registerFormData.url || undefined,
          topic: selectedNode.topic, // Use the discovered topic
          description: registerFormData.description,
          status: "active",
          tenantId: registerFormData.tenantId === "none" ? "" : registerFormData.tenantId || "",
        }),
      });

      if (response.ok) {
        const newLocation = await response.json();
        toast.success(`Location "${newLocation.name}" created successfully!`);
        setRegisterModalOpen(false);
        setSelectedNode(null);
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to create location");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create location");
    } finally {
      setRegistering(false);
    }
  };

  // Auto-update node activity status
  useEffect(() => {
    const interval = setInterval(() => {
      setDiscoveredNodes(prev => {
        const now = Date.now();
        const newMap = new Map();

        for (const [topic, node] of prev) {
          const isActive = now - node.lastSeen.getTime() < NODE_TIMEOUT;
          newMap.set(topic, { ...node, isActive });
        }

        return newMap;
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Node Info Discover</h1>
          {currentSubscription && (
            <Badge variant="outline" className="font-mono text-xs">
              {currentSubscription}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <MqttStatus />
          {currentSubscription && (
            <Badge variant="default" className="flex items-center gap-1">
              <Compass className="h-3 w-3" />
              Discovery Active
            </Badge>
          )}
          {isDiscovering && <Activity className="h-4 w-4 animate-pulse" />}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Topics</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{uniqueTopics.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Nodes</CardTitle>
              <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">{activeNodes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{messages.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Discovery Status</CardTitle>
              <Database className="h-4 w-4 text-foreground" />
            </CardHeader>
            <CardContent>
              <Badge variant={currentSubscription ? "default" : "secondary"} className="text-xs">
                {currentSubscription ? "Active" : "Inactive"}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Discovery Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Discovery Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="base-topic">Base Topic</Label>
                <Input
                  id="base-topic"
                  value={baseTopic}
                  onChange={(e) => setBaseTopic(e.target.value)}
                  placeholder="example/sensor"
                  disabled={!!currentSubscription}
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="auto-wildcard"
                  checked={autoWildcard}
                  onCheckedChange={setAutoWildcard}
                  disabled={!!currentSubscription}
                />
                <Label htmlFor="auto-wildcard" className="text-sm">
                  Auto-add wildcard (/#+)
                </Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={startDiscovery}
                disabled={!isReady || !!currentSubscription || !baseTopic.trim()}
                className="flex-1"
              >
                <Compass className="h-4 w-4 mr-2" />
                Start Discovery
              </Button>
              <Button
                variant="destructive"
                onClick={stopDiscovery}
                disabled={!currentSubscription}
              >
                <Minus className="h-4 w-4 mr-2" />
                Stop
              </Button>
              <Button
                variant="outline"
                onClick={clearResults}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {currentSubscription && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-400">
                  <Wifi className="h-4 w-4" />
                  <span className="font-medium text-foreground">Discovery Active</span>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Listening to: <code className="font-mono text-foreground bg-muted px-1 py-0.5 rounded">{currentSubscription}</code>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Discovered Nodes */}
        {discoveredNodes.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Discovered Nodes ({activeNodes}/{uniqueTopics.length})
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Topic</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>IP WLAN</TableHead>
                      <TableHead>IP ETH</TableHead>
                      <TableHead>MAC Address</TableHead>
                      <TableHead>Devices</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead className="w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from(discoveredNodes.values()).map((node) => {
                      const isActive = node.isActive && isNodeActive(node.lastSeen);
                      const parsed = parsePayload(node.lastPayload);
                      return (
                        <TableRow key={node.topic} >
                          <TableCell className="font-mono text-sm break-all">{node.topic}</TableCell>
                          <TableCell>{parsed.name}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {node.lastSeen.toLocaleTimeString('id-ID', {
                              hour12: false,
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{node.messageCount}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={isActive ? "default" : "secondary"}>
                              {isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>{renderIPAddress(parsed.ipWlan || "N/A")}</TableCell>
                          <TableCell>{renderIPAddress(parsed.ipEth || "N/A")}</TableCell>
                          <TableCell className="font-mono text-sm">{parsed.macAddress}</TableCell>
                          <TableCell>{parsed.deviceCount}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {parsed.timestamp ? new Date(parsed.timestamp).toLocaleTimeString('id-ID', {
                              hour12: false,
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            }) : "N/A"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col sm:flex-row gap-1">
                              <Button
                                size="sm"
                                onClick={() => handleViewDevices(node)}
                                variant="outline"
                                className="flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleRegisterLocation(node)}
                                className="flex items-center gap-1"
                              >
                                <MapPin className="h-3 w-3" />
                                Register
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Message Stream */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Message Stream ({filteredMessages.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Filter topics..."
                  value={messageFilter}
                  onChange={(e) => setMessageFilter(e.target.value)}
                  className="w-64"
                  disabled={messages.length === 0}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto p-4 space-y-2">
              {filteredMessages.length > 0 ? (
                filteredMessages.slice(-50).map((message, index) => (
                  <div
                    key={index}
                    className="border border-border rounded-lg p-3 bg-muted/20 dark:bg-muted/10 hover:bg-muted/40 dark:hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="font-mono text-xs badge-data">
                        {message.timestamp.toLocaleTimeString('id-ID', {
                          hour12: false,
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          fractionalSecondDigits: 3,
                        })}
                      </Badge>
                      <Badge variant="default" className="text-xs badge-info">
                        New Node
                      </Badge>
                    </div>
                    <div className="font-medium text-sm mb-1 break-all text-content">
                      {message.topic}
                    </div>
                    <pre className="text-xs bg-background dark:bg-secondary/30 p-2 rounded border border-border overflow-x-auto whitespace-pre-wrap break-all max-h-24 overflow-y-auto text-mqtt-data">
                      {formatPayload(message.payload)}
                    </pre>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                  {currentSubscription ? (
                    <>
                      <p className="text-muted-foreground text-content">No messages received yet</p>
                      <p className="text-sm text-muted-foreground text-data-key">Waiting for MQTT messages on: <code className="font-mono bg-muted px-1 py-0.5 rounded">{currentSubscription}</code></p>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-content">Start discovery to begin receiving messages</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registration Modal */}
      <Dialog open={registerModalOpen} onOpenChange={setRegisterModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Register Node Location
            </DialogTitle>
            <DialogDescription>
              Create a new location entry using the discovered MQTT topic data
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLocation} className="space-y-4">
            {/* Node Info Display */}
            {selectedNode && (
              <Card className="bg-muted/30 dark:bg-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Node Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Topic:</span>
                    <code className="text-xs bg-background px-2 py-1 rounded">
                      {selectedNode.topic}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Messages:</span>
                    <span>{selectedNode.messageCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Last Seen:</span>
                    <span className="text-muted-foreground">
                      {selectedNode.lastSeen.toLocaleString('id-ID')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location-name">Location Name *</Label>
                <Input
                  id="location-name"
                  value={registerFormData.name}
                  onChange={(e) => setRegisterFormData({...registerFormData, name: e.target.value})}
                  placeholder="Location name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenant-select">Tenant (Optional)</Label>
                <Select
                  value={registerFormData.tenantId}
                  onValueChange={(value) => setRegisterFormData({...registerFormData, tenantId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Tenant</SelectItem>
                    {tenants.map((tenant: any) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                        {tenant.company && ` (${tenant.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={registerFormData.longitude}
                  onChange={(e) => setRegisterFormData({...registerFormData, longitude: e.target.value})}
                  placeholder="-180 to 180"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={registerFormData.latitude}
                  onChange={(e) => setRegisterFormData({...registerFormData, latitude: e.target.value})}
                  placeholder="-90 to 90"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={registerFormData.url}
                onChange={(e) => setRegisterFormData({...registerFormData, url: e.target.value})}
                placeholder="mqtt://host:port"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={registerFormData.description}
                onChange={(e) => setRegisterFormData({...registerFormData, description: e.target.value})}
                placeholder="Location description"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRegisterModalOpen(false)}
                disabled={registering}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={registering || !registerFormData.name.trim()}
              >
                {registering ? "Creating..." : "Create Location"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Device Details Modal */}
      <Dialog open={deviceModalOpen} onOpenChange={setDeviceModalOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Device Details
            </DialogTitle>
            <DialogDescription>
              {selectedNodeForDevices ? `Devices discovered on topic: ${selectedNodeForDevices.topic}` : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedNodeForDevices && (
            <div className="space-y-4">
              {(() => {
                const parsed = parsePayload(selectedNodeForDevices.lastPayload);

                return (
                  <>
                    {/* Modbus Devices */}
                    {(parsed.deviceDetails?.modbus && parsed.deviceDetails.modbus.length > 0) && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            Modbus Devices ({parsed.deviceDetails.modbus.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {parsed.deviceDetails.modbus.map((device: any, index: number) => (
                              <Card key={index} className="border-2">
                                <CardContent className="p-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Device Profile Info */}
                                    <div className="space-y-2">
                                      <h4 className="font-semibold text-sm">Device Profile</h4>
                                      <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                          <span className="font-medium">Name:</span>
                                          <span>{device.profile?.name || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Type:</span>
                                          <span>{device.profile?.device_type || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Manufacturer:</span>
                                          <span>{device.profile?.manufacturer || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Part Number:</span>
                                          <span>{device.profile?.part_number || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Topic:</span>
                                          <code className="text-xs">{device.profile?.topic || "N/A"}</code>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Protocol Settings Info */}
                                    <div className="space-y-2">
                                      <h4 className="font-semibold text-sm">Protocol Settings</h4>
                                      <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                          <span className="font-medium">Protocol:</span>
                                          <span>{device.protocol_setting?.protocol || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Slave Address:</span>
                                          <span>{device.protocol_setting?.address || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Port:</span>
                                          <span>{device.protocol_setting?.port || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Baudrate:</span>
                                          <span>{device.protocol_setting?.baudrate || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Parity:</span>
                                          <span>{device.protocol_setting?.parity || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Bytesize:</span>
                                          <span>{device.protocol_setting?.bytesize || "N/A"}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Modular Devices */}
                    {(parsed.deviceDetails?.modular && parsed.deviceDetails.modular.length > 0) && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Modular Devices ({parsed.deviceDetails.modular.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {parsed.deviceDetails.modular.map((device: any, index: number) => (
                              <Card key={index} className="border-2">
                                <CardContent className="p-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Device Profile Info */}
                                    <div className="space-y-2">
                                      <h4 className="font-semibold text-sm">Device Profile</h4>
                                      <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                          <span className="font-medium">Name:</span>
                                          <span>{device.profile?.name || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Type:</span>
                                          <span>{device.profile?.device_type || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Manufacturer:</span>
                                          <span>{device.profile?.manufacturer || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Part Number:</span>
                                          <span>{device.profile?.part_number || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Topic:</span>
                                          <code className="text-xs">{device.profile?.topic || "N/A"}</code>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Protocol Settings Info */}
                                    <div className="space-y-2">
                                      <h4 className="font-semibold text-sm">Protocol Settings</h4>
                                      <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                          <span className="font-medium">Protocol:</span>
                                          <span>{device.protocol_setting?.protocol || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Device Address:</span>
                                          <span>{device.protocol_setting?.address || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Device Bus:</span>
                                          <span>{device.protocol_setting?.device_bus || "N/A"}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* No Devices Message */}
                    {(!parsed.deviceDetails?.modbus || parsed.deviceDetails.modbus.length === 0) &&
                     (!parsed.deviceDetails?.modular || parsed.deviceDetails.modular.length === 0) && (
                      <Card>
                        <CardContent className="p-6 text-center">
                          <Database className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                          <p className="text-muted-foreground">No devices found on this node</p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NodeInfoDiscoverPage;
