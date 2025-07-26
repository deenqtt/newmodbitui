// File: app/devices/devices-external/page.tsx
"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useConnectivity } from "@/hooks/useConnectivity"; // Import hook koneksi kita

// Komponen UI & Ikon
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { HardDrive, PlusCircle, Database, Wifi, WifiOff, FileDown, FileUp, Edit, Trash2 } from "lucide-react";

interface Device {
  id: string;
  uniqId: string;
  name: string;
  topic: string;
  address: string | null;
}

export default function DevicesExternalPage() {
  const { dbStatus, mqttStatus } = useConnectivity(); // Gunakan hook koneksi
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State untuk dialog dan form
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // State untuk dialog konfirmasi hapus
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);

  const router = useRouter();
  const importFileRef = useRef<HTMLInputElement>(null);

  // --- FUNGSI-FUNGSI ---
  const fetchDevices = async () => { /* ... (sama seperti sebelumnya, tidak berubah) ... */ };
  useEffect(() => { fetchDevices(); }, []);

  const handleOpenDialog = (mode: "add" | "edit", device: Device | null = null) => {
    setDialogMode(mode);
    setCurrentDevice(device);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      topic: formData.get('topic') as string,
      address: formData.get('address') as string,
    };

    const url = dialogMode === 'edit' ? `/api/devices/external/${currentDevice?.id}` : '/api/devices/external';
    const method = dialogMode === 'edit' ? 'PUT' : 'POST';

    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

    if (response.ok) {
      setIsFormOpen(false);
      router.refresh(); // Cara modern untuk refresh data di Next.js
    } else {
      // Tampilkan error
      const errorData = await response.json();
      alert(errorData.message || "Gagal menyimpan data.");
    }
  };

  const handleDelete = async () => {
    if (!deviceToDelete) return;
    const response = await fetch(`/api/devices/external/${deviceToDelete.id}`, { method: 'DELETE' });
    if (response.ok) {
      router.refresh();
    } else {
      alert("Gagal menghapus device.");
    }
    setIsDeleteAlertOpen(false);
  };

  const handleExport = () => { /* ... (Logika ekspor) ... */ };
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => { /* ... (Logika impor) ... */ };


  // --- Render Komponen ---
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          <h1 className="text-lg font-semibold">External Devices</h1>
        </div>

        {/* Ikon Status & Tombol Aksi */}
        <div className="ml-auto flex items-center gap-4">
          <div title={`Database: ${dbStatus}`} className={`h-3 w-3 rounded-full ${dbStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <div title={`MQTT: ${mqttStatus}`} className={`h-3 w-3 rounded-full ${mqttStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>

          <Button variant="outline" size="sm" onClick={handleExport}><FileDown className="mr-2 h-4 w-4" />Export</Button>
          <Button variant="outline" size="sm" onClick={() => importFileRef.current?.click()}><FileUp className="mr-2 h-4 w-4" />Import</Button>
          <input type="file" ref={importFileRef} onChange={handleImport} className="hidden" accept=".json" />

          <Button onClick={() => handleOpenDialog('add')}><PlusCircle className="mr-2 h-4 w-4" />Tambah Device</Button>
        </div>
      </header>

      <main className="p-6">
        <div className="rounded-lg border">
          <Table>
            {/* ... (Tabel Header sama) ... */}
            <TableBody>
              {isLoading ? ( /* ... */ ) : devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>{device.name}</TableCell>
                  <TableCell>{device.topic}</TableCell>
                  <TableCell className="font-mono text-xs">{device.uniqId}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog('edit', device)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { setDeviceToDelete(device); setIsDeleteAlertOpen(true); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Dialog untuk Add/Edit Form */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'edit' ? 'Edit Device' : 'Tambah Device Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="name" defaultValue={currentDevice?.name} placeholder="Nama Device" required />
            <Input name="topic" defaultValue={currentDevice?.topic} placeholder="Topic" required />
            <Input name="address" defaultValue={currentDevice?.address ?? ''} placeholder="Address (Opsional)" />
            {/* uniqId tidak bisa diedit */}
            {dialogMode === 'edit' && <Input defaultValue={currentDevice?.uniqId} disabled />}
            <DialogFooter>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog untuk Konfirmasi Hapus */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent>
              {/* ... (Konten AlertDialog: Judul, deskripsi, tombol) ... */}
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}