// File: app/(dashboard)/view-dashboard/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { WidgetRenderer } from "@/components/widgets/WidgetRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LayoutGrid, AlertCircle, ArrowLeft, Edit3, Home } from "lucide-react";

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

export default function ViewDashboardPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const dashboardId = params.id;
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!dashboardId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/dashboards/${dashboardId}`
        );

        if (!response.ok) {
          throw new Error("Dashboard not found");
        }

        const data: DashboardData = await response.json();
        setDashboardData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [dashboardId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
        <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-16" />
          </div>
        </header>

        <main className="p-4 md:p-6">
          <div className="grid grid-cols-12 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="col-span-12 sm:col-span-6 lg:col-span-4 h-48 rounded-lg"
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
        <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </header>

        <main className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Dashboard Not Found</h2>
          <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            <Button onClick={() => router.push("/manage-dashboard")}>
              <Home className="mr-2 h-4 w-4" />
              Manage Dashboards
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Empty dashboard state
  if (!dashboardData || dashboardData.layout.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
        <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              {dashboardData?.name || "Dashboard"}
            </h1>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${dashboardId}`)}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Edit Dashboard
          </Button>
        </header>

        <main className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4">
          <div className="p-6 rounded-full bg-muted mb-4">
            <LayoutGrid className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Dashboard is Empty
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            This dashboard has no widgets yet. Start building by adding your
            first widget.
          </p>
          <Button
            size="lg"
            onClick={() => router.push(`/dashboard/${dashboardId}`)}
          >
            <Edit3 className="h-5 w-5 mr-2" />
            Start Editing
          </Button>
        </main>
      </div>
    );
  }

  // Main dashboard view
  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            {dashboardData.name}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${dashboardId}`)}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="ghost" onClick={() => router.push("/")}>
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
        </div>
      </header>

      <main className="p-4 md:p-6">
        <ResponsiveGridLayout
          className="layout rounded-xl min-h-[80vh]"
          layouts={{ lg: dashboardData.layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={30}
          isDraggable={false}
          isResizable={false}
          margin={[16, 16]}
        >
          {dashboardData.layout.map((item) => (
            <div
              key={item.i}
              className="bg-background rounded-lg shadow-sm border flex flex-col overflow-hidden 
                         hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex-1 w-full h-full">
                <WidgetRenderer item={item} />
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      </main>
    </div>
  );
}
