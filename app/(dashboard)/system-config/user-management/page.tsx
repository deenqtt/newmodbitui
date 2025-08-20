"use client";

import { useState, useEffect, useCallback, FormEvent, useMemo } from "react";
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
} from "@/components/ui/tooltip";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Users,
  Edit,
  Trash2,
  PlusCircle,
  Loader2,
  Shield,
  Database,
  ArrowUp,
  ArrowDown,
  Search,
} from "lucide-react";

// --- Hooks ---
import { useSortableTable } from "@/hooks/use-sort-table";

// --- Type Definitions ---
interface UserData {
  id: string;
  email: string;
  phoneNumber: string | null;
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

  // ✨ STATE BARU UNTUK TOTAL PENGGUNA
  const [totalUsersCount, setTotalUsersCount] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
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
      // ✨ SIMPAN TOTAL PENGGUNA SETELAH MENGAMBIL DATA
      setTotalUsersCount(data.length);
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

  useEffect(() => {
    if (!isAuthLoading) {
      if (isAuthenticated && user?.role === Role.ADMIN) {
        fetchUsers();
      } else {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, user, isAuthLoading, fetchUsers]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) {
      return users;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(lowercasedQuery) ||
        (u.phoneNumber && u.phoneNumber.includes(lowercasedQuery)) ||
        u.role.toLowerCase().includes(lowercasedQuery)
    );
  }, [users, searchQuery]);

  const {
    sorted: sortedUsers,
    sortKey,
    sortDirection,
    handleSort,
  } = useSortableTable(filteredUsers);

  const totalPages = Math.ceil(sortedUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleOpenModal = (userToEdit: UserData | null = null) => {
    if (userToEdit) {
      setIsEditMode(true);
      setCurrentUser(userToEdit);
    } else {
      setIsEditMode(false);
      setCurrentUser({ role: Role.USER, phoneNumber: null });
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
      phoneNumber: currentUser.phoneNumber,
      role: currentUser.role,
    };
    if (password) {
      body.password = password;
    }
    if (!isEditMode && (!password || !body.email)) {
      Toast.fire({
        icon: "error",
        title: "Email and password are required for new users.",
      });
      return;
    }
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
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
        {/* ✨ CARD UNTUK MENAMPILKAN TOTAL PENGGUNA */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              ) : (
                <div className="text-2xl font-bold">
                  {totalUsersCount !== null ? totalUsersCount : "N/A"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {/* AKHIR CARD */}

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center mb-4">
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
            <div className="relative mb-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search users by email, phone, or role..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* ✨ ICON SORTING SELALU TERLIHAT */}
                    <TableHead
                      className="font-semibold cursor-pointer"
                      onClick={() => handleSort("email")}
                    >
                      <div className="flex items-center">
                        Email
                        <span className="flex items-center ml-2">
                          <ArrowUp
                            className={`h-4 w-4 ${
                              sortKey === "email" && sortDirection === "asc"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <ArrowDown
                            className={`h-4 w-4 ${
                              sortKey === "email" && sortDirection === "desc"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                        </span>
                      </div>
                    </TableHead>
                    <TableHead
                      className="font-semibold cursor-pointer"
                      onClick={() => handleSort("phoneNumber")}
                    >
                      <div className="flex items-center">
                        Phone Number
                        <span className="flex items-center ml-2">
                          <ArrowUp
                            className={`h-4 w-4 ${
                              sortKey === "phoneNumber" &&
                              sortDirection === "asc"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <ArrowDown
                            className={`h-4 w-4 ${
                              sortKey === "phoneNumber" &&
                              sortDirection === "desc"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                        </span>
                      </div>
                    </TableHead>
                    <TableHead
                      className="font-semibold cursor-pointer"
                      onClick={() => handleSort("role")}
                    >
                      <div className="flex items-center">
                        Role
                        <span className="flex items-center ml-2">
                          <ArrowUp
                            className={`h-4 w-4 ${
                              sortKey === "role" && sortDirection === "asc"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <ArrowDown
                            className={`h-4 w-4 ${
                              sortKey === "role" && sortDirection === "desc"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-48">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                      </TableCell>
                    </TableRow>
                  ) : paginatedUsers.length > 0 ? (
                    paginatedUsers.map((u) => (
                      <TableRow
                        key={u.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900"
                      >
                        <TableCell className="font-medium text-gray-800 dark:text-gray-200">
                          {u.email}
                        </TableCell>
                        <TableCell>{u.phoneNumber}</TableCell>
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
                        colSpan={4}
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
        {totalPages > 1 && (
          <Pagination className="mt-6">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(currentPage - 1)}
                  href="#"
                  aria-disabled={currentPage <= 1}
                  tabIndex={currentPage <= 1 ? -1 : undefined}
                  className={
                    currentPage <= 1
                      ? "pointer-events-none opacity-50"
                      : undefined
                  }
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    href="#"
                    isActive={currentPage === i + 1}
                    onClick={() => handlePageChange(i + 1)}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(currentPage + 1)}
                  href="#"
                  aria-disabled={currentPage >= totalPages}
                  tabIndex={currentPage >= totalPages ? -1 : undefined}
                  className={
                    currentPage >= totalPages
                      ? "pointer-events-none opacity-50"
                      : undefined
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
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
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={currentUser.phoneNumber || ""}
                onChange={(e) =>
                  setCurrentUser({
                    ...currentUser,
                    phoneNumber: e.target.value,
                  })
                }
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
    </TooltipProvider>
  );
}

export default function UserManagementPageWrapper() {
  return (
    <AuthProvider>
      <UserManagementContent />
    </AuthProvider>
  );
}
