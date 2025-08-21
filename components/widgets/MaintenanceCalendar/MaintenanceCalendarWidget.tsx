// File: components/widgets/MaintenanceCalendar/MaintenanceCalendarWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { id } from "date-fns/locale";
import { Loader2, AlertTriangle, Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
}

interface Props {
  config: {
    widgetTitle?: string;
    viewType?: 'month' | 'week';
    showCompleted?: boolean;
    highlightOverdue?: boolean;
  };
}

export const MaintenanceCalendarWidget = ({ config }: Props) => {
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceItem[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [currentDate, setCurrentDate] = useState(new Date());
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

  // Mock data for testing - updated with current month dates (August 2025)
  const getMockData = (): MaintenanceItem[] => [
    {
      id: 1,
      name: "Server Room AC Maintenance",
      description: "Regular maintenance check for air conditioning system",
      startTask: "2025-08-15T08:00:00Z",
      endTask: "2025-08-15T12:00:00Z",
      status: "completed",
      assignedTo: { id: "1", email: "tech1@company.com", phoneNumber: "+1234567890" },
      deviceTarget: { name: "AC Unit - Server Room" }
    },
    {
      id: 2,
      name: "UPS Battery Check",
      description: "Monthly UPS battery voltage and capacity check",
      startTask: "2025-08-20T09:00:00Z",
      endTask: "2025-08-22T11:00:00Z",
      status: "in_progress",
      assignedTo: { id: "2", email: "tech2@company.com", phoneNumber: "+1234567891" },
      deviceTarget: { name: "UPS Unit - Main Power" }
    },
    {
      id: 3,
      name: "Network Switch Cleaning",
      description: "Clean dust from network switches and check cable connections",
      startTask: "2025-08-25T07:00:00Z",
      endTask: "2025-08-25T09:00:00Z",
      status: "scheduled",
      assignedTo: { id: "1", email: "tech1@company.com", phoneNumber: "+1234567890" },
      deviceTarget: { name: "Network Switch - Floor 2" }
    },
    {
      id: 4,
      name: "Fire Suppression Test",
      description: "Quarterly fire suppression system test and inspection",
      startTask: "2025-08-12T06:00:00Z",
      endTask: "2025-08-12T08:00:00Z",
      status: "overdue",
      assignedTo: { id: "3", email: "safety@company.com", phoneNumber: "+1234567892" },
      deviceTarget: { name: "Fire Suppression System" }
    }
  ];

  // Fetch maintenance data
  const fetchMaintenanceData = async () => {
    try {
      setStatus("loading");
      console.log(`[MaintenanceCalendar] Fetching from: ${API_BASE_URL}/api/maintenance`);
      
      const response = await fetch(`${API_BASE_URL}/api/maintenance`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`[MaintenanceCalendar] Response status: ${response.status}`);
      
      if (!response.ok) {
        // Use mock data if API fails
        console.warn(`[MaintenanceCalendar] API failed with ${response.status}, using mock data`);
        const mockData = getMockData();
        
        // Filter data based on config
        let filteredData = mockData;
        if (!config.showCompleted) {
          filteredData = mockData.filter((item: MaintenanceItem) => 
            item.status.toLowerCase() !== 'completed'
          );
        }
        
        setMaintenanceList(filteredData);
        setStatus("ok");
        return;
      }
      
      const data = await response.json();
      
      // Filter data based on config
      let filteredData = data;
      if (!config.showCompleted) {
        filteredData = data.filter((item: MaintenanceItem) => 
          item.status.toLowerCase() !== 'completed'
        );
      }
      setMaintenanceList(filteredData);
      setStatus("ok");
    } catch (err: any) {
      
      // Use mock data as fallback
      const mockData = getMockData();
      
      // Filter data based on config
      let filteredData = mockData;
      if (!config.showCompleted) {
        filteredData = mockData.filter((item: MaintenanceItem) => 
          item.status.toLowerCase() !== 'completed'
        );
      }
      
      setMaintenanceList(filteredData);
      setStatus("ok");
    }
  };

  useEffect(() => {
    fetchMaintenanceData();
  }, [config.showCompleted]);

  // Get maintenance tasks for specific date
  const getTasksForDate = (date: Date) => {
    return maintenanceList.filter(item => {
      const startDate = new Date(item.startTask);
      const endDate = new Date(item.endTask);
      
      // Set times to start of day for proper date comparison
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const startOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      return dateOnly >= startOnly && dateOnly <= endOnly;
    });
  };

  // Get status color (for calendar indicators)
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'bg-blue-500';
      case 'in_progress':
      case 'in progress':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-red-500';
      case 'overdue':
        return 'bg-orange-500';
      case 'outs': // Handle the "Outs" status from API
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Navigate months
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Render content based on status
  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Loading calendar...</p>
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

    return (
      <div className="h-full flex flex-col">
        {/* Month Navigation */}
        <div className="flex items-center justify-between p-2 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h4 
            className="font-semibold text-center"
            style={{ fontSize: `${fontSize + 1}px` }}
          >
            {format(currentDate, "MMMM yyyy", { locale: id })}
          </h4>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 p-2">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
              <div 
                key={day}
                className="text-center text-gray-600 font-semibold p-1"
                style={{ fontSize: `${fontSize - 1}px` }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1 flex-1">
            {monthDays.map(day => {
              const tasksForDay = getTasksForDate(day);
              const isCurrentDay = isToday(day);
              
              
              return (
                <div
                  key={day.toISOString()}
                  className={`
                    relative border rounded p-1 min-h-[3rem] transition-colors
                    ${isCurrentDay ? 'border-primary bg-primary/10' : 'border-gray-200'}
                    ${tasksForDay.length > 0 ? 'bg-blue-50' : 'bg-white'}
                  `}
                >
                  {/* Day Number */}
                  <div 
                    className={`text-center font-medium ${isCurrentDay ? 'text-primary' : 'text-gray-700'}`}
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    {format(day, 'd')}
                  </div>

                  {/* Task Indicators */}
                  {tasksForDay.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {tasksForDay.slice(0, 2).map(task => {
                        const isOverdue = config.highlightOverdue && 
                                        new Date(task.endTask) < new Date() && 
                                        task.status.toLowerCase() !== 'completed';
                        
                        return (
                          <div
                            key={task.id}
                            className={`
                              px-1 py-0.5 rounded text-white text-xs truncate
                              ${isOverdue ? 'bg-orange-500' : getStatusColor(task.status)}
                            `}
                            style={{ fontSize: `${fontSize - 2}px` }}
                            title={`${task.name} - ${task.status}`}
                          >
                            {task.name.length > 8 ? task.name.substring(0, 8) + '...' : task.name}
                          </div>
                        );
                      })}
                      
                      {tasksForDay.length > 2 && (
                        <div 
                          className="text-center text-gray-500 text-xs"
                          style={{ fontSize: `${fontSize - 2}px` }}
                        >
                          +{tasksForDay.length - 2}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="border-t p-2">
          <div className="flex flex-wrap gap-2 justify-center">
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span style={{ fontSize: `${fontSize - 1}px` }} className="text-gray-600">Scheduled</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span style={{ fontSize: `${fontSize - 1}px` }} className="text-gray-600">In Progress</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span style={{ fontSize: `${fontSize - 1}px` }} className="text-gray-600">Completed</span>
            </div>
            {config.highlightOverdue && (
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                <span style={{ fontSize: `${fontSize - 1}px` }} className="text-gray-600">Overdue</span>
              </div>
            )}
          </div>
        </div>
      </div>
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
            <Calendar className="h-4 w-4 mr-2 text-primary" />
            {config.widgetTitle || "Maintenance Calendar"}
          </h3>
          <div className="flex items-center space-x-1">
            <span 
              className="text-xs text-gray-500 bg-white px-2 py-1 rounded"
              style={{ fontSize: `${fontSize - 2}px` }}
            >
              {maintenanceList.length} tasks
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