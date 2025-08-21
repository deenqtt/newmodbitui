// File: components/widgets/CctvLiveStream/CctvLiveStreamConfigModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Camera, Video, Play, Settings, Eye } from "lucide-react";
import Swal from "sweetalert2";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface CctvCamera {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  apiKey?: string;
  group?: string;
}

interface MonitorData {
  name: string;
  mid: string;
  status: string;
  streams: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
}

export const CctvLiveStreamConfigModal = ({
  isOpen,
  onClose,
  onSave,
}: Props) => {
  const [cameras, setCameras] = useState<CctvCamera[]>([]);
  const [monitors, setMonitors] = useState<MonitorData[]>([]);
  const [isLoadingCameras, setIsLoadingCameras] = useState(false);
  const [isLoadingMonitors, setIsLoadingMonitors] = useState(false);

  // Form state
  const [widgetTitle, setWidgetTitle] = useState("");
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [selectedMonitorId, setSelectedMonitorId] = useState<string>("");
  const [autoPlay, setAutoPlay] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('medium');

  // Fetch cameras on modal open
  useEffect(() => {
    if (isOpen) {
      fetchCameras();
      resetForm();
    }
  }, [isOpen]);

  // Fetch monitors when camera is selected
  useEffect(() => {
    if (selectedCameraId) {
      fetchMonitors(selectedCameraId);
    } else {
      setMonitors([]);
      setSelectedMonitorId("");
    }
  }, [selectedCameraId]);

  const resetForm = () => {
    setWidgetTitle("");
    setSelectedCameraId("");
    setSelectedMonitorId("");
    setAutoPlay(false);
    setShowControls(true);
    setQuality('medium');
    setMonitors([]);
  };

  const fetchCameras = async () => {
    setIsLoadingCameras(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/cctv`);
      if (!response.ok) {
        throw new Error("Failed to fetch cameras");
      }
      const camerasData = await response.json();
      // Filter cameras that have apiKey and group (required for streaming)
      const validCameras = camerasData.filter((cam: CctvCamera) => 
        cam.apiKey && cam.group
      );
      setCameras(validCameras);
      
      if (validCameras.length === 0) {
        Swal.fire({
          icon: "warning",
          title: "No Compatible Cameras",
          text: "No cameras found with API Key and Group configured. Please configure at least one camera with Shinobi NVR settings for live streaming.",
        });
      }
    } catch (error: any) {
      Swal.fire("Error", error.message, "error");
    } finally {
      setIsLoadingCameras(false);
    }
  };

  const fetchMonitors = async (cameraId: string) => {
    setIsLoadingMonitors(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/cctv/${cameraId}/monitors`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch monitors: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch monitors");
      }
      
      // Filter monitors that have streams available
      const monitorsWithStreams = data.monitors.filter((m: MonitorData) => 
        m.streams && m.streams.length > 0
      );
      
      setMonitors(monitorsWithStreams);
      
      if (monitorsWithStreams.length === 0) {
        Swal.fire({
          icon: "info",
          title: "No Streaming Monitors",
          text: "No monitors with available streams found for this camera.",
        });
      }
      
    } catch (error: any) {
      console.error("Error fetching monitors:", error);
      setMonitors([]);
      Swal.fire({
        icon: "error",
        title: "Monitor Fetch Failed",
        text: `Unable to fetch monitors: ${error.message}`,
      });
    } finally {
      setIsLoadingMonitors(false);
    }
  };

  const handleSave = () => {
    // Validation
    if (!widgetTitle.trim()) {
      Swal.fire("Validation Error", "Widget title is required", "warning");
      return;
    }
    
    if (!selectedCameraId) {
      Swal.fire("Validation Error", "Please select a camera", "warning");
      return;
    }
    
    if (!selectedMonitorId) {
      Swal.fire("Validation Error", "Please select a monitor", "warning");
      return;
    }

    const config = {
      widgetTitle: widgetTitle.trim(),
      cctvId: selectedCameraId,
      monitorId: selectedMonitorId,
      autoPlay,
      showControls,
      quality,
    };

    onSave(config);
  };

  const selectedCamera = cameras.find(c => c.id === selectedCameraId);
  const selectedMonitor = monitors.find(m => m.mid === selectedMonitorId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Play className="h-5 w-5" />
            Configure CCTV Live Stream Widget
          </DialogTitle>
          <DialogDescription>
            Display live video stream from a CCTV monitor using HLS streaming.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 p-6">
          {/* Widget Title */}
          <div className="grid gap-2">
            <Label htmlFor="widgetTitle">Widget Title</Label>
            <Input
              id="widgetTitle"
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
              placeholder="e.g., Main Entrance Live"
            />
          </div>

          {/* Camera Selection */}
          <div className="grid gap-2">
            <Label htmlFor="camera">Camera (with Streaming Support)</Label>
            {isLoadingCameras ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                onValueChange={setSelectedCameraId}
                value={selectedCameraId}
              >
                <SelectTrigger id="camera">
                  <SelectValue placeholder="Select a camera with streaming configuration" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((camera) => (
                    <SelectItem key={camera.id} value={camera.id}>
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        <span>{camera.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {camera.ipAddress}:{camera.port}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {cameras.length === 0 && !isLoadingCameras && (
              <p className="text-xs text-muted-foreground">
                No cameras with streaming API configuration found. Configure camera with Shinobi NVR settings first.
              </p>
            )}
          </div>

          {/* Monitor Selection */}
          <div className="grid gap-2">
            <Label htmlFor="monitor">Monitor (with Stream)</Label>
            {isLoadingMonitors ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                onValueChange={setSelectedMonitorId}
                value={selectedMonitorId}
                disabled={!selectedCameraId || monitors.length === 0}
              >
                <SelectTrigger id="monitor">
                  <SelectValue placeholder={
                    !selectedCameraId 
                      ? "Select a camera first" 
                      : monitors.length === 0 
                        ? "No streaming monitors found" 
                        : "Select a monitor"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {monitors.map((monitor) => (
                    <SelectItem key={monitor.mid} value={monitor.mid}>
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        <span>{monitor.name}</span>
                        <Badge 
                          variant={monitor.status === 'recording' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {monitor.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {monitor.streams.length} stream{monitor.streams.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected Monitor Info */}
          {selectedCamera && selectedMonitor && (
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-2">Selected Stream</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>Camera: {selectedCamera.name}</div>
                <div>Monitor: {selectedMonitor.name} (ID: {selectedMonitor.mid})</div>
                <div>Status: {selectedMonitor.status}</div>
                <div>Available Streams: {selectedMonitor.streams.length}</div>
                <div className="text-green-600 font-medium">✓ Ready for live streaming</div>
              </div>
            </div>
          )}

          <Separator />

          {/* Stream Options */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Stream Settings</h4>
            
            {/* Auto Play */}
            <div className="flex items-center space-x-2">
              <Switch
                id="autoPlay"
                checked={autoPlay}
                onCheckedChange={setAutoPlay}
              />
              <Label htmlFor="autoPlay">Auto-play stream when loaded</Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Note: Auto-play may be blocked by browser policies
            </p>

            {/* Show Controls */}
            <div className="flex items-center space-x-2">
              <Switch
                id="showControls"
                checked={showControls}
                onCheckedChange={setShowControls}
              />
              <Label htmlFor="showControls">Show video controls on hover</Label>
            </div>

            {/* Quality Setting */}
            <div className="grid gap-2">
              <Label htmlFor="quality">Stream Quality</Label>
              <Select
                value={quality}
                onValueChange={(value: 'high' | 'medium' | 'low') => setQuality(value)}
              >
                <SelectTrigger id="quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>High Quality</span>
                      <Badge variant="outline" className="text-xs">Best</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>Medium Quality</span>
                      <Badge variant="outline" className="text-xs">Balanced</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>Low Quality</span>
                      <Badge variant="outline" className="text-xs">Fast</Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Higher quality requires more bandwidth and processing power
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSave}
            disabled={!selectedCameraId || !selectedMonitorId}
          >
            <Video className="h-4 w-4 mr-2" />
            Create Live Stream
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};