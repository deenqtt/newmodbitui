"use client";

import { useState, useEffect, FormEvent, useMemo } from "react";
import {
  GitBranch,
  PlusCircle,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Activity,
  FileText,
} from "lucide-react";
import { useSortableTable } from "@/hooks/use-sort-table";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import Link from "next/link";

// Asumsi Anda menggunakan shadcn/ui untuk komponen ini
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

// Tipe data untuk Application
type Application = {
  id: string;
  name: string;
  description: string;
};

// Inisialisasi SweetAlert2
const MySwal = withReactContent(Swal);
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

const ITEMS_PER_PAGE = 5; // Konfigurasi paginasi

export default function LoraWANApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State untuk form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // State untuk paginasi dan sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  // Sorting hook for applications table
  const { sorted: sortedApplications, sortKey, sortDirection, handleSort } = useSortableTable(
    useMemo(() => applications.filter(app =>
      app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id.toLowerCase().includes(searchTerm.toLowerCase())
    ), [applications, searchTerm])
  );

  // Pagination calculations
  const { filteredApplications, totalPages, paginatedApplications } = useMemo(() => {
    const filtered = sortedApplications;
    const total = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
    return {
      filteredApplications: filtered,
      totalPages: total,
      paginatedApplications: paginated,
    };
  }, [sortedApplications, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortKey, sortDirection, itemsPerPage]);

  // Fungsi untuk mengambil data aplikasi
  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/lorawan/applications");
      if (!response.ok) throw new Error("Failed to load applications.");
      setApplications(await response.json());
    } catch (error) {
      Toast.fire({ icon: "error", title: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Handler untuk membuat aplikasi baru
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/lorawan/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create application.");
      }

      Toast.fire({
        icon: "success",
        title: "Application created successfully!",
      });
      setName("");
      setDescription("");
      setIsModalOpen(false); // Tutup modal setelah berhasil
      fetchApplications(); // Muat ulang daftar
    } catch (error) {
      Toast.fire({ icon: "error", title: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler untuk menghapus aplikasi
  const handleDelete = async (app: Application) => {
    const result = await MySwal.fire({
      title: "Are you sure?",
      html: `You are about to delete application "<b>${app.name}</b>".<br/>This action is irreversible.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch("/api/lorawan/applications", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: app.id }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Failed to delete application.");
        }

        Toast.fire({
          icon: "success",
          title: "Application deleted successfully!",
        });
        fetchApplications(); // Muat ulang daftar
      } catch (error) {
        Toast.fire({ icon: "error", title: (error as Error).message });
      }
    }
  };



  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <GitBranch className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              LoRaWAN Applications
            </h1>
            <p className="text-muted-foreground">
              Manage, create, and organize your device applications.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={fetchApplications} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Applications
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : filteredApplications.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? "..." : filteredApplications.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pages
            </CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : totalPages}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4">
        {/* --- TOMBOL UNTUK MEMBUKA MODAL --- */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusCircle size={18} />
              Add Application
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Application</DialogTitle>
              <DialogDescription>
                Fill in the details below to create a new application.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Factory_Monitoring"
                    required
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Sensors in factory A"
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Application"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* --- TABEL APLIKASI --- */}
      <Card>
        <CardHeader>
          <CardTitle>Application List</CardTitle>
          <CardDescription>
            A list of all registered LoRaWAN applications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                type="text"
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Items per page:
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-muted/70 select-none" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-2">
                      <span>Name</span>
                      {!sortKey || sortKey !== 'name' ? (
                        <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                      ) : sortDirection === 'asc' ? (
                        <ArrowUp className="w-4 h-4 text-primary" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/70 select-none" onClick={() => handleSort('id')}>
                    <div className="flex items-center gap-2">
                      <span>Application ID</span>
                      {!sortKey || sortKey !== 'id' ? (
                        <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                      ) : sortDirection === 'asc' ? (
                        <ArrowUp className="w-4 h-4 text-primary" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Loading applications...
                    </TableCell>
                  </TableRow>
                ) : paginatedApplications.length > 0 ? (
                  paginatedApplications.map((app) => (
                    <TableRow key={app.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {app.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {app.description}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {app.id}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Link href={`/lo-ra-wan/applications/${app.id}`} passHref>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <Settings className="h-3.5 w-3.5" />
                            <span className="text-xs">Manage</span>
                          </Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 w-8 p-0 flex items-center justify-center"
                          onClick={() => handleDelete(app)}
                          aria-label="Delete application"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No applications found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 border-t border-border pt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredApplications.length)} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredApplications.length)} of{" "}
                  {filteredApplications.length} results
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

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (page > totalPages) return null;
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="min-w-9"
                      >
                        {page}
                      </Button>
                    );
                  })}

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
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Showing{" "}
            <strong>
              {Math.min(
                (currentPage - 1) * itemsPerPage + 1,
                applications.length
              )}
            </strong>{" "}
            to{" "}
            <strong>
              {Math.min(currentPage * itemsPerPage, applications.length)}
            </strong>{" "}
            of <strong>{applications.length}</strong> applications
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages || applications.length === 0}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
