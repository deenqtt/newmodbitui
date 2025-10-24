"use client";

import { useState, useEffect, useCallback } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { useConnectivity } from "@/hooks/useConnectivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SidebarInset } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Loader2,
  Plus,
  Edit,
  Trash,
  User,
  Users,
  Shield,
  UserCheck,
  CreditCard,
  Fingerprint,
  RefreshCw,
  X,
  AlertCircle,
  Info,
  ArrowLeft,
  Crown,
  Activity,
  HardDrive,
  UserCog,
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- Interfaces & Types
interface UserData {
  uid: number;
  name: string;
  privilege: number;
  password?: string;
  group_id?: string | number;
  user_id?: string;
  card?: number;
  devices?: string[];
}

interface FingerprintData {
  uid: number;
  fid: number;
  devices: {
    device_id: string;
    device_name: string;
  }[];
}

interface DeviceData {
  id: string;
  name: string;
  ip: string;
  port: number;
  password: number;
  timeout: number;
  force_udp: boolean;
  enabled: boolean;
}

interface MqttResponsePayload {
  status: "success" | "error" | "accepted" | "failed";
  message: string;
  data?: {
    users?: UserData[];
    unique_users?: UserData[];
    user?: UserData;
    deleted_user?: UserData;
    total_users?: number;
    query_type?: string;
    consolidated_fingerprints?: FingerprintData[];
    devices?: any[];
    summary?: {
      total_devices: number;
      successful_queries: number;
      unique_users: number;
      total_user_records: number;
      unique_fingerprints?: number;
      total_fingerprint_records?: number;
    };
  };
}

const PRIVILEGES = [
  {
    value: 0,
    label: "Normal User",
    icon: User,
    color: "bg-gray-100 text-gray-700",
  },
  {
    value: 1,
    label: "Enroll User",
    icon: UserCheck,
    color: "bg-blue-100 text-blue-700",
  },
  {
    value: 2,
    label: "Admin",
    icon: Shield,
    color: "bg-green-100 text-green-700",
  },
  {
    value: 3,
    label: "Super Admin",
    icon: Crown,
    color: "bg-purple-100 text-purple-700",
  },
  {
    value: 14,
    label: "Super User",
    icon: UserCog,
    color: "bg-orange-100 text-orange-700",
  },
];

