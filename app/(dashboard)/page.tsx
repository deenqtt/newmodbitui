// app/(dashboard)/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, AlertCircle, PlusCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// --- GUNAKAN DYNAMIC IMPORT UNTUK NON-AKTIFKAN SSR ---
const DashboardLayout = dynamic(() => import("@/components/DashboardLayout"), {
  ssr: false,
  loading: () => <p>Loading dashboard...</p>,
});

import dynamic from "next/dynamic";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface WidgetLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  widgetType?: string;
  config?: any;
}

interface DashboardData {
  id: string;
  name: string;
  layout: WidgetLayout[];
}

export default function MainDashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noDashboardsFound, setNoDashboardsFound] = useState(false);

  useEffect(() => {
    const fetchActiveDashboard = async () => {
      setIsLoading(true);
      setError(null);
      setNoDashboardsFound(false);
      try {
        const response = await fetch(`${API_BASE_URL}/api/dashboards/active`);
        if (!response.ok) {
          if (response.status === 404) {
            setNoDashboardsFound(true);
          } else {
            throw new Error("Failed to fetch active dashboard.");
          }
        } else {
          const data: DashboardData = await response.json();
          setDashboardData(data);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchActiveDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-12 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="col-span-12 sm:col-span-6 lg:col-span-4 h-48 rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (noDashboardsFound) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center">
        <LayoutGrid className="h-12 w-12 text-primary mb-4" />
        <h2 className="text-2xl font-bold">Welcome!</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          It looks like you don't have any dashboards yet. Let's create your
          first one to get started.
        </p>
        <Link href="/manage-dashboard">
          <Button size="lg">
            <PlusCircle className="mr-2 h-5 w-5" />
            Create Your First Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">An Error Occurred</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/manage-dashboard">
          <Button>Go to Manage Dashboards</Button>
        </Link>
      </div>
    );
  }

  if (!dashboardData || dashboardData.layout.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center">
        <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Dashboard is Empty</h2>
        <p className="text-muted-foreground mb-4">
          Your active dashboard has no widgets.
        </p>
        <Link href={`/dashboard/${dashboardData?.id}`}>
          <Button>Edit Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <main className="p-4 md:p-6">
      <DashboardLayout layout={dashboardData.layout} />
    </main>
  );
}
