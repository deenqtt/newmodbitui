// File: app/(dashboard)/network/register-snmp/page.tsx

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Swal from "sweetalert2";
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
import { useMqtt } from "@/contexts/MqttContext";
import {
  Loader2,
  PlusCircle,
  Download,
  Edit,
  Trash2,
  Wifi,
} from "lucide-react";

// --- Type Definitions ---
interface SnmpParameter {
  oid: string;
  CustomName?: string;
  device?: string;
  userEntry?: string;
  cameraNumber?: string;
  Value?: any;
  status?: string;
  TimeStamp?: string;
  duration?: string;
  Section: string;
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

export default function RegisterSnmpPage() {
  const { isReady, connectionStatus, publish, subscribe, unsubscribe } =
    useMqtt();

  const [tableData, setTableData] = useState<SnmpTableData>({});
  const [activeSection, setActiveSection] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editOid, setEditOid] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState("Power");

  // Form States
  const [topic, setTopic] = useState("");
  const [payloadData, setPayloadData] = useState<Record<string, any>>({});
  const [selectedKey, setSelectedKey] = useState("");
  const [customName, setCustomName] = useState("");

  // States for Dummy Data
  const [alarmOptions, setAlarmOptions] = useState<AlarmOption[]>([]);
  const [selectedAlarm, setSelectedAlarm] = useState<AlarmOption | null>(null);
  const [accessControlOptions, setAccessControlOptions] = useState<
    AccessControlOption[]
  >([]);
  const [selectedAccessControl, setSelectedAccessControl] =
    useState<AccessControlOption | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- FUNGSI DUMMY UNTUK ALARM & ACCESS CONTROL ---
  // TODO: Ganti dengan data asli dari API jika sudah siap
  const fetchAlarmLogs = useCallback(() => {
    console.log("Fetching DUMMY alarm logs...");
    const dummyAlarms: AlarmOption[] = [
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
    ];
    setAlarmOptions(dummyAlarms);
    if (dummyAlarms.length > 0) setSelectedAlarm(dummyAlarms[0]);
  }, []);

  const fetchAccessControl = useCallback(() => {
    console.log("Fetching DUMMY access control logs...");
    const dummyAccess: AccessControlOption[] = [
      { userEntry: "Admin User", TimeStamp: new Date().toISOString() },
      { userEntry: "Guest 123", TimeStamp: new Date().toISOString() },
    ];
    setAccessControlOptions(dummyAccess);
    if (dummyAccess.length > 0) setSelectedAccessControl(dummyAccess[0]);
  }, []);

  // Efek untuk memuat data dummy saat section di modal berubah
  useEffect(() => {
    if (selectedSection === "Alarm") {
      fetchAlarmLogs();
    } else if (selectedSection === "AccessControl") {
      fetchAccessControl();
    }
  }, [selectedSection, fetchAlarmLogs, fetchAccessControl]);

  // --- MQTT Logic ---
  useEffect(() => {
    const handleMessage = (msgTopic: string, payloadStr: string) => {
      try {
        const payload = JSON.parse(payloadStr);
        if (msgTopic === "IOT/Containment/snmp/setting/response") {
          setTableData(payload || {});
          setIsLoading(false);
        } else if (msgTopic === "IOT/Containment/snmp/mib/response") {
          // Logic download MIB
        } else {
          // Asumsi topik lain adalah untuk key-value
          setPayloadData(payload.value ? JSON.parse(payload.value) : payload);
        }
      } catch (e) {
        console.error("Error parsing MQTT message:", e);
      }
    };

    if (isReady) {
      subscribe("IOT/Containment/snmp/setting/response", handleMessage);
      subscribe("IOT/Containment/snmp/mib/response", handleMessage);
      publish(
        "IOT/Containment/snmp/setting/get",
        JSON.stringify({ Section: "All" })
      );
    }
    return () => {
      if (isReady) {
        unsubscribe("IOT/Containment/snmp/setting/response", handleMessage);
        unsubscribe("IOT/Containment/snmp/mib/response", handleMessage);
      }
    };
  }, [isReady, publish, subscribe, unsubscribe]);

