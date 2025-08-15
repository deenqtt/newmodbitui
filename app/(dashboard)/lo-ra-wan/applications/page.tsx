"use client";

import { useState, useEffect, FormEvent, useMemo } from "react";
import {
  GitBranch,
  PlusCircle,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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

  // State untuk paginasi
  const [currentPage, setCurrentPage] = useState(1);

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

  // Logika untuk paginasi
  const totalPages = Math.ceil(applications.length / ITEMS_PER_PAGE);
  const currentApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return applications.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [applications, currentPage]);

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Application ID</TableHead>
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
              ) : currentApplications.length > 0 ? (
                currentApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {app.description}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {app.id}
                    </TableCell>
                    <TableCell className="flex items-center justify-end gap-2">
                      <Link href={`/lo-ra-wan/applications/${app.id}`} passHref>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Settings size={14} />
                          Manage
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(app)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No applications found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Showing{" "}
            <strong>
              {Math.min(
                (currentPage - 1) * ITEMS_PER_PAGE + 1,
                applications.length
              )}
            </strong>{" "}
            to{" "}
            <strong>
              {Math.min(currentPage * ITEMS_PER_PAGE, applications.length)}
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
