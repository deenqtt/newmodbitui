"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2, Copy, RefreshCw, Smartphone, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";
import { format } from "date-fns";

// Komponen Shadcn/UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Tipe data
type DeviceInfo = {
  name: string;
  devEui: string;
  description: string;
  deviceProfileId: string;
  deviceProfileName: string;
  lastSeenAt: string | null;
  isDisabled: boolean;
  skipFcntCheck: boolean;
};
type DeviceActivation = {
  devAddr: string;
  appSKey: string;
  nwkSEncKey: string;
  fCntUp: number;
  nFCntDown: number;
};
type DeviceKeys = { appKey: string; nwkKey: string; genAppKey: string };
type QueueItem = {
  id: string;
  isPending: boolean;
  fCnt: number;
  fPort: number;
  confirmed: boolean;
  data: string;
};
type DeviceDetails = {
  device: DeviceInfo;
  deviceActivation?: DeviceActivation | null;
  deviceKeys?: { deviceKeys: DeviceKeys } | null;
};
type DeviceProfile = { id: string; name: string };

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

// Fungsi untuk membalik urutan byte dalam sebuah hex string
const reverseHexString = (hex: string): string => {
  if (!hex || hex.length % 2 !== 0) return hex;
  return (hex.match(/.{1,2}/g) || []).reverse().join("");
};

