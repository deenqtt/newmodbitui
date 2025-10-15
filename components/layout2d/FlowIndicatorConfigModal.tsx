"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Device {
  uniqId: string;
  name: string;
  topic: string;
  lastPayload?: string | null;
}

interface FlowIndicator {
  id: string;
  layoutId: string;
  deviceUniqId: string;
  selectedKey: string;
  customName: string;
  positionX: number;
  positionY: number;
  arrowDirection: string;
  logicOperator: string;
  compareValue: string;
  valueType: string;
  trueColor: string;
  trueAnimation: boolean;
  falseColor: string;
  falseAnimation: boolean;
  warningColor: string;
  warningAnimation: boolean;
  warningEnabled: boolean;
  warningOperator?: string;
  warningValue?: string;
  device?: Device;
}

interface FlowIndicatorConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (indicator: Partial<FlowIndicator>) => void;
  initialConfig?: any;
  position?: { x: number; y: number } | null;
}

const arrowIcons = {
  right: ArrowRight,
  left: ArrowLeft,
  up: ArrowUp,
  down: ArrowDown,
};

const logicOperators = [
  { value: ">", label: "Greater than (>)" },
  { value: ">=", label: "Greater than or equal (>=)" },
  { value: "<", label: "Less than (<)" },
  { value: "<=", label: "Less than or equal (<=)" },
  { value: "==", label: "Equal to (==)" },
  { value: "!=", label: "Not equal to (!=)" },
];

const valueTypes = [
  { value: "number", label: "Number" },
  { value: "string", label: "String" },
  { value: "boolean", label: "Boolean" },
];