// --- Main Component
export default function UserManagement() {
  const router = useRouter();
  const { isReady, connectionStatus, publish } = useMqtt();

  const requestTopic = "accessControl/user/command";
  const responseTopic = "accessControl/user/response";
  const deviceResponseTopic = "accessControl/device/response";

  const { payloads } = useConnectivity([responseTopic, deviceResponseTopic]);

  const isConnected = connectionStatus === "Connected";
  const [users, setUsers] = useState<UserData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserData>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "update">("add");
  const [deleteUserUID, setDeleteUserUID] = useState<number | null>(null);
  const [fingerprintAction, setFingerprintAction] = useState<{
    uid: number;
    fid: number;
    action: "register" | "delete";
  } | null>(null);
  const [isFingerprintProcessing, setIsFingerprintProcessing] = useState(false);
  const [cardAction, setCardAction] = useState<"sync" | "delete" | null>(null);
  const [isCardProcessing, setIsCardProcessing] = useState(false);
  const [selectedUserForCard, setSelectedUserForCard] = useState<number | null>(
    null
  );
  const [fingerprintList, setFingerprintList] = useState<FingerprintData[]>([]);
  const [isLoadingFingerprints, setIsLoadingFingerprints] = useState(false);
  const [fingerprintDialog, setFingerprintDialog] = useState<{
    isOpen: boolean;
    mode: "register" | "delete" | null;
    selectedUser: UserData | null;
  }>({
    isOpen: false,
    mode: null,
    selectedUser: null,
  });
  const [selectedFingerIndex, setSelectedFingerIndex] = useState<number>(1);
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [summaryData, setSummaryData] = useState<{
    totalUsers: number;
    totalDevices: number;
    totalFingerprints: number;
    connectedDevices: number;
  }>({
    totalUsers: 0,
    totalDevices: 0,
    totalFingerprints: 0,
    connectedDevices: 0,
  });

  const handleGetUsers = useCallback(async () => {
    if (!isConnected) return;
    setIsRefreshing(true);
    const command = { command: "getData" };
    await publish(requestTopic, JSON.stringify(command));
  }, [isConnected, publish, requestTopic]);

  const handleGetFingerprintList = useCallback(async () => {
    if (!isConnected) {
      console.warn("Cannot get fingerprint list: MQTT not connected");
      return;
    }

    console.log("Requesting fingerprint list...");
    setIsLoadingFingerprints(true);
    const command = { command: "getFingerprintList" };
    console.log("Sending fingerprint list command:", command);
    await publish(requestTopic, JSON.stringify(command));
  }, [isConnected, publish, requestTopic]);

  const handleGetDevices = useCallback(async () => {
    if (!isConnected) return;
    console.log("Requesting devices list...");
    const command = { command: "listDevices" };
    await publish("accessControl/device/command", JSON.stringify(command));
  }, [isConnected, publish]);

  const handleResponse = useCallback(
    (topic: string, message: string) => {
      try {
        console.log("Received MQTT response:", message);
        const payload: MqttResponsePayload = JSON.parse(message);

        console.log("MQTT Response Status:", payload.status);
        console.log("MQTT Response Data:", payload.data);

        if (payload.status === "success" || payload.status === "accepted") {
          if (payload.data?.consolidated_fingerprints !== undefined) {
            console.log(
              "Processing fingerprint list:",
              payload.data.consolidated_fingerprints
            );
            console.log("Fingerprint list summary:", payload.data.summary);
            setFingerprintList(payload.data.consolidated_fingerprints);
            setIsLoadingFingerprints(false);
            setSummaryData((prev) => ({
              ...prev,
              totalFingerprints:
                payload.data?.summary?.unique_fingerprints || 0,
            }));
            toast.success(
              `Loaded ${
                payload.data.summary?.unique_fingerprints || 0
              } fingerprints from ${
                payload.data.summary?.successful_queries || 0
              } devices`
            );
          } else if (
            payload.message?.includes("fingerprint") ||
            payload.message?.includes("Fingerprint")
          ) {
            if (payload.status === "success") {
              setIsFingerprintProcessing(false);
              setFingerprintAction(null);
              toast.success(payload.message);
              handleGetFingerprintList();
            } else {
              toast.info(payload.message);
            }
          } else if (
            payload.message?.includes("card") ||
            payload.message?.includes("Card")
          ) {
            if (payload.status === "success") {
              setIsCardProcessing(false);
              setCardAction(null);
              setSelectedUserForCard(null);
              toast.success(payload.message);
            } else {
              toast.info(payload.message);
            }
          } else if (payload.data) {
            if (payload.data?.unique_users) {
              setUsers(payload.data.unique_users);
              setSummaryData((prev) => ({
                ...prev,
                totalUsers: payload.data?.unique_users?.length || 0,
                totalDevices:
                  payload.data?.summary?.total_devices || prev.totalDevices,
                connectedDevices:
                  payload.data?.summary?.successful_queries ||
                  prev.connectedDevices,
              }));
              toast.success(
                `Loaded ${payload.data.unique_users.length} users from ${
                  payload.data?.summary?.successful_queries || 0
                } devices`
              );
            } else if (payload.data.users) {
              setUsers(payload.data.users);
              toast.success(`Loaded ${payload.data.users.length} users`);
            } else if (payload.data.user || payload.data.deleted_user) {
              if (payload.data.user) {
                toast.success(
                  `User ${payload.data.user.name} ${
                    payload.message.includes("created") ? "created" : "updated"
                  } successfully`
                );
              } else if (payload.data.deleted_user) {
                toast.success(
                  `User ${payload.data.deleted_user.name} deleted successfully`
                );
              }
              handleGetUsers();
            }
          }
        } else if (payload.status === "failed" || payload.status === "error") {
          console.error("MQTT Error/Failed:", payload);

          if (
            payload.message?.includes("fingerprint") ||
            payload.message?.includes("Fingerprint") ||
            payload.message?.includes("enroll")
          ) {
            setIsFingerprintProcessing(false);
            setFingerprintAction(null);

            if (
              payload.message?.includes("Cant Enroll") ||
              payload.message?.includes("Can't Enroll") ||
              payload.message?.includes("Enrollment failed for User")
            ) {
              toast.error(
                "Fingerprint enrollment failed!\n\n" +
                  "Please verify:\n" +
                  "• User exists on the master device\n" +
                  "• Selected finger index is available (try different index)\n" +
                  "• Device scanner is working properly\n" +
                  "• No duplicate fingerprint exists at that index\n" +
                  "• Finger is placed correctly during scanning\n\n" +
                  "Enhanced error details: " +
                  payload.message
              );
            } else if (
              payload.message?.includes("already registered") ||
              payload.message?.includes("already exists")
            ) {
              toast.error(
                "Fingerprint already exists!\n\n" +
                  "This finger may already be registered. Try:\n" +
                  "• Select a different finger index\n" +
                  "• Delete existing fingerprint first\n" +
                  "• Use a different finger\n\n" +
                  "Details: " +
                  payload.message
              );
            } else {
              toast.error("Fingerprint operation failed: " + payload.message);
            }
          } else {
            toast.error(payload.message);
          }

          setIsFingerprintProcessing(false);
          setIsCardProcessing(false);
          setFingerprintAction(null);
          setCardAction(null);
          setSelectedUserForCard(null);
          setIsLoadingFingerprints(false);
        }
      } catch (e) {
        console.error(
          "Failed to parse MQTT message:",
          e,
          "Raw message:",
          message
        );
      } finally {
        setIsRefreshing(false);
        setIsDialogOpen(false);
        setDeleteUserUID(null);
      }
    },
    [handleGetUsers, handleGetFingerprintList]
  );

  const handleDeviceResponse = useCallback((topic: string, message: string) => {
    try {
      console.log("Received Device MQTT response:", message);
      const payload = JSON.parse(message);

      if (payload.status === "success" && payload.data?.devices) {
        setDevices(payload.data.devices);
        setSummaryData((prev) => ({
          ...prev,
          totalDevices:
            payload.data.total_devices || payload.data.devices.length,
          connectedDevices: payload.data.devices.filter(
            (d: DeviceData) => d.enabled
          ).length,
        }));
        console.log("Updated devices:", payload.data.devices);
        toast.success(
          `Found ${
            payload.data.total_devices || payload.data.devices.length
          } devices`
        );
      }
    } catch (e) {
      console.error(
        "Failed to parse Device MQTT message:",
        e,
        "Raw message:",
        message
      );
    }
  }, []);

  const handleAddUser = async () => {
    if (!formData.name) {
      toast.error("Name is a required field.");
      return;
    }
    const command = {
      command: "createData",
      data: formData,
    };
    await publish(requestTopic, JSON.stringify(command));
  };

  const handleUpdateUser = async () => {
    if (formData.uid === undefined) {
      toast.error("User UID is required for update.");
      return;
    }
    const command = {
      command: "updateData",
      data: {
        uid: formData.uid,
        ...formData,
      },
    };
    await publish(requestTopic, JSON.stringify(command));
  };

  const handleDeleteUser = async () => {
    if (deleteUserUID === null) return;
    const command = {
      command: "deleteData",
      data: { uid: deleteUserUID },
    };
    await publish(requestTopic, JSON.stringify(command));
  };

  const openFingerprintDialog = (
    mode: "register" | "delete",
    user: UserData
  ) => {
    setFingerprintDialog({
      isOpen: true,
      mode,
      selectedUser: user,
    });
    setSelectedFingerIndex(1);
  };

  const closeFingerprintDialog = () => {
    setFingerprintDialog({
      isOpen: false,
      mode: null,
      selectedUser: null,
    });
    setSelectedFingerIndex(1);
  };

  const handleRegisterFingerprint = async () => {
    if (!isConnected || !fingerprintDialog.selectedUser) return;

    const uid = fingerprintDialog.selectedUser.uid;
    const fid = selectedFingerIndex;

    setFingerprintAction({ uid, fid, action: "register" });
    setIsFingerprintProcessing(true);
    closeFingerprintDialog();

    const command = {
      command: "registerFinger",
      data: { uid, fid },
    };
    await publish(requestTopic, JSON.stringify(command));
  };

  const handleDeleteFingerprint = async () => {
    if (!isConnected || !fingerprintDialog.selectedUser) return;

    const uid = fingerprintDialog.selectedUser.uid;
    const fid = selectedFingerIndex;

    setFingerprintAction({ uid, fid, action: "delete" });
    setIsFingerprintProcessing(true);
    closeFingerprintDialog();

    const command = {
      command: "deleteFinger",
      data: { uid, fid },
    };
    await publish(requestTopic, JSON.stringify(command));
  };

  const handleSynchronizeCard = async () => {
    if (!isConnected) return;
    setCardAction("sync");
    setIsCardProcessing(true);
    const command = {
      command: "syncronizeCard",
      data: {},
    };
    await publish(requestTopic, JSON.stringify(command));
  };

  const handleDeleteCard = async (uid: number) => {
    if (!isConnected) return;
    setSelectedUserForCard(uid);
    setCardAction("delete");
    setIsCardProcessing(true);
    const command = {
      command: "deleteCard",
      data: { uid },
    };
    await publish(requestTopic, JSON.stringify(command));
  };

  const openAddDialog = () => {
    setDialogMode("add");
    setFormData({
      name: "",
      password: "",
      privilege: 0,
    });
    setIsDialogOpen(true);
  };

  const openUpdateDialog = (user: UserData) => {
    setDialogMode("update");
    setFormData(user);
    setIsDialogOpen(true);
  };

  const getUserFingerprintStatus = (uid: number) => {
    const userFingerprints = fingerprintList.filter((fp) => fp.uid === uid);
    return {
      hasFingerprints: userFingerprints.length > 0,
      fingerprintCount: userFingerprints.length,
      devices: userFingerprints.flatMap((fp) => fp.devices),
    };
  };

  // Handle MQTT responses using payloads from useConnectivity
  useEffect(() => {
    const response = payloads[responseTopic];
    if (response) {
      handleResponse(responseTopic, response);
    }
  }, [payloads, responseTopic, handleResponse]);

  useEffect(() => {
    const deviceResponse = payloads[deviceResponseTopic];
    if (deviceResponse) {
      handleDeviceResponse(deviceResponseTopic, deviceResponse);
    }
  }, [payloads, deviceResponseTopic, handleDeviceResponse]);

  // Initialize data fetching when MQTT is ready
  useEffect(() => {
    if (isReady && isConnected) {
      handleGetUsers();
      handleGetFingerprintList();
      handleGetDevices();
    }
  }, [
    isReady,
    isConnected,
    handleGetUsers,
    handleGetFingerprintList,
    handleGetDevices,
  ]);

  return (
    <TooltipProvider>
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="p-4 md:p-6">
            {/* Header Section */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.back()}
                  className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>

                {/* Connection Status & Refresh */}
                <div className="ml-auto flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-white dark:bg-slate-800 shadow-sm">
                    <div
                      className={`w-2 h-2 rounded-full animate-pulse ${
                        isConnected ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <span>MQTT: {connectionStatus}</span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleGetUsers}
                    disabled={!isConnected || isRefreshing}
                    size="sm"
                  >
                    {isRefreshing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Page Title */}
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
                    User Management
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Manage access control users, permissions, and biometrics
                  </p>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="border-0 shadow-sm bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                        <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          Total Users
                        </p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {summaryData.totalUsers}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                        <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          Total Devices
                        </p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {summaryData.totalDevices}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                        <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          Connected Devices
                        </p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {summaryData.connectedDevices}/
                          {summaryData.totalDevices}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                        <Fingerprint className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          Total Fingerprints
                        </p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {summaryData.totalFingerprints}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Main User Registry Card */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">User Registry</CardTitle>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Manage all users across ZKTeco access control devices
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      onClick={handleSynchronizeCard}
                      disabled={!isConnected || isCardProcessing}
                      variant="outline"
                      size="sm"
                    >
                      {isCardProcessing && cardAction === "sync" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="mr-2 h-4 w-4" />
                      )}
                      Sync Cards
                    </Button>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button onClick={openAddDialog}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add User
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>
                            {dialogMode === "add"
                              ? "Add New User"
                              : "Update User"}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
                          {/* Display read-only values for existing users */}
                          {dialogMode === "update" && (
                            <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                              <div>
                                <Label className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                  UID
                                </Label>
                                <div className="text-sm font-mono bg-white dark:bg-slate-800 p-2 rounded mt-1">
                                  {formData.uid || "Auto-generated"}
                                </div>
                              </div>
                              <div>
                                <Label className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                  User ID
                                </Label>
                                <div className="text-sm font-mono bg-white dark:bg-slate-800 p-2 rounded mt-1">
                                  {formData.user_id || "System-generated"}
                                </div>
                              </div>
                              <div>
                                <Label className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                  Card Number
                                </Label>
                                <div className="text-sm font-mono bg-white dark:bg-slate-800 p-2 rounded mt-1">
                                  {formData.card || "Not assigned"}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Information for new users */}
                          {dialogMode === "add" && (
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center gap-2 mb-2">
                                <Info className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                  Automatic Generation
                                </span>
                              </div>
                              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                <li>
                                  • UID will be auto-generated by the system
                                </li>
                                <li>• User ID will be system-generated</li>
                                <li>
                                  • Card Number can be assigned later via card
                                  synchronization
                                </li>
                              </ul>
                            </div>
                          )}

                          {/* Editable fields */}
                          <div>
                            <Label
                              htmlFor="name"
                              className="text-sm font-medium"
                            >
                              Full Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="name"
                              placeholder="Enter full name"
                              value={formData.name || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  name: e.target.value,
                                })
                              }
                              className="mt-1"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label
                                htmlFor="password"
                                className="text-sm font-medium"
                              >
                                Password
                              </Label>
                              <Input
                                id="password"
                                type="password"
                                placeholder="Device access password"
                                value={formData.password || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    password: e.target.value,
                                  })
                                }
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label
                                htmlFor="privilege"
                                className="text-sm font-medium"
                              >
                                Privilege Level
                              </Label>
                              <Select
                                value={String(formData.privilege ?? 0)}
                                onValueChange={(value) =>
                                  setFormData({
                                    ...formData,
                                    privilege: Number(value),
                                  })
                                }
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select privilege level" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PRIVILEGES.map((p) => {
                                    const Icon = p.icon;
                                    return (
                                      <SelectItem
                                        key={p.value}
                                        value={String(p.value)}
                                      >
                                        <div className="flex items-center gap-2">
                                          <Icon className="h-4 w-4" />
                                          <span>{p.label}</span>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={
                              dialogMode === "add"
                                ? handleAddUser
                                : handleUpdateUser
                            }
                          >
                            {dialogMode === "add" ? "Add User" : "Update User"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* Fingerprint Management Dialog */}
                    <Dialog
                      open={fingerprintDialog.isOpen}
                      onOpenChange={closeFingerprintDialog}
                    >
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>
                            {fingerprintDialog.mode === "register"
                              ? "Register Fingerprint"
                              : "Delete Fingerprint"}
                            {fingerprintDialog.selectedUser && (
                              <Badge variant="outline" className="ml-2">
                                {fingerprintDialog.selectedUser.name}
                              </Badge>
                            )}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <Label className="text-sm font-medium">
                                User Information
                              </Label>
                              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg mt-1">
                                <p className="font-medium">
                                  {fingerprintDialog.selectedUser?.name}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  UID: {fingerprintDialog.selectedUser?.uid}
                                </p>
                              </div>
                            </div>
                            <div>
                              <Label
                                htmlFor="finger-index"
                                className="text-sm font-medium"
                              >
                                Finger Index
                              </Label>
                              <Select
                                value={selectedFingerIndex.toString()}
                                onValueChange={(value) =>
                                  setSelectedFingerIndex(Number(value))
                                }
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select finger index" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">
                                    Index 0 - Left Little
                                  </SelectItem>
                                  <SelectItem value="1">
                                    Index 1 - Left Ring
                                  </SelectItem>
                                  <SelectItem value="2">
                                    Index 2 - Left Middle
                                  </SelectItem>
                                  <SelectItem value="3">
                                    Index 3 - Left Index
                                  </SelectItem>
                                  <SelectItem value="4">
                                    Index 4 - Left Thumb
                                  </SelectItem>
                                  <SelectItem value="5">
                                    Index 5 - Right Thumb
                                  </SelectItem>
                                  <SelectItem value="6">
                                    Index 6 - Right Index
                                  </SelectItem>
                                  <SelectItem value="7">
                                    Index 7 - Right Middle
                                  </SelectItem>
                                  <SelectItem value="8">
                                    Index 8 - Right Ring
                                  </SelectItem>
                                  <SelectItem value="9">
                                    Index 9 - Right Little
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {fingerprintDialog.mode === "register" && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                <Fingerprint className="h-4 w-4" />
                                <span className="font-medium">
                                  Master Device Registration
                                </span>
                              </div>
                              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                Fingerprint will be registered on the master
                                device first, then automatically synchronized to
                                all other devices.
                              </p>
                            </div>
                          )}

                          {fingerprintDialog.mode === "delete" && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                                <AlertCircle className="h-4 w-4" />
                                <span className="font-medium">
                                  Delete From All Devices
                                </span>
                              </div>
                              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                This will permanently remove the fingerprint
                                template from all connected devices.
                              </p>
                            </div>
                          )}

                          {(() => {
                            const fpStatus = getUserFingerprintStatus(
                              fingerprintDialog.selectedUser?.uid || 0
                            );
                            return (
                              fpStatus.hasFingerprints && (
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                                    <Fingerprint className="h-4 w-4" />
                                    <span className="font-medium">
                                      Current Registration Status
                                    </span>
                                  </div>
                                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                                    User has {fpStatus.fingerprintCount}{" "}
                                    fingerprint(s) registered on devices:{" "}
                                    {fpStatus.devices
                                      .map((d) => d.device_name)
                                      .join(", ")}
                                  </p>
                                </div>
                              )
                            );
                          })()}
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={closeFingerprintDialog}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant={
                              fingerprintDialog.mode === "register"
                                ? "default"
                                : "destructive"
                            }
                            onClick={
                              fingerprintDialog.mode === "register"
                                ? handleRegisterFingerprint
                                : handleDeleteFingerprint
                            }
                            disabled={!isConnected}
                          >
                            {fingerprintDialog.mode === "register" ? (
                              <>
                                <Fingerprint className="mr-2 h-4 w-4" />
                                Register Fingerprint
                              </>
                            ) : (
                              <>
                                <X className="mr-2 h-4 w-4" />
                                Delete Fingerprint
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {isRefreshing ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
                      Loading users...
                    </p>
                  </div>
                ) : users.length > 0 ? (
                  <div className="overflow-x-auto">
                    <UITable>
                      <TableHeader>
                        <TableRow className="border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            UID
                          </TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            Full Name
                          </TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            Privilege
                          </TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            User ID
                          </TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            Card
                          </TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            Devices
                          </TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">
                            Access Method
                          </TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow
                            key={user.uid}
                            className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <TableCell>
                              {(() => {
                                const privilege = PRIVILEGES.find(
                                  (p) => p.value === user.privilege
                                );
                                const Icon = privilege?.icon || User;
                                return (
                                  <Badge
                                    variant="outline"
                                    className={`${
                                      privilege?.color ||
                                      "bg-gray-100 text-gray-700"
                                    } border-0 shadow-sm`}
                                  >
                                    <Icon className="h-3 w-3 mr-1" />
                                    {privilege?.label ||
                                      `Level ${user.privilege}`}
                                  </Badge>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded w-fit">
                                {user.user_id || "N/A"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.card && user.card !== 0 ? (
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-3 w-3 text-blue-600" />
                                  <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-lg px-2 py-1">
                                    {user.card}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-500 text-sm">
                                  No card
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {user.devices && user.devices.length > 0 ? (
                                  user.devices.map((deviceId) => {
                                    const device = devices.find(
                                      (d) => d.id === deviceId
                                    );
                                    const deviceName = device?.name || deviceId;
                                    return (
                                      <Badge
                                        key={deviceId}
                                        variant="secondary"
                                        className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                      >
                                        <HardDrive className="h-3 w-3 mr-1" />
                                        {deviceName}
                                      </Badge>
                                    );
                                  })
                                ) : (
                                  <span className="text-slate-500 text-sm">
                                    No devices
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        openFingerprintDialog("register", user)
                                      }
                                      disabled={
                                        !isConnected || isFingerprintProcessing
                                      }
                                      className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    >
                                      {isFingerprintProcessing &&
                                      fingerprintAction?.uid === user.uid &&
                                      fingerprintAction?.action ===
                                        "register" ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Fingerprint className="h-4 w-4 text-blue-600" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Register fingerprint on master device</p>
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        openFingerprintDialog("delete", user)
                                      }
                                      disabled={
                                        !isConnected || isFingerprintProcessing
                                      }
                                      className="h-8 w-8 p-0 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                    >
                                      {isFingerprintProcessing &&
                                      fingerprintAction?.uid === user.uid &&
                                      fingerprintAction?.action === "delete" ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <X className="h-4 w-4 text-orange-600" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete fingerprint from all devices</p>
                                  </TooltipContent>
                                </Tooltip>

                                {user.card && user.card !== 0 ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleDeleteCard(user.uid)
                                        }
                                        disabled={
                                          !isConnected || isCardProcessing
                                        }
                                        className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      >
                                        {isCardProcessing &&
                                        selectedUserForCard === user.uid &&
                                        cardAction === "delete" ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <CreditCard className="h-4 w-4 text-red-600" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Remove card assignment from user</p>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openUpdateDialog(user)}
                                      className="h-8 w-8 p-0 hover:bg-green-50 dark:hover:bg-green-900/20"
                                    >
                                      <Edit className="h-4 w-4 text-green-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit user information</p>
                                  </TooltipContent>
                                </Tooltip>

                                <AlertDialog>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            setDeleteUserUID(user.uid)
                                          }
                                          className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                          <Trash className="h-4 w-4 text-red-600" />
                                        </Button>
                                      </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Delete user from all devices</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Delete User
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete user{" "}
                                        <span className="font-semibold">
                                          {user.name}
                                        </span>{" "}
                                        with UID{" "}
                                        <span className="font-semibold">
                                          {user.uid}
                                        </span>
                                        ? This action cannot be undone and will
                                        remove the user from all devices.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={handleDeleteUser}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete User
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </UITable>
                  </div>
                ) : (
                  <div className="text-center py-16 px-4">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                        <Users className="h-8 w-8 text-slate-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
                          No users registered
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                          Get started by adding your first user to the access
                          control system
                        </p>
                        <Button onClick={openAddDialog}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Your First User
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </TooltipProvider>
  );
}
