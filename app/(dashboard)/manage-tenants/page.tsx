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
import { useToast } from "@/hooks/use-toast";
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
  Plus,
  Edit,
  Trash2,
  Building,
  Search,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Shield,
  Users,
  UserCheck,
  FileDown,
  FileUp,
  UploadCloud,
  Loader2
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

const ITEMS_PER_PAGE = 10;

interface Tenant {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  notes: string | null;
}

const ManageTenantsContent = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [fileToImport, setFileToImport] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    status: "active",
    notes: "",
  });
  const { toast } = useToast();
  const router = useRouter();

  // Hooks for sorting and filtering
  const { sorted, sortField, sortDirection, handleSort } = useSortableTable(tenants);
  const { searchQuery, setSearchQuery, filteredData } = useSearchFilter(
    sorted,
    ["name", "company", "email"]
  );

  useEffect(() => {
    fetchTenants();
  }, []);

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedTenants = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/tenants");
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      } else if (response.status === 401) {
        toast({
          title: "Unauthorized",
          description: "You need to login to access this page.",
          variant: "destructive",
        });
        router.push("/login");
        return;
      } else if (response.status === 403) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to manage tenants.",
          variant: "destructive",
        });
        router.push("/dashboard");
        return;
      } else {
        throw new Error("Failed to fetch tenants");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch tenants.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast({
        title: "Validation Error",
        description: "Name and email are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = editingTenant ? `/api/tenants/${editingTenant.id}` : "/api/tenants";
      const method = editingTenant ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: editingTenant ? "Tenant updated successfully." : "Tenant created successfully.",
        });
        fetchTenants();
        setDialogOpen(false);
        resetForm();
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to save tenant");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      company: tenant.company || "",
      email: tenant.email,
      phone: tenant.phone || "",
      address: tenant.address || "",
      status: tenant.status,
      notes: tenant.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tenant?")) return;

    try {
      const response = await fetch(`/api/tenants/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Tenant deleted successfully.",
        });
        fetchTenants();
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete tenant");
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
      company: "",
      email: "",
      phone: "",
      address: "",
      status: "active",
      notes: "",
    });
    setEditingTenant(null);
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
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
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
              <Building className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Manage Tenants
              </h1>
              <p className="text-muted-foreground">
                Manage tenants (companies/users) in the multi-tenant system
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
                    Total Tenants
                  </p>
                  <p className="text-3xl font-bold">
                    {tenants.length}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Active Tenants
                  </p>
                  <p className="text-3xl font-bold text-emerald-600">
                    {tenants.filter((t) => t.status === "active").length}
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-full">
                  <UserCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Inactive Tenants
                  </p>
                  <p className="text-3xl font-bold text-orange-600">
                    {tenants.filter((t) => t.status === "inactive").length}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                  <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tenant Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl">
                  Tenant List
                </CardTitle>
                <CardDescription>
                  Manage and monitor all registered tenants
                </CardDescription>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchTenants}
                  disabled={loading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Tenant
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTenant ? "Edit Tenant" : "Add New Tenant"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingTenant ? "Update tenant information" : "Create a new tenant in the system"}
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Tenant name"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="company">Company</Label>
                          <Input
                            id="company"
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            placeholder="Company name"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="email@domain.com"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="Phone number"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Full address"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
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
                              <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Additional notes"
                            rows={2}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingTenant ? "Update" : "Save"}
                        </Button>
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
                  placeholder="Search tenants..."
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
                    <TableHead
                      className="cursor-pointer font-semibold text-slate-700 dark:text-slate-300"
                      onClick={() => handleSort("company")}
                    >
                      Company <ArrowUpDown className="inline mr-1 h-4 w-4" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer font-semibold text-slate-700 dark:text-slate-300"
                      onClick={() => handleSort("email")}
                    >
                      Email <ArrowUpDown className="inline mr-1 h-4 w-4" />
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                      Created
                    </TableHead>
                    <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTenants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-48">
                        <div className="flex flex-col items-center gap-3">
                          <Users className="h-12 w-12 text-muted-foreground/50" />
                          <div className="space-y-1">
                            <p className="text-muted-foreground font-medium">
                              {searchQuery ? "No tenants found" : "No tenants available"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {searchQuery
                                ? "Try adjusting your search terms"
                                : "Add your first tenant to get started"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTenants.map((tenant) => (
                      <TableRow
                        key={tenant.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-200"
                      >
                        <TableCell className="py-4 font-medium">
                          {tenant.name}
                        </TableCell>
                        <TableCell className="py-4">
                          {tenant.company || "-"}
                        </TableCell>
                        <TableCell className="py-4">{tenant.email}</TableCell>
                        <TableCell className="py-4">{getStatusBadge(tenant.status)}</TableCell>
                        <TableCell className="py-4">
                          {new Date(tenant.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                                  onClick={() => handleEdit(tenant)}
                                >
                                  <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Edit tenant
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/20"
                                  onClick={() => handleDelete(tenant.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Delete tenant
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
    </TooltipProvider>
  );
}

export default function ManageTenantsPage() {
  return (
    <ManageTenantsContent />
  );
}
