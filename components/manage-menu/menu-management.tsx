"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleManagement } from "./role-management";
import { MenuGroupManagement } from "./menu-group-management";
import { MenuItemManagement } from "./menu-item-management";
import { PermissionManagement } from "./permission-management";

export default function MenuManagement() {
  const [activeTab, setActiveTab] = useState("roles");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="menu-groups">Menu Groups</TabsTrigger>
          <TabsTrigger value="menu-items">Menu Items</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
             
            </CardHeader>
            <CardContent>
              <RoleManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu-groups" className="space-y-4">
          <Card>
            <CardHeader>
             
            </CardHeader>
            <CardContent>
              <MenuGroupManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu-items" className="space-y-4">
          <Card>
            <CardHeader>
             
            </CardHeader>
            <CardContent>
              <MenuItemManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
          
            </CardHeader>
            <CardContent>
              <PermissionManagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
