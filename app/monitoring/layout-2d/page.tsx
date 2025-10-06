"use client";

import { useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutGrid,
  AlertCircle,
  PlusCircle,
  Edit,
  Save,
  X,
  Plus,
  Settings,
  Navigation,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DataPointConfigModal from "@/components/layout2d/DataPointConfigModal";
import FlowIndicatorConfigModal from "@/components/layout2d/FlowIndicatorConfigModal";
import { toast } from "sonner";

// Dynamic imports to avoid SSR issues
const Layout2DCanvas = dynamic(
  () => import("@/components/layout2d/Layout2DCanvas"),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[600px]" />,
  }
);

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

export default function MonitoringLayout2DPage() {
  const [layouts, setLayouts] = useState<Layout2D[]>([]);
  const [activeLayout, setActiveLayout] = useState<Layout2D | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<Layout2D | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("canvas");
  const [isManageMode, setIsManageMode] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configModalPosition, setConfigModalPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [editingDataPoint, setEditingDataPoint] = useState<any>(null);
  const [isFlowIndicatorModalOpen, setIsFlowIndicatorModalOpen] = useState(false);
  const [flowIndicatorModalPosition, setFlowIndicatorModalPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [editingFlowIndicator, setEditingFlowIndicator] = useState<any>(null);
  const [creationMode, setCreationMode] = useState<'datapoint' | 'flowindicator'>('datapoint');

  // Fetch all layouts
  const fetchLayouts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/layout2d`);
      if (!response.ok) {
        throw new Error("Failed to fetch layouts");
      }
      const data: Layout2D[] = await response.json();
      setLayouts(data);

      // Find and set active layout
      const active = data.find((layout) => layout.isUse);
      if (active) {
        setActiveLayout(active);
        if (!selectedLayout) {
          setSelectedLayout(active);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLayout]);

  // Fetch active layout separately
  const fetchActiveLayout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/layout2d/active`);
      if (response.ok) {
        const data: Layout2D = await response.json();
        setActiveLayout(data);
        if (!selectedLayout) {
          setSelectedLayout(data);
        }
      }
    } catch (err) {
      // Active layout not found is ok
    }
  };

  useEffect(() => {
    fetchLayouts();
  }, [fetchLayouts]);

  const handleLayoutsChange = () => {
    fetchLayouts();
  };

  const handleSetActiveLayout = (layoutId: string) => {
    // Update activeLayout state when layout becomes active
    const newActiveLayout = layouts.find((l) => l.id === layoutId);
    if (newActiveLayout) {
      setActiveLayout({ ...newActiveLayout, isUse: true });
    }
  };

  const handleLayoutSelect = (layout: Layout2D) => {
    setSelectedLayout(layout);
    setActiveTab("canvas");
    setIsManageMode(false); // Reset manage mode when switching layouts
  };

  // Data point handlers
  const handleAddDataPoint = (x: number, y: number) => {
    if (creationMode === 'datapoint') {
      setConfigModalPosition({ x, y });
      setEditingDataPoint(null);
      setIsConfigModalOpen(true);
    } else if (creationMode === 'flowindicator') {
      setFlowIndicatorModalPosition({ x, y });
      setEditingFlowIndicator(null);
      setIsFlowIndicatorModalOpen(true);
    }
  };

  const handleEditDataPoint = (dataPoint: any) => {
    setEditingDataPoint(dataPoint);
    setConfigModalPosition(null);
    setIsConfigModalOpen(true);
  };

  const handleDeleteDataPoint = async (dataPointId: string) => {
    if (!selectedLayout) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/layout2d/${selectedLayout.id}/datapoints/${dataPointId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success("Data point deleted");
        // Refresh canvas by updating selected layout timestamp
        setSelectedLayout({
          ...selectedLayout,
          updatedAt: new Date().toISOString(),
        });
      } else {
        toast.error("Failed to delete data point");
      }
    } catch (error) {
      console.error("Failed to delete data point:", error);
      toast.error("Failed to delete data point");
    }
  };

  const handleSaveDataPoint = async (config: any) => {
    if (!selectedLayout) return;

    try {
      const url = editingDataPoint
        ? `${API_BASE_URL}/api/layout2d/${selectedLayout.id}/datapoints/${editingDataPoint.id}`
        : `${API_BASE_URL}/api/layout2d/${selectedLayout.id}/datapoints`;

      const method = editingDataPoint ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast.success(
          editingDataPoint ? "Data point updated" : "Data point added"
        );
        // Refresh canvas by updating selected layout timestamp
        setSelectedLayout({
          ...selectedLayout,
          updatedAt: new Date().toISOString(),
        });
      } else {
        toast.error("Failed to save data point");
      }
    } catch (error) {
      console.error("Failed to save data point:", error);
      toast.error("Failed to save data point");
    }
  };

  // Flow indicator handlers
  const handleAddFlowIndicator = (x: number, y: number) => {
    setFlowIndicatorModalPosition({ x, y });
    setEditingFlowIndicator(null);
    setIsFlowIndicatorModalOpen(true);
  };

  const handleEditFlowIndicator = (flowIndicator: any) => {
    setEditingFlowIndicator(flowIndicator);
    setFlowIndicatorModalPosition(null);
    setIsFlowIndicatorModalOpen(true);
  };

  const handleDeleteFlowIndicator = async (flowIndicatorId: string) => {
    if (!selectedLayout) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/layout2d/${selectedLayout.id}/flowindicators/${flowIndicatorId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success("Flow indicator deleted");
        // Refresh canvas by updating selected layout timestamp
        setSelectedLayout({
          ...selectedLayout,
          updatedAt: new Date().toISOString(),
        });
      } else {
        toast.error("Failed to delete flow indicator");
      }
    } catch (error) {
      console.error("Failed to delete flow indicator:", error);
      toast.error("Failed to delete flow indicator");
    }
  };

  const handleSaveFlowIndicator = async (config: any) => {
    if (!selectedLayout) return;

    try {
      const url = editingFlowIndicator
        ? `${API_BASE_URL}/api/layout2d/${selectedLayout.id}/flowindicators/${editingFlowIndicator.id}`
        : `${API_BASE_URL}/api/layout2d/${selectedLayout.id}/flowindicators`;

      const method = editingFlowIndicator ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast.success(
          editingFlowIndicator ? "Flow indicator updated" : "Flow indicator added"
        );
        // Refresh canvas by updating selected layout timestamp
        setSelectedLayout({
          ...selectedLayout,
          updatedAt: new Date().toISOString(),
        });
      } else {
        toast.error("Failed to save flow indicator");
      }
    } catch (error) {
      console.error("Failed to save flow indicator:", error);
      toast.error("Failed to save flow indicator");
    }
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Monitoring - Process Flow Layouts</h1>
            <p className="text-muted-foreground">Monitor real-time data visualization and flow indicators</p>
          </div>
          <div className="text-sm text-muted-foreground">
            View-only mode for monitoring purposes
          </div>
        </div>

        {layouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-15rem)] text-center relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="grid grid-cols-8 gap-4 h-full">
                {Array.from({ length: 32 }).map((_, i) => (
                  <div key={i} className="bg-primary rounded-lg"></div>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-2xl mx-auto px-6">
              {/* Icon with gradient background */}
              <div className="relative mb-8">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center mb-4">
                  <LayoutGrid className="h-12 w-12 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-60 animate-pulse"></div>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-gradient-to-r from-green-500 to-blue-500 rounded-full opacity-60 animate-pulse delay-1000"></div>
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent mb-4">
                Welcome to Process Flow Monitoring
              </h2>

              {/* Description */}
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Monitor interactive process flow layouts with real-time data from your IoT devices.
                View live dashboards with data points and flow indicators.
              </p>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-xl border">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mb-3">
                    <LayoutGrid className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">Real-time Monitoring</h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Live data visualization from IoT devices</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-xl border">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mb-3">
                    <Navigation className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm text-green-900 dark:text-green-100 mb-1">Flow Indicators</h3>
                  <p className="text-xs text-green-700 dark:text-green-300">Monitor process flow with dynamic arrows</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-4 rounded-xl border">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mb-3">
                    <Settings className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm text-purple-900 dark:text-purple-100 mb-1">Status Monitoring</h3>
                  <p className="text-xs text-purple-700 dark:text-purple-300">Live status updates and alerts</p>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  No process flow layouts available for monitoring.
                </p>
                <p className="text-xs text-muted-foreground">
                  <Link href="/layout2d" className="text-primary hover:underline">
                    Go to Layout Management
                  </Link> to create and configure layouts.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col flex-1"
          >
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
              <TabsTrigger value="canvas">Process Flow Monitor</TabsTrigger>
              <TabsTrigger value="manage">Layout Selection</TabsTrigger>
            </TabsList>

            <TabsContent
              value="canvas"
              className="flex flex-col flex-1 space-y-4"
            >
              {activeLayout && (
                <Card className="flex flex-col flex-1">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {selectedLayout
                            ? selectedLayout.name
                            : activeLayout.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedLayout &&
                          selectedLayout.id !== activeLayout.id
                            ? "Preview Mode"
                            : "Active Process Flow"}
                          {isManageMode && " - Edit Mode"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {isManageMode && (
                          <div className="flex gap-1 bg-muted rounded-lg p-1">
                            <Button
                              onClick={() => setCreationMode('datapoint')}
                              variant={creationMode === 'datapoint' ? "default" : "ghost"}
                              size="sm"
                              className="h-8 px-3"
                            >
                              <PlusCircle className="w-4 h-4 mr-1" />
                              Data Point
                            </Button>
                            <Button
                              onClick={() => setCreationMode('flowindicator')}
                              variant={creationMode === 'flowindicator' ? "default" : "ghost"}
                              size="sm"
                              className="h-8 px-3"
                            >
                              <Navigation className="w-4 h-4 mr-1" />
                              Flow Arrow
                            </Button>
                          </div>
                        )}
                        <Button
                          onClick={() => setIsManageMode(!isManageMode)}
                          variant={isManageMode ? "default" : "outline"}
                          size="sm"
                        >
                          {isManageMode ? (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Done
                            </>
                          ) : (
                            <>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </>
                          )}
                        </Button>
                        {selectedLayout &&
                          selectedLayout.id !== activeLayout.id && (
                            <Button
                              onClick={() => setSelectedLayout(activeLayout)}
                              variant="outline"
                              size="sm"
                            >
                              Back to Active Layout
                            </Button>
                          )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex">
                    <Layout2DCanvas
                      layoutId={selectedLayout?.id || activeLayout.id}
                      backgroundImage={
                        selectedLayout?.image || activeLayout.image
                      }
                      className="w-full flex-1"
                      isManageMode={isManageMode}
                      onAddDataPoint={handleAddDataPoint}
                      onEditDataPoint={handleEditDataPoint}
                      onDeleteDataPoint={handleDeleteDataPoint}
                      onAddFlowIndicator={handleAddFlowIndicator}
                      onEditFlowIndicator={handleEditFlowIndicator}
                      onDeleteFlowIndicator={handleDeleteFlowIndicator}
                      refreshTrigger={selectedLayout?.updatedAt || activeLayout.updatedAt}
                    />
                  </CardContent>
                </Card>
              )}

              {!activeLayout && selectedLayout && (
                <Card className="flex flex-col flex-1">
                  <CardHeader>
                    <CardTitle className="text-xl">
                      {selectedLayout.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Preview Mode - This process flow is not currently active
                    </p>
                  </CardHeader>
                  <CardContent className="flex-1 p-0">
                    <Layout2DCanvas
                      layoutId={selectedLayout.id}
                      backgroundImage={selectedLayout.image}
                      className="w-full h-full"
                      isManageMode={isManageMode}
                      onAddDataPoint={handleAddDataPoint}
                      onEditDataPoint={handleEditDataPoint}
                      onDeleteDataPoint={handleDeleteDataPoint}
                      onAddFlowIndicator={handleAddFlowIndicator}
                      onEditFlowIndicator={handleEditFlowIndicator}
                      onDeleteFlowIndicator={handleDeleteFlowIndicator}
                      refreshTrigger={selectedLayout.updatedAt}
                    />
                  </CardContent>
                </Card>
              )}

              {!activeLayout && !selectedLayout && (
                <Card className="flex flex-col flex-1">
                  <CardContent className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-lg mx-auto px-6 py-12">
                      {/* Icon with background */}
                      <div className="relative mb-8">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900 dark:to-orange-800 rounded-2xl flex items-center justify-center border border-orange-200 dark:border-orange-700 mb-4">
                          <LayoutGrid className="h-10 w-10 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
                      </div>

                      {/* Title */}
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                        No Active Process Flow
                      </h2>

                      {/* Description */}
                      <p className="text-muted-foreground mb-8 leading-relaxed">
                        You have created process flows, but none are currently active.
                        Select a layout from the management tab to start monitoring.
                      </p>

                      {/* Action Button */}
                      <Button
                        onClick={() => setActiveTab("manage")}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                        size="lg"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Select Layout
                      </Button>

                      {/* Helper text */}
                      <p className="text-sm text-muted-foreground mt-4">
                        💡 Tip: You can view any layout from the selection tab
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="manage">
              <Layout2DList
                layouts={layouts}
                onLayoutsChange={handleLayoutsChange}
                onLayoutSelect={handleLayoutSelect}
                onSetActive={handleSetActiveLayout}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Data Point Config Modal */}
        <DataPointConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleSaveDataPoint}
          initialConfig={editingDataPoint}
          position={configModalPosition}
        />

        {/* Flow Indicator Config Modal */}
        <FlowIndicatorConfigModal
          isOpen={isFlowIndicatorModalOpen}
          onClose={() => setIsFlowIndicatorModalOpen(false)}
          onSave={handleSaveFlowIndicator}
          initialConfig={editingFlowIndicator}
          position={flowIndicatorModalPosition}
        />
      </div>
    </main>
  );
}