const arrowDirections = [
  { value: "right", label: "Right →", icon: ArrowRight },
  { value: "left", label: "Left ←", icon: ArrowLeft },
  { value: "up", label: "Up ↑", icon: ArrowUp },
  { value: "down", label: "Down ↓", icon: ArrowDown },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export default function FlowIndicatorConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  position,
}: FlowIndicatorConfigModalProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<FlowIndicator>>({
    deviceUniqId: "",
    selectedKey: "",
    customName: "",
    positionX: 50,
    positionY: 50,
    arrowDirection: "right",
    logicOperator: ">",
    compareValue: "",
    valueType: "number",
    trueColor: "#22c55e",
    trueAnimation: true,
    falseColor: "#ef4444",
    falseAnimation: false,
    warningColor: "#f59e0b",
    warningAnimation: true,
    warningEnabled: false,
    warningOperator: ">",
    warningValue: "",
  });

  const [availableKeys, setAvailableKeys] = useState<string[]>([]);

  // Fetch devices
  const fetchDevices = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/devices/for-selection`;

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Authentication required. Please refresh the page.");
          onClose();
          return;
        }
        throw new Error(
          `Failed to fetch devices: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      setDevices(data);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
      toast.error("Failed to load devices. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      fetchDevices();
    }
  }, [isOpen, fetchDevices]);

  useEffect(() => {
    if (initialConfig) {
      setFormData(initialConfig);
    } else if (position) {
      setFormData(prev => ({
        ...prev,
        positionX: position.x,
        positionY: position.y,
      }));
    }
  }, [initialConfig, position]);

  // Get available keys from selected device's last payload
  useEffect(() => {
    if (formData.deviceUniqId) {
      const selectedDevice = devices.find(d => d.uniqId === formData.deviceUniqId);
      if (selectedDevice?.lastPayload) {
        try {
          const payload = JSON.parse(selectedDevice.lastPayload);
          const innerPayload = typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};
          setAvailableKeys(Object.keys(innerPayload));
        } catch (error) {
          console.error("Failed to parse device payload:", error);
          setAvailableKeys([]);
        }
      } else {
        setAvailableKeys([]);
      }
    }
  }, [formData.deviceUniqId, devices]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.deviceUniqId || !formData.selectedKey || !formData.customName || !formData.compareValue) {
      toast.error("Please fill in all required fields");
      return;
    }

    onSave(formData);
  };

  const resetForm = () => {
    setFormData({
      deviceUniqId: "",
      selectedKey: "",
      customName: "",
      positionX: clickPosition?.x || 50,
      positionY: clickPosition?.y || 50,
      arrowDirection: "right",
      logicOperator: ">",
      compareValue: "",
      valueType: "number",
      trueColor: "#22c55e",
      trueAnimation: true,
      falseColor: "#ef4444",
      falseAnimation: false,
      warningColor: "#f59e0b",
      warningAnimation: true,
      warningEnabled: false,
      warningOperator: ">",
      warningValue: "",
    });
    setAvailableKeys([]);
    onClose();
  };

  const getPreviewColor = (state: "true" | "false" | "warning") => {
    switch (state) {
      case "true": return formData.trueColor;
      case "false": return formData.falseColor;
      case "warning": return formData.warningColor;
    }
  };

  const getPreviewAnimation = (state: "true" | "false" | "warning") => {
    switch (state) {
      case "true": return formData.trueAnimation;
      case "false": return formData.falseAnimation;
      case "warning": return formData.warningAnimation;
    }
  };

  const ArrowIcon = arrowIcons[formData.arrowDirection as keyof typeof arrowIcons] || ArrowRight;

  return (
    <Dialog open={isOpen} onOpenChange={resetForm}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialConfig ? "Edit Flow Indicator" : "Add Flow Indicator"}
          </DialogTitle>
          <DialogDescription>
            Configure a flow process indicator with conditional logic for visual feedback.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Device and Data Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Device & Data Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="device">Device *</Label>
                  <Select
                    value={formData.deviceUniqId}
                    onValueChange={(value) => {
                      setFormData(prev => ({
                        ...prev,
                        deviceUniqId: value,
                        selectedKey: "", // Reset selected key when device changes
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select device" />
                    </SelectTrigger>
                    <SelectContent>
                      {(devices || []).map((device) => (
                        <SelectItem key={device.uniqId} value={device.uniqId}>
                          {device.name} ({device.topic})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="selectedKey">Data Key *</Label>
                  <Select
                    value={formData.selectedKey}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, selectedKey: value }))}
                    disabled={!formData.deviceUniqId || availableKeys.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select data key" />
                    </SelectTrigger>
                    <SelectContent>
                      {(availableKeys || []).map((key) => (
                        <SelectItem key={key} value={key}>
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.deviceUniqId && availableKeys.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      No data available from this device
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="customName">Indicator Name *</Label>
                  <Input
                    id="customName"
                    value={formData.customName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customName: e.target.value }))}
                    placeholder="Enter indicator name"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Visual Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Visual Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="positionX">Position X (%)</Label>
                    <Input
                      id="positionX"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.positionX}
                      onChange={(e) => setFormData(prev => ({ ...prev, positionX: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="positionY">Position Y (%)</Label>
                    <Input
                      id="positionY"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.positionY}
                      onChange={(e) => setFormData(prev => ({ ...prev, positionY: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Arrow Direction</Label>
                  <Select
                    value={formData.arrowDirection}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, arrowDirection: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {arrowDirections.map((direction) => {
                        const Icon = direction.icon;
                        return (
                          <SelectItem key={direction.value} value={direction.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {direction.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Logic Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Logic Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Value Type</Label>
                  <Select
                    value={formData.valueType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, valueType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {valueTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Logic Operator *</Label>
                  <Select
                    value={formData.logicOperator}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, logicOperator: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {logicOperators.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="compareValue">Compare Value *</Label>
                  <Input
                    id="compareValue"
                    value={formData.compareValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, compareValue: e.target.value }))}
                    placeholder={
                      formData.valueType === "boolean"
                        ? "true or false"
                        : formData.valueType === "number"
                          ? "123"
                          : "text"
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visual States Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Visual States</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* True State */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Label className="text-sm font-medium">When Condition is TRUE</Label>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="trueColor">Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="trueColor"
                        type="color"
                        value={formData.trueColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, trueColor: e.target.value }))}
                        className="w-16 h-10"
                      />
                      <Input
                        value={formData.trueColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, trueColor: e.target.value }))}
                        placeholder="#22c55e"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      checked={formData.trueAnimation}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, trueAnimation: checked }))}
                    />
                    <Label className="text-sm">Animation</Label>
                  </div>
                  <div className="pt-6">
                    <ArrowIcon
                      className={`h-8 w-8 ${getPreviewAnimation("true") ? "animate-pulse" : ""}`}
                      style={{ color: getPreviewColor("true") }}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* False State */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <Label className="text-sm font-medium">When Condition is FALSE</Label>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="falseColor">Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="falseColor"
                        type="color"
                        value={formData.falseColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, falseColor: e.target.value }))}
                        className="w-16 h-10"
                      />
                      <Input
                        value={formData.falseColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, falseColor: e.target.value }))}
                        placeholder="#ef4444"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      checked={formData.falseAnimation}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, falseAnimation: checked }))}
                    />
                    <Label className="text-sm">Animation</Label>
                  </div>
                  <div className="pt-6">
                    <ArrowIcon
                      className={`h-8 w-8 ${getPreviewAnimation("false") ? "animate-pulse" : ""}`}
                      style={{ color: getPreviewColor("false") }}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Warning State */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.warningEnabled}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, warningEnabled: checked }))}
                    />
                    <Label className="text-sm font-medium">Enable Warning State</Label>
                  </div>
                </div>

                {formData.warningEnabled && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Warning Operator</Label>
                        <Select
                          value={formData.warningOperator}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, warningOperator: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select operator" />
                          </SelectTrigger>
                          <SelectContent>
                            {logicOperators.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="warningValue">Warning Value</Label>
                        <Input
                          id="warningValue"
                          value={formData.warningValue}
                          onChange={(e) => setFormData(prev => ({ ...prev, warningValue: e.target.value }))}
                          placeholder="Warning threshold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="warningColor">Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="warningColor"
                            type="color"
                            value={formData.warningColor}
                            onChange={(e) => setFormData(prev => ({ ...prev, warningColor: e.target.value }))}
                            className="w-16 h-10"
                          />
                          <Input
                            value={formData.warningColor}
                            onChange={(e) => setFormData(prev => ({ ...prev, warningColor: e.target.value }))}
                            placeholder="#f59e0b"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <Switch
                          checked={formData.warningAnimation}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, warningAnimation: checked }))}
                        />
                        <Label className="text-sm">Animation</Label>
                      </div>
                      <div className="pt-6">
                        <ArrowIcon
                          className={`h-8 w-8 ${getPreviewAnimation("warning") ? "animate-pulse" : ""}`}
                          style={{ color: getPreviewColor("warning") }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit">
              {initialConfig ? "Update Indicator" : "Create Indicator"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}