  const handleTopicSubscribe = () => {
    if (topic) {
      // Unsubscribe dari topik lama jika ada, untuk efisiensi
      Object.values(tableData).forEach((item) =>
        unsubscribe(item.topic, () => {})
      );
      subscribe(topic, (msgTopic, payloadStr) => {
        try {
          const payload = JSON.parse(payloadStr);
          setPayloadData(payload.value ? JSON.parse(payload.value) : payload);
        } catch (e) {
          console.error(`Error parsing payload from ${msgTopic}`, e);
        }
      });
      Swal.fire(
        "Subscribed!",
        `Successfully subscribed to topic: ${topic}`,
        "success"
      );
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditOid(null);
    setSelectedSection("Power");
    setTopic("");
    setPayloadData({});
    setSelectedKey("");
    setCustomName("");
    setSelectedAlarm(null);
    setSelectedAccessControl(null);
  };

  const handleConfirmAndSend = () => {
    let payloadToSend: Record<string, any> = { Section: selectedSection };

    if (isEditing) payloadToSend.OID = editOid;

    if (selectedSection === "Alarm") {
      if (!selectedAlarm)
        return Swal.fire("Error", "Please select an alarm.", "error");
      payloadToSend = { ...payloadToSend, ...selectedAlarm };
    } else if (selectedSection === "AccessControl") {
      if (!selectedAccessControl)
        return Swal.fire(
          "Error",
          "Please select an access control log.",
          "error"
        );
      payloadToSend = { ...payloadToSend, ...selectedAccessControl };
    } else {
      if (!selectedKey || !customName)
        return Swal.fire(
          "Error",
          "Please select a key and provide a custom name.",
          "error"
        );
      payloadToSend.CustomName = customName;
      payloadToSend.Value = payloadData[selectedKey];
      payloadToSend.Topic = topic;
      payloadToSend.Key = selectedKey;
    }

    publish("IOT/Containment/snmp/setting/add", JSON.stringify(payloadToSend));
    Swal.fire(
      "Sent!",
      "Configuration has been sent to the service.",
      "success"
    );
    setIsModalOpen(false);
    resetForm();
    setTimeout(
      () =>
        publish(
          "IOT/Containment/snmp/setting/get",
          JSON.stringify({ Section: "All" })
        ),
      500
    ); // Refresh data
  };

  const handleDelete = (oid: string) => {
    Swal.fire({
      title: "Are you sure?",
      text: `Delete OID: ${oid}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        publish(
          "IOT/Containment/snmp/setting/delete",
          JSON.stringify({ OID: oid })
        );
        Swal.fire("Deleted!", "Delete command sent.", "success");
        setTimeout(
          () =>
            publish(
              "IOT/Containment/snmp/setting/get",
              JSON.stringify({ Section: "All" })
            ),
          500
        ); // Refresh data
      }
    });
  };

  // --- Computed Values for Display ---
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

  return (
    <main className="p-4 md:p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Register SNMP</h1>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                Registered Parameters
                <Wifi
                  size={16}
                  className={
                    connectionStatus === "Connected"
                      ? "text-green-500"
                      : "text-red-500"
                  }
                />
              </CardTitle>
              <CardDescription>
                Parameters registered for SNMP polling.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setIsModalOpen(true);
                  resetForm();
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Parameter
              </Button>
              <Button size="sm" variant="outline">
                <Download className="mr-2 h-4 w-4" /> Download MIB
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              "All",
              "Power",
              "Cooling",
              "Env",
              "Battery",
              "Solar",
              "Alarm",
              "AccessControl",
              "CCTV",
              "DeviceServer",
            ].map((section) => (
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OID</TableHead>
                <TableHead>Custom Name</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-48 text-center text-muted-foreground"
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
                      {item.Value || item.status || item.TimeStamp || "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" disabled>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.oid)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-end">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Parameter" : "Add Parameter"}
            </DialogTitle>
            <DialogDescription>
              Register a new parameter for SNMP polling.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Section</Label>
              <Select
                value={selectedSection}
                onValueChange={setSelectedSection}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Power",
                    "Cooling",
                    "Env",
                    "Battery",
                    "Solar",
                    "Alarm",
                    "AccessControl",
                    "CCTV",
                    "DeviceServer",
                  ].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSection === "Alarm" && (
              <div className="space-y-2 p-4 border rounded-md">
                <Label>Select Alarm (Dummy Data)</Label>
                <Select
                  onValueChange={(val) => setSelectedAlarm(alarmOptions[val])}
                  defaultValue="0"
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {alarmOptions.map((opt, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {opt.alarmName} ({opt.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedSection === "AccessControl" && (
              <div className="space-y-2 p-4 border rounded-md">
                <Label>Select Access Control (Dummy Data)</Label>
                <Select
                  onValueChange={(val) =>
                    setSelectedAccessControl(accessControlOptions[val])
                  }
                  defaultValue="0"
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accessControlOptions.map((opt, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {opt.userEntry} (
                        {new Date(opt.TimeStamp).toLocaleTimeString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedSection !== "Alarm" &&
              selectedSection !== "AccessControl" && (
                <div className="space-y-4 p-4 border rounded-md">
                  <div className="space-y-2">
                    <Label>Subscribe to Topic for Live Data</Label>
                    <div className="flex gap-2">
                      <Input
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., IOT/Device/Sensor1"
                      />
                      <Button type="button" onClick={handleTopicSubscribe}>
                        Subscribe
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
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
                            {key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Custom Name</Label>
                    <Input
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g., UPS Input Voltage"
                    />
                  </div>
                </div>
              )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAndSend}>Confirm and Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
