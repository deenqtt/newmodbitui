// File: components/widgets/CameraSnapshot/CameraSnapshotConfigModal.tsx
"use client";

import React, { useState, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import Swal from "sweetalert2";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface CctvConfig {
  id: string;
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: {
    widgetTitle: string;
    cctvId: string;
  };
}

export const CameraSnapshotConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [cctvList, setCctvList] = useState<CctvConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [widgetTitle, setWidgetTitle] = useState(
    initialConfig?.widgetTitle || ""
  );
  const [selectedCctvId, setSelectedCctvId] = useState<string | null>(
    initialConfig?.cctvId || null
  );

  useEffect(() => {
    if (isOpen) {
      if (initialConfig) {
        setWidgetTitle(initialConfig.widgetTitle);
        setSelectedCctvId(initialConfig.cctvId);
      } else {
        setWidgetTitle("");
        setSelectedCctvId(null);
      }

      const fetchCctvList = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/cctv`);
          if (!response.ok) throw new Error("Failed to fetch CCTV list");
          setCctvList(await response.json());
        } catch (error: any) {
          Swal.fire("Error", error.message, "error");
          onClose();
        } finally {
          setIsLoading(false);
        }
      };
      fetchCctvList();
    }
  }, [isOpen, onClose, initialConfig]);

  const handleSave = () => {
    if (!widgetTitle || !selectedCctvId) {
      Swal.fire(
        "Incomplete",
        "Widget Title and a CCTV selection are required.",
        "warning"
      );
      return;
    }
    onSave({
      widgetTitle,
      cctvId: selectedCctvId,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            Configure Camera Snapshot
          </DialogTitle>
          <DialogDescription>
            Select a CCTV to display its latest snapshot.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 p-6">
          <div className="grid gap-2">
            <Label>Widget Title</Label>
            <Input
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
              placeholder="e.g., Lobby Camera"
            />
          </div>
          <div className="grid gap-2">
            <Label>Select CCTV</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                onValueChange={setSelectedCctvId}
                value={selectedCctvId || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a CCTV feed" />
                </SelectTrigger>
                <SelectContent>
                  {cctvList.map((cctv) => (
                    <SelectItem key={cctv.id} value={cctv.id}>
                      {cctv.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSave}
            disabled={isLoading || !widgetTitle || !selectedCctvId}
          >
            Save Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
