// File: app/(dashboard)/network/register-snmp/page.tsx

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Swal from "sweetalert2";
import { useMqtt } from "@/contexts/MqttContext";

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
import {
  Loader2,
  PlusCircle,
  Download,
  Edit,
  Trash2,
  Wifi,
  ChevronLeft,
  ChevronRight,
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
  // Added from form logic
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

// =================================================================
// Sub-Component: SnmpPageHeader
// =================================================================
interface SnmpPageHeaderProps {
  connectionStatus: string;
  onAdd: () => void;
  onDownloadMib: () => void;
}

const SnmpPageHeader = ({
  connectionStatus,
  onAdd,
  onDownloadMib,
}: SnmpPageHeaderProps) => (
  <CardHeader>
    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
      <div>
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          Registered SNMP Parameters
          <Wifi
            size={20}
            className={
              connectionStatus === "Connected"
                ? "text-green-500"
                : "text-red-500"
            }
          />
        </CardTitle>
        <CardDescription>
          Manage parameters registered for SNMP polling and data collection.
        </CardDescription>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button size="sm" onClick={onAdd}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Parameter
        </Button>
        <Button size="sm" variant="outline" onClick={onDownloadMib}>
          <Download className="mr-2 h-4 w-4" /> Download MIB
        </Button>
      </div>
    </div>
  </CardHeader>
);

// =================================================================
// Sub-Component: SectionFilter
// =================================================================
interface SectionFilterProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const SectionFilter = ({
  activeSection,
  onSectionChange,
}: SectionFilterProps) => (
  <div className="px-6 pb-4">
    <div className="flex flex-wrap gap-2">
      {["All", ...SECTIONS].map((section) => (
        <Button
          key={section}
          variant={activeSection === section ? "default" : "outline"}
          size="sm"
          onClick={() => onSectionChange(section)}
          className="transition-all duration-200"
        >
          {section}
        </Button>
      ))}
    </div>
  </div>
);

// =================================================================
// Sub-Component: SnmpDataTable
// =================================================================
interface SnmpDataTableProps {
  data: SnmpParameter[];
  isLoading: boolean;
  onDelete: (oid: string) => void;
  // onEdit: (item: SnmpParameter) => void; // Uncomment when edit is ready
}

const SnmpDataTable = ({ data, isLoading, onDelete }: SnmpDataTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  }, [data, currentPage]);

  const totalPages = useMemo(
    () => Math.ceil(data.length / itemsPerPage),
    [data]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  return (
    <>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[25%]">OID</TableHead>
                <TableHead>Custom Name / Identifier</TableHead>
                <TableHead>Last Value / Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="text-muted-foreground">Loading data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
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
                      {String(
                        item.Value ?? item.status ?? item.TimeStamp ?? "N/A"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* <Button variant="ghost" size="icon" onClick={() => onEdit(item)} disabled>
                        <Edit className="h-4 w-4" />
                      </Button> */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(item.oid)}
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
      <CardFooter className="flex justify-between items-center pt-4">
        <span className="text-sm text-muted-foreground">
          Total {data.length} items
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardFooter>
    </>
  );
};

// =================================================================
// Sub-Component: AddParameterDialog
// =================================================================
interface AddParameterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: any) => void;
  isEditing: boolean;
  initialData?: SnmpParameter | null;
  subscribeToTopic: (topic: string, callback: (payload: any) => void) => void;
}

const AddParameterDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  isEditing,
  initialData,
  subscribeToTopic,
}: AddParameterDialogProps) => {
  const [section, setSection] = useState("Power");
  const [topic, setTopic] = useState("");
  const [payloadData, setPayloadData] = useState<Record<string, any>>({});
  const [selectedKey, setSelectedKey] = useState("");
  const [customName, setCustomName] = useState("");

  // Dummy data states
  const [alarmOptions, setAlarmOptions] = useState<AlarmOption[]>([]);
  const [selectedAlarm, setSelectedAlarm] = useState<AlarmOption | null>(null);
  const [accessControlOptions, setAccessControlOptions] = useState<
    AccessControlOption[]
  >([]);
  const [selectedAccessControl, setSelectedAccessControl] =
    useState<AccessControlOption | null>(null);

  // Fetch dummy data when section changes
  useEffect(() => {
    if (section === "Alarm") {
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
    } else if (section === "AccessControl") {
      const dummyAccess: AccessControlOption[] = [
        { userEntry: "Admin User", TimeStamp: new Date().toISOString() },
        { userEntry: "Guest 123", TimeStamp: new Date().toISOString() },
      ];
      setAccessControlOptions(dummyAccess);
      if (dummyAccess.length > 0) setSelectedAccessControl(dummyAccess[0]);
    }
  }, [section]);

  const handleTopicSubscribe = () => {
    if (topic) {
      subscribeToTopic(topic, (payload) => {
        setPayloadData(payload.value ? JSON.parse(payload.value) : payload);
      });
      Swal.fire(
        "Subscribed!",
        `Successfully subscribed to topic: ${topic}`,
        "success"
      );
    }
  };

  const handleConfirm = () => {
    let payloadToSend: Record<string, any> = { Section: section };
    if (isEditing) payloadToSend.OID = initialData?.oid;

    if (section === "Alarm") {
      if (!selectedAlarm)
        return Swal.fire("Error", "Please select an alarm.", "error");
      payloadToSend = { ...payloadToSend, ...selectedAlarm };
    } else if (section === "AccessControl") {
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

    onSave(payloadToSend);
    onOpenChange(false);
  };

  const renderStandardForm = () => (
    <div className="space-y-4 p-4 border rounded-md bg-muted/20">
      <div className="space-y-1.5">
        <Label>Subscribe to Topic for Live Data</Label>
        <div className="flex gap-2">
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., IOT/Device/Sensor1"
          />
          <Button
            type="button"
            onClick={handleTopicSubscribe}
            variant="secondary"
          >
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
                {key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Custom Name</Label>
        <Input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="e.g., UPS Input Voltage"
        />
      </div>
    </div>
  );

  const renderSpecialForm = (type: "Alarm" | "AccessControl") => {
    const options = type === "Alarm" ? alarmOptions : accessControlOptions;
    const onSelectChange =
      type === "Alarm"
        ? (val: string) => setSelectedAlarm(alarmOptions[parseInt(val)])
        : (val: string) =>
            setSelectedAccessControl(accessControlOptions[parseInt(val)]);
    const renderOption = (opt: any, i: number) => (
      <SelectItem key={i} value={String(i)}>
        {type === "Alarm"
          ? `${opt.alarmName} (${opt.status})`
          : `${opt.userEntry} (${new Date(
              opt.TimeStamp
            ).toLocaleTimeString()})`}
      </SelectItem>
    );

    return (
      <div className="space-y-2 p-4 border rounded-md bg-muted/20">
        <Label>Select {type} (Dummy Data)</Label>
        <Select onValueChange={onSelectChange} defaultValue="0">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{options.map(renderOption)}</SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Parameter" : "Add New Parameter"}
          </DialogTitle>
          <DialogDescription>
            Register a new parameter for SNMP polling.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="space-y-1.5">
            <Label>Select Section</Label>
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
          {section === "Alarm" && renderSpecialForm("Alarm")}
          {section === "AccessControl" && renderSpecialForm("AccessControl")}
          {section !== "Alarm" &&
            section !== "AccessControl" &&
            renderStandardForm()}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm and Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// =================================================================
// --- Komponen Halaman Utama ---
// =================================================================
export default function RegisterSnmpPage() {
  const { isReady, connectionStatus, publish, subscribe, unsubscribe } =
    useMqtt();

  const [tableData, setTableData] = useState<SnmpTableData>({});
  const [activeSection, setActiveSection] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<SnmpParameter | null>(null);

  const requestTableData = useCallback(() => {
    setIsLoading(true);
    publish(
      "IOT/Containment/snmp/setting/get",
      JSON.stringify({ Section: "All" })
    );
  }, [publish]);

  useEffect(() => {
    const handleMessage = (msgTopic: string, payloadStr: string) => {
      try {
        const payload = JSON.parse(payloadStr);
        if (msgTopic === "IOT/Containment/snmp/setting/response") {
          setTableData(payload || {});
          setIsLoading(false);
        }
      } catch (e) {
        console.error("Error parsing MQTT setting response:", e);
        setIsLoading(false);
      }
    };

    if (isReady) {
      subscribe("IOT/Containment/snmp/setting/response", handleMessage);
      requestTableData();
    }
    return () => {
      if (isReady) {
        unsubscribe("IOT/Containment/snmp/setting/response", handleMessage);
      }
    };
  }, [isReady, publish, subscribe, unsubscribe, requestTableData]);

  const handleSave = (payload: any) => {
    publish("IOT/Containment/snmp/setting/add", JSON.stringify(payload));
    Swal.fire(
      "Sent!",
      "Configuration has been sent to the service.",
      "success"
    );
    setTimeout(requestTableData, 500); // Refresh data after a short delay
  };

  const handleDelete = (oid: string) => {
    Swal.fire({
      title: "Are you sure?",
      text: `This will permanently delete the parameter with OID: ${oid}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        publish(
          "IOT/Containment/snmp/setting/delete",
          JSON.stringify({ OID: oid })
        );
        Swal.fire("Deleted!", "The delete command has been sent.", "success");
        setTimeout(requestTableData, 500);
      }
    });
  };

  const handleSubscribeToTopic = (
    topic: string,
    callback: (payload: any) => void
  ) => {
    const handleDynamicMessage = (_: string, payloadStr: string) => {
      try {
        callback(JSON.parse(payloadStr));
      } catch (e) {
        console.error(`Error parsing payload from dynamic topic ${topic}`, e);
      }
    };
    // It's good practice to unsubscribe from old dynamic topics if any, but for this form, we'll keep it simple.
    subscribe(topic, handleDynamicMessage);
  };

  const filteredData = useMemo(() => {
    const allData = Object.entries(tableData).map(([oid, item]) => ({
      oid,
      ...item,
    }));
    if (activeSection === "All") return allData;
    return allData.filter((item) => item.Section === activeSection);
  }, [tableData, activeSection]);

  return (
    <main className="p-4 md:p-6 lg:p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Register SNMP</h1>

      <Card>
        <SnmpPageHeader
          connectionStatus={connectionStatus || "Disconnected"}
          onAdd={() => {
            setIsEditing(false);
            setEditItem(null);
            setIsModalOpen(true);
          }}
          onDownloadMib={() =>
            Swal.fire(
              "Info",
              "Download MIB functionality is not yet implemented.",
              "info"
            )
          }
        />
        <SectionFilter
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <SnmpDataTable
          data={filteredData}
          isLoading={isLoading}
          onDelete={handleDelete}
        />
      </Card>

      <AddParameterDialog
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSave={handleSave}
        isEditing={isEditing}
        initialData={editItem}
        subscribeToTopic={handleSubscribeToTopic}
      />
    </main>
  );
}
