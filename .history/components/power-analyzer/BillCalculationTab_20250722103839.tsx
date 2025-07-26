"use client";

import { useState, useEffect, useMemo, useCallback, FormEvent } from "react";
import Swal from "sweetalert2";

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Edit, Trash2, Loader2, Search } from "lucide-react";

// --- Type Definitions ---
interface BillConfig {
  id: string;
  customName: string;
  key: string;
  units: string;
  topicName: string;
  value?: number;
}

// --- Konfigurasi Notifikasi Toast ---
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export function BillCalculationTab() {
  const [configs, setConfigs] = useState<BillConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<Partial<BillConfig>>({});
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<BillConfig | null>(null);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Data dummy
      const dummyData: BillConfig[] = [
        {
          id: "1",
          customName: "Server Rack A",
          key: "power_watts",
          units: "Watts",
          topicName: "SERVER/RACK_A/POWER",
          value: 2500,
        },
        {
          id: "2",
          customName: "Cooling Unit 1",
          key: "power_watts",
          units: "Watts",
          topicName: "HVAC/UNIT_1/POWER",
          value: 7500,
        },
      ];
      setConfigs(dummyData);
    } catch (error: any) {
      Toast.fire({ icon: "error", title: error.message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const formatNumber = (value: number | undefined | null) => {
    if (value === null || value === undefined) return "0.00";
    return value.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const calculateCost = (value: number | undefined | null, rate: number) => {
    if (value === null || value === undefined) return 0;
    const energyKwh = (value * 1) / 1000; // Kalkulasi per jam
    return energyKwh * rate;
  };

  const filteredConfigs = useMemo(
    () =>
      configs.filter(
        (c) =>
          c.customName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.topicName.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [configs, searchQuery]
  );

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Bill Calculation Configurations</CardTitle>
              <CardDescription>
                Configure items to calculate electricity costs from power data.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setIsEditMode(false);
                setCurrentConfig({});
                setIsModalOpen(true);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Data
            </Button>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Custom Name or Topic..."
              className="pl-8 w-full sm:w-1/3"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device Name</TableHead>
                  <TableHead>Metric (Key)</TableHead>
                  <TableHead>Data (Watts)</TableHead>
                  <TableHead>Cost (IDR/hour)</TableHead>
                  <TableHead>Cost (USD/hour)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-48">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                    </TableCell>
                  </TableRow>
                ) : filteredConfigs.length > 0 ? (
                  filteredConfigs.map((item) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <TableCell className="font-medium">
                        {item.customName}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.key}
                      </TableCell>
                      <TableCell>
                        {formatNumber(item.value)} {item.units}
                      </TableCell>
                      <TableCell>
                        Rp {formatNumber(calculateCost(item.value, 1467))}
                      </TableCell>
                      <TableCell>
                        $ {formatNumber(calculateCost(item.value, 0.1))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setIsEditMode(true);
                            setCurrentConfig(item);
                            setIsModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setConfigToDelete(item);
                            setIsDeleteAlertOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center h-48 text-muted-foreground"
                    >
                      No configurations found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditMode
                ? "Edit Bill Configuration"
                : "Add Bill Configuration"}
            </DialogTitle>
            <DialogDescription>
              Select a topic and key to start calculating costs.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4 pt-4">
            <div>
              <Label htmlFor="customName">Custom Name</Label>
              <Input id="customName" placeholder="e.g., Main Power" />
            </div>
            <div>
              <Label htmlFor="topicSelect">Select Topic</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select a topic..." />
                </SelectTrigger>
                <SelectContent>{/* Options */}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="keySelect">Select Key</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select a key..." />
                </SelectTrigger>
                <SelectContent>{/* Options */}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="units">Units</Label>
              <Input id="units" placeholder="e.g., Watts" />
            </div>
          </form>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the configuration for{" "}
              <b>{configToDelete?.customName}</b>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfigToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
