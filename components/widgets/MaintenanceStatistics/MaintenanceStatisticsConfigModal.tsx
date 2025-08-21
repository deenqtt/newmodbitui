// File: components/widgets/MaintenanceStatistics/MaintenanceStatisticsConfigModal.tsx
"use client";

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
import { BarChart } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
}

export const MaintenanceStatisticsConfigModal = ({
  isOpen,
  onClose,
  onSave,
}: Props) => {
  const handleSave = () => {
    // Placeholder config - akan diimplementasikan nanti
    const config = {
      widgetTitle: "Maintenance Statistics",
      timeRange: "30d", // 7d, 30d, 90d, 1y
      showPercentages: true,
      includeOverdue: true,
      chartType: "bar" // bar, pie, line
    };
    
    onSave(config);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl flex items-center">
            <BarChart className="h-5 w-5 mr-2" />
            Configure Maintenance Statistics
          </DialogTitle>
          <DialogDescription>
            This widget is not yet fully implemented. Configuration will be available in future updates.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 p-6">
          <div className="grid gap-2">
            <Label htmlFor="widgetTitle">Widget Title</Label>
            <Input
              id="widgetTitle"
              defaultValue="Maintenance Statistics"
              placeholder="e.g., Maintenance Performance Overview"
            />
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Coming Soon</h4>
            <p className="text-sm text-blue-800">
              The Maintenance Statistics widget will provide comprehensive analytics including:
            </p>
            <ul className="text-sm text-blue-800 mt-2 list-disc list-inside">
              <li>Completion rate trends</li>
              <li>Average task duration</li>
              <li>Overdue task statistics</li>
              <li>Technician performance metrics</li>
              <li>Equipment maintenance frequency</li>
              <li>Cost analysis and budgeting</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave}>
            Save Widget (Preview)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};