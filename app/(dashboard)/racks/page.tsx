"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { useSortableTable } from "@/hooks/use-sort-table";
import MqttStatus from "@/components/ui/mqtt-status";

// UI Components
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Server,
  Edit,
  Trash2,
  HardDrive,
  TrendingUp,
  Minus,
  MoreVertical,
  Database,
  AlertCircle,
  Calendar,
  Settings,
  BarChart3,
  Search,
  ArrowUpDown,
  Eye,
} from "lucide-react";

interface Rack {
  id: string;
  name: string;
  capacityU: number;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  usedU: number;
  availableU: number;
  utilizationPercent: number;
  devices: Array<{
    id: string;
    positionU: number | null;
    sizeU: number;
    status: string;
  }>;
}

export default function RacksPage() {
  const router = useRouter();
  const [racks, setRacks] = useState<Rack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rackToDelete, setRackToDelete] = useState<Rack | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    capacityU: 42,
    location: "",
    notes: "",
  });
  const { toast } = useToast();

  // Search hook
  const { searchQuery, setSearchQuery, filteredData } = useSearchFilter(
    racks,
    ["name", "location", "notes"]
  );

  // Sort hook - using filteredData instead of full racks
  const { sorted, handleSort } = useSortableTable(filteredData);

  // Fetch racks data
  const fetchRacks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/racks");
      if (!response.ok) {
        throw new Error("Failed to fetch racks");
      }
      const data = await response.json();
      setRacks(data);
    } catch (error) {
      console.error("Error fetching racks:", error);
      toast({
        title: "Error",
        description: "Failed to load racks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create rack
  const handleCreate = async () => {
    try {
      const response = await fetch("/api/racks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      toast({
        title: "Success",
        description: "Rack created successfully",
      });

      setIsCreateDialogOpen(false);
      setFormData({ name: "", capacityU: 42, location: "", notes: "" });
      fetchRacks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create rack",
        variant: "destructive",
      });
    }
  };

  // Edit rack
  const handleEdit = async () => {
    if (!selectedRack) return;

    try {
      const response = await fetch(`/api/racks/${selectedRack.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      toast({
        title: "Success",
        description: "Rack updated successfully",
      });

      setIsEditDialogOpen(false);
      setSelectedRack(null);
      setFormData({ name: "", capacityU: 42, location: "", notes: "" });
      fetchRacks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update rack",
        variant: "destructive",
      });
    }
  };

  // Delete rack
  const handleDelete = async () => {
    if (!rackToDelete) return;

    try {
      const response = await fetch(`/api/racks/${rackToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast({
        title: "Success",
        description: "Rack deleted successfully",
      });

      setIsDeleteDialogOpen(false);
      setRackToDelete(null);
      fetchRacks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete rack",
        variant: "destructive",
      });
    }
  };

  // Open edit dialog
  const openEditDialog = (rack: Rack) => {
    setSelectedRack(rack);
    setFormData({
      name: rack.name,
      capacityU: rack.capacityU,
      location: rack.location || "",
      notes: rack.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  // Get utilization color
  const getUtilizationColor = (percent: number) => {
    if (percent < 30) return "text-emerald-600";
    if (percent < 70) return "text-amber-600";
    if (percent < 90) return "text-orange-600";
    return "text-red-600";
  };

  // Initialize fetch
  useEffect(() => {
    fetchRacks();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Server Rack Management</h1>
        </div>
        <div className="flex items-center gap-2">
          <MqttStatus />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={fetchRacks}
            disabled={isLoading}
          >
            <Database className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rack
          </Button>
        </div>
      </div>
        {/* Summary Cards - Following the pattern */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Racks</CardTitle>
              <Server className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{racks.length}</div>
              <p className="text-xs text-muted-foreground">
                Active server racks
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Capacity
              </CardTitle>
              <HardDrive className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {racks.reduce((sum, rack) => sum + rack.capacityU, 0)}U
              </div>
              <p className="text-xs text-muted-foreground">
                Rack units configured
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Used Capacity
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {racks.reduce((sum, rack) => sum + rack.usedU, 0)}U
              </div>
              <p className="text-xs text-muted-foreground">
                Units currently used
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Available
              </CardTitle>
              <Minus className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {racks.reduce((sum, rack) => sum + rack.availableU, 0)}U
              </div>
              <p className="text-xs text-muted-foreground">
                Free rack units
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Statistics */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Rack Utilization Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">High Utilization</span>
                  <Badge variant="destructive">
                    {racks.filter(r => r.utilizationPercent >= 90).length} racks
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Racks at 90%+ capacity
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Moderate Utilization</span>
                  <Badge variant="secondary">
                    {racks.filter(r => r.utilizationPercent >= 70 && r.utilizationPercent < 90).length} racks
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Racks at 70-89% capacity
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Low Utilization</span>
                  <Badge variant="outline">
                    {racks.filter(r => r.utilizationPercent < 70).length} racks
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Racks under 70% capacity
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Racks Table/List - Following the pattern */}
        <div className="rounded-lg border bg-background shadow-sm">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">
              Server Racks ({racks.length})
            </h3>
            <p className="text-sm text-muted-foreground">
              Manage server racks and equipment placement
            </p>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="text-center py-8">
                <Server className="mx-auto h-16 w-16 text-muted-foreground mb-4 animate-pulse" />
                <h3 className="text-lg font-semibold mb-2">
                  Loading racks...
                </h3>
                <p className="text-muted-foreground">
                  Fetching rack information from database
                </p>
              </div>
            ) : racks.length === 0 ? (
              <div className="text-center py-8">
                <Server className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No racks found
                </h3>
                <p className="text-muted-foreground mb-4">
                  Get started by adding your first server rack
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rack
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
                      placeholder="Search racks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Showing {sorted.length} of {racks.length} racks
                  </div>
                </div>

                {/* Table View */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 p-0 hover:bg-transparent font-semibold"
                            onClick={() => handleSort("name")}
                          >
                            Rack Name
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead className="w-[150px]">Capacity</TableHead>
                        <TableHead className="w-[120px]">Utilization</TableHead>
                        <TableHead className="w-[120px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 p-0 hover:bg-transparent font-semibold"
                            onClick={() => handleSort("location")}
                          >
                            Location
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead className="w-[100px]">Devices</TableHead>
                        <TableHead className="w-[120px]">Created</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        [...Array(5)].map((_, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
                            </TableCell>
                            <TableCell>
                              <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                            </TableCell>
                            <TableCell>
                              <div className="h-4 bg-muted animate-pulse rounded w-12"></div>
                            </TableCell>
                            <TableCell>
                              <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
                            </TableCell>
                            <TableCell>
                              <div className="h-4 bg-muted animate-pulse rounded w-12"></div>
                            </TableCell>
                            <TableCell>
                              <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                            </TableCell>
                            <TableCell>
                              <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : sorted.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <Server className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No racks found</h3>
                            <p className="text-muted-foreground mb-4">
                              {searchQuery ? "Try adjusting your search criteria" : "Get started by adding your first server rack"}
                            </p>
                            {!searchQuery && (
                              <Button onClick={() => setIsCreateDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Rack
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ) : (
                        sorted.map((rack) => (
                          <TableRow key={rack.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Server className="h-4 w-4 text-primary" />
                                {rack.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">{rack.usedU}/{rack.capacityU} U</div>
                                <div className="text-muted-foreground">{rack.availableU}U available</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className={`text-sm font-medium ${getUtilizationColor(rack.utilizationPercent)}`}>
                                  {rack.utilizationPercent.toFixed(1)}%
                                </div>
                                <div className="w-full bg-muted rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full transition-all duration-500 ${
                                      rack.utilizationPercent < 30
                                        ? "bg-emerald-500"
                                        : rack.utilizationPercent < 70
                                        ? "bg-amber-500"
                                        : rack.utilizationPercent < 90
                                        ? "bg-orange-500"
                                        : "bg-red-500"
                                    }`}
                                    style={{ width: `${Math.min(rack.utilizationPercent, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {rack.location || <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {rack.devices.length}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(rack.createdAt).toLocaleDateString("id-ID", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditDialog(rack)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/racks/${rack.id}`)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setRackToDelete(rack);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Create Rack Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Server Rack</DialogTitle>
            <DialogDescription>
              Configure a new server rack for equipment installation and management
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rack-name">Rack Name *</Label>
              <Input
                id="rack-name"
                placeholder="e.g., Rack-A01, Primary-Server-Rack"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity-u">Capacity (U) *</Label>
              <Input
                id="capacity-u"
                type="number"
                min="1"
                max="100"
                placeholder="42"
                value={formData.capacityU}
                onChange={(e) => setFormData({ ...formData, capacityU: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Standard 4-post server rack capacity in rack units
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Data Center Room 1, Floor 2"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional information about this rack, power specs, cooling, etc."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name.trim()}>
              Create Rack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rack Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Server Rack</DialogTitle>
            <DialogDescription>
              Update rack configuration and information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-rack-name">Rack Name *</Label>
              <Input
                id="edit-rack-name"
                placeholder="e.g., Rack-A01, Primary-Server-Rack"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-capacity-u">Capacity (U) *</Label>
              <Input
                id="edit-capacity-u"
                type="number"
                min="1"
                max="100"
                value={formData.capacityU}
                onChange={(e) => setFormData({ ...formData, capacityU: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Be careful when reducing capacity as it may affect existing installations
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                placeholder="e.g., Data Center Room 1, Floor 2"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Additional Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Additional information about this rack"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!formData.name.trim()}>
              Update Rack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Server Rack</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{rackToDelete?.name}"? This action cannot be undone.
              {rackToDelete && rackToDelete.devices.length > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Warning: This rack contains {rackToDelete.devices.length} device(s).
                  Please move devices to another rack first.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={rackToDelete ? rackToDelete.devices.length > 0 : false}
            >
              {rackToDelete && rackToDelete.devices.length > 0 ? "Cannot Delete" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
