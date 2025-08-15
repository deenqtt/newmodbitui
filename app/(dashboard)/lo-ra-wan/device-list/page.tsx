// File: app/(dashboard)/devices/lorawan-devices/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Network, History, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
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

// Tipe data untuk perangkat LoRaWAN
type LoraDevice = {
  id: string;
  devEui: string;
  name: string;
  lastSeen: string | null;
};

// Konfigurasi Paginasi
const ITEMS_PER_PAGE = 10;

// Fungsi untuk format tanggal
const formatTimestamp = (timestamp: string | null) => {
  if (!timestamp) return <span className="text-muted-foreground">Never</span>;
  return new Date(timestamp).toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function LoraWANPage() {
  const [devices, setDevices] = useState<LoraDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchDevices = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/lorawan/devices");
        if (!response.ok) throw new Error("Failed to fetch devices");
        setDevices(await response.json());
      } catch (error) {
        console.error(error);
        // Di sini Anda bisa menambahkan notifikasi error untuk pengguna
      } finally {
        setIsLoading(false);
      }
    };
    fetchDevices();
  }, []);

  // Logika untuk Paginasi
  const totalPages = Math.ceil(devices.length / ITEMS_PER_PAGE);
  const currentDevices = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return devices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [devices, currentPage]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Network className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LoRaWAN Devices</h1>
          <p className="text-muted-foreground">
            List of all LoRaWAN devices sending data via ChirpStack.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Devices</CardTitle>
          <CardDescription>
            A comprehensive list of every registered device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device Name</TableHead>
                  <TableHead>Device EUI</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Loading devices...
                    </TableCell>
                  </TableRow>
                ) : currentDevices.length > 0 ? (
                  currentDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">
                        {device.name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {device.devEui}
                      </TableCell>
                      <TableCell>{formatTimestamp(device.lastSeen)}</TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/lo-ra-wan/device-list/${device.id}/history`}
                          passHref
                        >
                          <Button variant="outline" size="sm">
                            <History className="mr-2 h-4 w-4" />
                            View Data
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No LoRaWAN devices found.
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
              {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, devices.length)}
            </strong>{" "}
            to{" "}
            <strong>
              {Math.min(currentPage * ITEMS_PER_PAGE, devices.length)}
            </strong>{" "}
            of <strong>{devices.length}</strong> devices
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
              disabled={currentPage === totalPages || devices.length === 0}
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
