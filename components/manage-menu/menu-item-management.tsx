"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Eye, EyeOff, Menu } from "lucide-react";

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

  useEffect(() => {
    fetchMenuItems();
    fetchMenuGroups();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await fetch("/api/menu-items");
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
      const response = await fetch("/api/menu-groups");
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="menuGroupId" className="text-right">
                      Menu Group
                    </Label>
                    <Select value={formData.menuGroupId} onValueChange={(value) => setFormData({ ...formData, menuGroupId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select menu group" />
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="unique-name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="label">Label</Label>
                    <Input
                      id="label"
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      placeholder="Display Label"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="path">Path</Label>
                  <Input
                    id="path"
                    value={formData.path}
                    onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                    placeholder="/dashboard/overview"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="icon">Icon</Label>
                    <Input
                      id="icon"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="BarChart3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="component">Component</Label>
                    <Input
                      id="component"
                      value={formData.component}
                      onChange={(e) => setFormData({ ...formData, component: e.target.value })}
                      placeholder="Dashboard"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order">Order</Label>
                    <Input
                      id="order"
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
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
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {menuItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.label}</TableCell>
                <TableCell className="font-mono text-sm">{item.path || "-"}</TableCell>
                <TableCell>{item.menuGroup.label}</TableCell>
                <TableCell>{item.order}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {item.isDeveloper && (
                      <Badge variant="outline">Dev</Badge>
                    )}
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
    </div>
  );
}
