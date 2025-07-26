// File: app/(dashboard)/system-config/system-backup/page.tsx

"use client";

import { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DatabaseBackup, ExternalLink, Info, Loader2 } from "lucide-react";
import Link from "next/link";

export default function SystemBackupPage() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF;
  const supabaseBackupUrl = `https://app.supabase.com/project/${projectRef}/database/backups`;

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    Swal.fire({
      title: "Memulai Proses Backup...",
      text: "Harap tunggu, ini bisa memakan waktu beberapa saat.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const response = await axios.post("/api/system-backup/create");
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: response.data.message,
      });
    } catch (error: any) {
      console.error("Backup failed:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text: error.response?.data?.message || "Terjadi kesalahan pada server.",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">System Backup</h1>
      <Card>
        <CardHeader>
          <CardTitle>Manual Backup</CardTitle>
          <CardDescription>
            Memicu proses backup database secara manual. Snapshot database akan
            dibuat oleh Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCreateBackup} disabled={isBackingUp}>
            {isBackingUp ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <DatabaseBackup className="mr-2 h-4 w-4" />
            )}
            {isBackingUp ? "Processing..." : "Create Full Backup Now"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automatic Backups & Restore</CardTitle>
          <CardDescription>
            Informasi mengenai backup otomatis yang dikelola oleh Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Backup Otomatis Aktif</AlertTitle>
            <AlertDescription>
              Supabase secara otomatis melakukan backup database Anda setiap
              hari. Untuk melakukan restore ke titik waktu tertentu
              (Point-in-Time Recovery), Anda harus melakukannya melalui
              dashboard resmi Supabase untuk keamanan maksimal.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href={supabaseBackupUrl} target="_blank">
              Buka Dashboard Backup Supabase
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
