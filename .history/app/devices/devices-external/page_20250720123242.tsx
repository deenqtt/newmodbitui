// File: app/devices/devices-external/page.tsx
"use client";

import { useState, useEffect, type FormEvent } from "react";

// Import Ikon & Komponen UI
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { HardDrive, PlusCircle } from "lucide-react"; // Ganti ikon menjadi HardDrive

// Definisikan tipe data untuk sebuah device
interface Device {
  id: string;
  uniqId: string;
  name: string;
  topic: string;
  address: string | null;
  createdAt: string;
}

export default function DevicesExternalPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ... (Fungsi fetchDevices dan handleSubmit tetap sama)
  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/devices/external");
      if (!response.ok) throw new Error("Gagal memuat data dari server.");
      const data: Device[] = await response.json();
      setDevices(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const response = await fetch("/api/devices/external", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, topic, address }),
    });

    if (response.ok) {
      setIsDialogOpen(false);
      setName("");
      setTopic("");
      setAddress("");
      await fetchDevices();
    } else {
      const errorData = await response.json();
      setError(errorData.message || "Terjadi kesalahan saat menyimpan.");
    }
  };

  return (
    // Kita bungkus semuanya dalam satu elemen fragmen <>
    <>
      {/* ===== BLOK HEADER YANG ANDA MINTA ===== */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          {/* Ikon dan Judul disesuaikan untuk halaman ini */}
          <HardDrive className="h-5 w-5" />
          <h1 className="text-lg font-semibold">External Devices</h1>
        </div>
        <div className="ml-auto">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Tambah Device
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Tambah Device Eksternal Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  {/* ... form inputs ... */}
                  <div>
                    <Label htmlFor="name" className="mb-2 block">
                      Nama Device
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="topic" className="mb-2 block">
                      Topic
                    </Label>
                    <Input
                      id="topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="address" className="mb-2 block">
                      Address (Opsional)
                    </Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>
                {error && (
                  <p className="text-sm text-red-500 text-center mb-4">
                    {error}
                  </p>
                )}
                <DialogFooter>
                  <Button type="submit">Simpan</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* ===== KONTEN UTAMA HALAMAN ===== */}
      <main className="p-6 space-y-6">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Device</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Unique ID</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : devices.length > 0 ? (
                devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>{device.topic}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {device.uniqId}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    Belum ada data. Silakan tambah device baru.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </>
  );
}
