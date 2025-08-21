"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Send, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface TestResult {
  success: boolean;
  message: string;
  timestamp: string;
  response?: any;
}

export default function WhatsAppTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [configStatus, setConfigStatus] = useState<any>(null);

  // Test custom message
  const handleSendCustomMessage = async () => {
    if (!phoneNumber || !recipientName || !message) {
      Swal.fire("Error", "Please fill in all required fields", "error");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/test`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          recipientName,
          testType: 'custom',
          customMessage: message
        }),
      });

      const data = await response.json();
      const result: TestResult = {
        success: response.ok,
        message: data.message || 'Unknown error',
        timestamp: new Date().toLocaleTimeString(),
        response: data
      };

      setTestResults(prev => [result, ...prev]);

      if (result.success) {
        Swal.fire("Success", "WhatsApp message sent successfully!", "success");
        // Clear form
        setMessage("");
      } else {
        Swal.fire("Failed", result.message, "error");
      }
    } catch (error: any) {
      const result: TestResult = {
        success: false,
        message: error.message || 'Network error',
        timestamp: new Date().toLocaleTimeString()
      };
      setTestResults(prev => [result, ...prev]);
      Swal.fire("Error", "Network error occurred", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Test maintenance notification
  const handleSendMaintenanceTest = async () => {
    if (!phoneNumber || !recipientName) {
      Swal.fire("Error", "Please fill in phone number and recipient name", "error");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/test`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          recipientName,
          testType: 'maintenance'
        }),
      });

      const data = await response.json();
      const result: TestResult = {
        success: response.ok,
        message: data.message || 'Unknown error',
        timestamp: new Date().toLocaleTimeString(),
        response: data
      };

      setTestResults(prev => [result, ...prev]);

      if (result.success) {
        Swal.fire("Success", "Maintenance notification sent successfully!", "success");
      } else {
        Swal.fire("Failed", result.message, "error");
      }
    } catch (error: any) {
      const result: TestResult = {
        success: false,
        message: error.message || 'Network error',
        timestamp: new Date().toLocaleTimeString()
      };
      setTestResults(prev => [result, ...prev]);
      Swal.fire("Error", "Network error occurred", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Test alarm notification
  const handleSendAlarmTest = async () => {
    if (!phoneNumber || !recipientName) {
      Swal.fire("Error", "Please fill in phone number and recipient name", "error");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/test`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          recipientName,
          testType: 'alarm'
        }),
      });

      const data = await response.json();
      const result: TestResult = {
        success: response.ok,
        message: data.message || 'Unknown error',
        timestamp: new Date().toLocaleTimeString(),
        response: data
      };

      setTestResults(prev => [result, ...prev]);

      if (result.success) {
        Swal.fire("Success", "Alarm notification sent successfully!", "success");
      } else {
        Swal.fire("Failed", result.message, "error");
      }
    } catch (error: any) {
      const result: TestResult = {
        success: false,
        message: error.message || 'Network error',
        timestamp: new Date().toLocaleTimeString()
      };
      setTestResults(prev => [result, ...prev]);
      Swal.fire("Error", "Network error occurred", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Test system notification
  const handleSendSystemTest = async () => {
    if (!phoneNumber || !recipientName) {
      Swal.fire("Error", "Please fill in phone number and recipient name", "error");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/test`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          recipientName,
          testType: 'system'
        }),
      });

      const data = await response.json();
      const result: TestResult = {
        success: response.ok,
        message: data.message || 'Unknown error',
        timestamp: new Date().toLocaleTimeString(),
        response: data
      };

      setTestResults(prev => [result, ...prev]);

      if (result.success) {
        Swal.fire("Success", "System notification sent successfully!", "success");
      } else {
        Swal.fire("Failed", result.message, "error");
      }
    } catch (error: any) {
      const result: TestResult = {
        success: false,
        message: error.message || 'Network error',
        timestamp: new Date().toLocaleTimeString()
      };
      setTestResults(prev => [result, ...prev]);
      Swal.fire("Error", "Network error occurred", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Check configuration status
  const checkConfiguration = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/test`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      setConfigStatus(data);
    } catch (error) {
      console.error("Failed to check configuration:", error);
    }
  };

  // Load config status on mount
  useEffect(() => {
    checkConfiguration();
  }, []);

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="mx-auto grid w-full max-w-6xl gap-2">
        <h1 className="text-3xl font-semibold flex items-center">
          <MessageSquare className="mr-3 h-8 w-8 text-primary" />
          WhatsApp API Test
        </h1>
        <p className="text-muted-foreground">
          Test WhatsApp notifications and custom messages
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-6">
        {/* Configuration Status */}
        {configStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                Service Configuration Status
                {configStatus.configured ? (
                  <CheckCircle className="ml-2 h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="ml-2 h-5 w-5 text-red-500" />
                )}
              </CardTitle>
              <CardDescription>
                {configStatus.configured 
                  ? "WhatsApp service is properly configured" 
                  : "WhatsApp service configuration is incomplete"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div className="flex items-center">
                  <span className={configStatus.config.apiUrl ? "text-green-600" : "text-red-600"}>
                    {configStatus.config.apiUrl ? "✓" : "✗"} API URL
                  </span>
                </div>
                <div className="flex items-center">
                  <span className={configStatus.config.bearerToken ? "text-green-600" : "text-red-600"}>
                    {configStatus.config.bearerToken ? "✓" : "✗"} Bearer Token
                  </span>
                </div>
                <div className="flex items-center">
                  <span className={configStatus.config.channelId ? "text-green-600" : "text-red-600"}>
                    {configStatus.config.channelId ? "✓" : "✗"} Channel ID
                  </span>
                </div>
                <div className="flex items-center">
                  <span className={configStatus.config.templateId ? "text-green-600" : "text-red-600"}>
                    {configStatus.config.templateId ? "✓" : "✗"} Template ID
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-600">
                    Language: {configStatus.config.language}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
            <CardDescription>
              Enter recipient details for WhatsApp testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  placeholder="e.g., +6281234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Recipient Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., John Doe"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Message Test */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Message Test</CardTitle>
            <CardDescription>
              Send a custom WhatsApp message
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Enter your custom message here..."
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleSendCustomMessage}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Custom Message
            </Button>
          </CardContent>
        </Card>

        {/* Pre-defined Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Pre-defined Message Tests</CardTitle>
            <CardDescription>
              Test different notification types with sample data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={handleSendMaintenanceTest}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Test Maintenance Notification
              </Button>
              <Button 
                onClick={handleSendAlarmTest}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Test Alarm Notification
              </Button>
              <Button 
                onClick={handleSendSystemTest}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Test System Notification
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>
                  Recent WhatsApp API test results
                </CardDescription>
              </div>
              <Button onClick={clearResults} variant="outline" size="sm">
                Clear Results
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        {result.success ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mr-2" />
                        )}
                        <Badge variant={result.success ? "default" : "destructive"}>
                          {result.success ? "Success" : "Failed"}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">{result.timestamp}</span>
                    </div>
                    <p className="text-sm mb-2">{result.message}</p>
                    {result.response && (
                      <details className="mt-2">
                        <summary className="text-sm text-muted-foreground cursor-pointer">
                          View Response Details
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(result.response, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>To use WhatsApp API, make sure the following environment variables are configured:</p>
            <ul>
              <li><code>QONTAK_API_URL</code> - Qontak API URL</li>
              <li><code>QONTAK_BEARER_TOKEN</code> - Your Qontak bearer token</li>
              <li><code>QONTAK_CHANNEL_INTEGRATION_ID</code> - Channel integration ID</li>
              <li><code>QONTAK_MESSAGE_TEMPLATE_ID</code> - Message template ID</li>
              <li><code>QONTAK_LANGUAGE</code> - Language code (default: id)</li>
            </ul>
            <Separator className="my-4" />
            <p>Available API endpoints:</p>
            <ul>
              <li><code>POST /api/whatsapp/send</code> - Send custom message</li>
              <li><code>POST /api/whatsapp/maintenance</code> - Send maintenance notification</li>
              <li><code>POST /api/whatsapp/alarm</code> - Send alarm notification</li>
              <li><code>POST /api/whatsapp/bulk</code> - Send bulk messages</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}