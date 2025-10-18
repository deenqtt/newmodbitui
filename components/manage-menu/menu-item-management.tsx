"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { usePagination } from "@/hooks/use-pagination";
import { Plus, Edit, Trash2, Eye, EyeOff, Search, Filter } from "lucide-react";
import IconSelector from "@/components/layout2d/IconSelector";
import { getIconWithFallback } from "@/lib/icon-library";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface MenuItem {
  id: string;
  name: string;
  label: string;
  path: string;
  icon?: string;
  component?: string;
  order: number;
  isActive: boolean;
  isDeveloper: boolean;
  menuGroupId: string;
  menuGroup: {
    id: string;
    name: string;
    label: string;
  };
}

interface MenuGroupOption {
  id: string;
  label: string;
}

export function MenuItemManagement() {
  const { toast } = useToast();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuGroups, setMenuGroups] = useState<MenuGroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    menuGroupId: "",
    name: "",
    label: "",
    path: "",
    icon: "",
    component: "",
    order: 0,
    isActive: true,
    isDeveloper: false,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Group filter
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");

  // Filter by group first
  const filteredByGroup = useMemo(() => {
    if (selectedGroupId === "all") return menuItems;
    return menuItems.filter(item => item.menuGroupId === selectedGroupId);
  }, [menuItems, selectedGroupId]);

  // Search functionality - search on name, label, path, and group label
  const { searchQuery, setSearchQuery, filteredData: filteredMenuItems } = useSearchFilter(filteredByGroup, ['name', 'label', 'path', 'menuGroup.label']);

  // Pagination logic
  const { paginatedData: paginatedMenuItems, totalPages, hasNextPage, hasPrevPage } = usePagination(filteredMenuItems, pageSize, currentPage);

  useEffect(() => {
    fetchMenuItems();
    fetchMenuGroups();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await fetch("/api/menu-items", {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        setMenuItems(result.data);
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch menu items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuGroups = async () => {
    try {
      const response = await fetch("/api/menu-groups", {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        setMenuGroups(result.data.map((group: any) => ({
          id: group.id,
          label: group.label,
        })));
      }
    } catch (error) {
      console.error("Failed to fetch menu groups:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Menu item name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.menuGroupId) {
      toast({
        title: "Validation Error",
        description: "Menu group is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const isEditing = !!editingItem;
      const url = isEditing ? `/api/menu-items/${editingItem.id}` : "/api/menu-items";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: `Menu item ${isEditing ? "updated" : "created"} successfully`,
        });

        setDialogOpen(false);
        setEditingItem(null);
        setFormData({
          menuGroupId: "",
          name: "",
          label: "",
          path: "",
          icon: "",
          component: "",
          order: 0,
          isActive: true,
          isDeveloper: false,
        });
        fetchMenuItems();
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingItem ? "update" : "create"} menu item`,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      menuGroupId: item.menuGroupId,
      name: item.name,
      label: item.label,
      path: item.path,
      icon: item.icon || "",
      component: item.component || "",
      order: item.order,
      isActive: item.isActive,
      isDeveloper: item.isDeveloper,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (item: MenuItem) => {
    if (!confirm(`Are you sure you want to delete menu item "${item.label}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/menu-items/${item.id}`, {
        method: "DELETE",
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Menu item deleted successfully",
        });
        fetchMenuItems();
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete menu item",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (item: MenuItem) => {
    try {
      const response = await fetch(`/api/menu-items/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          menuGroupId: item.menuGroupId,
          name: item.name,
          label: item.label,
          path: item.path,
          icon: item.icon,
          component: item.component,
          order: item.order,
          isActive: !item.isActive,
          isDeveloper: item.isDeveloper,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: `Menu item ${result.data.isActive ? "activated" : "deactivated"}`,
        });
        fetchMenuItems();
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update menu item status",
        variant: "destructive",
      });
    }
  };

  const handleToggleActiveDirect = async (itemId: string, checked: boolean) => {
    try {
      const item = menuItems.find(i => i.id === itemId);
      if (!item) return;

      const response = await fetch(`/api/menu-items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          menuGroupId: item.menuGroupId,
          name: item.name,
          label: item.label,
          path: item.path,
          icon: item.icon,
          component: item.component,
          order: item.order,
          isActive: checked,
          isDeveloper: item.isDeveloper,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: `Menu item ${checked ? "activated" : "deactivated"}`,
        });
        fetchMenuItems();
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update menu item status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Menu Items</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage individual menu items for navigation
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingItem(null);
              setFormData({
                menuGroupId: "",
                name: "",
                label: "",
                path: "",
                icon: "",
                component: "",
                order: 0,
                isActive: true,
                isDeveloper: false,
              });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Menu Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? "Update menu item information"
                  : "Create a new menu item for the navigation"
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Menu Item Name</Label>
                  <Input
                    value={formData.label}
                    onChange={(e) => setFormData({
                      ...formData,
                      name: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                      label: e.target.value
                    })}
                    placeholder="e.g., Dashboard Overview"
                    required
                  />
                  {formData.name && (
                    <p className="text-xs text-muted-foreground">
                      Path name: <code>{formData.name}</code>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Menu Group</Label>
                    <Select value={formData.menuGroupId} onValueChange={(value) => setFormData({ ...formData, menuGroupId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {menuGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Order</Label>
                    <Input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Path/URL</Label>
                    <Input
                      value={formData.path}
                      onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                      placeholder="/dashboard"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <IconSelector
                      value={formData.icon}
                      onChange={(iconName: string) => setFormData({ ...formData, icon: iconName })}
                      placeholder="Select icon"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isDeveloper"
                      checked={formData.isDeveloper}
                      onCheckedChange={(checked) => setFormData({ ...formData, isDeveloper: checked })}
                    />
                    <Label htmlFor="isDeveloper">Developer Only</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingItem ? "Update" : "Create"} Menu Item
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center space-x-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Select value={selectedGroupId} onValueChange={(value) => {
              setSelectedGroupId(value);
              setCurrentPage(1); // Reset to first page when filter changes
            }}>
              <SelectTrigger className="w-48 pl-8">
                <SelectValue placeholder="All groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All groups</SelectItem>
                {menuGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(searchQuery || selectedGroupId !== "all") && (
          <p className="text-sm text-muted-foreground">
            {filteredMenuItems.length} of {menuItems.length} menu items
          </p>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMenuItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getIconWithFallback(item.icon || 'Menu')}
                    <span>{item.label}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{item.path || "-"}</TableCell>
                <TableCell>{item.menuGroup.label}</TableCell>
                <TableCell>{item.order}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.isActive}
                      onCheckedChange={(checked) => handleToggleActiveDirect(item.id, checked)}
                    />
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {item.isDeveloper && (
                      <Badge variant="outline">Dev</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">ADM V</Badge>
                      <Badge variant="outline" className="text-xs">USR V</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      View permissions set per role
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(item)}
                    >
                      {item.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (hasPrevPage) setCurrentPage(currentPage - 1);
                }}
                className={!hasPrevPage ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  isActive={currentPage === page}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(page);
                  }}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (hasNextPage) setCurrentPage(currentPage + 1);
                }}
                className={!hasNextPage ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
