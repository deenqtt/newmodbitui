// File: app/(dashboard)/system-config/system-backup/page.tsx

"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function SystemBackupPage() {
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF;
  const supabaseBackupUrl = `https://app.supabase.com/project/${projectRef}/database/backups`;
  return (
    // --- TAMBAHAN PEMBUNGKUS UTAMA DENGAN PADDING ---
    <main className="p-4 md:p-6 lg:p-8">
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            System Backup & Restore
          </h1>
          <p className="text-muted-foreground">
            Kelola dan lihat status backup database Anda.
          </p>
        </div>

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
              <Link
                href={supabaseBackupUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Buka Dashboard Backup Supabase
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
