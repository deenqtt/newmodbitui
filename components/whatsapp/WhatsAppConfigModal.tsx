"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  MessageSquare, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Send,
  Info 
} from "lucide-react";
import Swal from "sweetalert2";

interface WhatsAppConfig {
  configured: boolean;
  apiUrl: boolean;
  bearerToken: boolean;
  channelIntegrationId: boolean;
  messageTemplateId: boolean;
  language: string;
}

interface WhatsAppConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export function WhatsAppConfigModal({ isOpen, onClose }: WhatsAppConfigModalProps) {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    apiUrl: "",
    bearerToken: "",
    channelIntegrationId: "",
    messageTemplateId: "",
    language: "id"
  });
  
  // Test form state
  const [testPhoneNumber, setTestPhoneNumber] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/whatsapp/config");
      if (response.ok) {
        const data = await response.json();
        setConfig(data.data);
      } else {
        Toast.fire({ icon: "error", title: "Failed to fetch WhatsApp configuration" });
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
      Toast.fire({ icon: "error", title: "Failed to fetch configuration" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/whatsapp/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        Toast.fire({ icon: "success", title: "WhatsApp configuration saved!" });
        await fetchConfig(); // Refresh config status
      } else {
        const errorData = await response.json();
        Toast.fire({ icon: "error", title: errorData.message || "Failed to save configuration" });
      }
    } catch (error) {
      console.error("Failed to save config:", error);
      Toast.fire({ icon: "error", title: "Failed to save configuration" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testPhoneNumber) {
      Toast.fire({ icon: "warning", title: "Please enter a phone number for testing" });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testPhoneNumber }),
      });

      const data = await response.json();
      
      if (response.ok) {
        Toast.fire({ 
          icon: "success", 
          title: "Test message sent successfully!",
          text: "Check your WhatsApp for the test message"
        });
      } else {
        Toast.fire({ 
          icon: "error", 
          title: "Test failed",
          text: data.message || "Failed to send test message"
        });
      }
    } catch (error) {
      console.error("Test connection failed:", error);
      Toast.fire({ icon: "error", title: "Test connection failed" });
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            WhatsApp Configuration
          </DialogTitle>
        </DialogHeader>

        {isLoading && !config ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Configuration Status */}
            {config && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configuration Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Overall Configuration</span>
                      <Badge variant={config.configured ? "default" : "destructive"}>
                        {config.configured ? "Configured" : "Incomplete"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(config.apiUrl)}
                        <span>API URL</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(config.bearerToken)}
                        <span>Bearer Token</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(config.channelIntegrationId)}
                        <span>Channel Integration</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(config.messageTemplateId)}
                        <span>Message Template</span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Language: <Badge variant="outline">{config.language}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Configuration Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Update Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiUrl">API URL</Label>
                  <Input
                    id="apiUrl"
                    placeholder="https://service-chat.qontak.com/api/open/v1/broadcasts/whatsapp/direct"
                    value={formData.apiUrl}
                    onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bearerToken">Bearer Token</Label>
                  <Input
                    id="bearerToken"
                    type="password"
                    placeholder="Your Qontak Bearer Token"
                    value={formData.bearerToken}
                    onChange={(e) => setFormData({ ...formData, bearerToken: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channelIntegrationId">Channel Integration ID</Label>
                  <Input
                    id="channelIntegrationId"
                    placeholder="662f9fcb-7e2b-4c1a-8eda-9aeb4a388004"
                    value={formData.channelIntegrationId}
                    onChange={(e) => setFormData({ ...formData, channelIntegrationId: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="messageTemplateId">Message Template ID</Label>
                  <Input
                    id="messageTemplateId"
                    placeholder="300d84f2-d962-4451-bc27-870fb99d18e7"
                    value={formData.messageTemplateId}
                    onChange={(e) => setFormData({ ...formData, messageTemplateId: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Input
                    id="language"
                    placeholder="id"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  />
                </div>

                <Button onClick={handleSaveConfig} disabled={isLoading} className="w-full">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Configuration
                </Button>
              </CardContent>
            </Card>

            {/* Test Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Test Connection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testPhone">Test Phone Number</Label>
                  <Input
                    id="testPhone"
                    placeholder="628123456789"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Enter phone number with country code (e.g., 628123456789)
                  </div>
                </div>

                <Button 
                  onClick={handleTestConnection} 
                  disabled={isTesting || !config?.configured}
                  variant="outline"
                  className="w-full"
                >
                  {isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Send Test Message
                </Button>
              </CardContent>
            </Card>

            {/* Information */}
            <Card className="bg-blue-50 dark:bg-blue-950">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                      WhatsApp Integration Information:
                    </p>
                    <ul className="space-y-1 text-blue-600 dark:text-blue-400">
                      <li>• Automatic notifications will be sent when maintenance tasks are created</li>
                      <li>• Users need to have phone numbers in their profiles</li>
                      <li>• Manual notifications can be sent from the maintenance page</li>
                      <li>• All configurations are stored in environment variables for security</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}