"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, Check, Eye, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { upscaleImage } from "@/lib/image-utils";

interface Layout2D {
  id: string;
  name: string;
  isUse: boolean;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Layout2DListProps {
  layouts: Layout2D[];
  onLayoutsChange: () => void;
  onLayoutSelect: (layout: Layout2D) => void;
  onSetActive?: (layoutId: string) => void;
}

export default function Layout2DList({
  layouts,
  onLayoutsChange,
  onLayoutSelect,
  onSetActive,
}: Layout2DListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingLayout, setEditingLayout] = useState<Layout2D | null>(null);
  const [deleteLayoutId, setDeleteLayoutId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    image: null as File | null,
  });

  const handleCreateLayout = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    if (!formData.name.trim()) {
      toast.error("Please enter a layout name");
      return;
    }

    // Check for duplicate names
    const existingLayout = layouts.find(
      (layout) =>
        layout.name.toLowerCase() === formData.name.trim().toLowerCase()
    );
    if (existingLayout) {
      toast.error(
        `Layout name "${formData.name}" already exists. Please choose a different name.`
      );
      return;
    }

    try {
      let processedImage = null;

      // If there's an image, upscale it first
      if (formData.image) {
        toast.info("Processing image for better quality...");

        try {
          // Upscale image by 2x for better resolution
          processedImage = await upscaleImage(formData.image, 2);

          const response = await fetch("/api/layout2d", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: formData.name,
              image: processedImage,
            }),
          });

          if (response.ok) {
            toast.success(
              "Process flow created successfully with enhanced resolution"
            );
            setIsCreateOpen(false);
            setFormData({ name: "", image: null });
            onLayoutsChange();
          } else {
            const error = await response.text();
            if (error.includes("already exists")) {
              toast.error(
                `Layout name "${formData.name}" already exists. Please choose a different name.`
              );
            } else {
              toast.error(error || "Failed to create process flow");
            }
          }
        } catch (imageError) {
          console.error("Image processing failed:", imageError);
          toast.error(
            "Failed to process image. Please try a different image format."
          );
        }
      } else {
        const response = await fetch("/api/layout2d", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            image: null,
          }),
        });

        if (response.ok) {
          toast.success("Process flow created successfully");
          setIsCreateOpen(false);
          setFormData({ name: "", image: null });
          onLayoutsChange();
        } else {
          const error = await response.text();
          if (error.includes("already exists")) {
            toast.error(
              `Layout name "${formData.name}" already exists. Please choose a different name.`
            );
          } else {
            toast.error(error || "Failed to create process flow");
          }
        }
      }
    } catch (error) {
      console.error("Create layout error:", error);
      toast.error("Failed to create process flow");
    }
  };

  const handleEditLayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLayout) return;

    // Validate form data
    if (!formData.name.trim()) {
      toast.error("Please enter a layout name");
      return;
    }

    // Check for duplicate names (excluding current editing layout)
    const existingLayout = layouts.find(
      (layout) =>
        layout.id !== editingLayout.id &&
        layout.name.toLowerCase() === formData.name.trim().toLowerCase()
    );
    if (existingLayout) {
      toast.error(
        `Layout name "${formData.name}" already exists. Please choose a different name.`
      );
      return;
    }

    try {
      let processedImage = editingLayout.image;

      if (formData.image) {
        toast.info("Processing image for better quality...");

        try {
          // Upscale image by 2x for better resolution
          processedImage = await upscaleImage(formData.image, 2);

          const response = await fetch(`/api/layout2d/${editingLayout.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: formData.name,
              image: processedImage,
            }),
          });

          if (response.ok) {
            toast.success(
              "Process flow updated successfully with enhanced resolution"
            );
            setIsEditOpen(false);
            setEditingLayout(null);
            setFormData({ name: "", image: null });
            onLayoutsChange();
          } else {
            const error = await response.text();
            if (error.includes("already exists")) {
              toast.error(
                `Layout name "${formData.name}" already exists. Please choose a different name.`
              );
            } else {
              toast.error(error || "Failed to update process flow");
            }
          }
        } catch (imageError) {
          console.error("Image processing failed:", imageError);
          toast.error(
            "Failed to process image. Please try a different image format."
          );
        }
      } else {
        const response = await fetch(`/api/layout2d/${editingLayout.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            image: processedImage,
          }),
        });

        if (response.ok) {
          toast.success("Process flow updated successfully");
          setIsEditOpen(false);
          setEditingLayout(null);
          setFormData({ name: "", image: null });
          onLayoutsChange();
        } else {
          const error = await response.text();
          toast.error(error || "Failed to update layout");
        }
      }
    } catch (error) {
      console.error("Edit layout error:", error);
      toast.error("Failed to update process flow");
    }
  };

  const handleDeleteLayout = async () => {
    if (!deleteLayoutId) return;

    try {
      const response = await fetch(`/api/layout2d/${deleteLayoutId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Process flow deleted successfully");
        onLayoutsChange();
      } else {
        const error = await response.text();
        toast.error(error || "Failed to delete process flow");
      }
    } catch (error) {
      toast.error("Failed to delete process flow");
    } finally {
      setDeleteLayoutId(null);
    }
  };

  const handleSetActive = async (layoutId: string) => {
    // Find the layout being activated
    const targetLayout = layouts.find((l) => l.id === layoutId);
    if (!targetLayout || targetLayout.isUse) return;

    try {
      const response = await fetch("/api/layout2d/active", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: layoutId }),
      });

      if (response.ok) {
        toast.success("Active process flow changed");
        onLayoutsChange();

        // Auto-select the newly activated layout
        const updatedLayout = { ...targetLayout, isUse: true };
        onLayoutSelect(updatedLayout);

        // Call parent handler if provided
        onSetActive?.(layoutId);
      } else {
        const error = await response.text();
        toast.error(error || "Failed to set active process flow");
      }
    } catch (error) {
      toast.error("Failed to set active process flow");
    }
  };

  const handleLayoutClick = (layout: Layout2D) => {
    // Auto-switch to this layout and set as active
    if (!layout.isUse) {
      handleSetActive(layout.id);
    } else {
      // If already active, just select it
      onLayoutSelect(layout);
    }
  };

  const openEditDialog = (layout: Layout2D) => {
    setEditingLayout(layout);
    setFormData({
      name: layout.name,
      image: null,
    });
    setIsEditOpen(true);
  };

  const resetCreateForm = () => {
    setFormData({ name: "", image: null });
    setIsCreateOpen(false);
  };

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Process Flow Layouts</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Process Flow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Process Flow</DialogTitle>
              <DialogDescription>
                Create a new process flow layout with an optional background
                image for real-time data visualization.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateLayout}>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Process Flow Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter process flow name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="image">Background Image (Optional)</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        image: e.target.files?.[0] || null,
                      })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetCreateForm}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Process Flow</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table View */}
      <div className="border rounded-lg overflow-hidden w-full">
        <table className="w-full table-auto">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 font-medium">Active</th>
              <th className="text-left p-2 font-medium">Preview</th>
              <th className="text-left p-2 font-medium">Name</th>
              <th className="text-left p-2 font-medium">Created</th>
              <th className="text-left p-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {layouts.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-medium">No Process Flow Layouts</p>
                      <p className="text-sm">Create your first process flow layout to get started</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              layouts.map((layout) => (
                <tr key={layout.id} className="hover:bg-muted/30 border-b border-border/50">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layout.isUse}
                        onChange={() => handleSetActive(layout.id)}
                        className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      {layout.isUse && (
                        <span className="text-xs text-green-600 font-medium">
                          Active
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    className="p-2 cursor-pointer"
                    onClick={() => handleLayoutClick(layout)}
                  >
                    {layout.image ? (
                      <div className="w-16 h-12 rounded-md overflow-hidden bg-gray-100">
                        <img
                          src={layout.image}
                          alt={layout.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-12 rounded-md bg-gray-100 flex items-center justify-center">
                        <span className="text-xs text-gray-500">No Image</span>
                      </div>
                    )}
                  </td>
                  <td
                    className="p-2 cursor-pointer"
                    onClick={() => handleLayoutClick(layout)}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{layout.name}</span>
                      {layout.isUse && (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td
                    className="p-2 text-sm text-muted-foreground cursor-pointer"
                    onClick={() => handleLayoutClick(layout)}
                  >
                    {new Date(layout.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-2">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(layout);
                        }}
                        className="px-2"
                        title="Edit Process Flow Name/Image"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteLayoutId(layout.id);
                        }}
                        className="px-2"
                        title="Delete Process Flow"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Process Flow</DialogTitle>
            <DialogDescription>
              Update the process flow name and background image settings.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditLayout}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-name">Process Flow Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter process flow name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-image">Background Image</Label>
                <Input
                  id="edit-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      image: e.target.files?.[0] || null,
                    })
                  }
                />
                {editingLayout?.image && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">
                      Current image:
                    </p>
                    <img
                      src={editingLayout.image}
                      alt="Current"
                      className="w-20 h-20 object-cover rounded-md border"
                    />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Update Process Flow</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteLayoutId !== null}
        onOpenChange={() => setDeleteLayoutId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              process flow and all its data points.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLayout}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
