// File: components/power-analyzer/PowerAnalyzerTab.tsx
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function PowerAnalyzerTab() {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Power Analyzer</CardTitle>
        <CardDescription>
          Detailed analysis of power consumption data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Power Analyzer details content will be displayed here.
        </p>
      </CardContent>
    </Card>
  );
}
