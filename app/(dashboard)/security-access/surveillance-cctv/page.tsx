"use client";

import { useState, useEffect, FormEvent } from "react";
import { MqttProvider, useMqtt } from "@/contexts/MqttContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlusCircle,
  Trash2,
  Video,
  Wifi,
  WifiOff,
  Edit,
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";

interface Cctv {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  channel?: string | null;
  username?: string | null;
  password?: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function SurveillanceCctvPage() {
  const { connectionStatus } = useMqtt();
  const [cctvList, setCctvList] = useState<Cctv[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCctv, setEditingCctv] = useState<Cctv | null>(null);
  const [form, setForm] = useState<Partial<Cctv>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const fetchCctv = async () => {
    try {
      if (cctvList.length === 0) setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/cctv`);
      if (!response.ok) throw new Error("Failed to fetch CCTV data");
      const data = await response.json();
      setCctvList(data);
    } catch (error: any) {
      Swal.fire("Error", error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCctv();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddClick = () => {
    setEditingCctv(null);
    setForm({
      name: "",
      ipAddress: "",
      port: 554,
      channel: "", // <-- PERUBAHAN UTAMA DI SINI
      username: "admin",
      password: "",
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (cctv: Cctv) => {
    setEditingCctv(cctv);
    setForm({ ...cctv, password: "" });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const url = editingCctv
      ? `${API_BASE_URL}/api/cctv/${editingCctv.id}`
      : `${API_BASE_URL}/api/cctv`;
    const method = editingCctv ? "PUT" : "POST";
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok)
        throw new Error(
          `Failed to ${method === "POST" ? "add" : "update"} CCTV`
        );
      Swal.fire(
        "Success",
        `CCTV has been ${method === "POST" ? "added" : "updated"}.`,
        "success"
      );
      setIsModalOpen(false);
      fetchCctv();
    } catch (error: any) {
      Swal.fire("Error", error.message, "error");
    }
  };

  const handleDelete = (cctv: Cctv) => {
    Swal.fire({
      title: `Delete ${cctv.name}?`,
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#d33",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/cctv/${cctv.id}`, {
            method: "DELETE",
          });
          if (!response.ok) throw new Error("Deletion failed on server.");
          Swal.fire(
            "Deleted!",
            "CCTV configuration has been deleted.",
            "success"
          );
          fetchCctv();
        } catch (error) {
          Swal.fire("Error", "Failed to delete the configuration.", "error");
        }
      }
    });
  };

  const handlePreview = (id: string) => {
    setIsPreviewLoading(true);
    setPreviewUrl(
      `${API_BASE_URL}/api/cctv/${id}/stream?t=${new Date().getTime()}`
    );
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setIsPreviewLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Connected":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <Wifi className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
      case "Disconnected":
      case "Failed to Connect":
        return (
          <Badge variant="destructive">
            <WifiOff className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}...</Badge>;
    }
  };

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>CCTV Surveillance</CardTitle>
              <CardDescription>
                Manage your CCTV camera configurations.
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>MQTT:</span>
                {getStatusBadge(connectionStatus)}
              </div>
              <Button onClick={handleAddClick}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add New CCTV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Camera Name</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : cctvList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      No cameras configured.
                    </TableCell>
                  </TableRow>
                ) : (
                  cctvList.map((cctv) => (
                    <TableRow key={cctv.id}>
                      <TableCell className="font-medium">{cctv.name}</TableCell>
                      <TableCell>{cctv.ipAddress}</TableCell>
                      <TableCell>{cctv.port}</TableCell>
                      <TableCell>{cctv.username || "N/A"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(cctv.id)}
                        >
                          <Video className="h-4 w-4 mr-1" /> Preview
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(cctv)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(cctv)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingCctv ? "Edit CCTV" : "Add New CCTV"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Camera Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., CCTV Gudang"
                  value={form.name || ""}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ipAddress">IP Address</Label>
                <Input
                  id="ipAddress"
                  name="ipAddress"
                  placeholder="192.168.1.100"
                  value={form.ipAddress || ""}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    name="port"
                    type="number"
                    placeholder="554"
                    value={form.port || ""}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="channel">Channel/Path</Label>
                  <Input
                    id="channel"
                    name="channel"
                    placeholder="101"
                    value={form.channel || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    placeholder="admin"
                    value={form.username || ""}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Leave blank to keep unchanged"
                    onChange={handleInputChange}
                  />
                </div>
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
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewUrl} onOpenChange={closePreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Live Preview</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full bg-slate-900 rounded-md overflow-hidden flex items-center justify-center">
            {/* Tampilkan gambar secara langsung tanpa loading state */}
            {previewUrl && (
              <img
                src={previewUrl}
                alt="CCTV Live Stream"
                className="w-full h-full object-contain" // Hapus class "hidden"
                // Hapus props onLoad
                onError={() => {
                  // Pertahankan onError untuk menangani jika URL benar-benar error
                  closePreview();
                  Swal.fire(
                    "Stream Error",
                    "Could not load video stream. Check config and network.",
                    "error"
                  );
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function SurveillanceCctvPageWithProvider() {
  return (
    <MqttProvider>
      <SurveillanceCctvPage />
    </MqttProvider>
  );
}
