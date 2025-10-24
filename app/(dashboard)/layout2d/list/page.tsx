"use client";

import { useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutGrid,
  AlertCircle,
  Plus,
  Edit,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Dynamic imports to avoid SSR issues
const Layout2DList = dynamic(
  () => import("@/components/layout2d/Layout2DList"),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-96" />,
  }
);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Layout2D {
  id: string;
  name: string;
  isUse: boolean;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function Layout2DListPage() {
  const [layouts, setLayouts] = useState<Layout2D[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all layouts
  const fetchLayouts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/layout2d`);
      if (!response.ok) {
        throw new Error("Failed to fetch layouts");
      }
      const data: Layout2D[] = await response.json();
      setLayouts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLayouts();
  }, [fetchLayouts]);

  const handleLayoutsChange = () => {
    fetchLayouts();
  };

  const handleSetActiveLayout = (layoutId: string) => {
    // Update activeLayout state when layout becomes active
    setLayouts(prevLayouts =>
      prevLayouts.map(layout => ({
        ...layout,
        isUse: layout.id === layoutId
      }))
    );
  };

  const handleLayoutSelect = (layout: Layout2D) => {
    // Navigate to the canvas page
    window.location.href = `/layout2d`;
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="w-full h-[600px]" />
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
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <main className="h-full flex flex-col p-4 md:p-6">
      <div className="flex flex-col h-full space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LayoutGrid className="w-6 h-6" />
              Manage Layouts
            </h1>
            <p className="text-sm text-muted-foreground">
              Create, edit, and manage your process flow layouts
            </p>
          </div>
          <Link href="/layout2d">
            <Button>
              <Edit className="w-4 h-4 mr-2" />
              Canvas View
            </Button>
          </Link>
        </div>

        {/* Layout List */}
        <Card className="flex flex-col flex-1">
          <CardHeader>
            <CardTitle className="text-lg">
              Process Flow Layouts ({layouts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 p-0">
            {layouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-12 px-6">
                <div className="text-center max-w-lg">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-2xl flex items-center justify-center mb-4">
                    <Plus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No Layouts Found
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first process flow layout to get started with visualizing your IoT data.
                  </p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Layout
                  </Button>
                </div>
              </div>
            ) : (
              <Layout2DList
                layouts={layouts}
                onLayoutsChange={handleLayoutsChange}
                onLayoutSelect={handleLayoutSelect}
                onSetActive={handleSetActiveLayout}
              />
            )}
          </CardContent>
        </Card>

        {/* Features Info Box */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Plus className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Create Layouts</h4>
                  <p className="text-xs text-muted-foreground mt-1">Add new process flow layouts with custom backgrounds and names</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Edit className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Edit & Manage</h4>
                  <p className="text-xs text-muted-foreground mt-1">Update layout properties, activate layouts, or remove unused ones</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Save className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Canvas Integration</h4>
                  <p className="text-xs text-muted-foreground mt-1">Switch to canvas view to add data points and visualize real-time data</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
