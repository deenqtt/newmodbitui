"use client";

import { useState, useEffect } from "react";
import { useMap } from "react-leaflet";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, MapPinned, RefreshCw, Server, Wifi, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { useMQTTAlarms } from "@/hooks/useMQTT";
import MQTTConnectionBadge from "@/components/mqtt-status";

// Dynamically import Map component to avoid SSR issues with Leaflet
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96">Loading map...</div>,
});

const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), {
  ssr: false,
});

const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), {
  ssr: false,
});

const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), {
  ssr: false,
  loading: () => null, // Don't show anything while loading
});

// Function to zoom to a location on the map
const zoomToLocation = (mapInstance: any, lat: number, lng: number) => {
  if (!mapInstance) return;
  mapInstance.flyTo([lat, lng], 12, { duration: 1.5 });
};

// Component to handle map instance
const MapEventHandler = ({ onMapReady }: { onMapReady: (map: any) => void }) => {
  const map = useMap();
  useEffect(() => {
    if (map && onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);
  return null;
};

interface NodeTenantLocation {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  url: string | null;
  topic: string | null;
  description: string | null;
  status: boolean;
  nodeType: string | null;
  tenantId: string | null;
  tenant?: {
    id: string;
    name: string;
    company: string | null;
  };
}

export default function ManageNodeMapPage() {
  const [locations, setLocations] = useState<NodeTenantLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  const [createIcon, setCreateIcon] = useState<((url: string, size?: number) => any) | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);

  // MQTT Alarm monitoring
  const { alarmCounts } = useMQTTAlarms(locations);

  useEffect(() => {
    fetchLocations();
    // Auto-refresh location data every 1 minute to reflect status changes
    const interval = setInterval(fetchLocations, 60000); // 60 seconds = 1 minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fix for default marker icon and create custom icons
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        // Override default icon URLs to prevent broken icon issues
        L.Icon.Default.prototype.options.iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png';
        L.Icon.Default.prototype.options.iconRetinaUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png';
        L.Icon.Default.prototype.options.shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png';

        // Create function to generate custom icons with different sizes
        const iconCreator = (url: string, size: number = 24) => {
          return new L.Icon({
            iconUrl: url,
            iconSize: [size, size],
            iconAnchor: [size/2, size],  // Center horizontally, full height anchor
            popupAnchor: [0, -size],     // Popup above icon
          });
        };

        setCreateIcon(() => iconCreator);
      });
    }
  }, []);

  const fetchLocations = async () => {
    try {
      setRefreshing(true);
      const response = await fetch("/api/node-tenant-locations");
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
        // Force map re-mounting to prevent container re-initialization issues
        setMapKey(prev => prev + 1);
      } else {
        console.error("Failed to fetch locations");
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusBadge = (status: boolean) => {
    if (status) {
      return <Badge variant="default">Active</Badge>;
    } else {
      return <Badge variant="secondary">Inactive</Badge>;
    }
  };

  const getNodeTypeBadge = (nodeType: string | null) => {
    switch (nodeType) {
      case "server":
        return <Badge variant="destructive" className="text-xs bg-orange-600 hover:bg-orange-700 text-white">SERVER</Badge>;
      case "node":
        return <Badge variant="secondary" className="text-xs bg-blue-600 hover:bg-blue-700 text-white">NODE</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">UNKNOWN</Badge>;
    }
  };

  const getTenantBadge = (location: NodeTenantLocation) => {
    if (location.tenant) {
      return (
        <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
          {location.tenant.name}
          {location.tenant.company && ` - ${location.tenant.company}`}
        </Badge>
      );
    }
    return <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400">-</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Map Section with Alarm Panel on Right */}
      <div className="flex gap-6">
        {/* Map Section - Left Side */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <div className="flex items-center">
                  <MapPinned className="w-5 h-5 mr-2" />
                  Node Tenant Location Map
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={fetchLocations}
                    disabled={refreshing}
                    variant="outline"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Total {locations.length} locations displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[600px] w-full">
                <MapContainer
                  center={[-6.2088, 106.8456]} // Default center (Jakarta)
                  zoom={6}
                  className="h-full w-full rounded-b-lg"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {/* Network Connection Lines - Draw lines from all nodes to server */}
                  {(() => {
                    // Find all server nodes (nodeType === 'server')
                    const serverNodes = locations.filter(loc => loc.nodeType === 'server');

                    if (serverNodes.length === 0) return null;

                    // Draw connection lines from each non-server location to all servers
                    const nodeLocations = locations.filter(location => location.nodeType !== 'server');

                    return nodeLocations
                      .flatMap((location, locationIndex) =>
                        serverNodes.map((serverNode, serverIndex) => {
                          const isActiveConnection = location.status;
                          const lineColor = isActiveConnection ? '#00b42dff' : '#e50b0bff';
                          const lineOpacity = isActiveConnection ? 0.7 : 0.5;

                          return (
                            <Polyline
                              key={`connection-${location.id}-${serverNode.id}-${locationIndex}-${serverIndex}`}
                              positions={[
                                [serverNode.latitude, serverNode.longitude], // From server
                                [location.latitude, location.longitude]       // To node location
                              ]}
                              pathOptions={{
                                color: lineColor,
                                weight: 2,
                                opacity: lineOpacity,
                                dashArray: '5, 5',
                              }}
                            />
                          );
                        })
                      );
                  })()}
                  <MapEventHandler onMapReady={setMapInstance} />
                  {locations.map((location) => {
                    // Simple nodeType-based icon selection (much cleaner!)
                    const isServer = location.nodeType === 'server';

                    const iconUrl = isServer
                      ? (location.status ? "/server-green.svg" : "/server-red.svg")
                      : (location.status ? "/router-green.svg" : "/router-red.svg");

                    // Create icon with different sizes for server vs router
                    const icon = createIcon ? createIcon(iconUrl, isServer ? 32 : 24) : undefined;

                    return (
                      <Marker
                        key={location.id}
                        position={[location.latitude, location.longitude]}
                        icon={icon}
                      >
                        <Popup>
                          <div className="min-w-[280px] max-w-[400px] p-4 bg-background border border-border rounded-lg shadow-lg">
                            <div className="flex items-start gap-3 mb-4">
                              {location.nodeType === "server" ? (
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                  <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                              ) : (
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                                  <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg text-foreground mb-1 truncate">
                                  {location.name}
                                </h3>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {location.nodeType} Node
                                </p>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">Status:</span>
                                {getStatusBadge(location.status)}
                              </div>

                              <div className="flex items-start justify-between">
                                <span className="text-sm font-medium text-muted-foreground mr-2">Tenant:</span>
                                <div className="flex-1 min-w-0 text-right">
                                  {getTenantBadge(location)}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">Coordinates:</span>
                                <span className="font-mono text-xs bg-muted/50 px-2 py-1 rounded text-muted-foreground border">
                                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                                </span>
                              </div>

                              {location.topic && (
                                <div className="space-y-1">
                                  <span className="text-sm font-medium text-muted-foreground block">MQTT Topic:</span>
                                  <code className="bg-muted/50 px-2 py-1 rounded text-xs break-all text-foreground border block">
                                    {location.topic}
                                  </code>
                                </div>
                              )}

                              {location.url && (
                                <div className="space-y-1">
                                  <span className="text-sm font-medium text-muted-foreground block">URL:</span>
                                  <a
                                    href={location.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline text-sm break-all block hover:bg-blue-50 dark:hover:bg-blue-950/30 px-2 py-1 rounded border"
                                  >
                                    {location.url}
                                  </a>
                                </div>
                              )}

                              {location.description && (
                                <div className="mt-4 pt-3 border-t border-border">
                                  <span className="text-sm font-medium text-muted-foreground block mb-2">Description:</span>
                                  <p className="text-sm text-foreground leading-relaxed">
                                    {location.description}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alarm Summary Panel - Right Side */}
        <div className="w-96 space-y-4">
          {/* MQTT Connection Status using existing component */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span>MQTT Connection</span>
                <MQTTConnectionBadge />
              </CardTitle>
              <CardDescription className="text-xs">
                Monitoring {locations.filter(loc => loc.topic).length} location alarm topics
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Location Alarm Summary - Scrollable */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Location Alarm Summary</CardTitle>
              <CardDescription>Real-time alarm counts for each NodeTenantLocation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {/* Sort locations: Server types first, then others */}
                {[...locations].sort((a, b) => {
                  // Server types come first
                  if (a.nodeType === 'server' && b.nodeType !== 'server') return -1;
                  if (a.nodeType !== 'server' && b.nodeType === 'server') return 1;
                  // Same type: sort by name alphabetically
                  return a.name.localeCompare(b.name);
                }).map((location) => {
                  const alarmData = alarmCounts[location.id];
                  return (
                    <div
                      key={location.id}
                      className="p-3 border border-border rounded-lg bg-card hover:bg-accent hover:border-accent-foreground/20 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm truncate text-foreground max-w-[200px]">
                          {location.name}
                        </h4>
                        <div className="flex items-center gap-1">
                          {location.nodeType === 'server' && (
                            <Badge variant="destructive" className="text-xs bg-orange-600 hover:bg-orange-700 px-1 py-0">
                              SERVER
                            </Badge>
                          )}
                          {location.nodeType === 'node' && (
                            <Badge variant="secondary" className="text-xs bg-blue-600 hover:bg-blue-700 px-1 py-0 text-white">
                              NODE
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Alarm Counts */}
                      <div className="space-y-1">
                        {alarmData ? (
                          <>
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-red-600" />
                                <span className="text-muted-foreground">Active</span>
                              </div>
                              <span className="font-bold text-red-600">{alarmData.activeAlarms}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                <span className="text-muted-foreground">Cleared</span>
                              </div>
                              <span className="font-bold text-green-600">{alarmData.clearedAlarms}</span>
                            </div>
                            <div className="flex items-center justify-between border-t pt-1 text-xs">
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-blue-600" />
                                <span className="text-muted-foreground">Total</span>
                              </div>
                              <span className="font-bold text-blue-600">{alarmData.totalAlarms}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-gray-400" />
                                <span className="text-muted-foreground">Active</span>
                              </div>
                              <span className="font-bold text-gray-400">-</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-gray-400" />
                                <span className="text-muted-foreground">Cleared</span>
                              </div>
                              <span className="font-bold text-gray-400">-</span>
                            </div>
                            <div className="flex items-center justify-between border-t pt-1 text-xs">
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-gray-400" />
                                <span className="text-muted-foreground">Total</span>
                              </div>
                              <span className="font-bold text-gray-400">No Data</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Tenant Badge */}
                      {location.tenant && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs bg-muted/30 border-muted-foreground/20 text-muted-foreground w-full justify-center">
                            {location.tenant.name}
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Location Statistics Below Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Location Statistics
          </CardTitle>
          <CardDescription>Summary of all NodeTenantLocations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Locations</p>
              <p className="text-2xl font-bold">{locations.length}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Nodes</p>
              <p className="text-2xl font-bold text-green-600">{locations.filter((loc) => loc.status).length}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Inactive Nodes</p>
              <p className="text-2xl font-bold text-red-600">{locations.filter((loc) => !loc.status).length}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">With Tenants</p>
              <p className="text-2xl font-bold text-blue-600">{locations.filter((loc) => loc.tenantId && loc.tenantId !== "").length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NodeTenantLocation Cards - Clickable for Zoom */}
      <Card>
        <CardHeader>
          <CardTitle>NodeTenantLocation Overview</CardTitle>
          <CardDescription>Click any card to zoom to location on map</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {locations.map((location) => {
              const alarmData = alarmCounts[location.id];
              return (
                <div
                  key={location.id}
                  className="p-4 border border-border rounded-lg bg-card cursor-pointer hover:bg-accent hover:border-accent-foreground/20 transition-colors duration-200"
                  onClick={() => zoomToLocation(mapInstance, location.latitude, location.longitude)}
                  title={`Click to zoom to ${location.name}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm truncate text-foreground max-w-[200px]">
                      {location.name}
                    </h4>
                    <div className="flex items-center gap-1">
                      {getNodeTypeBadge(location.nodeType)}
                      {getStatusBadge(location.status)}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-2">
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </p>

                  {/* Alarm Counts */}
                  <div className="space-y-1">
                    {alarmData ? (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            <span className="text-muted-foreground">Active</span>
                          </div>
                          <span className="font-bold text-red-600">{alarmData.activeAlarms}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            <span className="text-muted-foreground">Cleared</span>
                          </div>
                          <span className="font-bold text-green-600">{alarmData.clearedAlarms}</span>
                        </div>
                        <div className="flex items-center justify-between border-t pt-1 text-xs">
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-blue-600" />
                            <span className="text-muted-foreground">Total</span>
                          </div>
                          <span className="font-bold text-blue-600">{alarmData.totalAlarms}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-gray-400" />
                            <span className="text-muted-foreground">Active</span>
                          </div>
                          <span className="font-bold text-gray-400">-</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-gray-400" />
                            <span className="text-muted-foreground">Cleared</span>
                          </div>
                          <span className="font-bold text-gray-400">-</span>
                        </div>
                        <div className="flex items-center justify-between border-t pt-1 text-xs">
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-gray-400" />
                            <span className="text-muted-foreground">Total</span>
                          </div>
                          <span className="font-bold text-gray-400">No Data</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Tenant Badge */}
                  {location.tenant && (
                    <div className="mt-3 pt-3 border-t">
                      <Badge variant="outline" className="text-xs bg-muted/30 border-muted-foreground/20 text-muted-foreground w-full justify-center">
                        {location.tenant.name}
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
