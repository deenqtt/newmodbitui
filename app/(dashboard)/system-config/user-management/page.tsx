"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
// Impor AuthProvider dan useAuth
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Role } from "@prisma/client";
import Swal from "sweetalert2";

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
} from "@/components/ui/tooltip"; // Impor Tooltip
import {
  Users,
  Edit,
  Trash2,
  PlusCircle,
  Loader2,
  Shield,
  Database,
} from "lucide-react"; // Impor Database

// --- Type Definitions ---
interface UserData {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

// --- Konfigurasi Notifikasi Toast ---
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

function UserManagementContent() {
  // Token tidak lagi dibutuhkan di sini karena sudah dikelola oleh cookie
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();

  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<UserData>>({});
  const [password, setPassword] = useState("");
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);

  // --- FUNGSI FETCH DIPERBAIKI ---
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Browser akan otomatis mengirim cookie, jadi tidak perlu header Authorization
      const response = await fetch("/api/users");

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error(
            "[UserManagement] Akses ditolak (401/403). Melakukan logout..."
          );
          logout();
        }
        throw new Error("Failed to fetch users.");
      }
      const data = await response.json();

      setUsers(data);
    } catch (error: any) {
      console.error(
        "[UserManagement] Gagal mengambil data pengguna:",
        error.message
      );
      Toast.fire({ icon: "error", title: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const checkDb = async () => {
      try {
        const res = await fetch("/api/health");
        setDbStatus(res.ok ? "connected" : "disconnected");
      } catch (error) {
        setDbStatus("disconnected");
      }
    };
    checkDb();
    const interval = setInterval(checkDb, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- LOGIKA PEMANGGILAN FETCH DIPERBAIKI ---
  useEffect(() => {
    // Hanya jalankan setelah status autentikasi selesai dicek
    if (!isAuthLoading) {
      if (isAuthenticated && user?.role === Role.ADMIN) {
        fetchUsers();
      } else {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, user, isAuthLoading, fetchUsers]);

  const handleOpenModal = (userToEdit: UserData | null = null) => {
    if (userToEdit) {
      setIsEditMode(true);
      setCurrentUser(userToEdit);
    } else {
      setIsEditMode(false);
      setCurrentUser({ role: Role.USER });
    }
    setPassword("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const url = isEditMode ? `/api/users/${currentUser.id}` : "/api/users";
    const method = isEditMode ? "PUT" : "POST";

    const body: any = {
      email: currentUser.email,
      role: currentUser.role,
    };
    if (password) {
      body.password = password;
    }
    if (!isEditMode && !password) {
      Toast.fire({
        icon: "error",
        title: "Password is required for new users.",
      });
      return;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" }, // Tidak perlu header Auth
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      Toast.fire({
        icon: "success",
        title: `User ${isEditMode ? "updated" : "created"} successfully!`,
      });
      handleCloseModal();
      fetchUsers();
    } catch (error: any) {
      Toast.fire({ icon: "error", title: error.message });
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE", // Tidak perlu header Auth
      });
      if (response.status !== 204) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete user.");
      }
      Toast.fire({ icon: "success", title: "User deleted!" });
      fetchUsers();
    } catch (error: any) {
      Toast.fire({ icon: "error", title: error.message });
    } finally {
      setIsDeleteAlertOpen(false);
      setUserToDelete(null);
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
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-gray-600">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <main className="p-4 md:p-6">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage all users, roles, and credentials.
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenModal()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add User
              </Button>
            </div>
            <div className="flex items-center gap-4 pt-4">
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Database
                    className={`h-4 w-4 ${
                      dbStatus === "connected"
                        ? "text-green-500"
                        : dbStatus === "connecting"
                        ? "text-yellow-400"
                        : "text-red-500"
                    }`}
                  />
                  <span>DB: {dbStatus}</span>
                </TooltipTrigger>
                <TooltipContent>Database Status</TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="text-right font-semibold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-48">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                      </TableCell>
                    </TableRow>
                  ) : users.length > 0 ? (
                    users.map((u) => (
                      <TableRow
                        key={u.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900"
                      >
                        <TableCell className="font-medium text-gray-800 dark:text-gray-200">
                          {u.email}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              u.role === Role.ADMIN
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {u.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenModal(u)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setUserToDelete(u);
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
                        colSpan={3}
                        className="text-center h-48 text-gray-500"
                      >
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isEditMode ? "Edit User" : "Add New User"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={currentUser.email || ""}
                  onChange={(e) =>
                    setCurrentUser({ ...currentUser, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={
                    isEditMode ? "Leave blank to keep current password" : ""
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={currentUser.role}
                  onValueChange={(value: Role) =>
                    setCurrentUser({ ...currentUser, role: value })
                  }
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Role.ADMIN}>Admin</SelectItem>
                    <SelectItem value={Role.USER}>User</SelectItem>
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

        <AlertDialog
          open={isDeleteAlertOpen}
          onOpenChange={setIsDeleteAlertOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the user{" "}
                <b>{userToDelete?.email}</b>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDelete(null)}>
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
      </main>
    </TooltipProvider>
  );
}

// Komponen wrapper untuk menyediakan AuthProvider
export default function UserManagementPageWrapper() {
  return (
    <AuthProvider>
      <UserManagementContent />
    </AuthProvider>
  );
}
