import { Suspense } from "react";
import MenuManagement from "@/components/manage-menu/menu-management";

export default function ManageMenuPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Menu Management</h1>
          <p className="text-muted-foreground">
            Manage menu groups, menu items, roles, and permissions
          </p>
        </div>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <MenuManagement />
      </Suspense>
    </div>
  );
}
