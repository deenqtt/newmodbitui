import React from 'react';

export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            System overview and monitoring dashboard.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Dashboard status cards */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="text-2xl font-bold text-green-600">🟢</div>
            <p className="text-xs text-muted-foreground">System Status</p>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="text-2xl font-bold">11</div>
            <p className="text-xs text-muted-foreground">Active Devices</p>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">Menu Sections</p>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Maintenance Tasks</p>
          </div>
        </div>

        {/* Dashboard content will go here */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">System Overview</h2>
            <p className="text-muted-foreground">
              IoT monitoring system running with integrated database seeding.
              All new seeds (layout2d, logging-configs, maintenance) have been successfully implemented.
            </p>
          </div>

          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <p className="text-muted-foreground">Activity monitoring coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
