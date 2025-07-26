// File: app/devices/devices-external/page.tsx
"use client";

import { useState, useEffect, type FormEvent } from "react";

// Asumsi Anda menggunakan komponen UI dari Shadcn/UI
// Pastikan komponen-komponen ini sudah ada di proyek Anda
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
import { PlusCircle } from "lucide-react";

// Definisikan tipe data untuk sebuah device agar TypeScript tidak error
interface Device {
  id: string;
  uniqId: string;
  name: string;
  topic: string;
  address: string | null;
  createdAt: string;
}

export default function DevicesExternalPage() {
  // State untuk menyimpan daftar device dari API
  const [devices, setDevices] = useState<Device[]>([]);
  // State untuk status loading
  const [isLoading, setIsLoading] = useState(true);
  // State untuk dialog form tambah data
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // State untuk setiap input di dalam form
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [address, setAddress] = useState("");

  // State untuk menampilkan pesan error
  const [error, setError] = useState<string | null>(null);

  // Fungsi untuk mengambil data dari API
  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/devices/external");
      if (!response.ok) {
        throw new Error("Gagal memuat data dari server.");
      }
      const data: Device[] = await response.json();
      setDevices(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Jalankan fetchDevices() saat halaman pertama kali dimuat
  useEffect(() => {
    fetchDevices();
  }, []);

  // Fungsi yang dijalankan saat form di-submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); // Mencegah refresh halaman
    setError(null); // Reset pesan error

    // Kirim data ke API menggunakan method POST
    const response = await fetch("/api/devices/external", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, topic, address }),
    });

    if (response.ok) {
      // Jika berhasil
      setIsDialogOpen(false); // Tutup dialog
      // Kosongkan kembali form
      setName("");
      setTopic("");
      setAddress("");
      await fetchDevices(); // Ambil data terbaru untuk me-refresh tabel
    } else {
      // Jika gagal
      const errorData = await response.json();
      setError(errorData.message || "Terjadi kesalahan saat menyimpan.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">External Devices</h1>
          <p className="mt-1 text-gray-500">
            Kelola semua perangkat eksternal yang terhubung.
          </p>
        </div>

        {/* Tombol untuk membuka Dialog Form */}
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
            {/* Form untuk menambah data */}
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
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
              {/* Tampilkan pesan error jika ada */}
              {error && (
                <p className="text-sm text-red-500 text-center mb-4">{error}</p>
              )}
              <DialogFooter>
                <Button type="submit">Simpan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabel untuk menampilkan data device */}
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
    </div>
  );
}
