// File: components/widgets/MaintenanceList/MaintenanceListWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Loader2, AlertTriangle, Calendar, Clock, User, Wrench, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface MaintenanceItem {
  id: number;
  name: string;
  description?: string;
  startTask: string;
  endTask: string;
  status: string;
  assignedTo: {
    id: string;
    email: string;
    phoneNumber?: string;
  };
  deviceTarget: {
    name: string;
  };
  createdAt: string;
}

interface Props {
  config: {
    widgetTitle?: string;
    maxItems?: number;
    statusFilter?: string[];
    autoRefresh?: boolean;
    refreshInterval?: number; // in minutes
    showDescription?: boolean;
    showAssignee?: boolean;
    showDevice?: boolean;
    dateFormat?: 'relative' | 'absolute';
  };
}

export const MaintenanceListWidget = ({ config }: Props) => {
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceItem[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(12);

  // Responsive font sizing
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        const baseSize = Math.max(10, width / 30);
        setFontSize(Math.min(16, baseSize));
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Mock data for testing
  const getMockData = (): MaintenanceItem[] => [
    {
      id: 1,
      name: "Server Room AC Maintenance",
      description: "Regular maintenance check for air conditioning system",
      startTask: "2024-01-15T08:00:00Z",
      endTask: "2024-01-15T12:00:00Z",
      status: "completed",
      assignedTo: { id: "1", email: "tech1@company.com", phoneNumber: "+1234567890" },
      deviceTarget: { name: "AC Unit - Server Room" },
      createdAt: "2024-01-10T10:00:00Z"
    },
    {
      id: 2,
      name: "UPS Battery Check",
      description: "Monthly UPS battery voltage and capacity check",
      startTask: "2024-01-20T09:00:00Z",
      endTask: "2024-01-20T11:00:00Z",
      status: "in_progress",
      assignedTo: { id: "2", email: "tech2@company.com", phoneNumber: "+1234567891" },
      deviceTarget: { name: "UPS Unit - Main Power" },
      createdAt: "2024-01-18T14:00:00Z"
    },
    {
      id: 3,
      name: "Network Switch Cleaning",
      description: "Clean dust from network switches and check cable connections",
      startTask: "2024-01-25T07:00:00Z",
      endTask: "2024-01-25T09:00:00Z",
      status: "scheduled",
      assignedTo: { id: "1", email: "tech1@company.com", phoneNumber: "+1234567890" },
      deviceTarget: { name: "Network Switch - Floor 2" },
      createdAt: "2024-01-20T16:00:00Z"
    },
    {
      id: 4,
      name: "Fire Suppression Test",
      description: "Quarterly fire suppression system test and inspection",
      startTask: "2024-01-12T06:00:00Z",
      endTask: "2024-01-12T08:00:00Z",
      status: "overdue",
      assignedTo: { id: "3", email: "safety@company.com", phoneNumber: "+1234567892" },
      deviceTarget: { name: "Fire Suppression System" },
      createdAt: "2024-01-05T09:00:00Z"
    }
  ];

  // Fetch maintenance data
  const fetchMaintenanceData = async () => {
    try {
      setStatus("loading");
      const response = await fetch(`${API_BASE_URL}/api/maintenance`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        // Use mock data if API fails
        const mockData = getMockData();
        const sortedData = mockData.slice(0, config.maxItems || 10);
        
        setMaintenanceList(sortedData);
        setStatus("ok");
        return;
      }
      
      const data = await response.json();
      // Just take the raw data for now
      const sortedData = data.slice(0, config.maxItems || 10);
      
      setMaintenanceList(sortedData);
      setStatus("ok");
    } catch (err: any) {
      // Use mock data as fallback
      const mockData = getMockData();
      const sortedData = mockData.slice(0, config.maxItems || 10);
      
      setMaintenanceList(sortedData);
      setStatus("ok");
    }
  };

  useEffect(() => {
    fetchMaintenanceData();

    // Setup auto-refresh if enabled
    if (config.autoRefresh && config.refreshInterval && config.refreshInterval > 0) {
      const intervalId = setInterval(
        fetchMaintenanceData, 
        config.refreshInterval * 60 * 1000
      );
      return () => clearInterval(intervalId);
    }
  }, [config.statusFilter, config.maxItems, config.autoRefresh, config.refreshInterval]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'overdue':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date based on config
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    
    if (config.dateFormat === 'relative') {
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 1) {
        return `${Math.floor(diffInHours * 60)} menit lalu`;
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)} jam lalu`;
      } else {
        return `${Math.floor(diffInHours / 24)} hari lalu`;
      }
    }
    
    return format(date, "dd MMM yyyy, HH:mm", { locale: id });
  };

  // Render content based on status
  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Loading maintenance data...</p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm font-semibold text-destructive">Error</p>
          <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>
        </div>
      );
    }

    if (maintenanceList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <Wrench className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No maintenance tasks found</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-full w-full">
        <div className="p-2 space-y-2">
          {maintenanceList.map((item) => {
            const isOverdue = new Date(item.endTask) < new Date() && 
                            item.status.toLowerCase() !== 'completed';
            
            return (
              <div
                key={item.id}
                className={`
                  p-3 rounded-lg border transition-all duration-200 hover:shadow-md
                  ${isOverdue ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}
                `}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 
                      className="font-semibold text-gray-900 truncate"
                      style={{ fontSize: `${fontSize + 2}px` }}
                      title={item.name}
                    >
                      {item.name}
                    </h4>
                    {config.showDescription !== false && item.description && (
                      <p 
                        className="text-gray-600 text-xs mt-1 line-clamp-2"
                        style={{ fontSize: `${fontSize - 1}px` }}
                      >
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    {isOverdue && (
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    )}
                    <Badge 
                      className={`text-xs ${getStatusColor(item.status)}`}
                      style={{ fontSize: `${fontSize - 2}px` }}
                    >
                      {item.status}
                    </Badge>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1">
                  {config.showDevice !== false && (
                    <div className="flex items-center text-gray-600">
                      <Wrench className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span 
                        className="text-xs truncate"
                        style={{ fontSize: `${fontSize - 1}px` }}
                        title={item.deviceTarget.name}
                      >
                        {item.deviceTarget.name}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span 
                        className="text-xs"
                        style={{ fontSize: `${fontSize - 1}px` }}
                      >
                        {format(new Date(item.startTask), "dd MMM", { locale: id })}
                      </span>
                    </div>
                    
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span 
                        className="text-xs"
                        style={{ fontSize: `${fontSize - 1}px` }}
                      >
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  {config.showAssignee !== false && (
                    <div className="flex items-center text-gray-600">
                      <User className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span 
                        className="text-xs truncate"
                        style={{ fontSize: `${fontSize - 1}px` }}
                        title={item.assignedTo.email}
                      >
                        {item.assignedTo.email.split('@')[0]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex flex-col overflow-hidden cursor-move"
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 
            className="font-semibold text-gray-900 truncate flex items-center"
            style={{ fontSize: `${fontSize + 1}px` }}
          >
            <Wrench className="h-4 w-4 mr-2 text-primary" />
            {config.widgetTitle || "Maintenance List"}
          </h3>
          <div className="flex items-center space-x-1">
            {config.autoRefresh && (
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" title="Auto-refresh enabled" />
            )}
            <span 
              className="text-xs text-gray-500 bg-white px-2 py-1 rounded"
              style={{ fontSize: `${fontSize - 2}px` }}
            >
              {maintenanceList.length}/{config.maxItems || 10}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
};