"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function PueTab() {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>PUE (Power Usage Effectiveness)</CardTitle>
        <CardDescription>
          Configure and monitor the PUE of your facility.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          PUE management content will be displayed here.
        </p>
      </CardContent>
    </Card>
  );
}
