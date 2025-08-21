"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Role, MaintenanceTarget } from "@prisma/client";
import Swal from "sweetalert2";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { cn } from "@/lib/utils"; // Pastikan Anda memiliki utility ini

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Edit,
  Trash2,
  PlusCircle,
  Loader2,
  Shield,
  Database,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Info,
  MessageSquare,
  Send,
} from "lucide-react";
import { WhatsAppConfigModal } from "@/components/whatsapp/WhatsAppConfigModal";

// --- Type Definitions ---
interface UserData {
  id: string;
  email: string;
}

interface DeviceData {
  uniqId: string;
  name: string;
  topic: string;
  lastPayload: any;
  lastUpdatedByMqtt: string | null;
}

interface MaintenanceData {
  id: number;
  name: string;
  description: string | null;
  startTask: string;
  endTask: string;
  assignTo: string;
  assignedTo: UserData;
  targetType: MaintenanceTarget;
  targetId: string; // Changed to string (cuid)
  deviceTarget?: DeviceData | null; // Added device relation
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

function MaintenanceManagementContent() {
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();

  const [maintenances, setMaintenances] = useState<MaintenanceData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentMaintenance, setCurrentMaintenance] = useState<
    Partial<MaintenanceData>
  >({});
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [maintenanceToDelete, setMaintenanceToDelete] =
    useState<MaintenanceData | null>(null);

