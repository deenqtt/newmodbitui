"use client";

import { useState, useEffect, FormEvent } from "react";
import { Package, PlusCircle, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Checkbox } from "@/components/ui/checkbox";

// Tipe data untuk Device Profile
type DeviceProfile = {
  id: string;
  name: string;
  region: string;
  macVersion: string;
};

const MySwal = withReactContent(Swal);
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export default function LoraWANProfilesPage() {
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State untuk form
  const [name, setName] = useState("");
  const [region, setRegion] = useState("US915");
  const [macVersion, setMacVersion] = useState("LORAWAN_1_0_3");
  const [regParamsRevision, setRegParamsRevision] = useState("A");
  const [adrAlgorithmId, setAdrAlgorithmId] = useState("default");
  const [uplinkInterval, setUplinkInterval] = useState("3600");

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/lorawan/device-profiles");
      if (!response.ok) throw new Error("Failed to load profiles.");
      setProfiles(await response.json());
    } catch (error) {
      Toast.fire({ icon: "error", title: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/lorawan/device-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: "09dcf92f-ef9e-420e-8d4b-8a8aea7b6add",
          name,
          region,
          macVersion,
          regParamsRevision,
          adrAlgorithmId,
          uplinkInterval: parseInt(uplinkInterval, 10),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create profile.");
      }

      Toast.fire({
        icon: "success",
        title: "Device Profile created successfully!",
      });
      setName("");
      fetchProfiles();
      setIsModalOpen(false);
    } catch (error) {
      Toast.fire({ icon: "error", title: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (profile: DeviceProfile) => {
    const result = await MySwal.fire({
      title: "Are you sure?",
      html: `You are about to delete device profile "<b>${profile.name}</b>".`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch("/api/lorawan/device-profiles", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: profile.id }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Failed to delete profile.");
        }

        Toast.fire({ icon: "success", title: "Device Profile deleted!" });
        fetchProfiles();
      } catch (error) {
        Toast.fire({ icon: "error", title: (error as Error).message });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">LoRaWAN Device Profiles</h1>
              <p className="text-muted-foreground">
                Manage templates for your LoRaWAN devices.
              </p>
            </div>
          </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Add New Device Profile</DialogTitle>
              <DialogDescription>
                Fill in the details for the new device profile. Fields marked
                with * are required.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Profile Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Sensor_Suhu_OTAA"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="region">Region *</Label>
                  <Select value={region} onValueChange={setRegion} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AS923_2">AS923-2</SelectItem>
                      <SelectItem value="US915">US915</SelectItem>
                      <SelectItem value="EU868">EU868</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regParams">
                    Regional Parameters Revision *
                  </Label>
                  <Select
                    value={regParamsRevision}
                    onValueChange={setRegParamsRevision}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="RP002_1_0_1">RP002-1.0.1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="macVersion">MAC Version *</Label>
                  <Select
                    value={macVersion}
                    onValueChange={setMacVersion}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LORAWAN_1_0_3">
                        LoRaWAN 1.0.3
                      </SelectItem>
                      <SelectItem value="LORAWAN_1_0_4">
                        LoRaWAN 1.0.4
                      </SelectItem>
                      <SelectItem value="LORAWAN_1_1_0">
                        LoRaWAN 1.1.0
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adrAlgorithm">ADR Algorithm *</Label>
                  <Select
                    value={adrAlgorithmId}
                    onValueChange={setAdrAlgorithmId}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        Default ADR algorithm (LoRa only)
                      </SelectItem>
                      <SelectItem value="lr_fhss">
                        LR-FHSS only ADR algorithm
                      </SelectItem>
                      <SelectItem value="lora_and_lr_fhss">
                        LoRa & LR-FHSS ADR algorithm
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="uplinkInterval">
                    Expected uplink interval (secs) *
                  </Label>
                  <Input
                    id="uplinkInterval"
                    type="number"
                    value={uplinkInterval}
                    onChange={(e) => setUplinkInterval(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Profile"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>

      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  LoRaWAN Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    Loading profiles...
                  </td>
                </tr>
              ) : profiles.length > 0 ? (
                profiles.map((profile) => (
                  <tr key={profile.id}>
                    <td className="px-6 py-4 font-semibold">{profile.name}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {profile.region}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {profile.macVersion}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                      {profile.id}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(profile)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    No device profiles found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
