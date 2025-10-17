import React from 'react';

export default function AlarmsPage() {
  return (
    <div className="p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alarms</h1>
          <p className="text-muted-foreground">
            Monitor and manage system alarms and notifications.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Alarm status cards will go here */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Active Alarms</p>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Critical Alarms</p>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Warning Alarms</p>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Cleared Today</p>
          </div>
        </div>

        {/* Alarms table/list will go here */}
        <div className="rounded-lg border">
          <div className="p-6">
            <h2 className="text-xl font-semibold">Recent Alarms</h2>
            <p className="text-muted-foreground">Alarm management interface coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
