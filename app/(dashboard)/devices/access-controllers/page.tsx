"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Wifi,
  WifiOff,
  Users, // Digunakan untuk 'Manage'
  History,
  Trash2,
  RefreshCw,
  Pencil, // <-- Ikon baru untuk 'Edit'
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { EditControllerForm } from "@/components/devices/edit-controller-form";
import { Toast } from "@/lib/toast";
import Swal from "sweetalert2";

// ... (Type definitions dan state lainnya tidak berubah, jadi saya singkat di sini)
type AccessController = {
  id: string;
  name: string;
  ipAddress: string;
  status: string;
  lockCount: number;
};
type ActivityLog = {
  id: string;
  timestamp: string;
  message: string;
};

export default function AccessControllersPage() {
  const router = useRouter();
  const [controllers, setControllers] = useState<AccessController[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newIpAddress, setNewIpAddress] = useState("");
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
  const [selectedController, setSelectedController] =
    useState<AccessController | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLogLoading, setIsLogLoading] = useState(false);
  const [logSyncStatus, setLogSyncStatus] = useState("");

  // ... (Semua fungsi handler seperti fetchControllers, handleAddDevice, handleDelete, dll. tidak berubah)
  const fetchControllers = async () => {
    try {
      const response = await fetch("/api/devices/access-controllers");
      if (!response.ok) throw new Error("Failed to fetch data from server");
      const data: AccessController[] = await response.json();
      setControllers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      if (isLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchControllers();
    const refreshInterval = setInterval(fetchControllers, 5000);
    return () => clearInterval(refreshInterval);
  }, []);

  const handleAddDevice = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/devices/access-controllers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, ipAddress: newIpAddress }),
      });
      if (!response.ok) throw new Error("Failed to add device");
      setNewName("");
      setNewIpAddress("");
      fetchControllers();
      Toast.fire({
        icon: "success",
        title: "Device added successfully!",
      });
    } catch (err: any) {
      Toast.fire({
        icon: "error",
        title: `Error: ${err.message}`,
      });
    }
  };

  const handleEdit = (controller: AccessController) => {
    setSelectedController(controller);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: `Delete "${name}"?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/devices/access-controllers/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete device");
        fetchControllers();
        Toast.fire({
          icon: "success",
          title: "Device deleted successfully!",
        });
      } catch (err: any) {
        Toast.fire({
          icon: "error",
          title: `Error: ${err.message}`,
        });
      }
    }
  };

  const handleSaveEdit = async (
    id: string,
    name: string,
    ipAddress: string
  ) => {
    try {
      const response = await fetch(`/api/devices/access-controllers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ipAddress }),
      });
      if (!response.ok) throw new Error("Failed to save changes");
      setIsEditModalOpen(false);
      fetchControllers();
      Toast.fire({
        icon: "success",
        title: "Changes saved successfully!",
      });
    } catch (err: any) {
      Toast.fire({
        icon: "error",
        title: `Error: ${err.message}`,
      });
    }
  };

  const handleManageUsers = (controller: AccessController) => {
    router.push(`/devices/access-controllers/${controller.id}/users`);
  };

  const handleViewLogs = async (
    controller: AccessController,
    forceSync = false
  ) => {
    if (!isLogModalOpen || forceSync) {
      setSelectedController(controller);
      setIsLogModalOpen(true);
      setIsLogLoading(true);
      setActivityLogs([]);
      setLogSyncStatus("Fetching logs from database...");
      const fetchDbLogs = fetch(
        `/api/devices/access-controllers/${controller.id}/logs`
      ).then((res) => res.json());
      setLogSyncStatus("Syncing with device, please wait...");
      const fetchDeviceLogs = fetch(
        `/api/devices/access-controllers/${controller.id}/sync-logs`,
        { method: "POST" }
      ).then((res) => res.json());

      try {
        const [dbLogs, deviceLogs] = await Promise.all([
          fetchDbLogs,
          fetchDeviceLogs,
        ]);
        setLogSyncStatus("Merging and sorting logs...");
        const combinedLogs = [...dbLogs, ...deviceLogs];
        const uniqueLogsMap = new Map<string, ActivityLog>();
        combinedLogs.forEach((log) => {
          if (!log.message) {
            log.message = `Lock ${log.lockAddress} event by ${log.method} (Card: ${log.cardNumber})`;
          }
          const key = `${log.timestamp}-${log.message}`;
          if (!uniqueLogsMap.has(key)) {
            uniqueLogsMap.set(key, log);
          }
        });
        const sortedLogs = Array.from(uniqueLogsMap.values()).sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setActivityLogs(sortedLogs);
        setLogSyncStatus(
          deviceLogs.length > 0
            ? "Sync complete!"
            : "Sync complete (no new logs from device)."
        );
      } catch (err: any) {
        Toast.fire({ icon: "error", title: "Failed to fetch or sync logs." });
        setLogSyncStatus("Error during sync.");
      } finally {
        setIsLogLoading(false);
      }
    }
  };

  const handleDeleteLogs = async (controllerId: string) => {
    const result = await Swal.fire({
      title: "Clear all logs for this device?",
      text: "This action is permanent and cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, clear all!",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(
          `/api/devices/access-controllers/${controllerId}/logs`,
          {
            method: "DELETE",
          }
        );
        const resData = await response.json();
        if (!response.ok)
          throw new Error(resData.error || "Failed to delete logs.");
        Toast.fire({
          icon: "success",
          title: "All logs cleared successfully!",
        });
        setActivityLogs([]);
      } catch (err: any) {
        Toast.fire({ icon: "error", title: err.message });
      }
    }
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      hour12: false,
    });
  };

  return (
    <>
      <div className="p-6 space-y-6 bg-background">
        {/* Form Add New Controller tidak berubah */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3 text-foreground">Add New Controller</h2>
          <form
            onSubmit={handleAddDevice}
            className="flex flex-wrap md:flex-nowrap items-end gap-4"
          >
            <div className="flex-grow w-full md:w-auto">
              <label
                htmlFor="deviceName"
                className="block text-sm font-medium text-gray-700"
              >
                Device Name
              </label>
              <input
                id="deviceName"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Controller Pintu Lobby"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex-grow w-full md:w-auto">
              <label
                htmlFor="deviceIp"
                className="block text-sm font-medium text-gray-700"
              >
                IP Address
              </label>
              <input
                id="deviceIp"
                type="text"
                value={newIpAddress}
                onChange={(e) => setNewIpAddress(e.target.value)}
                placeholder="e.g., 192.168.0.144"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-indigo-700 flex items-center gap-2 w-full md:w-auto justify-center"
            >
              <PlusCircle size={18} />
              Add Device
            </button>
          </form>
        </div>

        {/* Tabel Daftar Controller */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Locks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      Loading devices...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-red-500">
                      Error: {error}
                    </td>
                  </tr>
                ) : controllers.length > 0 ? (
                  controllers.map((controller) => (
                    <tr key={controller.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          {controller.status === "online" ? (
                            <Wifi size={20} className="text-green-500" />
                          ) : (
                            <WifiOff size={20} className="text-red-500" />
                          )}
                          <span
                            className={`capitalize font-medium ${
                              controller.status === "online"
                                ? "text-green-800"
                                : "text-red-800"
                            }`}
                          >
                            {controller.status}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {controller.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {controller.ipAddress}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {controller.lockCount}
                      </td>
                      {/* ======================================================================== */}
                      {/* === PERUBAHAN UTAMA DI SINI: Kolom Actions yang Diperbarui === */}
                      {/* ======================================================================== */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {/* Tombol Manage Users */}
                          <button
                            onClick={() => handleManageUsers(controller)}
                            title="Manage Users & Devices"
                            className="p-2 rounded-full text-sky-600 hover:bg-sky-100 transition-colors"
                          >
                            <Users size={18} />
                          </button>
                          {/* Tombol View Logs */}
                          <button
                            onClick={() => handleViewLogs(controller)}
                            title="View Activity Logs"
                            className="p-2 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            <History size={18} />
                          </button>
                          {/* Tombol Edit */}
                          <button
                            onClick={() => handleEdit(controller)}
                            title="Edit Controller"
                            className="p-2 rounded-full text-amber-600 hover:bg-amber-100 transition-colors"
                          >
                            <Pencil size={18} />
                          </button>
                          {/* Tombol Delete */}
                          <button
                            onClick={() =>
                              handleDelete(controller.id, controller.name)
                            }
                            title="Delete Controller"
                            className="p-2 rounded-full text-red-600 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-gray-500">
                      No access controllers found. Add one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ... (Semua Modal tidak berubah) ... */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Access Controller"
      >
        <EditControllerForm
          controller={selectedController}
          onSave={handleSaveEdit}
          onCancel={() => setIsEditModalOpen(false)}
        />
      </Modal>
      <Modal
        isOpen={isInstructionModalOpen}
        onClose={() => setIsInstructionModalOpen(false)}
        title="How to Access Device UI"
      >
        {selectedController && (
          <div className="text-gray-700 space-y-4">
            <p>
              To access this device's web interface, your computer must be on
              the same network as the controller.
            </p>
            <div>
              <p className="font-semibold">Option 1: Connect via LAN</p>
              <p className="text-sm">
                If the device is connected to your main network via Ethernet,
                open this address in your browser:
              </p>
              <div className="mt-2">
                <a
                  href={`http://${selectedController.ipAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 font-mono bg-indigo-50 p-2 rounded-md block text-center break-all"
                >
                  http://{selectedController.ipAddress}
                </a>
              </div>
            </div>
            <div>
              <p className="font-semibold">
                Option 2: Connect via Device's Wi-Fi AP
              </p>
              <p className="text-sm">
                You can also connect directly to the Wi-Fi hotspot created by
                the device. After connecting, open this address in your browser:{" "}
              </p>
              <div className="mt-2">
                <span className="text-indigo-600 font-mono bg-indigo-50 p-2 rounded-md block text-center">
                  http://10.10.0.1
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title={`Activity Log for "${selectedController?.name || ""}"`}
      >
        <div className="max-h-[60vh] flex flex-col">
          <div className="flex-grow overflow-y-auto pr-2">
            {isLogLoading ? (
              <div className="text-center text-gray-500 py-8">
                <RefreshCw className="animate-spin h-6 w-6 mx-auto mb-2" />
                <p>{logSyncStatus}</p>
              </div>
            ) : activityLogs.length > 0 ? (
              <ul className="space-y-3">
                {activityLogs.map((log, index) => (
                  <li
                    key={`${log.timestamp}-${index}`}
                    className="flex items-start space-x-3 p-2 rounded-md bg-gray-50"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <History size={16} className="text-gray-400" />
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm text-gray-800">{log.message}</p>
                      <p className="text-xs text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No activity logs found.
              </p>
            )}
          </div>
          <div className="border-t pt-4 mt-4 flex justify-between items-center">
            <button
              onClick={() => handleViewLogs(selectedController!, true)}
              disabled={isLogLoading}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={isLogLoading ? "animate-spin" : ""}
              />
              Force Sync
            </button>
            {activityLogs.length > 0 && !isLogLoading && (
              <button
                onClick={() => handleDeleteLogs(selectedController!.id)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-100 rounded-md hover:bg-red-200"
              >
                <Trash2 size={14} />
                Clear DB Logs
              </button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
