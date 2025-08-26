"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Router,
  Activity,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Badge } from "@/components/ui/badge";

import withReactContent from "sweetalert2-react-content";

type Gateway = {
  id: string;
  gatewayId: string;
  name: string;
  lastSeen: string | null;
  isOnline: boolean;
  stats: Array<{
    rfPacketsReceived: number;
    rfPacketsOk: number;
    crcOkRatio: number;
    upstreamAckRatio: number;
    timestamp: string;
  }>;
};

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
const getStatusBadge = (isOnline: boolean, lastSeen: string | null) => {
  if (!lastSeen) {
    return (
      <Badge variant="destructive">
        <WifiOff className="w-3 h-3 mr-1" />
        Never
      </Badge>
    );
  }

  const lastSeenTime = new Date(lastSeen).getTime();
  const now = new Date().getTime();
  const diffMinutes = (now - lastSeenTime) / (1000 * 60);

  if (diffMinutes < 5) {
    return (
      <Badge variant="default" className="bg-green-500">
        <CheckCircle className="w-3 h-3 mr-1" />
        Online
      </Badge>
    );
  } else if (diffMinutes < 30) {
    return (
      <Badge variant="secondary">
        <AlertCircle className="w-3 h-3 mr-1" />
        Warning
      </Badge>
    );
  } else {
    return (
      <Badge variant="destructive">
        <WifiOff className="w-3 h-3 mr-1" />
        Offline
      </Badge>
    );
  }
};

export default function GatewaysPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGateways = async () => {
    console.log("Fetching gateways..."); // Debug log
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/lorawan/gateways");
      console.log("Response status:", response.status); // Debug log

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Received data:", data); // Debug log

      setGateways(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Error fetching gateways:", error);
      setError(error.message || "Failed to fetch gateways");
    } finally {
      setIsLoading(false);
      console.log("Fetch completed"); // Debug log
    }
  };

  useEffect(() => {
    fetchGateways();

    // Auto refresh every 30 seconds
    const interval = setInterval(fetchGateways, 30000);
    return () => {
      console.log("Clearing interval"); // Debug log
      clearInterval(interval);
    };
  }, []);

  const stats = useMemo(() => {
    if (!Array.isArray(gateways))
      return { online: 0, total: 0, totalPackets: 0, avgCrcRatio: 0 };

    const online = gateways.filter((g) => {
      if (!g.lastSeen) return false;
      const diffMinutes =
        (new Date().getTime() - new Date(g.lastSeen).getTime()) / (1000 * 60);
      return diffMinutes < 5;
    }).length;

    const totalPackets = gateways.reduce((sum, g) => {
      return sum + (g.stats?.[0]?.rfPacketsReceived || 0);
    }, 0);

    const avgCrcRatio =
      gateways.length > 0
        ? gateways.reduce(
            (sum, g) => sum + (g.stats?.[0]?.crcOkRatio || 0),
            0
          ) / gateways.length
        : 0;

    return { online, total: gateways.length, totalPackets, avgCrcRatio };
  }, [gateways]);

  const handleDelete = async (gatewayId: string) => {
    const result = await Swal.fire({
      title: "Hapus Gateway?",
      text: "Semua data statistik akan hilang dan tidak bisa dikembalikan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      reverseButtons: true,
      confirmButtonColor: "#ef4444",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/lorawan/gateways/${gatewayId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        Toast.fire({
          icon: "success",
          title: "Gateway berhasil dihapus!",
        });
        fetchGateways(); // Refresh list
      } else {
        const data = await res.json();
        Toast.fire({
          icon: "error",
          title: "Gagal menghapus",
          text: data.error || "Unknown error",
        });
      }
    } catch (err: any) {
      Toast.fire({
        icon: "error",
        title: "Kesalahan jaringan",
        text: err.message,
      });
    }
  };
  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <h2 className="text-xl font-semibold">Error Loading Gateways</h2>
            <p className="text-sm mt-2">{error}</p>
          </div>
          <Button onClick={fetchGateways} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Router className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            LoRaWAN Gateways
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage your LoRaWAN gateway infrastructure.
          </p>
        </div>
        <div className="ml-auto">
          <Button onClick={fetchGateways} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Gateways
            </CardTitle>
            <Router className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? "..." : stats.online}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Packets Received
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats.totalPackets.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg CRC Success
            </CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : `${(stats.avgCrcRatio * 100).toFixed(1)}%`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gateways Table */}
      <Card>
        <CardHeader>
          <CardTitle>Gateways Status</CardTitle>
          <CardDescription>
            Real-time status of all registered gateways.
            {!isLoading && (
              <span className="ml-2 text-xs">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gateway Name</TableHead>
                  <TableHead>Gateway ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Packets (24h)</TableHead>
                  <TableHead>CRC Success</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Loading gateways...
                    </TableCell>
                  </TableRow>
                ) : gateways.length > 0 ? (
                  gateways.map((gateway) => (
                    <TableRow key={gateway.id}>
                      <TableCell className="font-medium">
                        {gateway.name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {gateway.gatewayId}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(gateway.isOnline, gateway.lastSeen)}
                      </TableCell>
                      <TableCell>{formatTimestamp(gateway.lastSeen)}</TableCell>
                      <TableCell>
                        {gateway.stats?.[0]?.rfPacketsReceived?.toLocaleString() ||
                          "0"}
                      </TableCell>
                      <TableCell>
                        {gateway.stats?.[0]?.crcOkRatio
                          ? `${(gateway.stats[0].crcOkRatio * 100).toFixed(1)}%`
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {/* View Details Button */}
                        <Link
                          href={`/lo-ra-wan/gateways/${gateway.id}/dashboard`}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <Activity className="h-3.5 w-3.5" />
                            <span className="text-xs">Details</span>
                          </Button>
                        </Link>

                        {/* Delete Button (Icon Only) */}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 w-8 p-0 flex items-center justify-center"
                          onClick={() => handleDelete(gateway.id)}
                          aria-label="Delete gateway"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No gateways found. Gateways will appear automatically when
                      they send data.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
