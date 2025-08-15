// File: app/(dashboard)/devices/lorawan-devices/[id]/history/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Network,
  History,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { Prisma } from "@prisma/client";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Swal from "sweetalert2";

// Tipe data
type DeviceData = {
  id: string;
  timestamp: string;
  data: Prisma.JsonValue;
};

type LoraDeviceDetails = {
  id: string;
  devEui: string;
  name: string;
  lastSeen: string | null;
  data: DeviceData[];
};

// Konfigurasi Paginasi
const ITEMS_PER_PAGE = 15;

// Konfigurasi notifikasi Toast
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

// Fungsi format tanggal
const formatTimestamp = (timestamp: string | null) => {
  if (!timestamp) return "N/A";
  return new Date(timestamp).toLocaleString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// Fungsi format JSON
const formatJsonData = (data: Prisma.JsonValue) => {
  if (typeof data === "object" && data !== null) {
    return Object.entries(data)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(" | ");
  }
  return String(data);
};

export default function DeviceHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const deviceId = params.id as string;

  const [device, setDevice] = useState<LoraDeviceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchHistory = useCallback(async () => {
    if (!deviceId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/lorawan/devices/${deviceId}/history`);
      if (!response.ok) throw new Error("Failed to fetch device history");
      setDevice(await response.json());
      setCurrentPage(1); // Reset ke halaman pertama setiap kali data baru diambil
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: "Could not fetch history!" });
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDeleteHistory = async () => {
    Swal.fire({
      title: "Are you sure?",
      text: `This will permanently delete all ${
        device?.data.length || 0
      } history records for this device. This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete all!",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(
            `/api/lorawan/devices/${deviceId}/history`,
            {
              method: "DELETE",
            }
          );

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Failed to delete history");
          }

          Toast.fire({
            icon: "success",
            title: "All device history has been deleted.",
          });

          fetchHistory();
        } catch (error) {
          Toast.fire({
            icon: "error",
            title: (error as Error).message,
          });
        }
      }
    });
  };

  const totalPages = useMemo(() => {
    if (!device) return 0;
    return Math.ceil(device.data.length / ITEMS_PER_PAGE);
  }, [device]);

  const currentData = useMemo(() => {
    if (!device) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return device.data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [device, currentPage]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 text-center text-muted-foreground">
        Loading device history...
      </div>
    );
  }

  if (!device) {
    return (
      <div className="container mx-auto p-4 md:p-6 text-center text-muted-foreground">
        Device not found.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Device List
        </Button>
        <div className="flex items-center gap-4">
          <Network className="h-9 w-9 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{device.name}</h1>
            <p className="text-sm text-muted-foreground font-mono">
              {device.devEui}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Last seen: {formatTimestamp(device.lastSeen)}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History size={22} />
                Data History
              </CardTitle>
              <CardDescription>
                A log of all data payloads received from this device.
              </CardDescription>
            </div>
            {device.data.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteHistory}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All History
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Decoded Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.length > 0 ? (
                  currentData.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground">
                        {formatTimestamp(entry.timestamp)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatJsonData(entry.data)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No data history found for this device.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Showing{" "}
            <strong>
              {Math.min(
                (currentPage - 1) * ITEMS_PER_PAGE + 1,
                device.data.length
              )}
            </strong>{" "}
            to{" "}
            <strong>
              {Math.min(currentPage * ITEMS_PER_PAGE, device.data.length)}
            </strong>{" "}
            of <strong>{device.data.length}</strong> entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || device.data.length === 0}
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
