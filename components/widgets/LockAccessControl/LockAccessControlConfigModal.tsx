// Lokasi: components/widgets/LockAccessControl/LockAccessControlConfigModal.tsx
// (Buat folder dan file baru ini)
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Tipe data untuk controller yang akan kita fetch
type Controller = {
  id: string;
  name: string;
};

// Tipe untuk props (properti) yang diterima komponen ini
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: { title: string; controllerId: string }) => void;
}

export function LockAccessControlConfigModal({
  isOpen,
  onClose,
  onSave,
}: Props) {
  const [title, setTitle] = useState("Lock Access Control");
  const [selectedControllerId, setSelectedControllerId] = useState("");
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Efek ini akan berjalan setiap kali modal dibuka (isOpen menjadi true)
  useEffect(() => {
    if (isOpen) {
      const fetchControllers = async () => {
        setIsLoading(true);
        try {
          // Panggil API untuk mendapatkan daftar semua controller yang ada
          const response = await fetch("/api/devices/access-controllers");
          const data: Controller[] = await response.json();
          setControllers(data);
        } catch (error) {
          console.error("Failed to fetch controllers", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchControllers();
    }
  }, [isOpen]);

  // Fungsi yang dipanggil saat tombol "Save" diklik
  const handleSave = () => {
    if (selectedControllerId) {
      // Kirim data konfigurasi (judul dan ID controller) kembali ke halaman utama
      onSave({ title, controllerId: selectedControllerId });
      onClose(); // Tutup modal
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Lock Access Control Widget</DialogTitle>
          <DialogDescription>
            Pilih controller mana yang akan ditampilkan dan dikontrol oleh
            widget ini.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="widget-title">Judul Widget</Label>
            <Input
              id="widget-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="controller-select">Access Controller</Label>
            <Select
              value={selectedControllerId}
              onValueChange={setSelectedControllerId}
            >
              <SelectTrigger id="controller-select">
                <SelectValue
                  placeholder={isLoading ? "Memuat..." : "Pilih controller"}
                />
              </SelectTrigger>
              <SelectContent>
                {!isLoading &&
                  controllers.map((controller) => (
                    <SelectItem key={controller.id} value={controller.id}>
                      {controller.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={!selectedControllerId}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