// Komponen KeyDisplay yang sudah diupdate untuk menerima byteOrder
const KeyDisplay = ({
  label,
  value,
  onValueChange,
  showGenerate = false,
  byteOrder = "msb",
}: {
  label: string;
  value: string;
  onValueChange?: (value: string) => void;
  showGenerate?: boolean;
  byteOrder?: "msb" | "lsb";
}) => {
  const displayValue = byteOrder === "lsb" ? reverseHexString(value) : value;

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onValueChange) return;
    const rawValue = e.target.value;
    // Simpan selalu dalam format MSB
    const storedValue =
      byteOrder === "lsb" ? reverseHexString(rawValue) : rawValue;
    onValueChange(storedValue);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          value={displayValue}
          onChange={handleOnChange}
          readOnly={!onValueChange}
          className={`font-mono ${!onValueChange ? "bg-muted" : ""}`}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Copy"
          onClick={() => navigator.clipboard.writeText(displayValue)}
        >
          <Copy className="h-4 w-4" />
        </Button>
        {showGenerate && onValueChange && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Generate"
            onClick={() => onValueChange(generateHex(32))}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default function DeviceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params.id as string;
  const devEui = params.devEui as string;

  // State
  const [deviceDetails, setDeviceDetails] = useState<DeviceDetails | null>(
    null
  );
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("configuration");
  const [configForm, setConfigForm] = useState<Partial<DeviceInfo>>({});
  const [keysForm, setKeysForm] = useState<Partial<DeviceKeys>>({});
  const [enqueueForm, setEnqueueForm] = useState({
    confirmed: false,
    fPort: 1,
    data: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [byteOrder, setByteOrder] = useState<"msb" | "lsb">("msb");
  const [payloadEncoding, setPayloadEncoding] = useState<"hex" | "base64">(
    "hex"
  );

  const fetchInitialData = useCallback(async () => {
    if (!devEui || !applicationId) return;
    setIsLoading(true);
    try {
      const results = await Promise.allSettled([
        fetch(`/api/lorawan/applications/${applicationId}/devices/${devEui}`),
        fetch(
          `/api/lorawan/applications/${applicationId}/devices/${devEui}/activation`
        ),
        fetch(
          `/api/lorawan/applications/${applicationId}/devices/${devEui}/keys`
        ),
        fetch("/api/lorawan/device-profiles"),
        fetch(
          `/api/lorawan/applications/${applicationId}/devices/${devEui}/queue`
        ),
      ]);

      const deviceDetailsRes =
        results[0].status === "fulfilled"
          ? await results[0].value.json()
          : null;
      const activationRes =
        results[1].status === "fulfilled"
          ? await results[1].value.json()
          : null;
      const keysRes =
        results[2].status === "fulfilled"
          ? await results[2].value.json()
          : null;
      const profilesRes =
        results[3].status === "fulfilled"
          ? await results[3].value.json()
          : null;
      const queueRes =
        results[4].status === "fulfilled"
          ? await results[4].value.json()
          : null;

      if (!deviceDetailsRes?.device) throw new Error("Device data not found");

      setDeviceDetails({
        device: deviceDetailsRes.device,
        deviceActivation: activationRes?.deviceActivation,
        deviceKeys: keysRes,
      });
      setConfigForm(deviceDetailsRes.device);
      setKeysForm(keysRes?.deviceKeys || {});
      setProfiles(profilesRes || []);
      setQueue(queueRes?.result || []);
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  }, [devEui, applicationId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const response = await fetch(
        `/api/lorawan/applications/${applicationId}/devices/${devEui}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device: configForm }),
        }
      );
      if (!response.ok) throw new Error("Failed to update device");
      Toast.fire({ icon: "success", title: "Device updated successfully!" });
      fetchInitialData();
    } catch (error) {
      Toast.fire({ icon: "error", title: (error as Error).message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateKeys = async (e: FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const payload = {
        deviceKeys: {
          ...keysForm,
          devEui,
          nwkKey: keysForm.nwkKey,
          appKey: keysForm.appKey,
        },
      };
      const response = await fetch(
        `/api/lorawan/applications/${applicationId}/devices/${devEui}/keys`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) throw new Error("Failed to update OTAA keys");
      Toast.fire({ icon: "success", title: "OTAA keys updated successfully!" });
      fetchInitialData();
    } catch (error) {
      Toast.fire({ icon: "error", title: (error as Error).message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = () => {
    if (!deviceDetails) return;
    const { name, devEui } = deviceDetails.device;
    Swal.fire({
      title: `Delete ${name}?`,
      text: `Are you sure you want to delete device ${devEui}? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(
            `/api/lorawan/applications/${applicationId}/devices/${devEui}`,
            { method: "DELETE" }
          );
          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Failed to delete device");
          }
          Toast.fire({
            icon: "success",
            title: "Device deleted successfully!",
          });
          router.push(`/lo-ra-wan/applications/${applicationId}`);
        } catch (error) {
          Toast.fire({ icon: "error", title: (error as Error).message });
        }
      }
    });
  };

  const handleEnqueue = async (e: FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    let dataToSend = enqueueForm.data;
    try {
      if (payloadEncoding === "hex") {
        if (
          /[^0-9a-fA-F]/.test(enqueueForm.data) ||
          enqueueForm.data.length % 2 !== 0
        ) {
          throw new Error(
            "Invalid HEX string. Must be even length and contain only 0-9, a-f."
          );
        }
        dataToSend = Buffer.from(enqueueForm.data, "hex").toString("base64");
      }

      const body = { ...enqueueForm, data: dataToSend };
      const response = await fetch(
        `/api/lorawan/applications/${applicationId}/devices/${devEui}/queue`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to enqueue");
      }
      Toast.fire({ icon: "success", title: "Payload enqueued successfully!" });
      setEnqueueForm({ confirmed: false, fPort: 1, data: "" });
      fetchInitialData();
    } catch (error) {
      Toast.fire({ icon: "error", title: (error as Error).message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFlushQueue = async () => {
    Swal.fire({
      title: "Are you sure?",
      text: "This will delete all items from the queue!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, flush it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(
            `/api/lorawan/applications/${applicationId}/devices/${devEui}/queue`,
            { method: "DELETE" }
          );
          if (!response.ok) throw new Error("Failed to flush queue");
          Toast.fire({ icon: "success", title: "Queue flushed!" });
          fetchInitialData();
        } catch (error) {
          Toast.fire({ icon: "error", title: (error as Error).message });
        }
      }
    });
  };

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString)
      return <span className="text-muted-foreground">Never seen</span>;
    return format(new Date(dateString), "yyyy-MM-dd HH:mm:ss");
  };

  if (isLoading)
    return (
      <div className="container mx-auto p-6 text-center">
        Loading device details...
      </div>
    );
  if (!deviceDetails)
    return (
      <div className="container mx-auto p-6 text-center">Device not found.</div>
    );

  const { device, deviceActivation } = deviceDetails;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div>
        <div className="text-sm text-muted-foreground mb-2">
          <Link href="/lo-ra-wan/applications" className="hover:underline">
            Applications
          </Link>{" "}
          /
          <Link
            href={`/lo-ra-wan/applications/${applicationId}`}
            className="hover:underline"
          >
            {" "}
            {applicationId}{" "}
          </Link>{" "}
          /<span className="font-medium text-foreground"> {device.name}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Smartphone className="h-9 w-9 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {device.name}
              </h1>
              <p className="text-sm text-muted-foreground font-mono">
                {device.devEui}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/lo-ra-wan/applications/${applicationId}`} passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Application
              </Button>
            </Link>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <nav className="-mb-px flex space-x-6">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`${
                activeTab === "dashboard"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("configuration")}
              className={`${
                activeTab === "configuration"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
            >
              Configuration
            </button>
            <button
              onClick={() => setActiveTab("otaa")}
              className={`${
                activeTab === "otaa"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
            >
              OTAA keys
            </button>
            <button
              onClick={() => setActiveTab("activation")}
              className={`${
                activeTab === "activation"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
            >
              Activation
            </button>
            <button
              onClick={() => setActiveTab("queue")}
              className={`${
                activeTab === "queue"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
            >
              Queue
            </button>
          </nav>
        </CardHeader>
        <CardContent className="p-6">
          {activeTab === "dashboard" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">
                    Last seen:
                  </span>{" "}
                  <span className="text-foreground">
                    {formatLastSeen(device.lastSeenAt)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    Device profile:
                  </span>{" "}
                  <span className="text-foreground">
                    {device.deviceProfileName}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    Enabled:
                  </span>{" "}
                  <span
                    className={`font-semibold ${
                      device.isDisabled ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {device.isDisabled ? "No" : "Yes"}
                  </span>
                </div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground text-sm">
                  Description:
                </span>
                <p className="text-foreground mt-1">
                  {device.description || "-"}
                </p>
              </div>
            </div>
          )}
          {activeTab === "configuration" && (
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={configForm.name || ""}
                  onChange={(e) =>
                    setConfigForm((p) => ({ ...p, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={configForm.description || ""}
                  onChange={(e) =>
                    setConfigForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="devEui">Device EUI (EUI64) *</Label>
                <Input
                  id="devEui"
                  value={configForm.devEui || ""}
                  disabled
                  className="font-mono bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile">Device profile *</Label>
                <Select
                  value={configForm.deviceProfileId}
                  onValueChange={(v) =>
                    setConfigForm((p) => ({ ...p, deviceProfileId: v }))
                  }
                  required
                >
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
              <div className="flex items-center space-x-6 pt-2">
                <div className="flex items-center space-x-3">
                  <Switch
                    id="is-disabled"
                    checked={configForm.isDisabled || false}
                    onCheckedChange={(c) =>
                      setConfigForm((p) => ({ ...p, isDisabled: c }))
                    }
                  />
                  <Label htmlFor="is-disabled">Device is disabled</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Switch
                    id="fcnt-check"
                    checked={configForm.skipFcntCheck || false}
                    onCheckedChange={(c) =>
                      setConfigForm((p) => ({ ...p, skipFcntCheck: c }))
                    }
                  />
                  <Label htmlFor="fcnt-check">
                    Disable frame-counter validation
                  </Label>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Updating..." : "Update Configuration"}
                </Button>
              </div>
            </form>
          )}
          {activeTab === "otaa" && (
            <div>
              <div className="flex justify-end mb-4">
                <ToggleGroup
                  type="single"
                  value={byteOrder}
                  onValueChange={(value: "msb" | "lsb") =>
                    value && setByteOrder(value)
                  }
                  aria-label="Byte Order"
                >
                  <ToggleGroupItem
                    value="msb"
                    aria-label="Most Significant Byte"
                  >
                    MSB
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="lsb"
                    aria-label="Least Significant Byte"
                  >
                    LSB
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <form onSubmit={handleUpdateKeys} className="space-y-6">
                <KeyDisplay
                  label="Application key"
                  value={keysForm.nwkKey || ""}
                  onValueChange={(v) =>
                    setKeysForm((p) => ({ ...p, nwkKey: v }))
                  }
                  showGenerate={true}
                  byteOrder={byteOrder}
                />
                <KeyDisplay
                  label="Gen App Key (for Remote Multicast Setup)"
                  value={keysForm.genAppKey || ""}
                  byteOrder={byteOrder}
                />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? "Updating..." : "Update OTAA Keys"}
                  </Button>
                </div>
              </form>
            </div>
          )}
          {activeTab === "activation" &&
            (deviceActivation ? (
              <div>
                <div className="flex justify-end mb-4">
                  <ToggleGroup
                    type="single"
                    value={byteOrder}
                    onValueChange={(value: "msb" | "lsb") =>
                      value && setByteOrder(value)
                    }
                    aria-label="Byte Order"
                  >
                    <ToggleGroupItem
                      value="msb"
                      aria-label="Most Significant Byte"
                    >
                      MSB
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="lsb"
                      aria-label="Least Significant Byte"
                    >
                      LSB
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className="space-y-6">
                  <KeyDisplay
                    label="Device address"
                    value={deviceActivation.devAddr}
                    byteOrder={byteOrder}
                  />
                  <KeyDisplay
                    label="Network session key (LoRaWAN 1.0)"
                    value={deviceActivation.nwkSEncKey}
                    byteOrder={byteOrder}
                  />
                  <KeyDisplay
                    label="Application session key (LoRaWAN 1.0)"
                    value={deviceActivation.appSKey}
                    byteOrder={byteOrder}
                  />
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Uplink frame-counter</Label>
                      <Input
                        value={deviceActivation.fCntUp}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Downlink frame-counter</Label>
                      <Input
                        value={deviceActivation.nFCntDown}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-10">
                Device has not been activated yet.
              </div>
            ))}
          {activeTab === "queue" && (
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Enqueue Payload</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleEnqueue} className="space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="confirmed"
                            checked={enqueueForm.confirmed}
                            onCheckedChange={(c) =>
                              setEnqueueForm((p) => ({ ...p, confirmed: c }))
                            }
                          />
                          <Label htmlFor="confirmed">Confirmed Downlink</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="fport">FPort</Label>
                          <Input
                            id="fport"
                            type="number"
                            className="w-24"
                            value={enqueueForm.fPort}
                            onChange={(e) =>
                              setEnqueueForm((p) => ({
                                ...p,
                                fPort: parseInt(e.target.value, 10) || 1,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <ToggleGroup
                        type="single"
                        value={payloadEncoding}
                        onValueChange={(value: "hex" | "base64") =>
                          value && setPayloadEncoding(value)
                        }
                      >
                        <ToggleGroupItem value="hex">HEX</ToggleGroupItem>
                        <ToggleGroupItem value="base64">Base64</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    <div>
                      <Label htmlFor="payload">
                        Payload ({payloadEncoding.toUpperCase()})
                      </Label>
                      <Textarea
                        id="payload"
                        className="font-mono mt-1"
                        value={enqueueForm.data}
                        onChange={(e) =>
                          setEnqueueForm((p) => ({
                            ...p,
                            data: e.target.value,
                          }))
                        }
                        placeholder={
                          payloadEncoding === "hex"
                            ? "e.g., 01020304"
                            : "e.g., AQIDBA=="
                        }
                      />
                    </div>
                    <Button type="submit" disabled={isUpdating}>
                      {isUpdating ? "Enqueuing..." : "Enqueue Payload"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Current Queue</h3>
                  <Button variant="outline" onClick={handleFlushQueue}>
                    Flush queue
                  </Button>
                </div>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>FPort</TableHead>
                        <TableHead>Confirmed</TableHead>
                        <TableHead>Data (HEX)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queue.length > 0 ? (
                        queue.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-xs">
                              {item.id}
                            </TableCell>
                            <TableCell>
                              {item.isPending ? "Yes" : "No"}
                            </TableCell>
                            <TableCell>{item.fPort}</TableCell>
                            <TableCell>
                              {item.confirmed ? "Yes" : "No"}
                            </TableCell>
                            <TableCell className="font-mono">
                              {Buffer.from(item.data, "base64").toString("hex")}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            Queue is empty.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