  // State untuk kalender
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isViewDialog, setIsViewDialog] = useState(false);
  const [maintenanceToView, setMaintenanceToView] =
    useState<MaintenanceData | null>(null);

  // WhatsApp state
  const [isWhatsAppConfigOpen, setIsWhatsAppConfigOpen] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  // --- FUNGSI FETCH API ---
  const fetchMaintenances = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/maintenance");
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logout();
        }
        throw new Error("Failed to fetch maintenance schedules.");
      }
      const data = await response.json();
      setMaintenances(data);
    } catch (error: any) {
      console.error(
        "[MaintenanceManagement] Gagal mengambil data:",
        error.message
      );
      Toast.fire({ icon: "error", title: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users for dropdown.");
      const data = await response.json();
      setUsers(data);
    } catch (error: any) {
      console.error(
        "[MaintenanceManagement] Gagal mengambil daftar pengguna:",
        error.message
      );
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const response = await fetch("/api/devices/for-selection");
      if (!response.ok) throw new Error("Failed to fetch devices for dropdown.");
      const data = await response.json();
      setDevices(data);
    } catch (error: any) {
      console.error(
        "[MaintenanceManagement] Gagal mengambil daftar devices:",
        error.message
      );
    }
  }, []);

  useEffect(() => {
    if (!isAuthLoading) {
      if (isAuthenticated && user?.role === Role.ADMIN) {
        fetchMaintenances();
        fetchUsers();
        fetchDevices();
      } else {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, user, isAuthLoading, fetchMaintenances, fetchUsers]);

  // --- LOGIKA KALENDER ---
  const generateCalendarDays = () => {
    const startOfCurrentMonth = startOfMonth(currentMonth);
    const endOfCurrentMonth = endOfMonth(currentMonth);
    const startDate = startOfWeek(startOfCurrentMonth);
    const endDate = endOfWeek(endOfCurrentMonth);

    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  };

  const getMaintenancesForDate = (date: Date) => {
    return maintenances.filter((m) => isSameDay(new Date(m.startTask), date));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-500";
      case "In Progress":
        return "bg-blue-500";
      case "Scheduled":
        return "bg-gray-500";
      case "On Hold":
        return "bg-yellow-500";
      case "Cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Completed":
        return "default";
      case "In Progress":
        return "secondary";
      case "Scheduled":
        return "outline";
      case "On Hold":
        return "destructive";
      case "Cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const openViewDialog = (maintenance: MaintenanceData) => {
    setMaintenanceToView(maintenance);
    setIsViewDialog(true);
  };

  // --- CRUD HANDLERS ---
  const handleOpenModal = (
    maintenanceToEdit: MaintenanceData | null = null
  ) => {
    if (maintenanceToEdit) {
      setIsEditMode(true);
      setCurrentMaintenance(maintenanceToEdit);
    } else {
      setIsEditMode(false);
      setCurrentMaintenance({
        targetType: MaintenanceTarget.Device,
        status: "Scheduled",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const url = isEditMode ? `/api/maintenance` : "/api/maintenance";
    const method = isEditMode ? "PUT" : "POST";

    // Perbaikan: Pastikan targetId diubah ke string jika itu yang diharapkan oleh API
    // Asumsi API mengharapkan number, jadi tidak perlu konversi
    const body = {
      ...currentMaintenance,
      targetId: currentMaintenance.targetId,
    };

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      Toast.fire({
        icon: "success",
        title: `Maintenance ${
          isEditMode ? "updated" : "created"
        } successfully!`,
      });
      handleCloseModal();
      fetchMaintenances();
    } catch (error: any) {
      Toast.fire({ icon: "error", title: error.message });
    }
  };

  const handleDelete = async () => {
    if (!maintenanceToDelete) return;
    try {
      const response = await fetch(
        `/api/maintenance?id=${maintenanceToDelete.id}`,
        {
          method: "DELETE",
        }
      );
      if (response.status !== 204) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete maintenance.");
      }
      Toast.fire({ icon: "success", title: "Maintenance deleted!" });
      fetchMaintenances();
    } catch (error: any) {
      Toast.fire({ icon: "error", title: error.message });
    } finally {
      setIsDeleteAlertOpen(false);
      setMaintenanceToDelete(null);
    }
  };

  const handleSendWhatsAppNotification = async (maintenance: MaintenanceData) => {
    const result = await Swal.fire({
      title: 'Send WhatsApp Notification?',
      text: `Send maintenance notification to ${maintenance.assignedTo.email}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Send Notification',
      cancelButtonText: 'Cancel',
      input: 'text',
      inputLabel: 'Phone Number (optional)',
      inputPlaceholder: 'Enter phone number if different from user profile',
      inputValidator: (value) => {
        if (value && !/^[\d+\-\s()]+$/.test(value)) {
          return 'Please enter a valid phone number';
        }
        return null;
      }
    });

    if (result.isConfirmed) {
      setIsSendingWhatsApp(true);
      try {
        const response = await fetch('/api/whatsapp/maintenance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            maintenanceId: maintenance.id,
            phoneNumber: result.value || undefined
          }),
        });

        const data = await response.json();
        
        if (response.ok) {
          Toast.fire({
            icon: "success",
            title: "WhatsApp notification sent!",
            text: `Notification sent to ${maintenance.assignedTo.email}`
          });
        } else {
          Toast.fire({
            icon: "error",
            title: "Failed to send notification",
            text: data.message || "Unknown error occurred"
          });
        }
      } catch (error: any) {
        Toast.fire({
          icon: "error",
          title: "Failed to send notification",
          text: error.message || "Network error occurred"
        });
      } finally {
        setIsSendingWhatsApp(false);
      }
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!user || user.role !== Role.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center bg-gray-100">
        <Shield className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="text-gray-600">
          Anda tidak memiliki izin untuk melihat halaman ini.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <main className="p-4 md:p-6">
        <Tabs defaultValue="table" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <TabsList>
                <TabsTrigger value="table">Table View</TabsTrigger>
                <TabsTrigger value="calendar">Calendar View</TabsTrigger>
              </TabsList>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Database
                    className={`h-4 w-4 ${
                      "connected" === "connected"
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  />
                </TooltipTrigger>
                <TooltipContent>Database Status</TooltipContent>
              </Tooltip>
              <Button 
                variant="outline" 
                onClick={() => setIsWhatsAppConfigOpen(true)}
              >
                <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp Config
              </Button>
              <Button onClick={() => handleOpenModal()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Maintenance
              </Button>
            </div>
          </div>
          <TabsContent value="table" className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader>
                <div>
                  <CardTitle>Maintenance List</CardTitle>
                  <CardDescription>
                    Manage all maintenance schedules and tasks.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task Name</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center h-48">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                          </TableCell>
                        </TableRow>
                      ) : maintenances.length > 0 ? (
                        maintenances.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">
                              {m.name}
                            </TableCell>
                            <TableCell>{m.assignedTo.email}</TableCell>
                            <TableCell>
                              {m.targetType === MaintenanceTarget.Device && m.deviceTarget
                                ? `${m.targetType}: ${m.deviceTarget.name}`
                                : `${m.targetType} (ID: ${m.targetId})`}
                            </TableCell>
                            <TableCell>{m.status}</TableCell>
                            <TableCell>
                              {new Date(m.startTask).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSendWhatsAppNotification(m)}
                                disabled={isSendingWhatsApp}
                                title="Send WhatsApp Notification"
                              >
                                {isSendingWhatsApp ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4 text-green-500 hover:text-green-600" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenModal(m)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setMaintenanceToDelete(m);
                                  setIsDeleteAlertOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center h-48 text-gray-500"
                          >
                            No maintenance schedules found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Maintenance Calendar</CardTitle>
                    <CardDescription>
                      View maintenance tasks in a calendar format.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentMonth(subMonths(currentMonth, 1))
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-lg font-semibold min-w-[160px] text-center">
                      {format(currentMonth, "MMMM yyyy")}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentMonth(addMonths(currentMonth, 1))
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="p-2 text-center text-sm font-medium text-muted-foreground border-b"
                      >
                        {day}
                      </div>
                    )
                  )}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarDays().map((day, index) => {
                    const maintenancesForDay = getMaintenancesForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isSelected =
                      selectedDate && isSameDay(day, selectedDate);
                    const isCurrentDay = isToday(day);

                    return (
                      <div
                        key={index}
                        className={cn(
                          "min-h-[120px] p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg",
                          !isCurrentMonth &&
                            "text-muted-foreground bg-gray-50/50",
                          isSelected && "bg-blue-50 border-blue-300",
                          isCurrentDay && "bg-yellow-50 border-yellow-300"
                        )}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div
                          className={cn(
                            "text-sm font-medium mb-1",
                            isCurrentDay && "text-yellow-700 font-bold"
                          )}
                        >
                          {format(day, "d")}
                        </div>

                        <div className="space-y-1">
                          {maintenancesForDay.slice(0, 3).map((maintenance) => (
                            <div
                              key={maintenance.id}
                              className={cn(
                                "text-xs p-1 rounded text-white truncate cursor-pointer hover:opacity-80",
                                getStatusColor(maintenance.status)
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                openViewDialog(maintenance);
                              }}
                              title={`${maintenance.name} - ${maintenance.status}`}
                            >
                              {maintenance.name}
                            </div>
                          ))}
                          {maintenancesForDay.length > 3 && (
                            <div className="text-xs text-muted-foreground text-center">
                              +{maintenancesForDay.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span>Scheduled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>On Hold</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Cancelled</span>
                  </div>
                </div>
                {/* Selected Date Details */}
                {selectedDate && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border-l-4 border-gray-200">
                    <h4 className="font-semibold mb-3">
                      Maintenance for{" "}
                      {format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </h4>
                    {getMaintenancesForDate(selectedDate).length === 0 ? (
                      <p className="text-muted-foreground">
                        No maintenance tasks scheduled for this date.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {getMaintenancesForDate(selectedDate).map(
                          (maintenance) => (
                            <div
                              key={maintenance.id}
                              className="flex items-center justify-between p-3 bg-white rounded border cursor-pointer hover:border-gray-300"
                              onClick={() => openViewDialog(maintenance)}
                            >
                              <div className="flex-1">
                                <div className="font-medium flex items-center gap-2">
                                  <Info className="h-4 w-4 text-blue-500" />
                                  {maintenance.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Assigned to: {maintenance.assignedTo?.email}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Target: {maintenance.targetType === MaintenanceTarget.Device && maintenance.deviceTarget
                                    ? `${maintenance.deviceTarget.name}`
                                    : `${maintenance.targetType} (${maintenance.targetId})`}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {format(
                                    new Date(maintenance.startTask),
                                    "HH:mm"
                                  )}{" "}
                                  -{" "}
                                  {format(
                                    new Date(maintenance.endTask),
                                    "HH:mm"
                                  )}
                                </div>
                              </div>
                              <Badge
                                variant={getStatusBadgeVariant(
                                  maintenance.status
                                )}
                              >
                                {maintenance.status}
                              </Badge>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* --- Modal untuk Tambah/Edit --- */}
        <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isEditMode ? "Edit Maintenance" : "Add New Maintenance"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Task Name</Label>
                <Input
                  id="name"
                  value={currentMaintenance.name || ""}
                  onChange={(e) =>
                    setCurrentMaintenance({
                      ...currentMaintenance,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={currentMaintenance.description || ""}
                  onChange={(e) =>
                    setCurrentMaintenance({
                      ...currentMaintenance,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTask">Start Time</Label>
                  <Input
                    id="startTask"
                    type="datetime-local"
                    value={
                      currentMaintenance.startTask
                        ? format(
                            new Date(currentMaintenance.startTask),
                            "yyyy-MM-dd'T'HH:mm"
                          )
                        : ""
                    }
                    onChange={(e) =>
                      setCurrentMaintenance({
                        ...currentMaintenance,
                        startTask: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTask">End Time</Label>
                  <Input
                    id="endTask"
                    type="datetime-local"
                    value={
                      currentMaintenance.endTask
                        ? format(
                            new Date(currentMaintenance.endTask),
                            "yyyy-MM-dd'T'HH:mm"
                          )
                        : ""
                    }
                    onChange={(e) =>
                      setCurrentMaintenance({
                        ...currentMaintenance,
                        endTask: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignTo">Assign To</Label>
                <Select
                  value={currentMaintenance.assignTo}
                  onValueChange={(value) =>
                    setCurrentMaintenance({
                      ...currentMaintenance,
                      assignTo: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetType">Target Type</Label>
                  <Select
                    value={currentMaintenance.targetType}
                    onValueChange={(value: MaintenanceTarget) =>
                      setCurrentMaintenance({
                        ...currentMaintenance,
                        targetType: value,
                        targetId: "", // Reset targetId when changing type
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={MaintenanceTarget.Device}>
                        Device
                      </SelectItem>
                      <SelectItem value={MaintenanceTarget.Rack}>
                        Rack
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetId">
                    {currentMaintenance.targetType === MaintenanceTarget.Device ? "Device" : "Rack ID"}
                  </Label>
                  {currentMaintenance.targetType === MaintenanceTarget.Device ? (
                    <Select
                      value={currentMaintenance.targetId || ""}
                      onValueChange={(value) =>
                        setCurrentMaintenance({
                          ...currentMaintenance,
                          targetId: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a device" />
                      </SelectTrigger>
                      <SelectContent>
                        {devices.map((device) => (
                          <SelectItem key={device.uniqId} value={device.uniqId}>
                            {device.name} ({device.topic})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="targetId"
                      type="text"
                      value={currentMaintenance.targetId || ""}
                      onChange={(e) =>
                        setCurrentMaintenance({
                          ...currentMaintenance,
                          targetId: e.target.value,
                        })
                      }
                      placeholder="Enter Rack ID"
                      required
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={currentMaintenance.status || ""}
                  onValueChange={(value) =>
                    setCurrentMaintenance({
                      ...currentMaintenance,
                      status: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseModal}
                >
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* --- Dialog untuk Detail Maintenance dari Kalender --- */}
        <Dialog open={isViewDialog} onOpenChange={setIsViewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Maintenance Details</DialogTitle>
            </DialogHeader>
            {maintenanceToView && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">Task Name</h4>
                  <p>{maintenanceToView.name}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Description</h4>
                  <p>{maintenanceToView.description || "N/A"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold">Start Time</h4>
                    <p>
                      {format(
                        new Date(maintenanceToView.startTask),
                        "PPPP HH:mm"
                      )}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold">End Time</h4>
                    <p>
                      {format(
                        new Date(maintenanceToView.endTask),
                        "PPPP HH:mm"
                      )}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold">Assigned To</h4>
                  <p>{maintenanceToView.assignedTo.email}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Target</h4>
                  <p>
                    {maintenanceToView.targetType === MaintenanceTarget.Device && maintenanceToView.deviceTarget
                      ? `${maintenanceToView.targetType}: ${maintenanceToView.deviceTarget.name} (${maintenanceToView.deviceTarget.topic})`
                      : `${maintenanceToView.targetType} (ID: ${maintenanceToView.targetId})`}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold">Status</h4>
                  <p>{maintenanceToView.status}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- Alert Dialog untuk Hapus --- */}
        <AlertDialog
          open={isDeleteAlertOpen}
          onOpenChange={setIsDeleteAlertOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the maintenance schedule{" "}
                <b>{maintenanceToDelete?.name}</b>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setMaintenanceToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* --- WhatsApp Configuration Modal --- */}
        <WhatsAppConfigModal
          isOpen={isWhatsAppConfigOpen}
          onClose={() => setIsWhatsAppConfigOpen(false)}
        />
      </main>
    </TooltipProvider>
  );
}

// Komponen wrapper untuk menyediakan AuthProvider
export default function MaintenancePageWrapper() {
  return (
    <AuthProvider>
      <MaintenanceManagementContent />
    </AuthProvider>
  );
}
