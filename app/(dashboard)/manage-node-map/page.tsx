"use client";

import { useState, useEffect } from "react";
import { useMap } from "react-leaflet";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, RefreshCw } from "lucide-react";

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

/*
Use Next.js _app.js or layout.tsx to import Leaflet CSS globally
Add to app/(dashboard)/layout.tsx or create a global Leaflet component
*/

interface NodeTenantLocation {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  url: string | null;
  topic: string | null;
  description: string | null;
  status: string;
  nodeType: string | null;
  tenantId: string;
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

  useEffect(() => {
    fetchLocations();

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

    // Cleanup when component unmounts
    return () => {
      setMapKey(prev => prev + 1);
    };
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Node Locations Map</h1>
          <p className="text-muted-foreground">
            Visualization of tenant node locations on OpenStreetMap
          </p>
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
      </div>

      <div className="space-y-6">
        {/* Full Size Map Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Location Map
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
                        const isActiveConnection = location.status === 'active' && serverNode.status === 'active';
                        const lineColor = isActiveConnection ? '#00fc3fff' : '#ef4444';
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
                              dashArray: isActiveConnection ? undefined : '5, 5',
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
                    ? (location.status === "active" ? "/server-green.svg" : "/server-red.svg")
                    : (location.status === "active" ? "/router-green.svg" : "/router-red.svg");

                  // Create icon with different sizes for server vs router
                  const icon = createIcon ? createIcon(iconUrl, isServer ? 32 : 24) : undefined;

                  return (
                    <Marker
                      key={location.id}
                      position={[location.latitude, location.longitude]}
                      icon={icon}
                    >
                    <Popup>
                      <div>
                        <h3 className="font-semibold text-lg mb-3 text-dark">{location.name}</h3>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-medium">Status:</span>
                            {getStatusBadge(location.status)}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-medium">Tenant:</span>
                            {getTenantBadge(location)}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-medium">Coordinates:</span>
                            <span className="font-mono text-xs bg-muted/30 px-1 py-0.5 rounded text-foreground">
                              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                            </span>
                          </div>

                          {location.topic && (
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground font-medium">Topic:</span>
                              <code className="bg-muted/30 px-1 py-0.5 rounded text-xs break-all text-foreground">
                                {location.topic}
                              </code>
                            </div>
                          )}

                          {location.url && (
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground font-medium">URL:</span>
                              <a
                                href={location.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline text-xs break-all"
                              >
                                {location.url}
                              </a>
                            </div>
                          )}

                          {location.description && (
                            <div className="mt-3 pt-2 border-t border-border">
                              <span className="text-muted-foreground font-medium block mb-1">Description:</span>
                              <p className="text-sm text-foreground leading-relaxed">{location.description}</p>
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

        {/* Statistics Summary Below Map */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Location Statistics Grid */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Locations</p>
                  <p className="text-2xl font-bold">{locations.length}</p>
                </div>
                <div className="p-2 bg-secondary rounded-full">
                  <MapPin className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600">
                    {locations.filter((loc) => loc.status === "active").length}
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <Badge variant="default" className="text-xs">ON</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Inactive</p>
                  <p className="text-2xl font-bold text-red-600">
                    {locations.filter((loc) => loc.status === "inactive").length}
                  </p>
                </div>
                <div className="p-2 bg-red-100 rounded-full">
                  <Badge variant="secondary" className="text-xs">OFF</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">With Tenant</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {locations.filter((loc) => loc.tenantId && loc.tenantId !== "").length}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Badge variant="outline" className="text-xs">T</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Locations List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Locations</CardTitle>
            <CardDescription>Latest added locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.slice(0, 6).map((location) => (
                <div
                  key={location.id}
                  className="p-3 border border-border rounded-lg bg-card cursor-pointer hover:bg-accent hover:border-accent-foreground/20 transition-colors duration-200"
                  onClick={() => zoomToLocation(mapInstance, location.latitude, location.longitude)}
                  title={`Click to zoom to ${location.name}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm truncate text-foreground">{location.name}</h4>
                    <div className="flex items-center gap-1">
                      {getNodeTypeBadge(location.nodeType)}
                      {getStatusBadge(location.status)}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </p>
                  {location.tenant && (
                    <Badge variant="outline" className="text-xs bg-muted/30 border-muted-foreground/20 text-muted-foreground">
                      {location.tenant.name}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
