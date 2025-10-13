"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Server,
  HardDrive,
  Edit,
  Trash2,
  Search,
  MoreVertical,
  TrendingUp,
  Minus,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Database,
  AlertCircle,
  BarChart3,
  Eye,
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
import { useToast } from "@/hooks/use-toast";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { useSortableTable } from "@/hooks/use-sort-table";
import MqttStatus from "@/components/ui/mqtt-status";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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

  // Pagination logic
  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRacks = sorted.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Reset to first page when sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sorted]);

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
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Server Rack Management
            </h1>
            <p className="text-muted-foreground">
              Manage your server racks and equipment placement
            </p>
          </div>

          <div className="flex items-center gap-2 mt-4 md:mt-0">
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
                    Showing {paginatedRacks.length} of {sorted.length} racks (Page {currentPage} of {totalPages})
                  </div>
                </div>

                {/* Items per page selector */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Items per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 text-sm border rounded"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
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
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>

                      {/* Page Numbers */}
                      {totalPages <= 7 ? (
                        // Show all pages if 7 or fewer
                        Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-10 h-10 p-0"
                          >
                            {page}
                          </Button>
                        ))
                      ) : (
                        // Show ellipsis pattern for more pages
                        <>
                          {currentPage <= 4 && (
                            <>
                              {[1, 2, 3, 4, 5].map((page) => (
                                <Button
                                  key={page}
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(page)}
                                  className="w-10 h-10 p-0"
                                >
                                  {page}
                                </Button>
                              ))}
                              <span className="px-2 text-muted-foreground">...</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(totalPages)}
                                className="w-10 h-10 p-0"
                              >
                                {totalPages}
                              </Button>
                            </>
                          )}

                          {currentPage > 4 && currentPage < totalPages - 3 && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(1)}
                                className="w-10 h-10 p-0"
                              >
                                1
                              </Button>
                              <span className="px-2 text-muted-foreground">...</span>
                              {[currentPage - 1, currentPage, currentPage + 1].map((page) => (
                                <Button
                                  key={page}
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(page)}
                                  className="w-10 h-10 p-0"
                                >
                                  {page}
                                </Button>
                              ))}
                              <span className="px-2 text-muted-foreground">...</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(totalPages)}
                                className="w-10 h-10 p-0"
                              >
                                {totalPages}
                              </Button>
                            </>
                          )}

                          {currentPage >= totalPages - 3 && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(1)}
                                className="w-10 h-10 p-0"
                              >
                                1
                              </Button>
                              <span className="px-2 text-muted-foreground">...</span>
                              {[totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages].map((page) => (
                                <Button
                                  key={page}
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(page)}
                                  className="w-10 h-10 p-0"
                                >
                                  {page}
                                </Button>
                              ))}
                            </>
                          )}
                        </>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Table View */}
                <div className="rounded-md border mt-4">
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
    </div> 
  );
}
