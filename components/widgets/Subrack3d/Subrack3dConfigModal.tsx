// File: components/widgets/Subrack3d/Subrack3dConfigModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TopicConfig {
  title: string;
  topic: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
}

export const Subrack3dConfigModal = ({ isOpen, onClose, onSave }: Props) => {
  const [customName, setCustomName] = useState("");
  const [deviceUniqId, setDeviceUniqId] = useState("");
  const [subrackType, setSubrackType] = useState("");
  const [topics, setTopics] = useState<TopicConfig[]>([]);
  const [error, setError] = useState("");

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCustomName("");
      setDeviceUniqId("");
      setSubrackType("");
      setTopics([]);
      setError("");
    }
  }, [isOpen]);

  // Update topics when subrackType changes
  useEffect(() => {
    if (!subrackType) {
      setTopics([]);
      return;
    }

    let newTopics: TopicConfig[] = [];
    if (subrackType === "Normal Subrack") {
      newTopics = [
        { title: "Optocoupler", topic: "" },
        { title: "Relay", topic: "" },
        { title: "Drycontact", topic: "" },
      ];
    } else if (subrackType === "Subrack With 18 Mini Relay") {
      newTopics = [
        { title: "Relay 1", topic: "" },
        { title: "Relay 2", topic: "" },
        { title: "Relay 3", topic: "" },
      ];
    } else if (subrackType === "Subrack With 42 DI/DO") {
      newTopics = [
        { title: "Optocoupler 1", topic: "" },
        { title: "Optocoupler 2", topic: "" },
        { title: "Optocoupler 3", topic: "" },
      ];
    } else if (subrackType === "Subrack With 42 Drycontact") {
      newTopics = [
        { title: "Drycontact 1", topic: "" },
        { title: "Drycontact 2", topic: "" },
        { title: "Drycontact 3", topic: "" },
      ];
    } else {
      newTopics = [{ title: "Unknown Device", topic: "" }];
    }

    setTopics(newTopics);
  }, [subrackType]);

  const handleTopicChange = (index: number, value: string) => {
    const newTopics = [...topics];
    newTopics[index].topic = value;
    setTopics(newTopics);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customName || !deviceUniqId || !subrackType) {
      setError("Widget name, device ID, and subrack type are required");
      return;
    }

    const emptyTopic = topics.some((t) => !t.topic);
    if (emptyTopic) {
      setError("All MQTT topics must be filled");
      return;
    }

    onSave({
      customName,
      deviceUniqId,
      subrackType,
      topics: topics.map((t) => t.topic), // Simpan hanya string topic
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure 3D Subrack View</DialogTitle>
          <DialogDescription>
            Set up your subrack 3D visualization with MQTT topics
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customName" className="text-right">
                Widget Name
              </Label>
              <div className="col-span-3">
                <Input
                  id="customName"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter widget name"
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deviceUniqId" className="text-right">
                Device ID
              </Label>
              <div className="col-span-3">
                <Input
                  id="deviceUniqId"
                  value={deviceUniqId}
                  onChange={(e) => setDeviceUniqId(e.target.value)}
                  placeholder="Enter unique device ID"
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subrackType" className="text-right">
                Subrack Type
              </Label>
              <div className="col-span-3">
                <Select value={subrackType} onValueChange={setSubrackType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select subrack type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal Subrack">
                      Normal Subrack
                    </SelectItem>
                    <SelectItem value="Subrack With 18 Mini Relay">
                      Subrack With 18 Mini Relay
                    </SelectItem>
                    <SelectItem value="Subrack With 42 DI/DO">
                      Subrack With 42 DI/DO
                    </SelectItem>
                    <SelectItem value="Subrack With 42 Drycontact">
                      Subrack With 42 Drycontact
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {topics.map((topicConfig, index) => (
              <div key={index} className="grid grid-cols-4 items-center gap-4">
                <Label
                  htmlFor={`topic-${index}`}
                  className="text-right truncate"
                >
                  {topicConfig.title}
                </Label>
                <div className="col-span-3">
                  <Input
                    id={`topic-${index}`}
                    value={topicConfig.topic}
                    onChange={(e) => handleTopicChange(index, e.target.value)}
                    placeholder={`Enter MQTT topic for ${topicConfig.title}`}
                    className="w-full"
                  />
                </div>
              </div>
            ))}

            {error && (
              <div className="col-span-4 text-sm text-destructive text-center">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Configuration</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
