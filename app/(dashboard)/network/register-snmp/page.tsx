// File: app/(dashboard)/network/register-snmp/page.tsx

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Swal from "sweetalert2";
import { useMqtt, MqttProvider } from "@/contexts/MqttContext";

// --- UI Components & Icons ---
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
  CardDescription,
  CardHeader,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  PlusCircle,
  Download,
  Trash2,
  Wifi,
  ChevronLeft,
  ChevronRight,
  ListFilter,
} from "lucide-react";

// --- Type Definitions ---
interface SnmpParameter {
  oid: string;
  Section: string;
  CustomName?: string;
  device?: string;
  userEntry?: string;
  cameraNumber?: string;
  Value?: any;
  status?: string;
  TimeStamp?: string;
  duration?: string;
  Topic?: string;
  Key?: string;
}

interface SnmpTableData {
  [oid: string]: Omit<SnmpParameter, "oid">;
}

interface AlarmOption {
  alarmName: string;
  status: string;
  device: string;
  type: string;
  timestamp: string;
}

interface AccessControlOption {
  userEntry: string;
  TimeStamp: string;
}

// --- Constants ---
const SECTIONS = [
  "Power",
  "Cooling",
  "Env",
  "Battery",
  "Solar",
  "Alarm",
  "AccessControl",
  "CCTV",
  "DeviceServer",
];
const MQTT_TOPIC_SETTING_GET = "IOT/Containment/snmp/setting/get";
const MQTT_TOPIC_SETTING_RESPONSE = "IOT/Containment/snmp/setting/response";
const MQTT_TOPIC_SETTING_ADD = "IOT/Containment/snmp/setting/add";
const MQTT_TOPIC_SETTING_DELETE = "IOT/Containment/snmp/setting/delete";
const MQTT_TOPIC_REQUEST_MIB = "IOT/Containment/snmp/mib/request";
const MQTT_TOPIC_RESPONSE_MIB = "IOT/Containment/snmp/mib/response";

// =================================================================
// Sub-Component: TableSkeleton
// =================================================================
const TableSkeleton = () => (
  <>
    {Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={index}>
        <TableCell>
          <Skeleton className="h-4 w-full" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-3/4" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-1/2" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-1/4" />
        </TableCell>
        <TableCell className="text-right">
          <Skeleton className="h-8 w-8 rounded-md" />
        </TableCell>
      </TableRow>
    ))}
  </>
);

// =================================================================
// Sub-Component: AddParameterDialog
// =================================================================
interface AddParameterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: any) => void;
  subscribeToTopic: (topic: string, callback: (payload: any) => void) => void;
}

const AddParameterDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  subscribeToTopic,
}: AddParameterDialogProps) => {
  const [section, setSection] = useState("Power");
  const [topic, setTopic] = useState("");
  const [payloadData, setPayloadData] = useState<Record<string, any>>({});
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");
  const [customName, setCustomName] = useState("");

  const [alarmOptions] = useState<AlarmOption[]>([
    {
      alarmName: "High Temperature",
      status: "Active",
      device: "Server Rack A",
      type: "Critical",
      timestamp: new Date().toISOString(),
    },
    {
      alarmName: "Door Open",
      status: "Inactive",
      device: "Main Entrance",
      type: "Warning",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [selectedAlarm, setSelectedAlarm] = useState<AlarmOption | null>(
    alarmOptions[0]
  );
  const [accessControlOptions] = useState<AccessControlOption[]>([
    { userEntry: "Admin User", TimeStamp: new Date().toISOString() },
    { userEntry: "Guest 123", TimeStamp: new Date().toISOString() },
  ]);
  const [selectedAccessControl, setSelectedAccessControl] =
    useState<AccessControlOption | null>(accessControlOptions[0]);

  const handleTopicSubscribe = () => {
    if (topic) {
      setIsSubscribing(true);
      subscribeToTopic(topic, (payload) => {
        setPayloadData(payload.value ? JSON.parse(payload.value) : payload);
        setIsSubscribing(false);
        Swal.fire(
          "Payload Received!",
          "Data from topic has been loaded.",
          "success"
        );
      });
    }
  };

  const handleConfirm = () => {
    let payloadToSend: Record<string, any> = { Section: section };
    if (["Alarm", "AccessControl"].includes(section)) {
      if (section === "Alarm") {
        if (!selectedAlarm) return;
        payloadToSend = { ...payloadToSend, ...selectedAlarm };
      } else {
        if (!selectedAccessControl) return;
        payloadToSend = { ...payloadToSend, ...selectedAccessControl };
      }
    } else {
      if (!selectedKey || !customName) {
        return Swal.fire(
          "Incomplete Form",
          "Please select a key and provide a custom name.",
          "error"
        );
      }
      payloadToSend.CustomName = customName;
      payloadToSend.Value = payloadData[selectedKey];
      payloadToSend.Topic = topic;
      payloadToSend.Key = selectedKey;
    }
    onSave(payloadToSend);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add New Parameter</DialogTitle>
          <DialogDescription>
            Register a new data point for SNMP polling.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-6 overflow-y-auto p-1 pr-4">
          <div className="space-y-3">
            <h3 className="font-semibold">1. Select Section</h3>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold">2. Configure Parameter</h3>
            {section === "Alarm" && (
              <div className="space-y-2 rounded-md border bg-slate-50 p-4 dark:bg-slate-800/30">
                <Label>Select Alarm (Using representative data)</Label>
                <Select
                  defaultValue="0"
                  onValueChange={(val) =>
                    setSelectedAlarm(alarmOptions[parseInt(val, 10)])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {alarmOptions.map((opt, i) => (
                      <SelectItem
                        key={i}
                        value={String(i)}
                      >{`${opt.alarmName} (${opt.status})`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {section === "AccessControl" && (
              <div className="space-y-2 rounded-md border bg-slate-50 p-4 dark:bg-slate-800/30">
                <Label>Select Access Control (Using representative data)</Label>
                <Select
                  defaultValue="0"
                  onValueChange={(val) =>
                    setSelectedAccessControl(
                      accessControlOptions[parseInt(val, 10)]
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accessControlOptions.map((opt, i) => (
                      <SelectItem key={i} value={String(i)}>{`${
                        opt.userEntry
                      } @ ${new Date(
                        opt.TimeStamp
                      ).toLocaleTimeString()}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {!["Alarm", "AccessControl"].includes(section) && (
              <div className="space-y-4 rounded-md border bg-slate-50 p-4 dark:bg-slate-800/30">
                <div className="space-y-1.5">
                  <Label htmlFor="topic-input">Subscribe to Topic</Label>
                  <div className="flex gap-2">
                    <Input
                      id="topic-input"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., IOT/Device/Sensor1"
                    />
                    <Button
                      type="button"
                      onClick={handleTopicSubscribe}
                      variant="secondary"
                      disabled={!topic || isSubscribing}
                    >
                      {isSubscribing && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Subscribe
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Select Key from Payload</Label>
                  <Select
                    value={selectedKey}
                    onValueChange={setSelectedKey}
                    disabled={Object.keys(payloadData).length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Waiting for payload..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(payloadData).map((key) => (
                        <SelectItem key={key} value={key}>
                          {key} (Value: {String(payloadData[key])})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="custom-name">Custom Name</Label>
                  <Input
                    id="custom-name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g., UPS Input Voltage"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm and Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// =================================================================
// --- Main Page Component ---
// =================================================================
function RegisterSnmpPage() {
  const { isReady, connectionStatus, publish, subscribe, unsubscribe } =
    useMqtt();
  const [tableData, setTableData] = useState<SnmpTableData>({});
  const [activeSection, setActiveSection] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Function to trigger file download
  const triggerFileDownload = (fileName: string, fileContent: string) => {
    try {
      // Decode Base64 content
      const binaryString = atob(fileContent);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/octet-stream" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      Swal.fire(
        "Download Started",
        `${fileName} is being downloaded.`,
        "success"
      );
    } catch (error) {
      console.error("Failed to decode or download file:", error);
      Swal.fire(
        "Download Failed",
        "There was an error processing the file.",
        "error"
      );
    }
  };

  const requestTableData = useCallback(() => {
    if (!isReady) return;
    setIsLoading(true);
    publish(MQTT_TOPIC_SETTING_GET, JSON.stringify({ Section: "All" }));
  }, [publish, isReady]);

  useEffect(() => {
    if (isReady) {
      const handleMessage = (topic: string, payloadStr: string) => {
        try {
          const payload = JSON.parse(payloadStr);
          if (topic === MQTT_TOPIC_SETTING_RESPONSE) {
            setTableData(payload || {});
            setIsLoading(false);
          } else if (topic === MQTT_TOPIC_RESPONSE_MIB) {
            if (payload.fileName && payload.fileContent) {
              triggerFileDownload(payload.fileName, payload.fileContent);
            } else {
              Swal.fire(
                "Download Failed",
                "Invalid response from the server for MIB file.",
                "error"
              );
            }
          }
        } catch (e) {
          console.error(`Error parsing MQTT message on topic ${topic}:`, e);
          if (topic === MQTT_TOPIC_SETTING_RESPONSE) setIsLoading(false);
        }
      };

      const topicsToSubscribe = [
        MQTT_TOPIC_SETTING_RESPONSE,
        MQTT_TOPIC_RESPONSE_MIB,
      ];
      topicsToSubscribe.forEach((topic) => subscribe(topic, handleMessage));

      requestTableData();

      return () => {
        topicsToSubscribe.forEach((topic) => unsubscribe(topic, handleMessage));
      };
    } else {
      setIsLoading(false);
    }
  }, [isReady, subscribe, unsubscribe, requestTableData]);

  const filteredData = useMemo(() => {
    const allData = Object.entries(tableData).map(([oid, item]) => ({
      oid,
      ...item,
    }));
    if (activeSection === "All") return allData;
    return allData.filter((item) => item.Section === activeSection);
  }, [tableData, activeSection]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = useMemo(
    () => Math.ceil(filteredData.length / itemsPerPage),
    [filteredData]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSection]);

  const handleSave = (payload: any) => {
    publish(MQTT_TOPIC_SETTING_ADD, JSON.stringify(payload));
    Swal.fire({
      icon: "success",
      title: "Sent!",
      text: "Configuration has been sent.",
      timer: 2000,
      showConfirmButton: false,
    });
    setTimeout(requestTableData, 500);
  };

  const handleDelete = (oid: string) => {
    Swal.fire({
      title: "Are you sure?",
      text: `This will permanently delete the parameter.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        publish(MQTT_TOPIC_SETTING_DELETE, JSON.stringify({ OID: oid }));
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "The delete command has been sent.",
          timer: 2000,
          showConfirmButton: false,
        });
        setTimeout(requestTableData, 500);
      }
    });
  };

  const handleDownloadMib = () => {
    publish(MQTT_TOPIC_REQUEST_MIB, JSON.stringify({ request: "mib_file" }));
    Swal.fire({
      icon: "info",
      title: "Requesting MIB File",
      text: "Please wait for the server to respond...",
      showConfirmButton: false,
    });
  };

  const handleSubscribeToTopic = (
    topic: string,
    callback: (payload: any) => void
  ) => {
    const handleDynamicMessage = (_: string, payloadStr: string) => {
      try {
        callback(JSON.parse(payloadStr));
        unsubscribe(topic, handleDynamicMessage);
      } catch (e) {
        console.error(`Error parsing payload from topic ${topic}`, e);
      }
    };
    subscribe(topic, handleDynamicMessage);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          SNMP Parameter Registration
        </h1>
        <p className="text-muted-foreground">
          Manage parameters for SNMP polling and data collection.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Wifi
                size={24}
                className={
                  connectionStatus === "Connected"
                    ? "text-green-500"
                    : "text-red-500"
                }
              />
              <div>
                <CardTitle>Registered Parameters</CardTitle>
                <CardDescription>
                  Connection Status:{" "}
                  <span
                    className={`font-bold ${
                      connectionStatus === "Connected"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {connectionStatus}
                  </span>
                </CardDescription>
              </div>
            </div>
            <div className="flex w-full flex-shrink-0 gap-2 sm:w-auto">
              <Button
                className="w-full sm:w-auto"
                onClick={() => setIsModalOpen(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Parameter
              </Button>
              <Button
                className="w-full sm:w-auto"
                variant="outline"
                onClick={handleDownloadMib}
              >
                <Download className="mr-2 h-4 w-4" /> Download MIB
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <ListFilter className="h-4 w-4 text-muted-foreground" />
            <p className="mr-2 text-sm font-medium">Filter by section:</p>
            {["All", ...SECTIONS].map((section) => (
              <Button
                key={section}
                variant={activeSection === section ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveSection(section)}
              >
                {section}
              </Button>
            ))}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">OID</TableHead>
                  <TableHead>Custom Name / Identifier</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Last Value / Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton />
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-64 text-center text-muted-foreground"
                    >
                      No parameters found for this section.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item) => (
                    <TableRow key={item.oid}>
                      <TableCell className="font-mono text-xs">
                        {item.oid}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.CustomName ||
                          item.device ||
                          item.userEntry ||
                          "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.Section}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {String(
                          item.Value ?? item.status ?? item.TimeStamp ?? "N/A"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.oid)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-4 pt-4 sm:flex-row sm:justify-between">
          <span className="text-sm text-muted-foreground">
            Total {filteredData.length} parameters found.
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              Page {currentPage} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <AddParameterDialog
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSave={handleSave}
        subscribeToTopic={handleSubscribeToTopic}
      />
    </div>
  );
}

// Wrapper component with MqttProvider
export default function SnmpPageWithProvider() {
  return (
    <MqttProvider>
      <RegisterSnmpPage />
    </MqttProvider>
  );
}
