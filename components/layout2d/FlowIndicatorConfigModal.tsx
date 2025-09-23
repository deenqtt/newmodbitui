"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  ArrowBigRight,
  ArrowBigLeft,
  ArrowBigUp,
  ArrowBigDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useMqtt } from "@/contexts/MqttContext";

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
  // NEW: Multi-logic fields
  useMultiLogic?: boolean;
  multiLogicConfig?: string;
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
  right: ArrowBigRight,
  left: ArrowBigLeft,
  up: ArrowBigUp,
  down: ArrowBigDown,
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

// NEW: Multi-logic types
type LogicCondition = {
  operator: string;
  value: string;
  valueType: "number" | "string" | "boolean";
};

type LogicState = {
  name: string;
  color: string;
  animation: boolean;
  conditions: LogicCondition[];
  conditionLogic: "AND" | "OR";
};

type MultiLogicConfig = {
  states: LogicState[];
  defaultState: string;
};

const conditionLogicOptions = [
  { value: "AND", label: "AND (All conditions must be true)" },
  { value: "OR", label: "OR (Any condition can be true)" },
];

const arrowDirections = [
  { value: "right", label: "Right", icon: ArrowBigRight },
  { value: "left", label: "Left", icon: ArrowBigLeft },
  { value: "up", label: "Up", icon: ArrowBigUp },
  { value: "down", label: "Down", icon: ArrowBigDown },
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
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const { subscribe, unsubscribe } = useMqtt();
  const subscribedTopicRef = useRef<string | null>(null);
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
    // NEW: Multi-logic fields
    useMultiLogic: false,
    multiLogicConfig: "",
  });

  const [availableKeys, setAvailableKeys] = useState<string[]>([]);

  // NEW: Multi-logic configuration state
  const [multiLogicConfig, setMultiLogicConfig] = useState<MultiLogicConfig>({
    states: [
      {
        name: "Normal",
        color: "#22c55e",
        animation: true,
        conditions: [{ operator: ">=", value: "0", valueType: "number" }],
        conditionLogic: "AND",
      },
      {
        name: "Warning",
        color: "#f59e0b",
        animation: true,
        conditions: [{ operator: ">=", value: "75", valueType: "number" }],
        conditionLogic: "AND",
      },
      {
        name: "Critical",
        color: "#ef4444",
        animation: true,
        conditions: [{ operator: ">=", value: "90", valueType: "number" }],
        conditionLogic: "AND",
      },
    ],
    defaultState: "Normal",
  });

  // Handle MQTT message for key detection (sama seperti DataPointConfigModal)
  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};
        const keys = Object.keys(innerPayload);
        setAvailableKeys(keys);
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
        setAvailableKeys([]);
      } finally {
        setIsWaitingForKey(false);
        // Unsubscribe setelah mendapat keys (one-time fetch seperti DataPointConfigModal)
        if (subscribedTopicRef.current) {
          unsubscribe(subscribedTopicRef.current, handleMqttMessage);
          subscribedTopicRef.current = null;
        }
      }
    },
    [unsubscribe]
  );

  // NEW: Helper functions for multi-logic configuration
  const addLogicState = () => {
    const newState: LogicState = {
      name: `State ${multiLogicConfig.states.length + 1}`,
      color: "#3b82f6",
      animation: true,
      conditions: [{ operator: ">", value: "0", valueType: "number" }],
      conditionLogic: "AND",
    };

    setMultiLogicConfig((prev) => ({
      ...prev,
      states: [...prev.states, newState],
    }));
  };

  const removeLogicState = (index: number) => {
    setMultiLogicConfig((prev) => {
      const newStates = prev.states.filter((_, i) => i !== index);
      return {
        ...prev,
        states: newStates,
        defaultState:
          newStates.length > 0 &&
          !newStates.find((s) => s.name === prev.defaultState)
            ? newStates[0].name
            : prev.defaultState,
      };
    });
  };

  const updateLogicState = (index: number, updates: Partial<LogicState>) => {
    setMultiLogicConfig((prev) => {
      const updatedStates = prev.states.map((state, i) =>
        i === index ? { ...state, ...updates } : state
      );

      // If updating state name and it was the default state, update default state reference
      let newDefaultState = prev.defaultState;
      if (updates.name && prev.states[index].name === prev.defaultState) {
        newDefaultState = updates.name;
      }

      return {
        ...prev,
        states: updatedStates,
        defaultState: newDefaultState,
      };
    });
  };

  const addConditionToState = (stateIndex: number) => {
    const newCondition: LogicCondition = {
      operator: ">",
      value: "0",
      valueType: "number",
    };

    setMultiLogicConfig((prev) => ({
      ...prev,
      states: prev.states.map((state, i) =>
        i === stateIndex
          ? { ...state, conditions: [...state.conditions, newCondition] }
          : state
      ),
    }));
  };

  const removeConditionFromState = (
    stateIndex: number,
    conditionIndex: number
  ) => {
    setMultiLogicConfig((prev) => ({
      ...prev,
      states: prev.states.map((state, i) =>
        i === stateIndex
          ? {
              ...state,
              conditions: state.conditions.filter(
                (_, ci) => ci !== conditionIndex
              ),
            }
          : state
      ),
    }));
  };

  const updateConditionInState = (
    stateIndex: number,
    conditionIndex: number,
    updates: Partial<LogicCondition>
  ) => {
    setMultiLogicConfig((prev) => ({
      ...prev,
      states: prev.states.map((state, i) =>
        i === stateIndex
          ? {
              ...state,
              conditions: state.conditions.map((condition, ci) =>
                ci === conditionIndex ? { ...condition, ...updates } : condition
              ),
            }
          : state
      ),
    }));
  };

  const createDefaultMultiLogicConfig = (
    deviceType: string,
    selectedKey: string
  ): MultiLogicConfig => {
    // Create smart defaults based on common IoT sensor patterns
    if (selectedKey.toLowerCase().includes("temp")) {
      return {
        states: [
          {
            name: "Cold",
            color: "#3b82f6",
            animation: false,
            conditions: [{ operator: "<", value: "20", valueType: "number" }],
            conditionLogic: "AND",
          },
          {
            name: "Normal",
            color: "#22c55e",
            animation: false,
            conditions: [
              { operator: ">=", value: "20", valueType: "number" },
              { operator: "<=", value: "30", valueType: "number" },
            ],
            conditionLogic: "AND",
          },
          {
            name: "Hot",
            color: "#f59e0b",
            animation: true,
            conditions: [
              { operator: ">", value: "30", valueType: "number" },
              { operator: "<=", value: "40", valueType: "number" },
            ],
            conditionLogic: "AND",
          },
          {
            name: "Critical",
            color: "#ef4444",
            animation: true,
            conditions: [{ operator: ">", value: "40", valueType: "number" }],
            conditionLogic: "AND",
          },
        ],
        defaultState: "Normal",
      };
    } else if (selectedKey.toLowerCase().includes("humid")) {
      return {
        states: [
          {
            name: "Dry",
            color: "#f59e0b",
            animation: true,
            conditions: [{ operator: "<", value: "30", valueType: "number" }],
            conditionLogic: "AND",
          },
          {
            name: "Normal",
            color: "#22c55e",
            animation: false,
            conditions: [
              { operator: ">=", value: "30", valueType: "number" },
              { operator: "<=", value: "70", valueType: "number" },
            ],
            conditionLogic: "AND",
          },
          {
            name: "Humid",
            color: "#3b82f6",
            animation: true,
            conditions: [{ operator: ">", value: "70", valueType: "number" }],
            conditionLogic: "AND",
          },
        ],
        defaultState: "Normal",
      };
    } else if (selectedKey.toLowerCase().includes("pressure")) {
      return {
        states: [
          {
            name: "Low",
            color: "#ef4444",
            animation: true,
            conditions: [{ operator: "<", value: "1000", valueType: "number" }],
            conditionLogic: "AND",
          },
          {
            name: "Normal",
            color: "#22c55e",
            animation: false,
            conditions: [
              { operator: ">=", value: "1000", valueType: "number" },
              { operator: "<=", value: "1030", valueType: "number" },
            ],
            conditionLogic: "AND",
          },
          {
            name: "High",
            color: "#f59e0b",
            animation: true,
            conditions: [{ operator: ">", value: "1030", valueType: "number" }],
            conditionLogic: "AND",
          },
        ],
        defaultState: "Normal",
      };
    } else {
      // Generic configuration
      return {
        states: [
          {
            name: "Low",
            color: "#3b82f6",
            animation: false,
            conditions: [{ operator: "<=", value: "33", valueType: "number" }],
            conditionLogic: "AND",
          },
          {
            name: "Medium",
            color: "#22c55e",
            animation: false,
            conditions: [
              { operator: ">", value: "33", valueType: "number" },
              { operator: "<=", value: "66", valueType: "number" },
            ],
            conditionLogic: "AND",
          },
          {
            name: "High",
            color: "#f59e0b",
            animation: true,
            conditions: [{ operator: ">", value: "66", valueType: "number" }],
            conditionLogic: "AND",
          },
        ],
        defaultState: "Medium",
      };
    }
  };

  // Fetch devices (sama seperti DataPointConfigModal)
  const fetchDevices = async () => {
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
  };

  useEffect(() => {
    if (isOpen) {
      fetchDevices();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialConfig) {
      setFormData(initialConfig);

      // Handle multi-logic configuration
      if (initialConfig.useMultiLogic && initialConfig.multiLogicConfig) {
        try {
          const parsedConfig =
            typeof initialConfig.multiLogicConfig === "string"
              ? JSON.parse(initialConfig.multiLogicConfig)
              : initialConfig.multiLogicConfig;

          // Validate parsed config
          if (parsedConfig.states && parsedConfig.states.length > 0) {
            // Ensure all states have valid names
            const validStates = parsedConfig.states.filter(
              (state: LogicState) => state.name && state.name.trim()
            );
            if (validStates.length > 0) {
              // Ensure default state exists
              const defaultState = validStates.find(
                (s: LogicState) => s.name === parsedConfig.defaultState
              )
                ? parsedConfig.defaultState
                : validStates[0].name;

              setMultiLogicConfig({
                ...parsedConfig,
                states: validStates,
                defaultState: defaultState,
              });
            } else {
              throw new Error("No valid states found");
            }
          } else {
            throw new Error("No states found");
          }
        } catch (error) {
          console.error("Error parsing multi-logic config:", error);
          // Fallback to default config
          setMultiLogicConfig({
            states: [
              {
                name: "Default",
                color: "#22c55e",
                animation: false,
                conditions: [
                  { operator: ">=", value: "0", valueType: "number" },
                ],
                conditionLogic: "AND",
              },
            ],
            defaultState: "Default",
          });
        }
      } else {
        // If editing legacy indicator, create smart default based on data key
        if (initialConfig.selectedKey) {
          const smartConfig = createDefaultMultiLogicConfig(
            "generic",
            initialConfig.selectedKey
          );
          setMultiLogicConfig(smartConfig);
        }
      }
    } else if (position) {
      setFormData((prev) => ({
        ...prev,
        positionX: position.x,
        positionY: position.y,
      }));
    }
  }, [initialConfig, position]);

  // Auto-generate smart multi-logic config when selectedKey changes
  useEffect(() => {
    if (formData.selectedKey && !initialConfig && formData.useMultiLogic) {
      const smartConfig = createDefaultMultiLogicConfig(
        "generic",
        formData.selectedKey
      );
      setMultiLogicConfig(smartConfig);
    }
  }, [formData.selectedKey, formData.useMultiLogic, initialConfig]);

  // Cleanup MQTT subscription on modal close (sama seperti DataPointConfigModal)
  useEffect(() => {
    if (!isOpen && subscribedTopicRef.current) {
      unsubscribe(subscribedTopicRef.current, handleMqttMessage);
      subscribedTopicRef.current = null;
      setIsWaitingForKey(false);
    }
  }, [isOpen, unsubscribe, handleMqttMessage]);

  // Real-time device key fetching via MQTT (sama persis seperti DataPointConfigModal)
  useEffect(() => {
    const selectedDevice = devices.find(
      (d) => d.uniqId === formData.deviceUniqId
    );
    const newTopic = selectedDevice?.topic;

    if (subscribedTopicRef.current && subscribedTopicRef.current !== newTopic) {
      unsubscribe(subscribedTopicRef.current, handleMqttMessage);
      subscribedTopicRef.current = null;
    }

    if (newTopic && newTopic !== subscribedTopicRef.current) {
      setAvailableKeys([]);
      setIsWaitingForKey(true);
      subscribe(newTopic, handleMqttMessage);
      subscribedTopicRef.current = newTopic;
    } else if (!newTopic) {
      setAvailableKeys([]);
      setIsWaitingForKey(false);
    }
  }, [
    formData.deviceUniqId,
    devices,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscribedTopicRef.current) {
        unsubscribe(subscribedTopicRef.current, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    };
  }, [unsubscribe, handleMqttMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi field wajib
    if (!formData.deviceUniqId) {
      toast.error("Please select a device");
      return;
    }

    if (!formData.selectedKey) {
      toast.error("Please select a data key");
      return;
    }

    if (!formData.customName?.trim()) {
      toast.error("Please enter indicator name");
      return;
    }

    // Validation for logic configuration
    if (formData.useMultiLogic) {
      // Validate multi-logic configuration
      if (multiLogicConfig.states.length === 0) {
        toast.error("Please add at least one logic state");
        return;
      }

      // Validate that default state exists
      if (
        !multiLogicConfig.states.find(
          (s) => s.name === multiLogicConfig.defaultState
        )
      ) {
        toast.error("Please set a valid default state");
        return;
      }

      // Validate each state has conditions
      for (let i = 0; i < multiLogicConfig.states.length; i++) {
        const state = multiLogicConfig.states[i];
        if (state.conditions.length === 0) {
          toast.error(`State "${state.name}" must have at least one condition`);
          return;
        }

        // Validate condition values
        for (let j = 0; j < state.conditions.length; j++) {
          const condition = state.conditions[j];
          if (!condition.value.trim()) {
            toast.error(
              `Please enter value for condition ${j + 1} in state "${
                state.name
              }"`
            );
            return;
          }
        }
      }

      // Prepare multi-logic data
      const dataToSave = {
        ...formData,
        useMultiLogic: true,
        multiLogicConfig: JSON.stringify(multiLogicConfig),
      };

      onSave(dataToSave);
    } else {
      // Legacy validation
      if (
        formData.compareValue === null ||
        formData.compareValue === undefined
      ) {
        toast.error("Please enter compare value");
        return;
      }

      // Prepare legacy data
      const dataToSave = {
        ...formData,
        useMultiLogic: false,
        multiLogicConfig: undefined,
      };

      onSave(dataToSave);
    }
  };

  const resetForm = () => {
    // Cleanup MQTT subscription
    if (subscribedTopicRef.current) {
      unsubscribe(subscribedTopicRef.current, handleMqttMessage);
      subscribedTopicRef.current = null;
    }

    setFormData({
      deviceUniqId: "",
      selectedKey: "",
      customName: "",
      positionX: position?.x || 50,
      positionY: position?.y || 50,
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
      // NEW: Multi-logic fields
      useMultiLogic: false,
      multiLogicConfig: "",
    });
    setAvailableKeys([]);
    setIsWaitingForKey(false);

    // Reset multi-logic config to default
    setMultiLogicConfig({
      states: [
        {
          name: "Normal",
          color: "#22c55e",
          animation: true,
          conditions: [{ operator: ">=", value: "0", valueType: "number" }],
          conditionLogic: "AND",
        },
      ],
      defaultState: "Normal",
    });
    onClose();
  };

  const getPreviewColor = (state: "true" | "false" | "warning") => {
    switch (state) {
      case "true":
        return formData.trueColor;
      case "false":
        return formData.falseColor;
      case "warning":
        return formData.warningColor;
    }
  };

  const getPreviewAnimation = (state: "true" | "false" | "warning") => {
    switch (state) {
      case "true":
        return formData.trueAnimation;
      case "false":
        return formData.falseAnimation;
      case "warning":
        return formData.warningAnimation;
    }
  };

  const ArrowIcon =
    arrowIcons[formData.arrowDirection as keyof typeof arrowIcons] ||
    ArrowBigRight;

  return (
    <Dialog open={isOpen} onOpenChange={resetForm}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialConfig ? "Edit Flow Indicator" : "Add Flow Indicator"}
          </DialogTitle>
          <DialogDescription>
            Configure a flow process indicator with conditional logic for visual
            feedback.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Device and Data Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Device & Data Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="device">Device *</Label>
                  <Select
                    value={formData.deviceUniqId}
                    onValueChange={(value) => {
                      setFormData((prev) => ({
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
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, selectedKey: value }))
                    }
                    disabled={
                      !formData.deviceUniqId ||
                      isWaitingForKey ||
                      availableKeys.length === 0
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isWaitingForKey
                            ? "Waiting for device data..."
                            : availableKeys.length > 0
                            ? "Select data key"
                            : "Select device first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(availableKeys || []).map((key) => (
                        <SelectItem key={key} value={key}>
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isWaitingForKey ? (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-primary">
                        Listening for real-time data from device...
                      </p>
                    </div>
                  ) : formData.deviceUniqId && availableKeys.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      No data received from this device yet
                    </p>
                  ) : availableKeys.length > 0 ? (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ {availableKeys.length} keys available • Real-time data
                      detected
                    </p>
                  ) : null}
                </div>

                <div>
                  <Label htmlFor="customName">Indicator Name *</Label>
                  <Input
                    id="customName"
                    value={formData.customName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        customName: e.target.value,
                      }))
                    }
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
                    <input
                      id="positionX"
                      type="text"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      value={Math.round((formData.positionX || 0) * 10) / 10}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                          setFormData((prev) => ({
                            ...prev,
                            positionX: Math.max(0, Math.min(100, value)),
                          }));
                        }
                      }}
                      placeholder="0-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="positionY">Position Y (%)</Label>
                    <input
                      id="positionY"
                      type="text"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      value={Math.round((formData.positionY || 0) * 10) / 10}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                          setFormData((prev) => ({
                            ...prev,
                            positionY: Math.max(0, Math.min(100, value)),
                          }));
                        }
                      }}
                      placeholder="0-100"
                    />
                  </div>
                </div>

                <div>
                  <Label>Arrow Direction</Label>
                  <Select
                    value={formData.arrowDirection}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        arrowDirection: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {arrowDirections.map((direction) => {
                        const Icon = direction.icon;
                        return (
                          <SelectItem
                            key={direction.value}
                            value={direction.value}
                          >
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Logic Configuration</CardTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="useMultiLogic" className="text-sm">
                    Advanced Logic
                  </Label>
                  <Switch
                    id="useMultiLogic"
                    checked={formData.useMultiLogic}
                    onCheckedChange={(checked) => {
                      setFormData((prev) => ({
                        ...prev,
                        useMultiLogic: checked,
                      }));
                      if (checked && formData.selectedKey) {
                        // Auto-generate smart config when switching to multi-logic
                        const smartConfig = createDefaultMultiLogicConfig(
                          "generic",
                          formData.selectedKey
                        );
                        setMultiLogicConfig(smartConfig);
                      }
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!formData.useMultiLogic ? (
                // Legacy Simple Logic
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Value Type</Label>
                      <Select
                        value={formData.valueType}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, valueType: value }))
                        }
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
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            logicOperator: value,
                          }))
                        }
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
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            compareValue: e.target.value,
                          }))
                        }
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
                </>
              ) : (
                // NEW: Advanced Multi-Logic Configuration
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Logic States</h4>
                    <Button type="button" size="sm" onClick={addLogicState}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add State
                    </Button>
                  </div>

                  {/* Default State Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Default State</Label>
                      <Select
                        value={multiLogicConfig.defaultState}
                        onValueChange={(value) =>
                          setMultiLogicConfig((prev) => ({
                            ...prev,
                            defaultState: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {multiLogicConfig.states
                            .filter((state) => state.name && state.name.trim())
                            .map((state) => (
                              <SelectItem key={state.name} value={state.name}>
                                {state.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Logic States */}
                  <div className="space-y-4">
                    {multiLogicConfig.states.map((state, stateIndex) => (
                      <Card
                        key={stateIndex}
                        className="border-l-4"
                        style={{ borderLeftColor: state.color }}
                      >
                        <CardContent className="pt-4">
                          <div className="space-y-4">
                            {/* State Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Input
                                  value={state.name}
                                  onChange={(e) => {
                                    const newName =
                                      e.target.value ||
                                      `State ${stateIndex + 1}`;
                                    updateLogicState(stateIndex, {
                                      name: newName,
                                    });
                                  }}
                                  className="w-32 h-8"
                                  placeholder="State name"
                                  required
                                />
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="color"
                                    value={state.color}
                                    onChange={(e) =>
                                      updateLogicState(stateIndex, {
                                        color: e.target.value,
                                      })
                                    }
                                    className="w-8 h-8 p-0 border-none"
                                  />
                                  <div className="flex items-center space-x-1">
                                    <Switch
                                      checked={state.animation}
                                      onCheckedChange={(checked) =>
                                        updateLogicState(stateIndex, {
                                          animation: checked,
                                        })
                                      }
                                    />
                                    <Label className="text-xs">Animate</Label>
                                  </div>
                                </div>
                              </div>
                              {multiLogicConfig.states.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLogicState(stateIndex)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>

                            {/* Condition Logic */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs">
                                  Condition Logic
                                </Label>
                                <Select
                                  value={state.conditionLogic}
                                  onValueChange={(value: "AND" | "OR") =>
                                    updateLogicState(stateIndex, {
                                      conditionLogic: value,
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {conditionLogicOptions.map((option) => (
                                      <SelectItem
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    addConditionToState(stateIndex)
                                  }
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Condition
                                </Button>
                              </div>
                            </div>

                            {/* Conditions */}
                            <div className="space-y-2">
                              {state.conditions.map(
                                (condition, conditionIndex) => (
                                  <div
                                    key={conditionIndex}
                                    className="grid grid-cols-12 gap-2 items-center"
                                  >
                                    <div className="col-span-1 text-xs text-muted-foreground">
                                      {conditionIndex > 0
                                        ? state.conditionLogic
                                        : "IF"}
                                    </div>
                                    <div className="col-span-2">
                                      <Select
                                        value={condition.valueType}
                                        onValueChange={(
                                          value: "number" | "string" | "boolean"
                                        ) =>
                                          updateConditionInState(
                                            stateIndex,
                                            conditionIndex,
                                            { valueType: value }
                                          )
                                        }
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {valueTypes.map((type) => (
                                            <SelectItem
                                              key={type.value}
                                              value={type.value}
                                            >
                                              {type.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="col-span-3">
                                      <Select
                                        value={condition.operator}
                                        onValueChange={(value) =>
                                          updateConditionInState(
                                            stateIndex,
                                            conditionIndex,
                                            { operator: value }
                                          )
                                        }
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {logicOperators.map((op) => (
                                            <SelectItem
                                              key={op.value}
                                              value={op.value}
                                            >
                                              {op.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="col-span-4">
                                      <Input
                                        value={condition.value}
                                        onChange={(e) =>
                                          updateConditionInState(
                                            stateIndex,
                                            conditionIndex,
                                            { value: e.target.value }
                                          )
                                        }
                                        placeholder={
                                          condition.valueType === "boolean"
                                            ? "true/false"
                                            : condition.valueType === "number"
                                            ? "123"
                                            : "text"
                                        }
                                        className="h-8"
                                      />
                                    </div>
                                    <div className="col-span-2 flex items-center justify-center">
                                      {state.conditions.length > 1 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            removeConditionFromState(
                                              stateIndex,
                                              conditionIndex
                                            )
                                          }
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>

                            {/* Preview */}
                            <div className="flex items-center gap-2 p-2 bg-muted rounded">
                              <Label className="text-xs">Preview:</Label>
                              <ArrowIcon
                                className={`h-6 w-6 ${
                                  state.animation ? "animate-pulse" : ""
                                }`}
                                style={{ color: state.color }}
                              />
                              <span
                                className="text-xs"
                                style={{ color: state.color }}
                              >
                                {state.name}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visual States Configuration - Only for Legacy Mode */}
          {!formData.useMultiLogic && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Visual States</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* True State */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <Label className="text-sm font-medium">
                      When Condition is TRUE
                    </Label>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="trueColor">Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="trueColor"
                          type="color"
                          value={formData.trueColor}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              trueColor: e.target.value,
                            }))
                          }
                          className="w-16 h-10"
                        />
                        <Input
                          value={formData.trueColor}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              trueColor: e.target.value,
                            }))
                          }
                          placeholder="#22c55e"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        checked={formData.trueAnimation}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            trueAnimation: checked,
                          }))
                        }
                      />
                      <Label className="text-sm">Animation</Label>
                    </div>
                    <div className="pt-6">
                      <ArrowIcon
                        className={`h-8 w-8 ${
                          getPreviewAnimation("true") ? "animate-pulse" : ""
                        }`}
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
                    <Label className="text-sm font-medium">
                      When Condition is FALSE
                    </Label>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="falseColor">Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="falseColor"
                          type="color"
                          value={formData.falseColor}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              falseColor: e.target.value,
                            }))
                          }
                          className="w-16 h-10"
                        />
                        <Input
                          value={formData.falseColor}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              falseColor: e.target.value,
                            }))
                          }
                          placeholder="#ef4444"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        checked={formData.falseAnimation}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            falseAnimation: checked,
                          }))
                        }
                      />
                      <Label className="text-sm">Animation</Label>
                    </div>
                    <div className="pt-6">
                      <ArrowIcon
                        className={`h-8 w-8 ${
                          getPreviewAnimation("false") ? "animate-pulse" : ""
                        }`}
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
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            warningEnabled: checked,
                          }))
                        }
                      />
                      <Label className="text-sm font-medium">
                        Enable Warning State
                      </Label>
                    </div>
                  </div>

                  {formData.warningEnabled && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Warning Operator</Label>
                          <Select
                            value={formData.warningOperator}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                warningOperator: value,
                              }))
                            }
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
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                warningValue: e.target.value,
                              }))
                            }
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
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  warningColor: e.target.value,
                                }))
                              }
                              className="w-16 h-10"
                            />
                            <Input
                              value={formData.warningColor}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  warningColor: e.target.value,
                                }))
                              }
                              placeholder="#f59e0b"
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                          <Switch
                            checked={formData.warningAnimation}
                            onCheckedChange={(checked) =>
                              setFormData((prev) => ({
                                ...prev,
                                warningAnimation: checked,
                              }))
                            }
                          />
                          <Label className="text-sm">Animation</Label>
                        </div>
                        <div className="pt-6">
                          <ArrowIcon
                            className={`h-8 w-8 ${
                              getPreviewAnimation("warning")
                                ? "animate-pulse"
                                : ""
                            }`}
                            style={{ color: getPreviewColor("warning") }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
