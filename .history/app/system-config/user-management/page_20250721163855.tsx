"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  DialogDescription,
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
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Users,
  Edit,
  Trash2,
  PlusCircle,
  Loader2,
  Shield,
  UserCheck,
  KeyRound,
} from "lucide-react";

// --- Type Definitions ---
interface UserData {
  id: string;
  email: string;
  role: Role;
  fingerprintId: string | null;
  cardUid: string | null;
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

function UserManagementPage() {
  const {
    user,
    token,
    isAuthenticated,
    isLoading: isAuthLoading,
    logout,
  } = useAuth();

  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<UserData>>({});
  const [password, setPassword] = useState("");
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 401) logout(); // Logout jika token tidak valid
        throw new Error("Failed to fetch users.");
      }
      const data = await response.json();
      setUsers(data);
    } catch (error: any) {
      Toast.fire({ icon: "error", title: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    if (isAuthenticated && user?.role === Role.ADMIN) {
      fetchUsers();
    }
  }, [isAuthenticated, user, fetchUsers]);

  const handleOpenModal = (userToEdit: UserData | null = null) => {
    if (userToEdit) {
      setIsEditMode(true);
      setCurrentUser(userToEdit);
    } else {
      setIsEditMode(false);
      setCurrentUser({ role: Role.USER }); // Default role
    }
    setPassword(""); // Selalu reset password field
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
      fingerprintId: currentUser.fingerprintId || null,
      cardUid: currentUser.cardUid || null,
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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

  // Menampilkan loading jika status auth belum siap
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-gray-500" />
      </div>
    );
  }

  // Menampilkan pesan akses ditolak jika bukan admin
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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900/50">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white dark:bg-gray-950 px-4 md:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-6" />
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
            User Management
          </h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Registered Users</CardTitle>
                <CardDescription>
                  Manage all users, roles, and credentials.
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenModal()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add User
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold">
                      Fingerprint ID
                    </TableHead>
                    <TableHead className="font-semibold">Card UID</TableHead>
                    <TableHead className="text-right font-semibold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-48">
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
                        <TableCell className="font-mono text-xs">
                          {u.fingerprintId || "N/A"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {u.cardUid || "N/A"}
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
                        colSpan={5}
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
      </main>

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
            <div className="space-y-2">
              <Label htmlFor="fingerprintId">Fingerprint ID (Optional)</Label>
              <Input
                id="fingerprintId"
                value={currentUser.fingerprintId || ""}
                onChange={(e) =>
                  setCurrentUser({
                    ...currentUser,
                    fingerprintId: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardUid">Card UID (Optional)</Label>
              <Input
                id="cardUid"
                value={currentUser.cardUid || ""}
                onChange={(e) =>
                  setCurrentUser({ ...currentUser, cardUid: e.target.value })
                }
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
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
    </div>
  );
}

// Komponen wrapper untuk menyediakan AuthProvider jika belum ada
export default function UserManagementPageWrapper() {
  return (
    // Asumsi AuthProvider sudah ada di layout utama,
    // namun ini sebagai fallback jika halaman diakses langsung
    <UserManagementPage />
  );
}
