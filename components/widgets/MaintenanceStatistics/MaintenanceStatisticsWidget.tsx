// File: components/widgets/MaintenanceStatistics/MaintenanceStatisticsWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { format, subDays, subMonths, subYears } from "date-fns";
import { id } from "date-fns/locale";
import { Loader2, AlertTriangle, BarChart, TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface MaintenanceItem {
  id: number;
  name: string;
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

interface StatisticsData {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  scheduledTasks: number;
  overdueTasks: number;
  completionRate: number;
  averageDuration: number;
  tasksThisMonth: number;
  tasksLastMonth: number;
}

interface Props {
  config: {
    widgetTitle?: string;
    timeRange?: '7d' | '30d' | '90d' | '1y';
    showPercentages?: boolean;
    includeOverdue?: boolean;
    chartType?: 'bar' | 'pie' | 'line';
  };
}

export const MaintenanceStatisticsWidget = ({ config }: Props) => {
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceItem[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(10);

  // Responsive font sizing
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        const baseSize = Math.max(8, width / 35);
        setFontSize(Math.min(14, baseSize));
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate statistics from maintenance data
  const calculateStatistics = (data: MaintenanceItem[]) => {
    const now = new Date();
    let cutoffDate = now;

    // Determine time range cutoff
    switch (config.timeRange) {
      case '7d':
        cutoffDate = subDays(now, 7);
        break;
      case '30d':
        cutoffDate = subDays(now, 30);
        break;
      case '90d':
        cutoffDate = subDays(now, 90);
        break;
      case '1y':
        cutoffDate = subYears(now, 1);
        break;
      default:
        cutoffDate = subDays(now, 30);
    }

    // Filter data by time range
    const filteredData = data.filter(item => {
      const createdDate = new Date(item.createdAt);
      return createdDate >= cutoffDate;
    });

    const totalTasks = filteredData.length;
    const completedTasks = filteredData.filter(item => 
      item.status.toLowerCase() === 'completed'
    ).length;
    const inProgressTasks = filteredData.filter(item => {
      const status = item.status.toLowerCase();
      return status === 'in_progress' || status === 'in progress' || status === 'outs';
    }).length;
    const scheduledTasks = filteredData.filter(item => 
      item.status.toLowerCase() === 'scheduled'
    ).length;
    const overdueTasks = filteredData.filter(item => 
      new Date(item.endTask) < now && item.status.toLowerCase() !== 'completed'
    ).length;

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate average duration for completed tasks
    const completedTasksWithDuration = filteredData
      .filter(item => item.status.toLowerCase() === 'completed')
      .map(item => {
        const start = new Date(item.startTask);
        const end = new Date(item.endTask);
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24); // days
      });

    const averageDuration = completedTasksWithDuration.length > 0
      ? completedTasksWithDuration.reduce((a, b) => a + b, 0) / completedTasksWithDuration.length
      : 0;

    // Tasks this month vs last month
    const thisMonthStart = subMonths(now, 0);
    const lastMonthStart = subMonths(now, 1);
    
    const tasksThisMonth = data.filter(item => 
      new Date(item.createdAt) >= thisMonthStart
    ).length;
    const tasksLastMonth = data.filter(item => {
      const created = new Date(item.createdAt);
      return created >= lastMonthStart && created < thisMonthStart;
    }).length;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      scheduledTasks,
      overdueTasks,
      completionRate,
      averageDuration,
      tasksThisMonth,
      tasksLastMonth,
    };
  };

  // Mock data for testing
  const getMockData = (): MaintenanceItem[] => [
    {
      id: 1,
      name: "Server Room AC Maintenance",
      startTask: "2024-12-15T08:00:00Z",
      endTask: "2024-12-15T12:00:00Z",
      status: "completed",
      assignedTo: { id: "1", email: "tech1@company.com", phoneNumber: "+1234567890" },
      deviceTarget: { name: "AC Unit - Server Room" },
      createdAt: "2024-12-10T10:00:00Z"
    },
    {
      id: 2,
      name: "UPS Battery Check",
      startTask: "2025-01-20T09:00:00Z",
      endTask: "2025-01-22T11:00:00Z",
      status: "in_progress",
      assignedTo: { id: "2", email: "tech2@company.com", phoneNumber: "+1234567891" },
      deviceTarget: { name: "UPS Unit - Main Power" },
      createdAt: "2025-01-18T14:00:00Z"
    },
    {
      id: 3,
      name: "Network Switch Cleaning",
      startTask: "2025-01-25T07:00:00Z",
      endTask: "2025-01-25T09:00:00Z",
      status: "scheduled",
      assignedTo: { id: "1", email: "tech1@company.com", phoneNumber: "+1234567890" },
      deviceTarget: { name: "Network Switch - Floor 2" },
      createdAt: "2025-01-20T16:00:00Z"
    },
    {
      id: 4,
      name: "Fire Suppression Test",
      startTask: "2025-01-12T06:00:00Z",
      endTask: "2025-01-12T08:00:00Z",
      status: "overdue",
      assignedTo: { id: "3", email: "safety@company.com", phoneNumber: "+1234567892" },
      deviceTarget: { name: "Fire Suppression System" },
      createdAt: "2025-01-05T09:00:00Z"
    },
    {
      id: 5,
      name: "Generator Test",
      startTask: "2024-11-20T08:00:00Z",
      endTask: "2024-11-20T10:00:00Z",
      status: "completed",
      assignedTo: { id: "4", email: "tech3@company.com", phoneNumber: "+1234567893" },
      deviceTarget: { name: "Backup Generator" },
      createdAt: "2024-11-15T12:00:00Z"
    }
  ];

  // Fetch maintenance data
  const fetchMaintenanceData = async () => {
    try {
      setStatus("loading");
      console.log(`[MaintenanceStatistics] Fetching from: ${API_BASE_URL}/api/maintenance`);
      
      const response = await fetch(`${API_BASE_URL}/api/maintenance`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`[MaintenanceStatistics] Response status: ${response.status}`);
      
      if (!response.ok) {
        // Use mock data if API fails
        console.warn(`[MaintenanceStatistics] API failed with ${response.status}, using mock data`);
        const mockData = getMockData();
        setMaintenanceList(mockData);
        
        // Calculate statistics
        const stats = calculateStatistics(mockData);
        setStatistics(stats);
        
        setStatus("ok");
        return;
      }
      
      const data = await response.json();
      setMaintenanceList(data);
      
      // Calculate statistics
      const stats = calculateStatistics(data);
      setStatistics(stats);
      
      setStatus("ok");
    } catch (err: any) {
      
      // Use mock data as fallback
      const mockData = getMockData();
      setMaintenanceList(mockData);
      
      // Calculate statistics
      const stats = calculateStatistics(mockData);
      setStatistics(stats);
      
      setStatus("ok");
    }
  };

  useEffect(() => {
    fetchMaintenanceData();
  }, [config.timeRange]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'in_progress':
        return 'text-yellow-600';
      case 'scheduled':
        return 'text-blue-600';
      case 'overdue':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return config.showPercentages ? `${value.toFixed(1)}%` : value.toFixed(1);
  };

  // Render statistics cards
  const renderStatistics = () => {
    if (!statistics) return null;

    const monthTrend = statistics.tasksThisMonth - statistics.tasksLastMonth;
    const isUpward = monthTrend > 0;

    return (
      <div className="grid grid-cols-2 gap-2 p-2">
        {/* Completion Rate */}
        <div className="bg-white rounded-lg border p-2">
          <div className="flex items-center justify-between mb-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span 
              className="text-lg font-bold text-green-600"
              style={{ fontSize: `${fontSize + 2}px` }}
            >
              {formatPercentage(statistics.completionRate)}
            </span>
          </div>
          <p 
            className="text-xs text-gray-600"
            style={{ fontSize: `${fontSize - 1}px` }}
          >
            Completion Rate
          </p>
          <p 
            className="text-xs text-gray-500"
            style={{ fontSize: `${fontSize - 2}px` }}
          >
            {statistics.completedTasks}/{statistics.totalTasks} tasks
          </p>
        </div>

        {/* Average Duration */}
        <div className="bg-white rounded-lg border p-2">
          <div className="flex items-center justify-between mb-1">
            <Clock className="h-4 w-4 text-blue-500" />
            <span 
              className="text-lg font-bold text-blue-600"
              style={{ fontSize: `${fontSize + 2}px` }}
            >
              {statistics.averageDuration.toFixed(1)}
            </span>
          </div>
          <p 
            className="text-xs text-gray-600"
            style={{ fontSize: `${fontSize - 1}px` }}
          >
            Avg. Duration
          </p>
          <p 
            className="text-xs text-gray-500"
            style={{ fontSize: `${fontSize - 2}px` }}
          >
            days per task
          </p>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-lg border p-2">
          <div className="flex items-center justify-between mb-1">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <span 
              className="text-lg font-bold text-yellow-600"
              style={{ fontSize: `${fontSize + 2}px` }}
            >
              {statistics.inProgressTasks}
            </span>
          </div>
          <p 
            className="text-xs text-gray-600"
            style={{ fontSize: `${fontSize - 1}px` }}
          >
            In Progress
          </p>
          <p 
            className="text-xs text-gray-500"
            style={{ fontSize: `${fontSize - 2}px` }}
          >
            active tasks
          </p>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-lg border p-2">
          <div className="flex items-center justify-between mb-1">
            {isUpward ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span 
              className={`text-lg font-bold ${isUpward ? 'text-green-600' : 'text-red-600'}`}
              style={{ fontSize: `${fontSize + 2}px` }}
            >
              {isUpward ? '+' : ''}{monthTrend}
            </span>
          </div>
          <p 
            className="text-xs text-gray-600"
            style={{ fontSize: `${fontSize - 1}px` }}
          >
            Monthly Trend
          </p>
          <p 
            className="text-xs text-gray-500"
            style={{ fontSize: `${fontSize - 2}px` }}
          >
            vs last month
          </p>
        </div>

        {/* Status Breakdown - Full Width */}
        <div className="col-span-2 bg-white rounded-lg border p-2">
          <div className="flex items-center mb-2">
            <BarChart className="h-4 w-4 text-gray-500 mr-1" />
            <span 
              className="font-semibold text-gray-700"
              style={{ fontSize: `${fontSize}px` }}
            >
              Status Breakdown
            </span>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span 
                className="text-xs text-gray-600"
                style={{ fontSize: `${fontSize - 1}px` }}
              >
                Scheduled
              </span>
              <div className="flex items-center">
                <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ 
                      width: `${statistics.totalTasks > 0 ? (statistics.scheduledTasks / statistics.totalTasks) * 100 : 0}%` 
                    }}
                  />
                </div>
                <span 
                  className="text-xs font-medium"
                  style={{ fontSize: `${fontSize - 1}px` }}
                >
                  {statistics.scheduledTasks}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span 
                className="text-xs text-gray-600"
                style={{ fontSize: `${fontSize - 1}px` }}
              >
                In Progress / Active
              </span>
              <div className="flex items-center">
                <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                  <div 
                    className="h-full bg-yellow-500 rounded-full"
                    style={{ 
                      width: `${statistics.totalTasks > 0 ? (statistics.inProgressTasks / statistics.totalTasks) * 100 : 0}%` 
                    }}
                  />
                </div>
                <span 
                  className="text-xs font-medium"
                  style={{ fontSize: `${fontSize - 1}px` }}
                >
                  {statistics.inProgressTasks}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span 
                className="text-xs text-gray-600"
                style={{ fontSize: `${fontSize - 1}px` }}
              >
                Completed
              </span>
              <div className="flex items-center">
                <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                  <div 
                    className="h-full bg-green-500 rounded-full"
                    style={{ 
                      width: `${statistics.totalTasks > 0 ? (statistics.completedTasks / statistics.totalTasks) * 100 : 0}%` 
                    }}
                  />
                </div>
                <span 
                  className="text-xs font-medium"
                  style={{ fontSize: `${fontSize - 1}px` }}
                >
                  {statistics.completedTasks}
                </span>
              </div>
            </div>

            {config.includeOverdue && statistics.overdueTasks > 0 && (
              <div className="flex justify-between items-center">
                <span 
                  className="text-xs text-gray-600"
                  style={{ fontSize: `${fontSize - 1}px` }}
                >
                  Overdue
                </span>
                <div className="flex items-center">
                  <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                    <div 
                      className="h-full bg-red-500 rounded-full"
                      style={{ 
                        width: `${statistics.totalTasks > 0 ? (statistics.overdueTasks / statistics.totalTasks) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <span 
                    className="text-xs font-medium text-red-600"
                    style={{ fontSize: `${fontSize - 1}px` }}
                  >
                    {statistics.overdueTasks}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render content based on status
  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Loading statistics...</p>
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

    if (!statistics || statistics.totalTasks === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <BarChart className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No maintenance data available</p>
        </div>
      );
    }

    return renderStatistics();
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
            <BarChart className="h-4 w-4 mr-2 text-primary" />
            {config.widgetTitle || "Maintenance Statistics"}
          </h3>
          <div className="flex items-center space-x-1">
            <Badge variant="secondary" className="text-xs">
              {config.timeRange || '30d'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        {renderContent()}
      </div>
    </div>
  );
};