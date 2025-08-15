"use client";

import { useState, useEffect, FormEvent, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  GitBranch,
  PlusCircle,
  RefreshCw,
  Trash2,
  Copy,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  MinusCircle,
} from "lucide-react";
import Swal from "sweetalert2";
import Link from "next/link";
import { format } from "date-fns";

// Komponen shadcn/ui
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// Tipe Data
type KeyValue = { key: string; value: string };
type Device = {
  devEui: string;
  name: string;
  deviceProfileName: string;
  lastSeenAt: string | null;
};
type DeviceProfile = { id: string; name: string };
type Application = {
  id: string;
  name: string;
  description: string;
  tenantId: string;
};

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});
const generateHex = (length: number) =>
  [...Array(length)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("")
    .toUpperCase();
const ITEMS_PER_PAGE = 10;

export default function ApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params.id as string;

  // State utama
  const [application, setApplication] = useState<Application | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("device");
  const [currentPage, setCurrentPage] = useState(1);

  // State untuk form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [devEui, setDevEui] = useState("");
  const [joinEui, setJoinEui] = useState("0000000000000000");
  const [deviceProfileId, setDeviceProfileId] = useState("");
  const [isDisabled, setIsDisabled] = useState(false);
  const [disableFcntCheck, setDisableFcntCheck] = useState(false);
  // State baru untuk Tags dan Variables
  const [tags, setTags] = useState<KeyValue[]>([{ key: "", value: "" }]);
  const [variables, setVariables] = useState<KeyValue[]>([
    { key: "", value: "" },
  ]);

  // ... (fetchData, useEffects, handleDelete tetap sama seperti sebelumnya)

  const fetchData = useCallback(async () => {
    if (!applicationId) return;
    setIsLoading(true);
    try {
      const profilesPromise = fetch("/api/lorawan/device-profiles").then(
        (res) => res.json()
      );
      const devicesPromise = fetch(
        `/api/lorawan/applications/${applicationId}/devices`
      ).then((res) => res.json());
      const appDetailsPromise = fetch(
        `/api/lorawan/applications/${applicationId}`
      ).then((res) => res.json());

      const [profilesData, devicesData, appData] = await Promise.all([
        profilesPromise,
        devicesPromise,
        appDetailsPromise,
      ]);

      setProfiles(profilesData || []);
      setDevices(devicesData.result || []);
      setApplication(appData.application);
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset form saat modal dibuka, termasuk tags dan variables
  useEffect(() => {
    if (isModalOpen) {
      setName("");
      setDescription("");
      setDevEui(generateHex(16));
      setJoinEui("0000000000000000");
      setDeviceProfileId("");
      setIsDisabled(false);
      setDisableFcntCheck(false);
      setTags([{ key: "", value: "" }]);
      setVariables([{ key: "", value: "" }]);
      setActiveTab("device");
    }
  }, [isModalOpen]);

  const handleDelete = (
    e: React.MouseEvent,
    devEuiToDelete: string,
    deviceName: string
  ) => {
    e.stopPropagation();
    Swal.fire({
      title: `Delete ${deviceName}?`,
      text: `Are you sure you want to delete device ${devEuiToDelete}? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(
            `/api/lorawan/applications/${applicationId}/devices/${devEuiToDelete}`,
            {
              method: "DELETE",
            }
          );
          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Failed to delete device");
          }
          Toast.fire({
            icon: "success",
            title: "Device deleted successfully!",
          });
          fetchData();
        } catch (error) {
          Toast.fire({ icon: "error", title: (error as Error).message });
        }
      }
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (activeTab !== "device") {
      // Hanya submit jika di tab utama
      // Ganti tab ke 'device' jika user menekan submit dari tab lain
      setActiveTab("device");
      Toast.fire({
        icon: "info",
        title: "Please review device details before submitting.",
      });
      return;
    }
    if (!deviceProfileId) {
      Toast.fire({ icon: "error", title: "Please select a device profile." });
      return;
    }
    setIsSubmitting(true);
    const appKey = generateHex(32);

    // Format tags dan variables dari array ke object
    const formattedTags = tags.reduce((acc, tag) => {
      if (tag.key) acc[tag.key] = tag.value;
      return acc;
    }, {} as Record<string, string>);
    const formattedVariables = variables.reduce((acc, variable) => {
      if (variable.key) acc[variable.key] = variable.value;
      return acc;
    }, {} as Record<string, string>);

    try {
      const response = await fetch(
        `/api/lorawan/applications/${applicationId}/devices`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            devEui,
            joinEui,
            appKey,
            deviceProfileId,
            isDisabled,
            disableFrameCounterValidation: disableFcntCheck,
            tags: formattedTags, // Kirim data yang sudah diformat
            variables: formattedVariables, // Kirim data yang sudah diformat
          }),
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create device");
      }
      Toast.fire({ icon: "success", title: "Device created successfully!" });
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      Toast.fire({ icon: "error", title: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generic handler untuk key-value pairs
  const handleKeyValueChange = (
    index: number,
    field: "key" | "value",
    newValue: string,
    type: "tags" | "variables"
  ) => {
    const setter = type === "tags" ? setTags : setVariables;
    setter((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: newValue };
      return newItems;
    });
  };

  const addKeyValue = (type: "tags" | "variables") => {
    const setter = type === "tags" ? setTags : setVariables;
    setter((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeKeyValue = (index: number, type: "tags" | "variables") => {
    const setter = type === "tags" ? setTags : setVariables;
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  // Komponen render untuk Tags dan Variables (agar tidak duplikat kode)
  const KeyValueEditor = ({ type }: { type: "tags" | "variables" }) => {
    const items = type === "tags" ? tags : variables;
    const title = type === "tags" ? "Tag" : "Variable";
    return (
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder="Key"
              value={item.key}
              onChange={(e) =>
                handleKeyValueChange(index, "key", e.target.value, type)
              }
            />
            <Input
              placeholder="Value"
              value={item.value}
              onChange={(e) =>
                handleKeyValueChange(index, "value", e.target.value, type)
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={items.length <= 1}
              onClick={() => removeKeyValue(index, type)}
            >
              <MinusCircle className="h-5 w-5 text-destructive" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={() => addKeyValue(type)}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add {title}
        </Button>
      </div>
    );
  };

  // ... (Logika paginasi dan formatLastSeen tetap sama)

  const totalPages = Math.ceil(devices.length / ITEMS_PER_PAGE);
  const currentDevices = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return devices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [devices, currentPage]);

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString)
      return (
        <span className="text-muted-foreground flex items-center gap-2">
          <WifiOff size={14} /> Never seen
        </span>
      );
    return format(new Date(dateString), "yyyy-MM-dd HH:mm:ss");
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/lo-ra-wan/applications" passHref>
            <Button variant="outline" className="mb-2 flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to Applications
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <GitBranch className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {application?.name || "Loading Application..."}
              </h1>
              <p className="text-sm text-muted-foreground font-mono">
                ID: {applicationId}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- KONTEN UTAMA --- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Devices</CardTitle>
            <CardDescription>
              A list of devices registered to this application.
            </CardDescription>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <PlusCircle size={18} /> Add Device
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Add device</DialogTitle>
              </DialogHeader>
              <div className="border-b">
                <nav className="-mb-px flex space-x-6 px-4">
                  <button
                    onClick={() => setActiveTab("device")}
                    className={`${
                      activeTab === "device"
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                  >
                    Device
                  </button>
                  <button
                    onClick={() => setActiveTab("tags")}
                    className={`${
                      activeTab === "tags"
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                  >
                    Tags
                  </button>
                  <button
                    onClick={() => setActiveTab("variables")}
                    className={`${
                      activeTab === "variables"
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                  >
                    Variables
                  </button>
                </nav>
              </div>
              <form
                onSubmit={handleSubmit}
                className="py-4 max-h-[70vh] overflow-y-auto px-1 pr-6"
              >
                {activeTab === "device" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="devEui">Device EUI (EUI64) *</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            id="devEui"
                            value={devEui}
                            onChange={(e) => setDevEui(e.target.value)}
                            required
                            className="font-mono"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title="Copy"
                            onClick={() =>
                              navigator.clipboard.writeText(devEui)
                            }
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title="Generate"
                            onClick={() => setDevEui(generateHex(16))}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="joinEui">Join EUI (EUI64)</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            id="joinEui"
                            value={joinEui}
                            onChange={(e) => setJoinEui(e.target.value)}
                            className="font-mono"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title="Copy"
                            onClick={() =>
                              navigator.clipboard.writeText(joinEui)
                            }
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title="Generate"
                            onClick={() => setJoinEui(generateHex(16))}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile">Device profile *</Label>
                      <Select onValueChange={setDeviceProfileId} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a profile..." />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="flex items-center space-x-3">
                        <Switch
                          id="is-disabled"
                          checked={isDisabled}
                          onCheckedChange={setIsDisabled}
                        />
                        <Label htmlFor="is-disabled">Device is disabled</Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Switch
                          id="fcnt-check"
                          checked={disableFcntCheck}
                          onCheckedChange={setDisableFcntCheck}
                        />
                        <Label htmlFor="fcnt-check">
                          Disable frame-counter validation
                        </Label>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === "tags" && <KeyValueEditor type="tags" />}
                {activeTab === "variables" && (
                  <KeyValueEditor type="variables" />
                )}
                <div className="flex justify-end pt-8">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {/* Tabel Devices */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Last Seen</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>DevEUI</TableHead>
                <TableHead>Device Profile</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading devices...
                  </TableCell>
                </TableRow>
              ) : currentDevices.length > 0 ? (
                currentDevices.map((device) => (
                  <TableRow
                    key={device.devEui}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/lo-ra-wan/applications/${applicationId}/devices/${device.devEui}`
                      )
                    }
                  >
                    <TableCell className="whitespace-nowrap">
                      {formatLastSeen(device.lastSeenAt)}
                    </TableCell>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {device.devEui}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {device.deviceProfileName}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) =>
                          handleDelete(e, device.devEui, device.name)
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No devices found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          {/* Paginasi */}
          <div className="text-xs text-muted-foreground">
            Showing{" "}
            <strong>
              {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, devices.length)}
            </strong>{" "}
            to{" "}
            <strong>
              {Math.min(currentPage * ITEMS_PER_PAGE, devices.length)}
            </strong>{" "}
            of <strong>{devices.length}</strong> devices
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || devices.length === 0}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
