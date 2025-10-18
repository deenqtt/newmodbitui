"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import dynamic from "next/dynamic";

// Dynamically import MapLocationPicker to avoid SSR issues
const MapLocationPicker = dynamic(() => import("@/components/MapLocationPicker"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/20">Loading map...</div>,
});
import { useSortableTable } from "@/hooks/use-sort-table";
import { useSearchFilter } from "@/hooks/use-search-filter";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
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
import { Loader2 } from "lucide-react";
import { MapPin, Plus, Edit, Trash2, Search, RefreshCw, ArrowUpDown } from "lucide-react";

const ITEMS_PER_PAGE = 10;

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
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  tenant?: {
    id: string;
    name: string;
    company: string | null;
  };
}

interface Tenant {
  id: string;
  name: string;
  company: string | null;
  email: string;
}

const ManageNodeLocationsPageContent = () => {
  const [locations, setLocations] = useState<NodeTenantLocation[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<NodeTenantLocation | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<NodeTenantLocation | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    longitude: "",
    latitude: "",
    url: "",
    topic: "",
    description: "",
    status: "active",
    nodeType: "node",
    tenantId: "no-tenant",
  });
  const { toast } = useToast();
  const router = useRouter();

  // Hooks for sorting and filtering
  const { sorted, sortField, sortDirection, handleSort } = useSortableTable(locations);
  const { searchQuery, setSearchQuery, filteredData } = useSearchFilter(
    sorted,
    ["name", "topic", "description", "tenant.name"]
  );

  useEffect(() => {
    fetchLocations();
    fetchTenants();
  }, []);

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedLocations = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/tenants");
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      }
    } catch (error) {
      // Silently fail for tenant fetching
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/node-tenant-locations");
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      } else {
        throw new Error("Failed to fetch locations");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch locations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.longitude || !formData.latitude) {
      toast({
        title: "Validation Error",
        description: "Name, longitude, and latitude are required.",
        variant: "destructive",
      });
      return;
    }

    // Validate coordinates
    const longitude = parseFloat(formData.longitude);
    const latitude = parseFloat(formData.latitude);

    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      toast({
        title: "Validation Error",
        description: "Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90.",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = editingLocation ? `/api/node-tenant-locations/${editingLocation.id}` : "/api/node-tenant-locations";
      const method = editingLocation ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          tenantId: formData.tenantId === "no-tenant" ? "" : formData.tenantId,
          longitude,
          latitude,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: editingLocation ? "Location updated successfully." : "Location created successfully.",
        });
        fetchLocations();
        setDialogOpen(false);
        resetForm();
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to save location");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (location: NodeTenantLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      longitude: location.longitude.toString(),
      latitude: location.latitude.toString(),
      url: location.url || "",
      topic: location.topic || "",
      description: location.description || "",
      status: location.status,
      nodeType: location.nodeType || "node",
      tenantId: location.tenantId || "no-tenant",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setLocationToDelete(locations.find(loc => loc.id === id) || null);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteLocation = async () => {
    if (!locationToDelete) return;

    try {
      const response = await fetch(`/api/node-tenant-locations/${locationToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Location deleted successfully.",
        });
        fetchLocations();
        setDeleteDialogOpen(false);
        setLocationToDelete(null);
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete location");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      longitude: "",
      latitude: "",
      url: "",
      topic: "",
      description: "",
      status: "active",
      nodeType: "node",
      tenantId: "no-tenant",
    });
    setEditingLocation(null);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 md:p-6 space-y-8">
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Manage Node Locations
              </h1>
              <p className="text-muted-foreground">
                Manage node locations for tenants in the IoT system
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Locations
                  </p>
                  <p className="text-3xl font-bold">
                    {locations.length}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Active Locations
                  </p>
                  <p className="text-3xl font-bold text-emerald-600">
                    {locations.filter((l) => l.status === "active").length}
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-full">
                  <div className="h-6 w-6 bg-emerald-600 dark:bg-emerald-400 rounded-full flex items-center justify-center">
                    <div className="h-2 w-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    With Tenants
                  </p>
                  <p className="text-3xl font-bold text-purple-600">
                    {locations.filter((l) => l.tenantId).length}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                  <div className="h-6 w-6 bg-purple-600 dark:bg-purple-400 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-white rounded-sm"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Locations Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl">
                  Node Locations List
                </CardTitle>
                <CardDescription>
                  Manage and monitor all registered node locations
                </CardDescription>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLocations}
                  disabled={loading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Location
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[1200px] h-[90vh] max-h-[900px] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingLocation ? "Edit Location" : "Add New Location"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingLocation ? "Update location information" : "Create a new node location"}
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-4">
                      {/* Map Section - Expanded */}
                      <div className="flex-shrink-0 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Label className="text-lg font-semibold">Interactive Map Location</Label>
                          <span className="text-sm text-muted-foreground">
                            ({formData.latitude || "Lat"}, {formData.longitude || "Lng"})
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Click anywhere on the map or drag the marker to select coordinates. The coordinates will automatically update in the fields below.
                        </p>
                        <div className="h-80 w-full rounded-lg overflow-hidden border">
                          <MapLocationPicker
                            latitude={parseFloat(formData.latitude) || 0}
                            longitude={parseFloat(formData.longitude) || 0}
                            onLocationChange={(lat, lng) => {
                              setFormData({
                                ...formData,
                                latitude: lat.toString(),
                                longitude: lng.toString(),
                              });
                            }}
                            className="h-full w-full"
                          />
                        </div>
                      </div>

                      {/* Form Fields - Compact Layout */}
                      <div className="flex-1 space-y-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-1 space-y-2">
                            <Label htmlFor="name">Location Name *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="Node location name"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="longitude">Longitude *</Label>
                            <Input
                              id="longitude"
                              type="number"
                              step="any"
                              value={formData.longitude}
                              onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                              placeholder="-180 to 180"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="latitude">Latitude *</Label>
                            <Input
                              id="latitude"
                              type="number"
                              step="any"
                              value={formData.latitude}
                              onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                              placeholder="-90 to 90"
                              required
                            />
                          </div>
                        </div>

                        {/* Connection Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="url">URL</Label>
                            <Input
                              id="url"
                              value={formData.url}
                              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                              placeholder="http://example.com"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="topic">MQTT Topic</Label>
                            <Input
                              id="topic"
                              value={formData.topic}
                              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                              placeholder="iot/devices/location"
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Location description"
                            rows={2}
                            className="resize-none"
                          />
                        </div>

                        {/* Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="tenantId">Tenant</Label>
                            <Select
                              value={formData.tenantId}
                              onValueChange={(value) => setFormData({ ...formData, tenantId: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select tenant (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="no-tenant">No Tenant</SelectItem>
                                {tenants.map((tenant) => (
                                  <SelectItem key={tenant.id} value={tenant.id}>
                                    {tenant.name} {tenant.company ? `(${tenant.company})` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                              value={formData.status}
                              onValueChange={(value) => setFormData({ ...formData, status: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3 pt-4 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            className="px-8"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="px-8"
                          >
                            {editingLocation ? "Update Location" : "Create Location"}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Search Bar */}
            <div className="pt-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-slate-200 dark:border-slate-700">
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                      Name
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                      Coordinates
                    </TableHead>
                    <TableHead
                      className="cursor-pointer font-semibold text-slate-700 dark:text-slate-300"
                      onClick={() => handleSort("tenant.name")}
                    >
                      Tenant <ArrowUpDown className="inline mr-1 h-4 w-4" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer font-semibold text-slate-700 dark:text-slate-300"
                      onClick={() => handleSort("topic")}
                    >
                      Topic <ArrowUpDown className="inline mr-1 h-4 w-4" />
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                      Status
                    </TableHead>
                    <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLocations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-48">
                        <div className="flex flex-col items-center gap-3">
                          <MapPin className="h-12 w-12 text-muted-foreground/50" />
                          <div className="space-y-1">
                            <p className="text-muted-foreground font-medium">
                              {searchQuery ? "No locations found" : "No locations available"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {searchQuery
                                ? "Try adjusting your search terms"
                                : "Add your first location to get started"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLocations.map((location) => (
                      <TableRow
                        key={location.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-200"
                      >
                        <TableCell className="py-4 font-medium">
                          {location.name}
                        </TableCell>
                        <TableCell className="py-4 font-mono text-sm">
                          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </TableCell>
                        <TableCell className="py-4">
                          {location.tenant ? (
                            <Badge variant="outline" className="text-xs">
                              {location.tenant.name}
                              {location.tenant.company ? ` (${location.tenant.company})` : ""}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 font-mono text-xs">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="max-w-32 truncate cursor-help">
                                {location.topic || "-"}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {location.topic || "No topic"}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="py-4">{getStatusBadge(location.status)}</TableCell>
                        <TableCell className="text-right py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                                  onClick={() => handleEdit(location)}
                                >
                                  <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Edit location
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/20"
                                  onClick={() => handleDelete(location.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Delete location
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Pagination className="mt-4 px-6 pb-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      className={
                        currentPage === 1 ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={currentPage === i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((p) => Math.min(p + 1, totalPages))
                      }
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{locationToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteLocation}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Location
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

export default function ManageNodeLocationsPage() {
  return <ManageNodeLocationsPageContent />;
}
