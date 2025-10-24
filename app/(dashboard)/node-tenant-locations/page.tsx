"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  MapPin,
  Server,
  Wifi,
  Globe,
  Edit,
  Trash2,
  Search,
  MoreVertical,
  AlertCircle,
  Database,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { useSortableTable } from "@/hooks/use-sort-table";
import { NodeTenantLocation, NodeTenantLocationFormData, Tenant } from "@/lib/types/tenant";
import MqttStatus from "@/components/ui/mqtt-status";

export default function NodeTenantLocationsPage() {
  const [locations, setLocations] = useState<NodeTenantLocation[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<NodeTenantLocation | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<NodeTenantLocation | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [formData, setFormData] = useState<NodeTenantLocationFormData>({
    name: "",
    longitude: 0,
    latitude: 0,
    url: "",
    topic: "",
    description: "",
    status: false,
    nodeType: "node",
    tenantId: "",
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();

  // Search hook
  const { searchQuery, setSearchQuery, filteredData } = useSearchFilter(
    locations,
    ["name", "description", "topic", "url", "nodeType", "tenant.name"]
  );

  // Sort hook
  const { sorted, handleSort } = useSortableTable(filteredData);

  // Pagination logic
  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLocations = sorted.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Fetch data
  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch locations
      const locationsResponse = await fetch("/api/node-tenant-locations");
      if (!locationsResponse.ok) {
        throw new Error("Failed to fetch locations");
      }
      const locationsData = await locationsResponse.json();
      setLocations(locationsData);

      // Fetch tenants for dropdown
      const tenantsResponse = await fetch("/api/tenants");
      if (!tenantsResponse.ok) {
        throw new Error("Failed to fetch tenants");
      }
      const tenantsData = await tenantsResponse.json();
      setTenants(tenantsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Validate form data
  const validateFormData = (data: NodeTenantLocationFormData): boolean => {
    const errors: Record<string, string> = {};

    if (!data.name.trim()) {
      errors.name = "Name is required";
    }

    if (data.longitude === undefined || data.longitude < -180 || data.longitude > 180) {
      errors.longitude = "Longitude must be between -180 and 180";
    }

    if (data.latitude === undefined || data.latitude < -90 || data.latitude > 90) {
      errors.latitude = "Latitude must be between -90 and 90";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create location
  const handleCreate = async () => {
    if (!validateFormData(formData)) {
      return;
    }

    try {
      const payload: NodeTenantLocationFormData = {
        ...formData,
        tenantId: formData.tenantId === "no-tenant" ? "" : formData.tenantId,
      };

      const response = await fetch("/api/node-tenant-locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast({
        title: "Success",
        description: "Location created successfully",
      });

      setIsCreateDialogOpen(false);
      resetFormData();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create location",
        variant: "destructive",
      });
    }
  };

  // Edit location
  const handleEdit = async () => {
    if (!selectedLocation || !validateFormData(formData)) {
      return;
    }

    try {
      const payload: NodeTenantLocationFormData = {
        ...formData,
        tenantId: formData.tenantId === "no-tenant" ? "" : formData.tenantId,
      };

      const response = await fetch(`/api/node-tenant-locations/${selectedLocation.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast({
        title: "Success",
        description: "Location updated successfully",
      });

      setIsEditDialogOpen(false);
      setSelectedLocation(null);
      resetFormData();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update location",
        variant: "destructive",
      });
    }
  };

  // Delete location
  const handleDelete = async () => {
    if (!locationToDelete) return;

    try {
      const response = await fetch(`/api/node-tenant-locations/${locationToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast({
        title: "Success",
        description: "Location deleted successfully",
      });

      setIsDeleteDialogOpen(false);
      setLocationToDelete(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete location",
        variant: "destructive",
      });
    }
  };

  // Open edit dialog
  const openEditDialog = (location: NodeTenantLocation) => {
    setSelectedLocation(location);
    setFormData({
      name: location.name,
      longitude: location.longitude,
      latitude: location.latitude,
      url: location.url || "",
      topic: location.topic || "",
      description: location.description || "",
      status: location.status,
      nodeType: location.nodeType,
      tenantId: location.tenantId || "no-tenant",
    });
    setValidationErrors({});
    setIsEditDialogOpen(true);
  };

  // Reset form data
  const resetFormData = () => {
    setFormData({
      name: "",
      longitude: 0,
      latitude: 0,
      url: "",
      topic: "",
      description: "",
      status: false,
      nodeType: "node",
      tenantId: "no-tenant",
    });
    setValidationErrors({});
  };

  // Get status color
  const getStatusColor = (location: NodeTenantLocation) => {
    if (location.status) {
      return location.nodeType === "server" ? "text-blue-600 bg-blue-100" : "text-green-600 bg-green-100";
    }
    return "text-gray-600 bg-gray-100";
  };

  // Get tenant display name
  const getTenantDisplayName = (location: NodeTenantLocation) => {
    if (location.tenant) {
      return `${location.tenant.name}${location.tenant.company ? ` (${location.tenant.company})` : ''}`;
    }
    return "No Tenant";
  };

  // Initialize fetch and auto-refresh
  useEffect(() => {
    fetchData();
    // Auto-refresh location data every 1 minute to reflect status changes
    const interval = setInterval(fetchData, 60000); // 60 seconds = 1 minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Node Tenant Locations
            </h1>
            <p className="text-muted-foreground">
              Manage geographical locations and tenant assignments for nodes
            </p>
          </div>

          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <MqttStatus />
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={fetchData}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
              <MapPin className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{locations.length}</div>
              <p className="text-xs text-muted-foreground">
                Node locations configured
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
              <Globe className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {locations.filter(l => l.status === true).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently online
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Server Nodes</CardTitle>
              <Server className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {locations.filter(l => l.nodeType === "server").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Server-type nodes
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned to Tenants</CardTitle>
              <Wifi className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {locations.filter(l => l.tenantId).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Tenant-attached locations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Locations Table/List */}
        <div className="rounded-lg border bg-background shadow-sm">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">
              Locations ({locations.length})
            </h3>
            <p className="text-sm text-muted-foreground">
              Geographical locations for network nodes and tenant assignments
            </p>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="text-center py-8">
                <MapPin className="mx-auto h-16 w-16 text-muted-foreground mb-4 animate-pulse" />
                <h3 className="text-lg font-semibold mb-2">Loading locations...</h3>
                <p className="text-muted-foreground">
                  Fetching location information from database
                </p>
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No locations found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by adding your first node location
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Search and Sort Controls */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search locations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Showing {paginatedLocations.length} of {sorted.length} locations (Page {currentPage} of {totalPages})
                  </div>
                </div>

                {/* Table View */}
                <div className="rounded-md border mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('name')}
                            className="h-auto p-0 font-semibold hover:bg-transparent"
                          >
                            Location Name
                          </Button>
                        </TableHead>
                        <TableHead>Coordinates</TableHead>
                        <TableHead>Node Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLocations.map((location) => (
                        <TableRow key={location.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{location.name}</span>
                              {location.description && (
                                <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                                  {location.description}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-mono">
                                {location.longitude.toFixed(6)}, {location.latitude.toFixed(6)}
                              </span>
                              {location.topic && (
                                <Badge variant="outline" className="text-xs w-fit">
                                  {location.topic}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={location.nodeType === "server" ? "default" : "secondary"}
                              className="capitalize"
                            >
                              {location.nodeType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(location)}>
                              {location.status ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getTenantDisplayName(location)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(location)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setLocationToDelete(location);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Location Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Location</DialogTitle>
              <DialogDescription>
                Configure a new geographical location for network nodes
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location-name">Location Name *</Label>
                <Input
                  id="location-name"
                  placeholder="e.g., Jakarta Data Center, Main Office"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={validationErrors.name ? "border-red-500" : ""}
                />
                {validationErrors.name && (
                  <p className="text-sm text-red-500">{validationErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude *</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="0.000001"
                    placeholder="-6.2088"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                    className={validationErrors.longitude ? "border-red-500" : ""}
                  />
                  {validationErrors.longitude && (
                    <p className="text-xs text-red-500">{validationErrors.longitude}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude *</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="0.000001"
                    placeholder="106.8456"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                    className={validationErrors.latitude ? "border-red-500" : ""}
                  />
                  {validationErrors.latitude && (
                    <p className="text-xs text-red-500">{validationErrors.latitude}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="node-type">Node Type</Label>
                <Select value={formData.nodeType} onValueChange={(value: "node" | "server") => setFormData({ ...formData, nodeType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select node type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="node">Regular Node</SelectItem>
                    <SelectItem value="server">Server Node</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenant-id">Tenant Assignment</Label>
                <Select value={formData.tenantId} onValueChange={(value) => setFormData({ ...formData, tenantId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-tenant">No Tenant</SelectItem>
                    {tenants.filter(t => t.isActive && t.status === "active").map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name} {tenant.company && `(${tenant.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-url">URL (Optional)</Label>
                <Input
                  id="location-url"
                  placeholder="http://location.example.com"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-topic">MQTT Topic (Optional)</Label>
                <Input
                  id="location-topic"
                  placeholder="sensors/location/topic"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-description">Description (Optional)</Label>
                <Textarea
                  id="location-description"
                  placeholder="Additional information about this location..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="location-status"
                  checked={formData.status}
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
                />
                <Label htmlFor="location-status">Active Status</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!formData.name.trim()}>
                Create Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Location Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Location</DialogTitle>
              <DialogDescription>
                Update geographical location configuration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-location-name">Location Name *</Label>
                <Input
                  id="edit-location-name"
                  placeholder="e.g., Jakarta Data Center, Main Office"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={validationErrors.name ? "border-red-500" : ""}
                />
                {validationErrors.name && (
                  <p className="text-sm text-red-500">{validationErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-longitude">Longitude *</Label>
                  <Input
                    id="edit-longitude"
                    type="number"
                    step="0.000001"
                    placeholder="-6.2088"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                    className={validationErrors.longitude ? "border-red-500" : ""}
                  />
                  {validationErrors.longitude && (
                    <p className="text-xs text-red-500">{validationErrors.longitude}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-latitude">Latitude *</Label>
                  <Input
                    id="edit-latitude"
                    type="number"
                    step="0.000001"
                    placeholder="106.8456"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                    className={validationErrors.latitude ? "border-red-500" : ""}
                  />
                  {validationErrors.latitude && (
                    <p className="text-xs text-red-500">{validationErrors.latitude}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-node-type">Node Type</Label>
                <Select value={formData.nodeType} onValueChange={(value: "node" | "server") => setFormData({ ...formData, nodeType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select node type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="node">Regular Node</SelectItem>
                    <SelectItem value="server">Server Node</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-tenant-id">Tenant Assignment</Label>
                <Select value={formData.tenantId} onValueChange={(value) => setFormData({ ...formData, tenantId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-tenant">No Tenant</SelectItem>
                    {tenants.filter(t => t.isActive && t.status === "active").map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name} {tenant.company && `(${tenant.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-location-url">URL (Optional)</Label>
                <Input
                  id="edit-location-url"
                  placeholder="http://location.example.com"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-location-topic">MQTT Topic (Optional)</Label>
                <Input
                  id="edit-location-topic"
                  placeholder="sensors/location/topic"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-location-description">Description (Optional)</Label>
                <Textarea
                  id="edit-location-description"
                  placeholder="Additional information about this location..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-location-status"
                  checked={formData.status}
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
                />
                <Label htmlFor="edit-location-status">Active Status</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={!formData.name.trim()}>
                Update Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Location</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{locationToDelete?.name}"? This action cannot be undone.
                All associated data and configurations will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Location
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
