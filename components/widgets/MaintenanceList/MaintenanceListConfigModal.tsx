// File: components/widgets/MaintenanceList/MaintenanceListConfigModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import Swal from "sweetalert2";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
}

const AVAILABLE_STATUSES = [
  { value: "Scheduled", label: "Scheduled", color: "bg-blue-100 text-blue-800" },
  { value: "In Progress", label: "In Progress", color: "bg-yellow-100 text-yellow-800" },
  { value: "Completed", label: "Completed", color: "bg-green-100 text-green-800" },
  { value: "Cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
  { value: "Overdue", label: "Overdue", color: "bg-orange-100 text-orange-800" }
];

const REFRESH_INTERVALS = [
  { value: 1, label: "1 minute" },
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" }
];

export const MaintenanceListConfigModal = ({
  isOpen,
  onClose,
  onSave,
}: Props) => {
  // Form state
  const [widgetTitle, setWidgetTitle] = useState("Maintenance List");
  const [maxItems, setMaxItems] = useState("10");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState("5");
  const [showDescription, setShowDescription] = useState(true);
  const [showAssignee, setShowAssignee] = useState(true);
  const [showDevice, setShowDevice] = useState(true);
  const [dateFormat, setDateFormat] = useState<'relative' | 'absolute'>('relative');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset to default values when opening
      setWidgetTitle("Maintenance List");
      setMaxItems("10");
      setStatusFilter([]);
      setAutoRefresh(false);
      setRefreshInterval("5");
      setShowDescription(true);
      setShowAssignee(true);
      setShowDevice(true);
      setDateFormat('relative');
    }
  }, [isOpen]);

  // Handle status filter toggle
  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  // Remove status from filter
  const removeStatusFilter = (status: string) => {
    setStatusFilter(prev => prev.filter(s => s !== status));
  };

  // Form validation
  const validateForm = () => {
    if (!widgetTitle.trim()) {
      Swal.fire("Validation Error", "Widget title is required.", "warning");
      return false;
    }

    const maxItemsNum = parseInt(maxItems);
    if (isNaN(maxItemsNum) || maxItemsNum < 1 || maxItemsNum > 50) {
      Swal.fire("Validation Error", "Max items must be between 1 and 50.", "warning");
      return false;
    }

    if (autoRefresh) {
      const intervalNum = parseInt(refreshInterval);
      if (isNaN(intervalNum) || intervalNum < 1) {
        Swal.fire("Validation Error", "Refresh interval must be at least 1 minute.", "warning");
        return false;
      }
    }

    return true;
  };

  // Handle save
  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const config = {
      widgetTitle: widgetTitle.trim(),
      maxItems: parseInt(maxItems),
      statusFilter: statusFilter.length > 0 ? statusFilter : undefined,
      autoRefresh,
      refreshInterval: autoRefresh ? parseInt(refreshInterval) : undefined,
      showDescription,
      showAssignee,
      showDevice,
      dateFormat
    };

    onSave(config);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            Configure Maintenance List Widget
          </DialogTitle>
          <DialogDescription>
            Configure how maintenance tasks are displayed in your dashboard widget.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 p-6">
          {/* Widget Title */}
          <div className="grid gap-2">
            <Label htmlFor="widgetTitle">Widget Title</Label>
            <Input
              id="widgetTitle"
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
              placeholder="e.g., Recent Maintenance Tasks"
              maxLength={50}
            />
          </div>

          {/* Max Items */}
          <div className="grid gap-2">
            <Label htmlFor="maxItems">Maximum Items to Display</Label>
            <Select value={maxItems} onValueChange={setMaxItems}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 items</SelectItem>
                <SelectItem value="10">10 items</SelectItem>
                <SelectItem value="15">15 items</SelectItem>
                <SelectItem value="20">20 items</SelectItem>
                <SelectItem value="25">25 items</SelectItem>
                <SelectItem value="30">30 items</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Status Filter */}
          <div className="grid gap-3">
            <Label>Status Filter (Optional)</Label>
            <p className="text-sm text-muted-foreground">
              Select specific statuses to show. Leave empty to show all statuses.
            </p>
            
            {/* Status Selection */}
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_STATUSES.map((status) => (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={statusFilter.includes(status.value)}
                    onCheckedChange={() => toggleStatusFilter(status.value)}
                  />
                  <Label 
                    htmlFor={`status-${status.value}`} 
                    className="text-sm cursor-pointer flex-1"
                  >
                    <Badge className={`${status.color} text-xs`}>
                      {status.label}
                    </Badge>
                  </Label>
                </div>
              ))}
            </div>

            {/* Selected Status Filters */}
            {statusFilter.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-sm text-muted-foreground">Selected:</span>
                {statusFilter.map((status) => {
                  const statusInfo = AVAILABLE_STATUSES.find(s => s.value === status);
                  return (
                    <Badge
                      key={status}
                      className={`${statusInfo?.color} text-xs flex items-center gap-1`}
                    >
                      {status}
                      <X
                        className="h-3 w-3 cursor-pointer hover:bg-black/20 rounded"
                        onClick={() => removeStatusFilter(status)}
                      />
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Auto Refresh */}
          <div className="grid gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoRefresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="autoRefresh" className="cursor-pointer">
                Enable Auto Refresh
              </Label>
            </div>

            {autoRefresh && (
              <div className="grid gap-2 ml-6">
                <Label htmlFor="refreshInterval">Refresh Interval</Label>
                <Select value={refreshInterval} onValueChange={setRefreshInterval}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFRESH_INTERVALS.map((interval) => (
                      <SelectItem key={interval.value} value={interval.value.toString()}>
                        {interval.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          {/* Display Options */}
          <div className="grid gap-3">
            <Label>Display Options</Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showDescription"
                  checked={showDescription}
                  onCheckedChange={setShowDescription}
                />
                <Label htmlFor="showDescription" className="cursor-pointer text-sm">
                  Show Task Description
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showAssignee"
                  checked={showAssignee}
                  onCheckedChange={setShowAssignee}
                />
                <Label htmlFor="showAssignee" className="cursor-pointer text-sm">
                  Show Assignee
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showDevice"
                  checked={showDevice}
                  onCheckedChange={setShowDevice}
                />
                <Label htmlFor="showDevice" className="cursor-pointer text-sm">
                  Show Target Device
                </Label>
              </div>
            </div>
          </div>

          {/* Date Format */}
          <div className="grid gap-2">
            <Label htmlFor="dateFormat">Date Format</Label>
            <Select value={dateFormat} onValueChange={(value: 'relative' | 'absolute') => setDateFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relative">Relative (e.g., "2 hours ago")</SelectItem>
                <SelectItem value="absolute">Absolute (e.g., "20 Jan 2025, 14:30")</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Widget Preview Settings</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>Title:</strong> {widgetTitle}</p>
              <p>• <strong>Max Items:</strong> {maxItems} tasks</p>
              <p>• <strong>Status Filter:</strong> {statusFilter.length === 0 ? "All statuses" : `${statusFilter.length} selected`}</p>
              <p>• <strong>Auto Refresh:</strong> {autoRefresh ? `Every ${refreshInterval} minutes` : "Disabled"}</p>
              <p>• <strong>Date Format:</strong> {dateFormat === 'relative' ? 'Relative' : 'Absolute'}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave}>
            Save Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};