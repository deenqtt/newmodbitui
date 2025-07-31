"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlusCircle,
  Edit,
  Trash2,
  LayoutGrid,
  CheckCircle2,
  Circle,
} from "lucide-react";
import Swal from "sweetalert2";

interface Dashboard {
  id: string;
  name: string;
  inUse: boolean;
  createdAt: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export default function ManageDashboardPage() {
  const router = useRouter();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(
    null
  );
  const [form, setForm] = useState({ name: "" });

  const fetchDashboards = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboards`);
      if (!response.ok) throw new Error("Failed to fetch dashboards");
      setDashboards(await response.json());
    } catch (error: any) {
      Swal.fire("Error", error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboards();
  }, []);

  const handleAddClick = () => {
    setEditingDashboard(null);
    setForm({ name: "" });
    setIsModalOpen(true);
  };

  const handleEditClick = (dashboard: Dashboard) => {
    setEditingDashboard(dashboard);
    setForm({ name: dashboard.name });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const url = editingDashboard
      ? `${API_BASE_URL}/api/dashboards/${editingDashboard.id}`
      : `${API_BASE_URL}/api/dashboards`;
    const method = editingDashboard ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error(`Failed to save dashboard`);
      Swal.fire("Success", `Dashboard has been saved.`, "success");
      setIsModalOpen(false);
      fetchDashboards();
    } catch (error: any) {
      Swal.fire("Error", error.message, "error");
    }
  };

  const handleSetActive = async (dashboardId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/dashboards/${dashboardId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inUse: true }),
        }
      );
      if (!response.ok) throw new Error("Failed to set active dashboard");
      fetchDashboards();
    } catch (error: any) {
      Swal.fire("Error", error.message, "error");
    }
  };

  const handleDelete = async (dashboardId: string) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await fetch(`${API_BASE_URL}/api/dashboards/${dashboardId}`, {
            method: "DELETE",
          });
          Swal.fire("Deleted!", "The dashboard has been deleted.", "success");
          fetchDashboards();
        } catch (error) {
          Swal.fire("Error", "Failed to delete the dashboard.", "error");
        }
      }
    });
  };

  const openDashboardEditor = (dashboardId: string) => {
    router.push(`/dashboard/${dashboardId}`);
  };

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Manage Dashboards</CardTitle>
              <CardDescription>
                Create, edit, and set your active dashboard.
              </CardDescription>
            </div>
            <Button onClick={handleAddClick}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add New Dashboard
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Active</TableHead>
                  <TableHead>Dashboard Name</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-[250px] float-right" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : dashboards.length > 0 ? (
                  dashboards.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSetActive(d.id)}
                          disabled={d.inUse}
                          className="disabled:opacity-100 disabled:cursor-default"
                        >
                          {d.inUse ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>
                        {new Date(d.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDashboardEditor(d.id)}
                        >
                          <LayoutGrid className="h-4 w-4 mr-2" />
                          Set/Open
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(d)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(d.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                      No dashboards found. Create one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Modal untuk Add/Edit Dashboard */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingDashboard ? "Edit Dashboard Name" : "Add New Dashboard"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Dashboard Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ name: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
