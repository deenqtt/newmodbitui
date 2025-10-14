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
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Users,
  Edit,
  Trash2,
  PlusCircle,
  Loader2,
  Shield,
  Database,
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  Crown,
  Phone,
  Mail,
} from "lucide-react";

// --- Hooks ---
import { useSortableTable } from "@/hooks/use-sort-table";

// --- Type Definitions ---
interface RoleData {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UserData {
  id: string;
  email: string;
  phoneNumber: string | null;
  role: RoleData;
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
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const fetchUsers = useCallback(
    async (showToast = false) => {
      try {
        if (showToast) {
          setRefreshing(true);
        }
        setIsLoading(true);

        const response = await fetch("/api/users");
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            console.error("Access denied. Logging out...");
            logout();
          }
          throw new Error("Failed to fetch users.");
        }
        const data = await response.json();
        setUsers(data);

        if (showToast) {
          Toast.fire({
            icon: "success",
            title: "Refreshed",
            text: `${data.length} users loaded`,
          });
        }
      } catch (error: any) {
        console.error("Failed to fetch users:", error.message);
        Toast.fire({ icon: "error", title: error.message });
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [logout]
  );

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
      if (isAuthenticated) {
        fetchUsers();
      } else {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, isAuthLoading, fetchUsers]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) {
      return users;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(lowercasedQuery) ||
        (u.phoneNumber && u.phoneNumber.includes(lowercasedQuery)) ||
        u.role.toString().toLowerCase().includes(lowercasedQuery)
    );
  }, [users, searchQuery]);

  // Use sortable table hook
  const { sorted: sortedUsers, sortKey, sortDirection, handleSort } = useSortableTable(filteredUsers);

  // Paginate the sorted results
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
      setCurrentUser({
        role: {
          id: "",
          name: "USER",
          description: "Regular User",
          isSystem: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        phoneNumber: null
      });
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
      roleId: currentUser.role?.id,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "text-emerald-600 dark:text-emerald-400";
      case "connecting":
        return "text-amber-600 dark:text-amber-400";
      default:
        return "text-red-600 dark:text-red-400";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400";
      case "connecting":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400";
      default:
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    }
  };

  const getRoleBadge = (role: RoleData) => {
    return role.name === "ADMIN"
      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
      : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
  };

  const getRoleIcon = (role: RoleData) => {
    return role.name === "ADMIN" ? (
      <Crown className="h-3 w-3 mr-1" />
    ) : (
      <UserCheck className="h-3 w-3 mr-1" />
    );
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto p-4 md:p-8">
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading user management...</p>
          </div>
        </div>
      </div>
    );
  }

  // Removed admin-only access protection

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className=" p-4 md:p-6 space-y-8">
          {/* Header Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  User Management
                </h1>
                <p className="text-muted-foreground">
                  Manage user accounts, roles, and permissions
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Users
                    </p>
                    <p className="text-3xl font-bold">{users.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Administrators
                    </p>
                    <p className="text-3xl font-bold text-purple-600">
                      {users.filter((u) => u.role.name === "ADMIN").length}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                    <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Regular Users
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      {users.filter((u) => u.role.name === "USER").length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                    <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Database
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={getStatusBadge(dbStatus)}
                        variant="secondary"
                      >
                        {dbStatus}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-100 dark:bg-slate-800/50 rounded-full">
                    <Database
                      className={`h-6 w-6 ${getStatusColor(dbStatus)}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Card */}
          <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl">User Accounts</CardTitle>
                  <CardDescription>
                    Manage user accounts, permissions, and system access
                  </CardDescription>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchUsers(true)}
                    disabled={refreshing}
                    className="whitespace-nowrap"
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${
                        refreshing ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleOpenModal()}
                    className="bg-primary hover:bg-primary/90 whitespace-nowrap"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="pt-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 bg-background"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-hidden">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground mt-2">
                      Loading users...
                    </p>
                  </div>
                ) : paginatedUsers.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="h-12 w-12 text-muted-foreground/50" />
                      <div className="space-y-1">
                        <p className="text-muted-foreground font-medium">
                          {searchQuery
                            ? "No users found"
                            : "No users available"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {searchQuery
                            ? "Try adjusting your search terms"
                            : "Add your first user to get started"}
                        </p>
                      </div>
                      {!searchQuery && (
                        <Button
                          onClick={() => handleOpenModal()}
                          className="mt-2"
                        >
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Add User
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b border-slate-200 dark:border-slate-700">
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            User Information
                          </TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            Contact
                          </TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            Role & Permissions
                          </TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            Created
                          </TableHead>
                          <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedUsers.map((userData) => (
                          <TableRow
                            key={userData.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-200"
                          >
                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                                  <Mail className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                </div>
                                <div className="space-y-1">
                                  <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {userData.email}
                                  </p>
                                  <code className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    ID: {userData.id.slice(0, 8)}...
                                  </code>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="py-4">
                              <div className="space-y-2">
                                {userData.phoneNumber ? (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-sm">
                                      {userData.phoneNumber}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground italic">
                                    No phone number
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="py-4">
                              <Badge
                                className={getRoleBadge(userData.role)}
                                variant="secondary"
                              >
                                {getRoleIcon(userData.role)}
                                {userData.role.name}
                              </Badge>
                            </TableCell>

                            <TableCell className="py-4">
                              <div className="space-y-1">
                                <p className="text-sm">
                                  {new Date(
                                    userData.createdAt
                                  ).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(
                                    userData.createdAt
                                  ).toLocaleTimeString()}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="text-right py-4">
                              <div className="flex items-center justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                                      onClick={() => handleOpenModal(userData)}
                                    >
                                      <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit user</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/20"
                                      onClick={() => {
                                        setUserToDelete(userData);
                                        setIsDeleteAlertOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete user</TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() =>
                                  handlePageChange(currentPage - 1)
                                }
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
                            {Array.from(
                              { length: Math.min(totalPages, 5) },
                              (_, i) => {
                                const pageNum = i + 1;
                                return (
                                  <PaginationItem key={i}>
                                    <PaginationLink
                                      href="#"
                                      isActive={currentPage === pageNum}
                                      onClick={() => handlePageChange(pageNum)}
                                    >
                                      {pageNum}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              }
                            )}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() =>
                                  handlePageChange(currentPage + 1)
                                }
                                href="#"
                                aria-disabled={currentPage >= totalPages}
                                tabIndex={
                                  currentPage >= totalPages ? -1 : undefined
                                }
                                className={
                                  currentPage >= totalPages
                                    ? "pointer-events-none opacity-50"
                                    : undefined
                                }
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add/Edit User Dialog */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isEditMode ? "Edit User Account" : "Add New User"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={currentUser.email || ""}
                onChange={(e) =>
                  setCurrentUser({ ...currentUser, email: e.target.value })
                }
                placeholder="user@example.com"
                className="h-10"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-sm font-medium">
                Phone Number (Optional)
              </Label>
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
                placeholder="+1 (555) 123-4567"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password {!isEditMode && "*"}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={
                  isEditMode
                    ? "Leave blank to keep current password"
                    : "Enter password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10"
                required={!isEditMode}
              />
              {isEditMode && (
                <p className="text-xs text-muted-foreground">
                  Leave empty to keep the current password
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">
                User Role *
              </Label>
              <Select
                value={currentUser.role?.id || ""}
                onValueChange={(value: string) =>
                  setCurrentUser({
                    ...currentUser,
                    role: value === "admin" ? {
                      id: "admin",
                      name: "ADMIN",
                      description: "Administrator",
                      isSystem: true,
                      isActive: true,
                      createdAt: new Date(),
                      updatedAt: new Date()
                    } : {
                      id: "user",
                      name: "USER",
                      description: "Regular User",
                      isSystem: true,
                      isActive: true,
                      createdAt: new Date(),
                      updatedAt: new Date()
                    }
                  })
                }
              >
                <SelectTrigger id="role" className="h-10">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center">
                      <Crown className="h-4 w-4 mr-2 text-purple-600" />
                      Administrator
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex items-center">
                      <UserCheck className="h-4 w-4 mr-2 text-green-600" />
                      Regular User
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Role Description */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {currentUser.role?.name === "ADMIN" ? (
                  <>
                    <strong>Administrator:</strong> Full access to all system
                    features including user management, system configuration,
                    and administrative functions.
                  </>
                ) : (
                  <>
                    <strong>Regular User:</strong> Standard access to monitoring
                    features and device controls. Cannot access administrative
                    functions.
                  </>
                )}
              </p>
            </div>
          </form>

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" form="userForm" onClick={handleSubmit}>
              {isEditMode ? "Update User" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Are you sure you want to permanently delete the user account for{" "}
            <strong>{userToDelete?.email}</strong>? This action cannot be undone
            and will revoke all access immediately.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete User
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
