// File: components/widgets/CctvMonitorVideos/CctvMonitorVideosWidget.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Video, 
  Play, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  HardDrive,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface CctvVideo {
  filename: string;
  time: string;
  size: number;
  href: string;
  status: number; // 1 = unread, 0 = read
  links: {
    deleteVideo: string;
    changeToUnread: string;
    changeToRead: string;
  };
}

interface MonitorData {
  name: string;
  mid: string;
  status: string;
  streams: string[];
}

interface Props {
  config: {
    widgetTitle: string;
    cctvId: string;
    monitorId: string;
    maxVideos?: number;
    autoRefresh?: boolean;
    refreshInterval?: number;
  };
}

export const CctvMonitorVideosWidget = ({ config }: Props) => {
  const [videos, setVideos] = useState<CctvVideo[]>([]);
  const [monitorInfo, setMonitorInfo] = useState<MonitorData | null>(null);
  const [cameraInfo, setCameraInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchMonitorVideos = useCallback(async () => {
    if (!config.cctvId || !config.monitorId) {
      setError("Camera or Monitor not configured");
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      // 1. Fetch monitor info using new API
      const monitorsResponse = await fetch(`/api/cctv/${config.cctvId}/monitors`);
      if (!monitorsResponse.ok) {
        throw new Error("Failed to fetch monitor data");
      }
      const monitorsData = await monitorsResponse.json();
      
      if (!monitorsData.success) {
        throw new Error(monitorsData.message || "Failed to fetch monitors");
      }
      
      setCameraInfo(monitorsData.camera);
      
      const currentMonitor = monitorsData.monitors.find((m: any) => m.mid === config.monitorId);
      if (!currentMonitor) {
        throw new Error("Monitor not found");
      }
      setMonitorInfo(currentMonitor);

      // 2. Fetch videos using new API
      const videosResponse = await fetch(`/api/cctv/${config.cctvId}/videos?monitorId=${config.monitorId}`);
      if (!videosResponse.ok) {
        throw new Error("Failed to fetch videos");
      }
      const videosData = await videosResponse.json();
      
      if (!videosData.success) {
        throw new Error(videosData.message || "Failed to fetch videos");
      }
      
      // Limit videos if maxVideos is set
      const videoList = videosData.videos || [];
      const limitedVideos = config.maxVideos 
        ? videoList.slice(0, config.maxVideos)
        : videoList;
      
      setVideos(limitedVideos);
      setLastRefresh(new Date());
      
    } catch (err: any) {
      console.error("Error fetching monitor videos:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [config.cctvId, config.monitorId, config.maxVideos]);

  // Auto refresh functionality
  useEffect(() => {
    fetchMonitorVideos();

    if (config.autoRefresh && config.refreshInterval) {
      const interval = setInterval(fetchMonitorVideos, config.refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [fetchMonitorVideos, config.autoRefresh, config.refreshInterval]);

  const handleVideoAction = async (video: CctvVideo, action: 'play' | 'status' | 'delete') => {
    if (!cameraInfo) return;

    try {
      switch (action) {
        case 'play':
          const playUrl = `http://${cameraInfo.ipAddress}:${cameraInfo.port}${video.href}`;
          window.open(playUrl, '_blank');
          break;

        case 'status':
          const statusUrl = video.status === 1 
            ? `http://${cameraInfo.ipAddress}:${cameraInfo.port}${video.links.changeToRead}`
            : `http://${cameraInfo.ipAddress}:${cameraInfo.port}${video.links.changeToUnread}`;
          
          await fetch(statusUrl);
          toast.success("Video status updated");
          fetchMonitorVideos(); // Refresh to show updated status
          break;

        case 'delete':
          if (confirm("Are you sure you want to delete this video?")) {
            const deleteUrl = `http://${cameraInfo.ipAddress}:${cameraInfo.port}${video.links.deleteVideo}`;
            await fetch(deleteUrl);
            toast.success("Video deleted");
            fetchMonitorVideos(); // Refresh list
          }
          break;
      }
    } catch (err: any) {
      toast.error(`Failed to ${action} video: ${err.message}`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (timeStr: string): string => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleString();
    } catch {
      return timeStr;
    }
  };

  const unreadCount = videos.filter(v => v.status === 1).length;
  const totalSize = videos.reduce((sum, v) => sum + v.size, 0);

  if (isLoading && videos.length === 0) {
    return (
      <div className="w-full h-full flex flex-col bg-white rounded-lg border border-gray-200">
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-gray-900 text-sm font-semibold truncate">
            {config.widgetTitle}
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col bg-white rounded-lg border border-gray-200">
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-gray-900 text-sm font-semibold truncate">
            {config.widgetTitle}
          </h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
          <p className="text-red-600 text-xs">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchMonitorVideos}
            className="mt-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-gray-900 text-sm font-semibold truncate">
            {config.widgetTitle}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchMonitorVideos}
            disabled={isLoading}
            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Monitor Info */}
        {monitorInfo && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <Badge variant="secondary" className="text-xs">
              {monitorInfo.name}
            </Badge>
            <Badge 
              variant={monitorInfo.status === 'recording' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {monitorInfo.status}
            </Badge>
          </div>
        )}

        {/* Stats */}
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <Video className="h-3 w-3" />
            <span>{videos.length} videos</span>
          </div>
          {unreadCount > 0 && (
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{unreadCount} new</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            <span>{formatFileSize(totalSize)}</span>
          </div>
        </div>
      </div>

      {/* Videos List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {videos.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-xs">
              No videos found
            </div>
          ) : (
            videos.map((video, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-md p-2 hover:bg-gray-100 transition-colors border border-gray-100"
              >
                {/* Video info */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-xs font-medium truncate">
                      {video.filename}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(video.time)}</span>
                      <Separator orientation="vertical" className="h-3" />
                      <span>{formatFileSize(video.size)}</span>
                    </div>
                  </div>
                  <Badge 
                    variant={video.status === 1 ? "default" : "secondary"}
                    className="text-xs ml-2"
                  >
                    {video.status === 1 ? "New" : "Read"}
                  </Badge>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVideoAction(video, 'play')}
                    className="h-6 px-2 text-xs"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Play
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVideoAction(video, 'status')}
                    className="h-6 px-2 text-xs"
                  >
                    {video.status === 1 ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVideoAction(video, 'delete')}
                    className="h-6 px-2 text-xs text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};