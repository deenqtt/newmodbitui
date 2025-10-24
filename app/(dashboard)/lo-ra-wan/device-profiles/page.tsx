"use client";

import { useState, useEffect, FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  PlusCircle,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  Server,
  Eye,
  ChevronDown,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useSortableTable } from "@/hooks/use-sort-table";

// Tipe data untuk Device Profile
type DeviceProfile = {
  id: string;
  name: string;
  region: string;
  macVersion: string;
  // Optional properties for sorting
  applicationId?: string;
};

export default function LoraWANProfilesPage() {
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<DeviceProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { toast } = useToast();

  // State untuk form
  const [name, setName] = useState("");
  const [region, setRegion] = useState("US915");
  const [macVersion, setMacVersion] = useState("LORAWAN_1_0_3");
  const [regParamsRevision, setRegParamsRevision] = useState("A");
  const [adrAlgorithmId, setAdrAlgorithmId] = useState("default");
  const [uplinkInterval, setUplinkInterval] = useState("3600");

  // Filter profiles based on search
  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         profile.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         profile.macVersion.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Apply sorting using useSortableTable hook
  const { sorted: sortedProfiles, sortKey, sortDirection, handleSort } = useSortableTable(filteredProfiles);

  // Paginate sorted results
  const totalPages = Math.ceil(sortedProfiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProfiles = sortedProfiles.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortKey, sortDirection]);

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/lorawan/device-profiles");
      if (!response.ok) throw new Error("Failed to load profiles.");
      setProfiles(await response.json());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profiles.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/lorawan/device-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: "09dcf92f-ef9e-420e-8d4b-8a8aea7b6add",
          name,
          region,
          macVersion,
          regParamsRevision,
          adrAlgorithmId,
          uplinkInterval: parseInt(uplinkInterval, 10),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create profile.");
      }

      toast({
        title: "Success",
        description: "Device Profile created successfully!",
      });
      resetForm();
      fetchProfiles();
      setIsModalOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create profile.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form function
  const resetForm = () => {
    setName("");
    setRegion("US915");
    setMacVersion("LORAWAN_1_0_3");
    setRegParamsRevision("A");
    setAdrAlgorithmId("default");
    setUplinkInterval("3600");
  };

  // Delete profile handler
  const handleDelete = async () => {
    if (!profileToDelete) return;

    try {
      const response = await fetch("/api/lorawan/device-profiles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profileToDelete.id }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to delete profile.");
      }

      toast({
        title: "Success",
        description: "Device Profile deleted successfully!",
      });
      fetchProfiles();
      setIsDeleteDialogOpen(false);
      setProfileToDelete(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete profile.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              LoRaWAN Device Profiles
            </h1>
            <p className="text-muted-foreground">
              Manage templates for your LoRaWAN devices.
            </p>
          </div>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Profile
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Add New Device Profile</DialogTitle>
              <DialogDescription>
                Fill in the details for the new device profile. Fields marked
                with * are required.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Profile Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Sensor_Suhu_OTAA"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="region">Region *</Label>
                  <Select value={region} onValueChange={setRegion} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AS923_2">AS923-2</SelectItem>
                      <SelectItem value="US915">US915</SelectItem>
                      <SelectItem value="EU868">EU868</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regParams">
                    Regional Parameters Revision *
                  </Label>
                  <Select
                    value={regParamsRevision}
                    onValueChange={setRegParamsRevision}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="RP002_1_0_1">RP002-1.0.1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="macVersion">MAC Version *</Label>
                  <Select
                    value={macVersion}
                    onValueChange={setMacVersion}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LORAWAN_1_0_3">
                        LoRaWAN 1.0.3
                      </SelectItem>
                      <SelectItem value="LORAWAN_1_0_4">
                        LoRaWAN 1.0.4
                      </SelectItem>
                      <SelectItem value="LORAWAN_1_1_0">
                        LoRaWAN 1.1.0
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adrAlgorithm">ADR Algorithm *</Label>
                  <Select
                    value={adrAlgorithmId}
                    onValueChange={setAdrAlgorithmId}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        Default ADR algorithm (LoRa only)
                      </SelectItem>
                      <SelectItem value="lr_fhss">
                        LR-FHSS only ADR algorithm
                      </SelectItem>
                      <SelectItem value="lora_and_lr_fhss">
                        LoRa & LR-FHSS ADR algorithm
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="uplinkInterval">
                    Expected uplink interval (secs) *
                  </Label>
                  <Input
                    id="uplinkInterval"
                    type="number"
                    value={uplinkInterval}
                    onChange={(e) => setUplinkInterval(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Profile"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Package className="h-6 w-6 text-primary" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Total Profiles</p>
                  <p className="text-2xl font-bold">{profiles.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Server className="h-6 w-6 text-emerald-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Active Profiles</p>
                  <p className="text-2xl font-bold">
                    {profiles.filter(p => p.id).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Eye className="h-6 w-6 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Current Page</p>
                  <p className="text-2xl font-bold">{currentPage}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <HardDrive className="h-6 w-6 text-amber-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Total Pages</p>
                  <p className="text-2xl font-bold">{totalPages}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search profiles by name, region, or LoRaWAN version..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Table/List Toggle */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Showing {paginatedProfiles.length} of {sortedProfiles.length} profiles
            </span>
            <div className="flex items-center gap-2">
              <label htmlFor="items-per-page" className="text-sm">Items per page:</label>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Devices Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('name')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Profile Name
                      {sortKey === 'name' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="ml-2 h-4 w-4" />
                        ) : sortDirection === 'desc' ? (
                          <ArrowDown className="ml-2 h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('region')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Region
                      {sortKey === 'region' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="ml-2 h-4 w-4" />
                        ) : sortDirection === 'desc' ? (
                          <ArrowDown className="ml-2 h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('macVersion')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      LoRaWAN Version
                      {sortKey === 'macVersion' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="ml-2 h-4 w-4" />
                        ) : sortDirection === 'desc' ? (
                          <ArrowDown className="ml-2 h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>Application ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-32"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-16"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-20"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-24"></div></TableCell>
                      <TableCell className="text-right"><div className="h-4 bg-muted rounded animate-pulse w-8 ml-auto"></div></TableCell>
                    </TableRow>
                  ))
                ) : paginatedProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <Package className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No Profiles Found</h3>
                        <p className="text-muted-foreground">
                          {searchTerm ? "No profiles match your search criteria" : "Get started by adding your first LoRaWAN device profile"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProfiles.map((profile) => (
                    <TableRow key={profile.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{profile.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{profile.region}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {profile.macVersion}
                      </TableCell>
                      <TableCell>
                        {profile.applicationId || <span className="text-muted-foreground">Not assigned</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setProfileToDelete(profile);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Profile
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              {/* Page Numbers */}
              {totalPages <= 7 ? (
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

        {/* Device Form Dialog (already defined above) */}

        {/* Delete Profile Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Device Profile</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{profileToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Profile
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
