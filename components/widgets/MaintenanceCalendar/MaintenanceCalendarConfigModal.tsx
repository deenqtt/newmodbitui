// File: components/widgets/MaintenanceCalendar/MaintenanceCalendarConfigModal.tsx
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
import { Calendar } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
}

export const MaintenanceCalendarConfigModal = ({
  isOpen,
  onClose,
  onSave,
}: Props) => {
  const handleSave = () => {
    // Placeholder config - akan diimplementasikan nanti
    const config = {
      widgetTitle: "Maintenance Calendar",
      viewType: "month", // month, week
      showCompleted: false,
      highlightOverdue: true
    };
    
    onSave(config);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Configure Maintenance Calendar
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
              defaultValue="Maintenance Calendar"
              placeholder="e.g., Monthly Maintenance Schedule"
            />
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Coming Soon</h4>
            <p className="text-sm text-blue-800">
              The Maintenance Calendar widget will show scheduled maintenance tasks in a calendar view with:
            </p>
            <ul className="text-sm text-blue-800 mt-2 list-disc list-inside">
              <li>Monthly and weekly calendar views</li>
              <li>Color-coded task status</li>
              <li>Drag-and-drop rescheduling</li>
              <li>Overdue task highlighting</li>
              <li>Quick task creation</li>
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