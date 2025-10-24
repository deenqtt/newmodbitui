"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Database, Edit, Loader2, Monitor, Plus, RotateCcw, Search, Server, Settings, Shield, TestTube, Trash2, Wifi, WifiOff, ArrowUpDown, ArrowUp, ArrowDown, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MQTTConnectionBadge from "@/components/mqtt-status";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { getMQTTSource, setMQTTSource, forceReloadMQTT } from "@/lib/mqtt-config";

interface MQTTConfiguration {
  id: string;
  name: string;
  brokerUrl: string;
  username?: string;
  password?: string;
  isActive: boolean;
  enable: boolean;
  createdAt: string;
  updatedAt: string;
}

type SortField = 'name' | 'brokerUrl' | 'creation';
type SortOrder = 'asc' | 'desc';

export default function MQTTConfigurationsPage() {
  const [configurations, setConfigurations] = useState<MQTTConfiguration[]>([]);
  const [filteredConfigurations, setFilteredConfigurations] = useState<MQTTConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<MQTTConfiguration | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    brokerUrl: "",
    username: "",
    password: "",
    isActive: false,
    enable: true,
  });
  const [saving, setSaving] = useState(false);
  const [mqttSource, setMqttSource] = useState<'env' | 'database'>('env');

  // Current broker configuration state
  const [currentBrokerConfig, setCurrentBrokerConfig] = useState<{
    source: 'env' | 'database';
    brokerUrl?: string;
    config?: {
      id: string;
      name: string;
      brokerUrl: string;
      username?: string;
      hasPassword?: boolean;
      createdAt?: string;
      updatedAt?: string;
    };
    requiresRestart: boolean;
  } | null>(null);

  // Search and Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('creation');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Test connection states
  const [testingConfigs, setTestingConfigs] = useState<Set<string>>(new Set());

  // Confirmation dialog states
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState<{
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    type: "info" | "warning" | "destructive";
    onConfirm: () => void;
  } | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchConfigurations();
    fetchCurrentBroker();
    // Load current MQTT source preference
    const currentSource = getMQTTSource();
    setMqttSource(currentSource);
  }, []);

  // Auto-reload current broker when source changes
  useEffect(() => {
    if (mqttSource) {
      fetchCurrentBroker();
    }
  }, [mqttSource]);

  // Filter and sort configurations
  useEffect(() => {
    let filtered = configurations.filter(config =>
      config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.brokerUrl.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'brokerUrl':
          aValue = a.brokerUrl.toLowerCase();
          bValue = b.brokerUrl.toLowerCase();
          break;
        case 'creation':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredConfigurations(filtered);
    setCurrentPage(1); // Reset to first page when filtering/sorting
  }, [configurations, searchQuery, sortField, sortOrder]);

  const showConfirmDialog = (title: string, description: string, confirmText: string, cancelText: string, type: "info" | "warning" | "destructive", onConfirm: () => void) => {
    setConfirmDialogData({
      title,
      description,
      confirmText,
      cancelText,
      type,
      onConfirm,
    });
    setConfirmDialogOpen(true);
  };

  const handleSourceSwitch = async (source: 'env' | 'database') => {
    const currentType = source === 'env' ? 'Environment Variables' : 'Database Configuration';
    const isEnvToDb = mqttSource === 'env' && source === 'database';
    const isDbToEnv = mqttSource === 'database' && source === 'env';

    const title = `Switch to ${currentType}?`;
    const description = `${isEnvToDb ? '• Database configuration will take effect immediately after switch\n• This disables app restart requirement for MQTT changes\n• Connection will automatically reload' : isDbToEnv ? '• Using environment variables from .env file\n• Changes will require app restart to take effect\n• This provides higher security for production' : '• Configuration will reload immediately'}\n\nAre you sure you want to proceed?`;

    const handleConfirm = async () => {
      try {
        // Set loading state during switch
        setLoading(true);

        const response = await fetch('/api/mqtt-configurations/reload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source }),
        });

        const result = await response.json();

        if (result.success) {
          setMQTTSource(source);
          setMqttSource(source);

          // Force reload active configurations
          fetchConfigurations();

          toast({
            title: "MQTT Source Changed Successfully",
            description: `${currentType} is now active. ${source === 'database' ? 'Configuration reload completed.' : 'Restart app if needed for changes.'}`,
          });
        } else {
          toast({
            title: "Switch Failed",
            description: result.error || `Failed to switch to ${currentType}`,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error switching MQTT source:', error);
        toast({
          title: "Switch Error",
          description: "Network error while switching MQTT source",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    showConfirmDialog(title, description, "Switch Source", "Cancel", "warning", handleConfirm);
  };

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/mqtt-configurations");
      const result = await response.json();

      if (result.success) {
        setConfigurations(result.data);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to fetch configurations",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching configurations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch configurations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingConfig(null);
    setFormData({
      name: "",
      brokerUrl: "",
      username: "",
      password: "",
      isActive: false,
      enable: true,
    });
    setDialogOpen(true);
  };

  const handleEdit = (config: MQTTConfiguration) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      brokerUrl: config.brokerUrl,
      username: config.username || "",
      password: config.password || "",
      isActive: config.isActive,
      enable: config.enable,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.brokerUrl) {
      toast({
        title: "Error",
        description: "Name and Broker URL are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const method = editingConfig ? "PUT" : "POST";
      const url = editingConfig
        ? `/api/mqtt-configurations/${editingConfig.id}`
        : "/api/mqtt-configurations";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: editingConfig
            ? "Configuration updated successfully"
            : "Configuration created successfully",
        });
        setDialogOpen(false);
        fetchConfigurations();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save configuration",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const handleConfirm = async () => {
      try {
        const response = await fetch(`/api/mqtt-configurations/${id}`, {
          method: "DELETE",
        });

        const result = await response.json();

        if (result.success) {
          toast({
            title: "Success",
            description: "Configuration deleted successfully",
          });
          fetchConfigurations();
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to delete configuration",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error deleting configuration:", error);
        toast({
          title: "Error",
          description: "Failed to delete configuration",
          variant: "destructive",
        });
      }
    };

    showConfirmDialog(
      `Delete MQTT Configuration?`,
      `Are you sure you want to delete the configuration "${name}"?\n\nThis action cannot be undone.`,
      "Delete",
      "Cancel",
      "destructive",
      handleConfirm
    );
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredConfigurations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedConfigurations = filteredConfigurations.slice(startIndex, startIndex + itemsPerPage);

  const getStatusIcon = (isActive: boolean, enable: boolean) => {
    if (!enable) return <WifiOff className="w-4 h-4 text-gray-500" />;
    if (isActive) return <Wifi className="w-4 h-4 text-green-500" />;
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const testConnection = async (configId: string, brokerUrl: string, username?: string, password?: string) => {
    setTestingConfigs(prev => new Set(prev).add(configId));

    try {
      const response = await fetch('/api/mqtt-configurations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brokerUrl, username, password }),
      });

      const result = await response.json();

      if (result.success) {
        const { connected, error } = result.data;
        toast({
          title: connected ? "Connection Successful" : "Connection Failed",
          description: connected ? "MQTT broker is reachable" : error || "Unable to connect",
          variant: connected ? "default" : "destructive",
        });
      } else {
        toast({
          title: "Test Failed",
          description: result.error || "Unable to test connection",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Test Error",
        description: "Network error while testing connection",
        variant: "destructive",
      });
    } finally {
      setTestingConfigs(prev => {
        const newSet = new Set(prev);
        newSet.delete(configId);
        return newSet;
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const fetchCurrentBroker = async () => {
    try {
      const response = await fetch('/api/mqtt-configurations/reload');
      const result = await response.json();

      if (result.success) {
        setCurrentBrokerConfig(result.data);
      }
    } catch (error) {
      console.error('Error fetching current broker config:', error);
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortOrder === 'asc'
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading configurations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            MQTT Management Center
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Comprehensive MQTT broker configuration and monitoring
          </p>
        </div>
      </div>

      <Tabs defaultValue="advanced" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[500px]">
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            <span className="hidden sm:inline">Advanced Settings</span>
            <span className="sm:hidden">Advanced</span>
          </TabsTrigger>
          <TabsTrigger value="configurations" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">MQTT Configurations</span>
            <span className="sm:hidden">Configs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="advanced" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-purple-600" />
                  Source Configuration
                </CardTitle>
                <CardDescription>
                  Choose MQTT configuration source and monitor connection status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      {mqttSource === 'env' ? (
                        <Server className="w-8 h-8 text-purple-600" />
                      ) : (
                        <Database className="w-8 h-8 text-purple-600" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-lg">
                        Currently using: {mqttSource === 'env' ? 'Environment Variables' : 'Database Configuration'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {mqttSource === 'env'
                          ? 'Using NEXT_PUBLIC_MQTT_* environment variables. Requires app restart for changes.'
                          : 'Using active database configuration. Changes apply immediately.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant={mqttSource === 'env' ? 'default' : 'outline'}
                      onClick={() => handleSourceSwitch('env')}
                      className="flex items-center gap-2 flex-1"
                      size="lg"
                    >
                      <Server className="w-4 h-4" />
                      Environment Variables
                    </Button>
                    <Button
                      variant={mqttSource === 'database' ? 'default' : 'outline'}
                      onClick={() => handleSourceSwitch('database')}
                      className="flex items-center gap-2 flex-1"
                      size="lg"
                    >
                      <Database className="w-4 h-4" />
                      Database Config
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3">Connection Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Broker:</span>
                      <span className="font-mono">
                        {mqttSource === 'env'
                          ? `${process.env.NEXT_PUBLIC_MQTT_BROKER_URL || 'Not set'}`
                          : 'Database active config'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Source:</span>
                      <Badge variant="outline" className="text-xs">
                        {mqttSource === 'env' ? 'ENV' : 'DB'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Auto-reload:</span>
                      <Badge variant={mqttSource === 'database' ? 'default' : 'secondary'} className="text-xs">
                        {mqttSource === 'database' ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-green-600" />
                  Connection Monitor
                </CardTitle>
                <CardDescription>
                  Real-time MQTT connection status and monitoring
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-3">
                  <MQTTConnectionBadge />
                  <div>
                    <p className="font-semibold">Live Connection Status</p>
                    <p className="text-sm text-gray-500">
                      Real-time MQTT monitoring via status component
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">MQTT Features</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Real-time Data</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>TCP/WebSocket</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Authentication</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Auto-reconnect</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>SSL/TLS Support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Fallback Config</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3">Active Services</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Thermal Monitoring</span>
                      <Badge variant="default" className="text-xs">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>EC25 Modem</span>
                      <Badge variant="default" className="text-xs">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>UI Dashboard</span>
                      <Badge variant="default" className="text-xs">Active</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Broker Display */}
          {currentBrokerConfig && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-600" />
                  Currently Active Broker
                </CardTitle>
                <CardDescription>
                  Current MQTT broker configuration in use by all services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg border">
                  <div className="flex-shrink-0">
                    {currentBrokerConfig.source === 'env' ? (
                      <Server className="w-10 h-10 text-blue-600" />
                    ) : (
                      <Database className="w-10 h-10 text-blue-600" />
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg">
                        {currentBrokerConfig.config?.name || 'Environment Variables'}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {currentBrokerConfig.source === 'env' ? 'ENV' : 'DB'}
                      </Badge>
                      {currentBrokerConfig.requiresRestart && (
                        <Badge variant="secondary" className="text-xs">
                          Restart Required
                        </Badge>
                      )}
                    </div>
                    <p className="font-mono text-sm text-gray-600 dark:text-gray-300">
                      {currentBrokerConfig.brokerUrl}
                    </p>
                    {currentBrokerConfig.config?.username && (
                      <p className="text-sm text-gray-500">
                        Authenticated as: <span className="font-medium">{currentBrokerConfig.config.username}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-data-key">Last Updated:</span>
                    <p className="text-data-value font-medium">
                      {currentBrokerConfig.config?.updatedAt
                        ? new Date(currentBrokerConfig.config.updatedAt).toLocaleString()
                        : 'Environment config'}
                    </p>
                  </div>
                  <div>
                    <span className="text-data-key">Auto-reload:</span>
                    <p className="text-data-value font-medium">
                      {currentBrokerConfig.source === 'database' ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Broker Test & Diagnostics
              </CardTitle>
              <CardDescription>
                Test MQTT broker connections and diagnose connectivity issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <Server className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <h3 className="font-semibold">ENV Broker</h3>
                  <p className="text-sm text-gray-500 mt-1">From environment variables</p>
                  <Button variant="outline" size="sm" className="mt-3">
                    Test Connection
                  </Button>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Database className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <h3 className="font-semibold">DB Broker</h3>
                  <p className="text-sm text-gray-500 mt-1">From active database config</p>
                  <Button variant="outline" size="sm" className="mt-3">
                    Test Connection
                  </Button>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                  <h3 className="font-semibold">Diagnostic</h3>
                  <p className="text-sm text-gray-500 mt-1">Connection health check</p>
                  <Button variant="outline" size="sm" className="mt-3">
                    Run Diagnostics
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configurations" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  Broker Configurations
                </div>
                <Button onClick={handleCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4" />
                  Add Broker
                </Button>
              </CardTitle>
              <CardDescription>
                Manage multiple MQTT broker configurations with authentication and failover options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or broker URL..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creation">Created Date</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="brokerUrl">Broker URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results Count */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredConfigurations.length} of {configurations.length} configurations
                  {searchQuery && ` matching "${searchQuery}"`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchConfigurations}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                          Name
                          {renderSortIcon('name')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => handleSort('brokerUrl')}
                      >
                        <div className="flex items-center">
                          Broker URL
                          {renderSortIcon('brokerUrl')}
                        </div>
                      </TableHead>
                      <TableHead>Authentication</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => handleSort('creation')}
                      >
                        <div className="flex items-center">
                          Created
                          {renderSortIcon('creation')}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedConfigurations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500 mb-4">
                            {searchQuery ? `No configurations found matching "${searchQuery}"` : 'No configurations found'}
                          </p>
                          <Button onClick={handleCreate} variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            {searchQuery ? 'Create New' : 'Create First Configuration'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedConfigurations.map((config) => (
                        <TableRow key={config.id} className={
                          config.isActive && config.enable ? 'bg-green-50/50 dark:bg-green-950/20' : ''
                        }>
                          <TableCell>
                            {getStatusIcon(config.isActive, config.enable)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {config.name}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{config.brokerUrl}</span>
                          </TableCell>
                          <TableCell>
                            {config.username ? (
                              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                <Shield className="w-3 h-3" />
                                Authenticated
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                <Wifi className="w-3 h-3" />
                                Public
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {config.enable ? (
                              config.isActive ? (
                                <Badge variant="default" className="bg-green-600">
                                  Active & Enabled
                                </Badge>
                              ) : (
                                <Badge variant="outline">Inactive but Enabled</Badge>
                              )
                            ) : (
                              <Badge variant="destructive">Disabled</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(config.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => testConnection(config.id, config.brokerUrl, config.username, config.password)}
                                disabled={testingConfigs.has(config.id)}
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                title="Test Connection"
                              >
                                {testingConfigs.has(config.id) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <TestTube className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(config)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Edit Configuration"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(config.id, config.name)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete Configuration"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredConfigurations.length)} of {filteredConfigurations.length} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? "Edit" : "Create"} MQTT Configuration
            </DialogTitle>
            <DialogDescription>
              Configure a new MQTT broker connection. Make sure to test the connection before saving.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="col-span-3"
                placeholder="e.g. Production IoT Hub"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brokerUrl" className="text-right">
                Broker URL *
              </Label>
              <Input
                id="brokerUrl"
                value={formData.brokerUrl}
                onChange={(e) =>
                  setFormData({ ...formData, brokerUrl: e.target.value })
                }
                className="col-span-3 font-mono"
                placeholder="wss://mqtt.example.com:8883"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="col-span-3"
                placeholder="Optional - leave empty for public broker"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="col-span-3"
                placeholder="Optional - leave empty for public broker"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="enable" className="text-right">
                Enable
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id="enable"
                  checked={formData.enable}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enable: checked })
                  }
                />
                <Label htmlFor="enable">
                  {formData.enable ? "Enabled" : "Disabled"}
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">
                Active
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">
                  {formData.isActive ? "Active" : "Inactive"}
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingConfig ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      {confirmDialogData && (
        <ConfirmationDialog
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          type={confirmDialogData.type}
          title={confirmDialogData.title}
          description={confirmDialogData.description}
          confirmText={confirmDialogData.confirmText}
          cancelText={confirmDialogData.cancelText}
          onConfirm={confirmDialogData.onConfirm}
          onCancel={() => setConfirmDialogOpen(false)}
        />
      )}
    </div>
  );
}
