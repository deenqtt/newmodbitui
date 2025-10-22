// File: components/widgets/CctvLiveStream/CctvLiveStreamWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  VolumeX,
  Volume2,
  Circle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Video,
  VideoOff,
  Maximize,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Hls from "hls.js";

interface MonitorData {
  name: string;
  mid: string;
  status: string;
  streams: string[];
  host?: string;
  port?: number;
  protocol?: string;
  width?: number;
  height?: number;
  fps?: number;
  type?: string;
  mode?: string;
  currentlyWatching?: number;
}

interface Props {
  config: {
    widgetTitle: string;
    cctvId: string;
    monitorId: string;
    autoPlay?: boolean;
    showControls?: boolean;
    quality?: "high" | "medium" | "low";
  };
}

export const CctvLiveStreamWidget = ({ config }: Props) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [monitorInfo, setMonitorInfo] = useState<MonitorData | null>(null);
  const [cameraInfo, setCameraInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "error" | "disconnected"
  >("connecting");
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  const fetchMonitorData = useCallback(async () => {
    if (!config.cctvId || !config.monitorId) {
      setError("Camera or Monitor not configured");
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setConnectionStatus("connecting");

      // Fetch stream URL using new API
      const streamResponse = await fetch(
        `/api/cctv/${config.cctvId}/stream-url?monitorId=${config.monitorId}`
      );
      if (!streamResponse.ok) {
        throw new Error("Failed to fetch stream data");
      }
      const streamData = await streamResponse.json();

      if (!streamData.success) {
        throw new Error(streamData.message || "Failed to get stream URL");
      }

      setCameraInfo(streamData.camera);
      setMonitorInfo(streamData.monitor);

      // Set stream URL from API response
      if (streamData.primaryStream && streamData.primaryStream.url) {
        setStreamUrl(streamData.primaryStream.url);
      } else {
        throw new Error("No streams available for this monitor");
      }
    } catch (err: any) {
      console.error("Error fetching stream data:", err);
      setError(err.message);
      setConnectionStatus("error");
    } finally {
      setIsLoading(false);
    }
  }, [config.cctvId, config.monitorId]);

  const initializeStream = useCallback(() => {
    if (!streamUrl || !videoRef.current) return;

    // Clean up existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("HLS manifest parsed, stream ready");
        setConnectionStatus("connected");

        if (config.autoPlay) {
          video
            .play()
            .then(() => setIsPlaying(true))
            .catch((e) => {
              console.error("Auto-play failed:", e);
              toast.error("Auto-play blocked by browser. Click play to start.");
            });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS Error:", data);
        if (data.fatal) {
          setConnectionStatus("error");
          setError(`Stream error: ${data.details}`);
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari)
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => {
        setConnectionStatus("connected");
        if (config.autoPlay) {
          video
            .play()
            .then(() => setIsPlaying(true))
            .catch((e) => console.error("Auto-play failed:", e));
        }
      });

      video.addEventListener("error", () => {
        setConnectionStatus("error");
        setError("Failed to load stream");
      });
    } else {
      setError("HLS streaming not supported in this browser");
      setConnectionStatus("error");
    }
  }, [streamUrl, config.autoPlay]);

  useEffect(() => {
    fetchMonitorData();
  }, [fetchMonitorData]);

  useEffect(() => {
    if (streamUrl && !isLoading) {
      initializeStream();
    }

    // Cleanup on unmount
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, isLoading, initializeStream]);

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          console.error("Play failed:", e);
          toast.error("Failed to play stream");
        });
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;

    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;

    if (!isFullscreen) {
      videoRef.current
        .requestFullscreen?.()
        .then(() => setIsFullscreen(true))
        .catch(() => toast.error("Fullscreen not supported"));
    } else {
      document
        .exitFullscreen?.()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  const retryConnection = () => {
    setError(null);
    setConnectionStatus("connecting");
    initializeStream();
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col bg-white rounded-lg border border-gray-200">
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-gray-900 text-sm font-semibold truncate">
            {config.widgetTitle}
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Loading stream...</p>
          </div>
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
          <AlertTriangle className="h-12 w-12 text-red-500 mb-2" />
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <Button onClick={retryConnection} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Connection
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

          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <Badge
              variant={
                connectionStatus === "connected"
                  ? "default"
                  : connectionStatus === "error"
                  ? "destructive"
                  : "secondary"
              }
              className="text-xs"
            >
              {connectionStatus === "connected" && (
                <Circle className="h-2 w-2 fill-current mr-1 animate-pulse" />
              )}
              {connectionStatus === "connecting"
                ? "Connecting"
                : connectionStatus === "connected"
                ? "LIVE"
                : connectionStatus === "error"
                ? "Error"
                : "Disconnected"}
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={fetchMonitorData}
              className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Monitor Info */}
        {monitorInfo && (
          <div className="mt-2">
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {monitorInfo.name}
              </Badge>
              <Badge
                variant={
                  monitorInfo.status === "Watching" ? "default" : "secondary"
                }
                className="text-xs"
              >
                {monitorInfo.status}
              </Badge>
              {monitorInfo.width && monitorInfo.height && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                  {monitorInfo.width}x{monitorInfo.height}
                </span>
              )}
              {monitorInfo.fps && (
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                  {monitorInfo.fps} FPS
                </span>
              )}
              {monitorInfo.type && (
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs uppercase">
                  {monitorInfo.type}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Video Container */}
      <div className="flex-1 relative bg-black">
        {streamUrl ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              muted={isMuted}
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => {
                setConnectionStatus("error");
                setError("Video playback error");
              }}
            />

            {/* Video Controls Overlay */}
            {config.showControls && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 bg-black/20">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={togglePlay}
                    size="sm"
                    variant="secondary"
                    className="bg-black/70 hover:bg-black/90 border-0 text-white"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    onClick={toggleMute}
                    size="sm"
                    variant="secondary"
                    className="bg-black/70 hover:bg-black/90 border-0 text-white"
                  >
                    {isMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    onClick={toggleFullscreen}
                    size="sm"
                    variant="secondary"
                    className="bg-black/70 hover:bg-black/90 border-0 text-white"
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Live Indicator */}
            {connectionStatus === "connected" && isPlaying && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-red-600 hover:bg-red-600 text-white text-xs animate-pulse">
                  <Circle className="h-2 w-2 fill-white mr-1" />
                  LIVE
                </Badge>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
            <VideoOff className="h-16 w-16 mb-4" />
            <p className="text-sm">No stream available</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 bg-gray-50 border-t border-gray-200 space-y-1">
        {/* Source Info */}
        {monitorInfo?.host && (
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="font-mono">
              {monitorInfo.protocol?.toUpperCase() || "RTSP"}://
              {monitorInfo.host}:{monitorInfo.port}
            </span>
            <span className="text-blue-600 font-medium">
              {streamUrl ? "HLS Stream" : "No Stream"}
            </span>
          </div>
        )}

        {/* Status Info */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span>Monitor: {monitorInfo?.mid || "Unknown"}</span>
            {monitorInfo?.mode && (
              <>
                <span>•</span>
                <span className="capitalize">{monitorInfo.mode}</span>
              </>
            )}
          </div>
          <span
            className={
              connectionStatus === "connected"
                ? "text-green-600 font-medium"
                : "text-red-500"
            }
          >
            {connectionStatus === "connected" ? "● LIVE" : "● OFFLINE"}
          </span>
        </div>
      </div>
    </div>
  );
};
