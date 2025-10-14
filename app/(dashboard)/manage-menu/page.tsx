"use client"

import { Suspense, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import MenuManagement from "@/components/manage-menu/menu-management";
import { RolePreviewCard } from "@/components/manage-menu/role-preview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FolderOpen, Menu, Shield, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/loading-page";

export default function ManageMenuPage() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    // In a real app, this would trigger a refresh of the menu data
  };

  return (
    <div className="space-y-6 p-6 pb-8">
      {/* Enhanced Header with Role Info */}
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Menu Management</h1>
          <p className="text-muted-foreground">
            Comprehensive menu system management and access control
            {user?.role && (
              <Badge variant="secondary" className="ml-2">
                {user.role.name}
              </Badge>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Main Tabs: Management + Preview */}
      <Tabs defaultValue="management" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="management">Menu Management</TabsTrigger>
          <TabsTrigger value="preview">Role Preview</TabsTrigger>
        </TabsList>

        {/* Management Tab - Original tabs */}
        <TabsContent value="management" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">System roles</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Menu Groups</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">11</div>
                <p className="text-xs text-muted-foreground">Active groups</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Menu Items</CardTitle>
                <Menu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">70+</div>
                <p className="text-xs text-muted-foreground">Total items</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Permissions</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">210+</div>
                <p className="text-xs text-muted-foreground">Role assignments</p>
              </CardContent>
            </Card>
          </div>

          {/* Menu Management with Enhanced Loading */}
          <Suspense
            fallback={
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <LoadingPage variant="minimal" message="Loading menu management..." />
                </CardContent>
              </Card>
            }
            key={refreshKey}
          >
            <MenuManagement />
          </Suspense>
        </TabsContent>

        {/* Preview Tab - Standalone role preview */}
        <TabsContent value="preview" className="space-y-6">
          {user && (
            <RolePreviewCard userRole={user.role} key={refreshKey} />
          )}

          {/* Additional preview info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Menu className="h-5 w-5" />
                Menu Structure Overview
              </CardTitle>
              <CardDescription>
                This preview shows which menus are accessible based on user roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-medium text-green-700">✅ Available Menus</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Dashboard items</li>
                    <li>• Control features</li>
                    <li>• Device management</li>
                    <li>• Network settings</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-orange-700">🔒 Restricted Items</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Developer tools</li>
                    <li>• Advanced configs</li>
                    <li>• System settings</li>
                    <li>• Admin privileges</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-blue-700">👥 Role Types</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <strong>ADMIN:</strong> Full access</li>
                    <li>• <strong>USER:</strong> Basic features</li>
                    <li>• <strong>DEVELOPER:</strong> Dev tools</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
