// File: app/(dashboard)/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { WidgetRenderer } from "@/components/widgets/WidgetRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface WidgetLayout extends Layout {
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

  useEffect(() => {
    const fetchActiveDashboard = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/dashboards/active`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(
              "No active dashboard found. Please create or set one."
            );
          }
          throw new Error("Failed to fetch active dashboard.");
        }
        const data: DashboardData = await response.json();
        setDashboardData(data);
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
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: dashboardData.layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={30}
        // --- INI KUNCINYA: MATIKAN INTERAKSI ---
        isDraggable={false}
        isResizable={false}
      >
        {dashboardData.layout.map((item) => (
          <div
            key={item.i}
            className="bg-background rounded-lg shadow-sm border flex flex-col overflow-hidden"
          >
            <div className="flex-1 w-full h-full">
              <WidgetRenderer item={item} />
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </main>
  );
}
