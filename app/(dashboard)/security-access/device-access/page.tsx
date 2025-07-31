// File: app/(dashboard)/security-access/device-access/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import Swal from "sweetalert2";
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  Users,
  Fingerprint,
  CreditCard,
  XCircle, // Tambahkan ikon untuk hapus fingerprint/card individual jika diperlukan
} from "lucide-react";
import { ZkTecoDevice, ZkTecoDeviceStatus, ZkTecoUser } from "@prisma/client";
import { Label } from "@/components/ui/label"; // Tambahkan Label jika belum ada

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export default function DeviceAccessPage() {
  // State untuk manajemen perangkat
  const [devices, setDevices] = useState<ZkTecoDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isSubmittingDevice, setIsSubmittingDevice] = useState(false);
  const [isDeleteDeviceAlertOpen, setIsDeleteDeviceAlertOpen] = useState(false);
  const [deviceToEdit, setDeviceToEdit] = useState<ZkTecoDevice | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<ZkTecoDevice | null>(
    null
  );
  const [deviceForm, setDeviceForm] = useState({
    name: "",
    ipAddress: "",
    port: "",
    topicIdentifier: "",
  });

  // --- State untuk manajemen pengguna ---
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedDeviceForUsers, setSelectedDeviceForUsers] =
    useState<ZkTecoDevice | null>(null);
  const [deviceUsers, setDeviceUsers] = useState<ZkTecoUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ZkTecoUser | null>(null);
  const [isDeleteUserAlertOpen, setIsDeleteUserAlertOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: "", password: "" });

  // --- BARU: State untuk Register Fingerprint & Card ---
  const [isRegisterFpModalOpen, setIsRegisterFpModalOpen] = useState(false);
  const [userToRegisterFp, setUserToRegisterFp] = useState<ZkTecoUser | null>(
    null
  );
  const [fingerIdInput, setFingerIdInput] = useState("");
  const [isRegisteringFpOrCard, setIsRegisteringFpOrCard] = useState(false); // Untuk tombol Register FP/Card
  const [isRegisterCardAlertOpen, setIsRegisterCardAlertOpen] = useState(false);
  const [userToRegisterCard, setUserToRegisterCard] =
    useState<ZkTecoUser | null>(null);

  const getAuthHeaders = useCallback(() => {
    const authToken = localStorage.getItem("authToken");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    };
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/zkteco/devices`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch devices");
      setDevices(await response.json());
    } catch (error) {
      console.error("Error fetching ZKTeco devices:", error);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 5000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  // --- FUNGSI-FUNGSI UNTUK MANAJEMEN PERANGKAT ---
  const openAddDeviceModal = () => {
    setDeviceToEdit(null);
    setDeviceForm({
      name: "",
      ipAddress: "",
      port: "",
      topicIdentifier: "front",
    });
    setIsDeviceModalOpen(true);
  };

  const openEditDeviceModal = (device: ZkTecoDevice) => {
    setDeviceToEdit(device);
    setDeviceForm({
      name: device.name,
      ipAddress: device.ipAddress,
      port: String(device.port),
      topicIdentifier: device.topicIdentifier,
    });
    setIsDeviceModalOpen(true);
  };

  const handleDeviceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDevice(true);
    const url = deviceToEdit
      ? `${API_BASE_URL}/api/zkteco/devices/${deviceToEdit.id}`
      : `${API_BASE_URL}/api/zkteco/devices`;
    const method = deviceToEdit ? "PUT" : "POST";
    try {
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(deviceForm),
      });
      if (!response.ok) throw new Error((await response.json()).message);
      Swal.fire(
        "Success",
        `Device ${method === "POST" ? "added" : "updated"} successfully!`,
        "success"
      );
      setIsDeviceModalOpen(false);
      fetchDevices();
    } catch (error: any) {
      Swal.fire("Error", `Operation failed: ${error.message}`, "error");
    } finally {
      setIsSubmittingDevice(false);
    }
  };

  const handleDeviceDelete = async () => {
    if (!deviceToDelete) return;
    setIsSubmittingDevice(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/zkteco/devices/${deviceToDelete.id}`,
        { method: "DELETE", headers: getAuthHeaders() }
      );
      if (response.status !== 204)
        throw new Error((await response.json()).message);
      Swal.fire("Deleted!", "The device has been deleted.", "success");
      fetchDevices();
    } catch (error: any) {
      Swal.fire("Error", `Deletion failed: ${error.message}`, "error");
    } finally {
      setIsSubmittingDevice(false);
      setIsDeleteDeviceAlertOpen(false);
    }
  };

  // --- FUNGSI-FUNGSI UNTUK MANAJEMEN PENGGUNA ---
  const fetchDeviceUsers = useCallback(
    async (deviceId: string) => {
      setIsLoadingUsers(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/zkteco/devices/${deviceId}/users`,
          { headers: getAuthHeaders() }
        );
        if (!response.ok) throw new Error("Failed to fetch users");
        setDeviceUsers(await response.json());
      } catch (error) {
        console.error("Error fetching device users:", error);
        Swal.fire(
          "Error",
          "Could not fetch user list for this device.",
          "error"
        );
      } finally {
        setIsLoadingUsers(false);
      }
    },
    [getAuthHeaders]
  );

  const openUserManagementModal = (device: ZkTecoDevice) => {
    setSelectedDeviceForUsers(device);
    setIsUserModalOpen(true);
    fetchDeviceUsers(device.id);
  };

  // =======================================================
  // GANTI FUNGSI INI
  // =======================================================
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeviceForUsers) return;
    setIsSubmittingUser(true);
    try {
      // Panggil endpoint 'command' dengan UID 'new' sebagai penanda.
      // Ini memberitahu backend bahwa kita sedang membuat user baru.
      const url = `${API_BASE_URL}/api/zkteco/devices/${selectedDeviceForUsers.id}/users/new/command`;

      const response = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          command: "create_user",
          // Kirim nama dan password sebagai 'args' sesuai API baru kita
          args: [newUserForm.name, newUserForm.password],
        }),
      });

      if (!response.ok) throw new Error((await response.json()).message);

      Swal.fire(
        "Command Sent",
        "Create user command has been sent. Please wait a moment for the device to sync.",
        "info"
      );
      setIsAddUserModalOpen(false);
      setNewUserForm({ name: "", password: "" });
      // Beri jeda agar service sempat sinkronisasi sebelum fetch ulang
      setTimeout(() => fetchDeviceUsers(selectedDeviceForUsers.id), 3000);
    } catch (error: any) {
      Swal.fire("Error", `Failed to send command: ${error.message}`, "error");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // =======================================================
  // PASTIKAN FUNGSI INI SESUAI (sudah benar sebelumnya, tapi ini untuk konfirmasi)
  // =======================================================
  const handleDeleteUser = async () => {
    if (!userToDelete || !selectedDeviceForUsers) return;
    setIsSubmittingUser(true);
    try {
      // URL ini sudah benar menargetkan API command yang baru
      const url = `${API_BASE_URL}/api/zkteco/devices/${selectedDeviceForUsers.id}/users/${userToDelete.uid}/command`;
      const response = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          command: "delete_user",
          args: [], // args kosong karena UID sudah ada di URL
        }),
      });
      if (!response.ok) throw new Error((await response.json()).message);
      Swal.fire(
        "Command Sent",
        "Delete user command has been sent. Please wait for sync.",
        "info"
      );
      setTimeout(() => fetchDeviceUsers(selectedDeviceForUsers.id), 3000);
    } catch (error: any) {
      Swal.fire(
        "Error",
        `Failed to send delete command: ${error.message}`,
        "error"
      );
    } finally {
      setIsSubmittingUser(false);
      setIsDeleteUserAlertOpen(false);
    }
  };
  // --- BARU: FUNGSI untuk Register Fingerprint ---
  const openRegisterFpModal = (user: ZkTecoUser) => {
    setUserToRegisterFp(user);
    setFingerIdInput(""); // Reset input
    setIsRegisterFpModalOpen(true);
  };

  const handleRegisterFingerprint = async () => {
    if (!userToRegisterFp || !selectedDeviceForUsers) return;

    const fingerId = parseInt(fingerIdInput, 10);
    if (isNaN(fingerId) || fingerId < 0 || fingerId > 9) {
      // ZKTeco typically uses 0-9 or 1-10
      Swal.fire(
        "Invalid Input",
        "Finger ID must be a number between 0 and 9.",
        "warning"
      );
      return;
    }

    setIsRegisteringFpOrCard(true); // Gunakan state ini untuk loading tombol
    try {
      const url = `${API_BASE_URL}/api/zkteco/devices/${selectedDeviceForUsers.id}/users/${userToRegisterFp.uid}/command`;
      const response = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          command: "register_fp",
          args: [String(fingerId)], // Kirim sebagai string, sesuai format payload command
        }),
      });
      if (!response.ok) throw new Error((await response.json()).message);

      Swal.fire(
        "Command Sent",
        `Please place finger ${fingerId} of ${userToRegisterFp.name} on the device. Waiting for registration...`,
        "info"
      );
      setIsRegisterFpModalOpen(false); // Tutup modal
      setTimeout(() => fetchDeviceUsers(selectedDeviceForUsers.id), 5000); // Beri jeda lebih lama
    } catch (error: any) {
      Swal.fire("Error", `Failed to send command: ${error.message}`, "error");
    } finally {
      setIsRegisteringFpOrCard(false);
    }
  };

  // --- BARU: FUNGSI untuk Delete Fingerprint (perlu penyesuaian UI untuk memilih FP yang dihapus) ---
  const handleDeleteFingerprint = async (
    user: ZkTecoUser,
    fingerId: number
  ) => {
    if (!selectedDeviceForUsers) return;

    Swal.fire({
      title: "Are you sure?",
      text: `This will send a command to delete fingerprint ID ${fingerId} for ${user.name} from the device.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsRegisteringFpOrCard(true); // Menggunakan state yang sama, atau bisa dibuat baru
        try {
          const url = `${API_BASE_URL}/api/zkteco/devices/${selectedDeviceForUsers.id}/users/${user.uid}/command`;
          const response = await fetch(url, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              command: "delete_fp",
              args: [String(fingerId)], // Kirim sebagai string
            }),
          });
          if (!response.ok) throw new Error((await response.json()).message);

          Swal.fire(
            "Command Sent",
            "Delete fingerprint command has been sent. Please wait for sync.",
            "info"
          );
          setTimeout(() => fetchDeviceUsers(selectedDeviceForUsers.id), 3000);
        } catch (error: any) {
          Swal.fire(
            "Error",
            `Failed to send command: ${error.message}`,
            "error"
          );
        } finally {
          setIsRegisteringFpOrCard(false);
        }
      }
    });
  };

  // --- BARU: FUNGSI untuk Register Card ---
  const openRegisterCardAlert = (user: ZkTecoUser) => {
    setUserToRegisterCard(user);
    setIsRegisterCardAlertOpen(true);
  };

  const handleRegisterCard = async () => {
    if (!userToRegisterCard || !selectedDeviceForUsers) return;

    setIsRegisteringFpOrCard(true);
    try {
      const url = `${API_BASE_URL}/api/zkteco/devices/${selectedDeviceForUsers.id}/users/${userToRegisterCard.uid}/command`;
      const response = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          command: "register_card",
          args: [], // Register card tidak membutuhkan args dari UI, hanya dari tap di device
        }),
      });
      if (!response.ok) throw new Error((await response.json()).message);

      Swal.fire(
        "Command Sent",
        `Please tap the card for ${userToRegisterCard.name} on the device. Waiting for registration...`,
        "info"
      );
      setIsRegisterCardAlertOpen(false); // Tutup alert
      setTimeout(() => fetchDeviceUsers(selectedDeviceForUsers.id), 5000); // Beri jeda lebih lama
    } catch (error: any) {
      Swal.fire("Error", `Failed to send command: ${error.message}`, "error");
    } finally {
      setIsRegisteringFpOrCard(false);
    }
  };

  // --- BARU: FUNGSI untuk Delete Card ---
  const handleDeleteCard = async (user: ZkTecoUser) => {
    if (!selectedDeviceForUsers || !user.card) return; // Pastikan user punya kartu untuk dihapus

    Swal.fire({
      title: "Are you sure?",
      text: `This will send a command to delete the card for ${user.name} from the device.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsRegisteringFpOrCard(true); // Menggunakan state yang sama
        try {
          const url = `${API_BASE_URL}/api/zkteco/devices/${selectedDeviceForUsers.id}/users/${user.uid}/command`;
          const response = await fetch(url, {
            method: "POST", // Tetap POST karena itu yang diterima endpoint command Anda
            headers: getAuthHeaders(),
            body: JSON.stringify({
              command: "delete_card",
              args: [],
            }),
          });
          if (!response.ok) throw new Error((await response.json()).message);

          Swal.fire(
            "Command Sent",
            "Delete card command has been sent. Please wait for sync.",
            "info"
          );
          setTimeout(() => fetchDeviceUsers(selectedDeviceForUsers.id), 3000);
        } catch (error: any) {
          Swal.fire(
            "Error",
            `Failed to send command: ${error.message}`,
            "error"
          );
        } finally {
          setIsRegisteringFpOrCard(false);
        }
      }
    });
  };

  const getStatusBadge = (status: ZkTecoDeviceStatus) => {
    switch (status) {
      case "CONNECTED":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">Connected</Badge>
        );
      case "DISCONNECTED":
        return <Badge variant="destructive">Disconnected</Badge>;
      case "CONNECTING":
        return (
          <Badge variant="outline" className="text-blue-500 border-blue-500">
            Connecting...
          </Badge>
        );
      case "ERROR":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>ZKTeco Device Management</CardTitle>
            <CardDescription>
              Manage your access control devices and their users.
            </CardDescription>
          </div>
          <Button onClick={openAddDeviceModal}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Device
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device Name</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Topic ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-48">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                  </TableCell>
                </TableRow>
              ) : devices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-10 text-muted-foreground"
                  >
                    No devices configured.
                  </TableCell>
                </TableRow>
              ) : (
                devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>{device.ipAddress}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{device.topicIdentifier}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(device.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="mr-2"
                        onClick={() => openUserManagementModal(device)}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Manage Users
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mr-2"
                        onClick={() => openEditDeviceModal(device)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => {
                          setDeviceToDelete(device);
                          setIsDeleteDeviceAlertOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Tambah/Edit Perangkat */}
      <Dialog open={isDeviceModalOpen} onOpenChange={setIsDeviceModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {deviceToEdit ? "Edit Device" : "Add New Device"}
            </DialogTitle>
            <DialogDescription>
              Topic ID is used for MQTT (e.g., 'front', 'rear').
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeviceSubmit}>
            <div className="grid gap-4 py-4">
              <Input
                placeholder="Device Name (e.g., Pintu Depan)"
                value={deviceForm.name}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, name: e.target.value })
                }
                required
              />
              <Input
                placeholder="Topic Identifier (e.g., front)"
                value={deviceForm.topicIdentifier}
                onChange={(e) =>
                  setDeviceForm({
                    ...deviceForm,
                    topicIdentifier: e.target.value,
                  })
                }
                required
              />
              <Input
                placeholder="IP Address (e.g., 192.168.1.201)"
                value={deviceForm.ipAddress}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, ipAddress: e.target.value })
                }
                required
              />
              <Input
                placeholder="Port (e.g., 4370)"
                type="number"
                value={deviceForm.port}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, port: e.target.value })
                }
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDeviceModalOpen(false)}
                disabled={isSubmittingDevice}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingDevice}>
                {isSubmittingDevice && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}{" "}
                {deviceToEdit ? "Save Changes" : "Save Device"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal untuk Manajemen Pengguna */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Manage Users for "{selectedDeviceForUsers?.name}"
            </DialogTitle>
            <DialogDescription>
              View, add, or remove users, and manage fingerprints/cards.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setIsAddUserModalOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New User
            </Button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Card</TableHead>
                  <TableHead>Fingerprints</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingUsers ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-40">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : deviceUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No users synced from this device yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  deviceUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.uid}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>
                        {user.card || "N/A"}
                        {user.card && ( // Tambahkan tombol delete card jika ada kartu
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-2 text-red-500 hover:text-red-600"
                            onClick={() => handleDeleteCard(user)}
                            disabled={isRegisteringFpOrCard} // Nonaktifkan saat proses lain berjalan
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.fingerprints &&
                        Array.isArray(user.fingerprints) &&
                        user.fingerprints.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.fingerprints.map((fp: any, index: number) => (
                              <Badge key={index} variant="secondary">
                                FP ID: {fp.fid}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="ml-1 h-4 w-4 p-0 text-red-500 hover:text-red-600"
                                  onClick={() =>
                                    handleDeleteFingerprint(user, fp.fid)
                                  }
                                  disabled={isRegisteringFpOrCard}
                                >
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          "No"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2"
                          onClick={() => openRegisterFpModal(user)} // Panggil fungsi baru
                          disabled={
                            isRegisteringFpOrCard ||
                            !selectedDeviceForUsers?.status?.includes(
                              "CONNECTED"
                            )
                          } // Aktifkan tombol
                        >
                          <Fingerprint className="h-4 w-4 mr-2" />
                          Register FP
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2"
                          onClick={() => openRegisterCardAlert(user)} // Panggil fungsi baru
                          disabled={
                            isRegisteringFpOrCard ||
                            !selectedDeviceForUsers?.status?.includes(
                              "CONNECTED"
                            )
                          } // Aktifkan tombol
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Register Card
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => {
                            setUserToDelete(user);
                            setIsDeleteUserAlertOpen(true);
                          }}
                          disabled={isRegisteringFpOrCard}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal untuk Menambah Pengguna Baru */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add New User to "{selectedDeviceForUsers?.name}"
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUserSubmit}>
            <div className="grid gap-4 py-4">
              <Input
                placeholder="User Name (e.g., bento)"
                value={newUserForm.name}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, name: e.target.value })
                }
                required
              />
              <Input
                placeholder="Password"
                value={newUserForm.password}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, password: e.target.value })
                }
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddUserModalOpen(false)}
                disabled={isSubmittingUser}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingUser}>
                {isSubmittingUser && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send Create Command
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- BARU: Modal untuk Register Fingerprint --- */}
      <Dialog
        open={isRegisterFpModalOpen}
        onOpenChange={setIsRegisterFpModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Register Fingerprint for "{userToRegisterFp?.name}"
            </DialogTitle>
            <DialogDescription>
              Enter the Finger ID (0-9) you want to register. Then, follow
              instructions on the ZKTeco device.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="fingerId">Finger ID (0-9)</Label>
            <Input
              id="fingerId"
              type="number"
              min="0"
              max="9"
              value={fingerIdInput}
              onChange={(e) => setFingerIdInput(e.target.value)}
              placeholder="e.g., 0 for thumb, 1 for index"
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsRegisterFpModalOpen(false)}
              disabled={isRegisteringFpOrCard}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegisterFingerprint}
              disabled={isRegisteringFpOrCard}
            >
              {isRegisteringFpOrCard && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Start Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- BARU: Alert Dialog untuk Konfirmasi Register Card --- */}
      <AlertDialog
        open={isRegisterCardAlertOpen}
        onOpenChange={setIsRegisterCardAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Register Card for "{userToRegisterCard?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will send a command to the device to enter card registration
              mode for this user. Please tap the card on the ZKTeco device once
              this confirmation is given.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToRegisterCard(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegisterCard}
              disabled={isRegisteringFpOrCard}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRegisteringFpOrCard && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Start Card Registration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog untuk Konfirmasi Hapus Perangkat */}
      <AlertDialog
        open={isDeleteDeviceAlertOpen}
        onOpenChange={setIsDeleteDeviceAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the device{" "}
              <strong>"{deviceToDelete?.name}"</strong> and all associated user
              data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeviceToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeviceDelete}
              disabled={isSubmittingDevice}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmittingDevice && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog untuk Konfirmasi Hapus Pengguna */}
      <AlertDialog
        open={isDeleteUserAlertOpen}
        onOpenChange={setIsDeleteUserAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send a command to delete user{" "}
              <strong>
                "{userToDelete?.name}" (UID: {userToDelete?.uid})
              </strong>{" "}
              from the device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isSubmittingUser || isRegisteringFpOrCard} // Tambahkan disable untuk mencegah konflik
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmittingUser && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Delete Command
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
