"use client";

import { useEffect, useState, useRef } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Camera,
  MonitorPlay,
  VideoOff,
  Play,
  Pause,
  VolumeX,
  Volume2,
  Circle,
  Video,
  Download,
  Trash,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cctvService, CctvCamera } from "@/lib/services/cctv-service";
import Hls from "hls.js";

interface FetchedStream {
  name: string;
  mid: string;
  status: string;
  streams: string[];
}

interface FetchedVideo {
  filename: string;
  time: string;
  size: number;
  href: string;
  status: number;
  links: {
    deleteVideo: string;
    changeToUnread: string;
    changeToRead: string;
  };
}

interface MonitorData {
  camera: CctvCamera;
  data: FetchedStream;
  videos?: FetchedVideo[] | null;
}

const LiveStreamPlayer = ({
  streamUrl,
  name,
}: {
  streamUrl: string;
  name: string;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let hls: Hls;

    if (videoRef.current) {
      const video = videoRef.current;
      if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch((e) => console.error("Video playback error:", e));
          setIsPlaying(true);
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamUrl;
        video.addEventListener("loadedmetadata", () => {
          video.play().catch((e) => console.error("Video playback error:", e));
          setIsPlaying(true);
        });
      }
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [streamUrl]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current
          .play()
          .catch((e) => console.error("Video playback error:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted={isMuted}
        playsInline
      />

      <div className="absolute top-3 left-3">
        <Badge className="bg-red-600 hover:bg-red-600 text-white text-xs animate-pulse">
          <Circle className="h-2 w-2 fill-white mr-1" />
          LIVE
        </Badge>
      </div>

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
        </div>
      </div>
    </div>
  );
};

const fetchMonitorData = async (
  camera: CctvCamera
): Promise<MonitorData | null> => {
  if (!camera.apiKey || !camera.group) {
    return null;
  }
  const apiUrl = `http://${camera.ipAddress}:${camera.port}/${camera.apiKey}/monitor/${camera.group}`;
  console.log("Fetching data from URL:", apiUrl);

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch monitor data: ${response.statusText}`);
    }

    const data = await response.json();
    return { camera, data: data[0] };
  } catch (error: any) {
    toast.error(
      `Error loading monitor data for "${camera.name}": ${error.message}`
    );
    console.error(`Error details for ${camera.name}:`, error);
    return null;
  }
};

const fetchVideoData = async (
  monitor: MonitorData
): Promise<FetchedVideo[] | null> => {
  const { ipAddress, port, apiKey, group } = monitor.camera;
  const monitorId = monitor.data.mid;
  if (!apiKey || !group || !monitorId) {
    return null;
  }
  const videoUrl = `http://${ipAddress}:${port}/${apiKey}/videos/${group}/${monitorId}`;
  console.log("Fetching videos from URL:", videoUrl);

  try {
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch video data: ${response.statusText}`);
    }
    const data = await response.json();
    return data.videos || [];
  } catch (error: any) {
    toast.error(
      `Error loading videos for "${monitor.data.name}": ${error.message}`
    );
    console.error(`Error details for videos of ${monitor.data.name}:`, error);
    return null;
  }
};

export default function CctvPage() {
  const [cameras, setCameras] = useState<CctvCamera[]>([]);
  const [loading, setLoading] = useState(true);
  const [monitorData, setMonitorData] = useState<MonitorData[]>([]);
  const [videoData, setVideoData] = useState<MonitorData[]>([]);

  const loadCamerasAndMonitorData = async () => {
    setLoading(true);
    try {
      const result = await cctvService.getCameras();
      if (result.success && result.data) {
        setCameras(result.data);
        const monitorPromises = result.data.map(fetchMonitorData);
        const results = await Promise.all(monitorPromises);
        const validResults = results.filter(
          (res) => res !== null
        ) as MonitorData[];
        setMonitorData(validResults);

        const videoPromises = validResults.map(async (monitor) => {
          const videos = await fetchVideoData(monitor);
          return { ...monitor, videos };
        });
        const videoResults = await Promise.all(videoPromises);
        setVideoData(videoResults);
      } else {
        toast.error(result.message || "Failed to load CCTV cameras");
      }
    } catch (error: any) {
      toast.error(error.message || "Error loading CCTV cameras");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    video: FetchedVideo,
    monitor: MonitorData
  ) => {
    const url =
      video.status === 1
        ? `http://${monitor.camera.ipAddress}:${monitor.camera.port}${video.links.changeToRead}`
        : `http://${monitor.camera.ipAddress}:${monitor.camera.port}${video.links.changeToUnread}`;

    await toast.promise(fetch(url), {
      loading: "Updating video status...",
      success: (res) => {
        if (!res.ok)
          throw new Error(`Failed to change status: ${res.statusText}`);
        // Re-fetch data to update the UI
        loadCamerasAndMonitorData();
        return "Video status updated successfully!";
      },
      error: "Failed to update video status.",
    });
  };

  const handleDeleteVideo = async (
    video: FetchedVideo,
    monitor: MonitorData
  ) => {
    if (window.confirm("Are you sure you want to delete this video?")) {
      const url = `http://${monitor.camera.ipAddress}:${monitor.camera.port}${video.links.deleteVideo}`;
      await toast.promise(fetch(url, { method: "GET" }), {
        // Metode bisa POST/DELETE tergantung API
        loading: "Deleting video...",
        success: (res) => {
          if (!res.ok)
            throw new Error(`Failed to delete video: ${res.statusText}`);
          // Re-fetch data to update the UI
          loadCamerasAndMonitorData();
          return "Video deleted successfully!";
        },
        error: "Failed to delete video.",
      });
    }
  };

  useEffect(() => {
    loadCamerasAndMonitorData();
  }, []);

  if (loading) {
    return (
      <SidebarInset>
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">Loading data...</span>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Camera className="h-5 w-5" />
          <h1 className="text-lg font-semibold">CCTV Data Display</h1>
        </div>
      </header>

      <Tabs defaultValue="cameras" className="w-full mt-4 p-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cameras">Camera Data</TabsTrigger>
          <TabsTrigger value="monitors">Live Monitors</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
        </TabsList>

        <TabsContent value="cameras" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CCTV Camera Data ({cameras.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Resolution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cameras.length > 0 ? (
                    cameras.map((camera: CctvCamera, index: number) => (
                      <TableRow key={camera.id}>
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{camera.name}</div>
                        </TableCell>
                        <TableCell>
                          <a
                            href={`http://${camera.ipAddress}:${camera.port}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {camera.ipAddress}:{camera.port}
                          </a>
                        </TableCell>
                        <TableCell className="w-[80px]">
                          <span className="block w-full truncate">
                            {camera.apiKey || "Not set"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {camera.group || "No Group"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {camera.resolution || "640x480"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-gray-500"
                      >
                        No CCTV cameras found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-2">Monitor List</h3>
                {monitorData.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Monitor Name</TableHead>
                        <TableHead>Camera Name</TableHead>
                        <TableHead>MID</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monitorData.map((monitor, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell>{monitor.data.name}</TableCell>
                          <TableCell>{monitor.camera.name}</TableCell>
                          <TableCell>{monitor.data.mid}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-500 hover:bg-green-500 text-white capitalize">
                              {monitor.data.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-gray-500">
                    No active monitors found.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Monitors ({monitorData.length})</CardTitle>
              <CardDescription>
                Displaying live stream data for cameras with a configured API
                key.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monitorData.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {monitorData.map((monitor, index) => {
                    const hlsStreamUrl = monitor.data.streams[0];
                    const fullUrl = `http://${monitor.camera.ipAddress}:${monitor.camera.port}${hlsStreamUrl}`;

                    return (
                      <div key={index} className="space-y-2">
                        {hlsStreamUrl ? (
                          <LiveStreamPlayer
                            streamUrl={fullUrl}
                            name={monitor.data.name}
                          />
                        ) : (
                          <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden flex flex-col items-center justify-center text-white">
                            <VideoOff className="h-10 w-10 text-gray-400" />
                            <span className="mt-2 text-sm">
                              Stream Not Available
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">
                            {monitor.data.name}
                          </div>
                          <Badge
                            variant="default"
                            className="bg-green-500 hover:bg-green-500 text-white"
                          >
                            {monitor.data.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          Group: {monitor.camera.group}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8">
                  <VideoOff className="h-12 w-12 text-gray-400" />
                  <p className="mt-4 text-center text-gray-500">
                    No active monitors found or failed to load.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Content for Videos */}
        <TabsContent value="videos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recorded Videos</CardTitle>
              <CardDescription>
                Daftar video yang tersedia untuk setiap monitor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {videoData.length > 0 ? (
                videoData.map(
                  (monitor, monitorIndex) =>
                    monitor.videos &&
                    monitor.videos.length > 0 && (
                      <div key={monitorIndex} className="mb-8">
                        <h4 className="text-md font-semibold mb-2">
                          Videos from {monitor.data.name} (
                          {monitor.videos.length})
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>File Name</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead>Size</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {monitor.videos.map((video, videoIndex) => (
                              <TableRow key={videoIndex}>
                                <TableCell className="font-medium">
                                  {video.filename}
                                </TableCell>
                                <TableCell>{video.time}</TableCell>
                                <TableCell>
                                  {(video.size / 1024 / 1024).toFixed(2)} MB
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      video.status === 1
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {video.status === 1 ? "Unread" : "Read"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <a
                                    href={`http://${monitor.camera.ipAddress}:${monitor.camera.port}${video.href}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mr-2"
                                  >
                                    <Button variant="outline" size="icon">
                                      <Play className="h-4 w-4" />
                                    </Button>
                                  </a>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="mr-2"
                                    onClick={() =>
                                      handleStatusChange(video, monitor)
                                    }
                                  >
                                    {video.status === 1 ? (
                                      <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                      <Video className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() =>
                                      handleDeleteVideo(video, monitor)
                                    }
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )
                )
              ) : (
                <div className="flex flex-col items-center justify-center p-8">
                  <VideoOff className="h-12 w-12 text-gray-400" />
                  <p className="mt-4 text-center text-gray-500">
                    No videos found or failed to load.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </SidebarInset>
  );
}
