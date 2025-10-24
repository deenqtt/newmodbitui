"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, User, Menu as MenuIcon } from "lucide-react";

interface Role {
  id: string;
  name: string;
  description: string;
}

interface MenuItem {
  id: string;
  name: string;
  label: string;
  menuGroup: {
    label: string;
  };
}

interface RolePermission {
  id: string;
  roleId: string;
  menuItemId: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

type PermissionType = 'canView' | 'canCreate' | 'canUpdate' | 'canDelete';

export function PermissionManagement() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [permissions, setPermissions] = useState<Record<string, RolePermission>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchRoles(), fetchMenuItems(), fetchRolePermissions()]);
    setLoading(false);
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/roles", {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        setRoles(result.data.filter((role: Role) => role.name !== 'ADMIN')); // Hide admin for safety
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await fetch("/api/menu-items", {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        setMenuItems(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch menu items:", error);
    }
  };

  const fetchRolePermissions = async () => {
    try {
      const response = await fetch("/api/role-menu-permissions", {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        const permsMap: Record<string, RolePermission> = {};
        result.data.forEach((perm: RolePermission) => {
          permsMap[`${perm.roleId}-${perm.menuItemId}`] = perm;
        });
        setPermissions(permsMap);
      }
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
    }
  };

  const handlePermissionChange = async (
    roleId: string,
    menuItemId: string,
    permissionType: 'canView' | 'canCreate' | 'canUpdate' | 'canDelete',
    checked: boolean
  ) => {
    const key = `${roleId}-${menuItemId}`;
    const existingPermission = permissions[key];

    try {
      setSaving(true);

      if (existingPermission) {
        // Update existing permission
        const response = await fetch(`/api/role-menu-permissions/${existingPermission.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include',
          body: JSON.stringify({
            [permissionType]: checked,
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Update local state
          setPermissions(prev => ({
            ...prev,
            [key]: result.data
          }));
        } else {
          toast({
            title: "Error",
            description: result.error,
            variant: "destructive",
          });
          return; // Don't update local state if error
        }
      } else {
        // Create new permission
        const response = await fetch("/api/role-menu-permissions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include',
          body: JSON.stringify({
            roleId,
            menuItemId,
            canView: permissionType === 'canView' ? checked : false,
            canCreate: permissionType === 'canCreate' ? checked : false,
            canUpdate: permissionType === 'canUpdate' ? checked : false,
            canDelete: permissionType === 'canDelete' ? checked : false,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setPermissions(prev => ({
            ...prev,
            [key]: result.data
          }));
        } else {
          toast({
            title: "Error",
            description: result.error,
            variant: "destructive",
          });
          return; // Don't update local state if error
        }
      }

      toast({
        title: "Success",
        description: "Permission updated successfully",
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getPermissionValue = (roleId: string, menuItemId: string, type: PermissionType) => {
    const permission = permissions[`${roleId}-${menuItemId}`];
    return permission?.[type] ?? false;
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Permission Management</h3>
          <p className="text-sm text-muted-foreground">
            Configure menu access permissions for each role
          </p>
        </div>

        <Button
          onClick={() => fetchRolePermissions()}
          disabled={saving}
          variant="outline"
        >
          <Save className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Menu Item</TableHead>
              <TableHead>Group</TableHead>
              {roles.map((role) => (
                <TableHead key={role.id} className="text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <User className="h-4 w-4" />
                    {role.name}
                  </div>
                  <div className="flex gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">V</span>
                    <span className="text-xs text-muted-foreground">C</span>
                    <span className="text-xs text-muted-foreground">U</span>
                    <span className="text-xs text-muted-foreground">D</span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {menuItems.map((menuItem) => (
              <TableRow key={menuItem.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <MenuIcon className="h-4 w-4" />
                    {menuItem.label}
                    {menuItem.name.includes('developer') && (
                      <Badge variant="outline" className="text-xs">Dev</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {menuItem.menuGroup.label}
                  </Badge>
                </TableCell>
                {roles.map((role) => (
                  <TableCell key={role.id} className="text-center">
                    <div className="flex gap-1 justify-center">
                      <Checkbox
                        checked={getPermissionValue(role.id, menuItem.id, 'canView')}
                        onCheckedChange={(checked: boolean) =>
                          handlePermissionChange(role.id, menuItem.id, 'canView', checked)
                        }
                        disabled={saving}
                      />
                      <Checkbox
                        checked={getPermissionValue(role.id, menuItem.id, 'canCreate')}
                        onCheckedChange={(checked: boolean) =>
                          handlePermissionChange(role.id, menuItem.id, 'canCreate', checked)
                        }
                        disabled={saving}
                      />
                      <Checkbox
                        checked={getPermissionValue(role.id, menuItem.id, 'canUpdate')}
                        onCheckedChange={(checked) => checked !== undefined && checked !== "indeterminate" &&
                          handlePermissionChange(role.id, menuItem.id, 'canUpdate', checked)
                        }
                        disabled={saving}
                      />
                      <Checkbox
                        checked={getPermissionValue(role.id, menuItem.id, 'canDelete')}
                        onCheckedChange={(checked) => checked !== undefined && checked !== "indeterminate" &&
                          handlePermissionChange(role.id, menuItem.id, 'canDelete', checked)
                        }
                        disabled={saving}
                      />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        <p><strong>Legend:</strong></p>
        <p>V = View | C = Create | U = Update | D = Delete</p>
        <div className="mt-2 flex items-center">
          <Badge variant="outline" className="mr-1">Dev</Badge>
          Items marked as developer-only
        </div>
      </div>
    </div>
  );
}
