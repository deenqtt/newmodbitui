"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, FolderOpen, Menu } from "lucide-react";
import IconSelector from "@/components/layout2d/IconSelector";
import { getIconWithFallback } from "@/lib/icon-library";

interface MenuGroup {
  id: string;
  name: string;
  label: string;
  icon?: string;
  order: number;
  isActive: boolean;
  isDeveloper: boolean;
  _count: {
    menuItems: number;
  };
}

export function MenuGroupManagement() {
  const { toast } = useToast();
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MenuGroup | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    label: "",
    icon: "",
    order: 0,
    isActive: true,
    isDeveloper: false,
  });

  useEffect(() => {
    fetchMenuGroups();
  }, []);

  const fetchMenuGroups = async () => {
    try {
      const response = await fetch("/api/menu-groups", {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        setMenuGroups(result.data);
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
        description: "Failed to fetch menu groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Menu group name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.label.trim()) {
      toast({
        title: "Validation Error",
        description: "Menu group label is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const isEditing = !!editingGroup;
      const url = isEditing ? `/api/menu-groups/${editingGroup.id}` : "/api/menu-groups";
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
          description: `Menu group ${isEditing ? "updated" : "created"} successfully`,
        });

        setDialogOpen(false);
        setEditingGroup(null);
        setFormData({ name: "", label: "", icon: "", order: 0, isActive: true, isDeveloper: false });
        fetchMenuGroups();
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
        description: `Failed to ${editingGroup ? "update" : "create"} menu group`,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (group: MenuGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      label: group.label,
      icon: group.icon || "",
      order: group.order,
      isActive: group.isActive,
      isDeveloper: group.isDeveloper || false,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (group: MenuGroup) => {
    if (group._count.menuItems > 0) {
      toast({
        title: "Cannot Delete",
        description: "Cannot delete menu group with menu items",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete menu group "${group.label}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/menu-groups/${group.id}`, {
        method: "DELETE",
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Menu group deleted successfully",
        });
        fetchMenuGroups();
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
        description: "Failed to delete menu group",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (group: MenuGroup) => {
    try {
      const response = await fetch(`/api/menu-groups/${group.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          name: group.name,
          label: group.label,
          icon: group.icon,
          order: group.order,
          isActive: !group.isActive,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: `Menu group ${result.data.isActive ? "activated" : "deactivated"}`,
        });
        fetchMenuGroups();
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
        description: "Failed to update menu group status",
        variant: "destructive",
      });
    }
  };

  const handleToggleActiveDirect = async (groupId: string, checked: boolean) => {
    try {
      const group = menuGroups.find(g => g.id === groupId);
      if (!group) return;

      const response = await fetch(`/api/menu-groups/${groupId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          name: group.name,
          label: group.label,
          icon: group.icon,
          order: group.order,
          isActive: checked,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: `Menu group ${checked ? "activated" : "deactivated"}`,
        });
        fetchMenuGroups();
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
        description: "Failed to update menu group status",
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
          <h3 className="text-lg font-medium">Menu Groups</h3>
          <p className="text-sm text-muted-foreground">
            Manage menu group categories and organization
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingGroup(null);
              setFormData({ name: "", label: "", icon: "", order: 0, isActive: true, isDeveloper: false });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? "Edit Menu Group" : "Add New Menu Group"}
              </DialogTitle>
              <DialogDescription>
                {editingGroup
                  ? "Update menu group information and access settings"
                  : "Create a new menu group for organizing menu items"
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-6 py-4">
                {/* Row 1: Name and Order */}
                <div className="grid grid-cols-3 gap-4">
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
                      placeholder="Display Name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order">Order</Label>
                    <Input
                      id="order"
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Row 2: Icon */}
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <IconSelector
                    value={formData.icon}
                    onChange={(iconName: string) => setFormData({ ...formData, icon: iconName })}
                    placeholder="Select group icon"
                  />
                </div>

                {/* Row 3: Toggles (Active and Developer) */}
                <div className="flex gap-6 pt-4 border-t">
                  {/* Active Toggle */}
                  <div className="flex items-center gap-3">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <div className="grid grid-cols-1 gap-0">
                      <Label htmlFor="isActive" className="text-sm font-medium">Active</Label>
                      <span className="text-xs text-muted-foreground">
                        {formData.isActive ? "Visible in sidebar" : "Hidden from sidebar"}
                      </span>
                    </div>
                  </div>

                  {/* Developer Only Toggle */}
                  <div className="flex items-center gap-3">
                    <Switch
                      id="isDeveloper"
                      checked={formData.isDeveloper || false}
                      onCheckedChange={(checked) => setFormData({ ...formData, isDeveloper: checked })}
                    />
                    <div className="grid grid-cols-1 gap-0">
                      <Label htmlFor="isDeveloper" className="text-sm font-medium">Developer Only</Label>
                      <span className="text-xs text-muted-foreground">
                        Only visible to developers
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingGroup ? "Update" : "Create"} Group
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
              <TableHead>Icon</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {menuGroups.map((group) => (
              <TableRow key={group.id}>
                <TableCell className="font-medium">{group.name}</TableCell>
                <TableCell>{group.label}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {group.icon && getIconWithFallback(group.icon)}
                    <span className="text-sm text-muted-foreground">{group.icon || "-"}</span>
                  </div>
                </TableCell>
                <TableCell>{group.order}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={group.isActive}
                      onCheckedChange={(checked) => handleToggleActiveDirect(group.id, checked)}
                    />
                    <Badge variant={group.isActive ? "default" : "secondary"}>
                      {group.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Menu className="h-4 w-4" />
                    {group._count.menuItems}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(group)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {group._count.menuItems === 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(group)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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
