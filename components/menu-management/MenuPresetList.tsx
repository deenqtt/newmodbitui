'use client';

import React from 'react';
import { MenuPreset } from '@/lib/types/preset';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CheckCircle,
  Circle,
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  RefreshCw,
  Settings,
  Loader2
} from 'lucide-react';

interface MenuPresetListProps {
  presets: MenuPreset[];
  loading: boolean;
  onEdit: (preset: MenuPreset) => void;
  onPreview: (preset: MenuPreset) => void;
  onPresetToggled: (presetId: string) => void;
}

export function MenuPresetList({
  presets,
  loading,
  onEdit,
  onPreview,
  onPresetToggled
}: MenuPresetListProps) {
  const { toast } = useToast();
  const [togglingPresets, setTogglingPresets] = React.useState<Set<string>>(new Set());

  const handleActivatePreset = async (preset: MenuPreset) => {
    // Prevent multiple clicks
    if (togglingPresets.has(preset.id)) return;

    // Add to toggling set to show loading
    setTogglingPresets(prev => new Set(prev).add(preset.id));

    console.log('🔄 Activating preset:', preset.name, preset.id);
    try {
      const response = await fetch(`/api/menu-presets/${preset.id}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 API Response status:', response.status);
      const result = await response.json();
      console.log('📡 API Response data:', result);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        console.log('✅ Preset activated successfully');
        onPresetToggled(preset.id);
      } else {
        console.error('❌ API Error:', result.error);
        toast({
          title: 'Error',
          description: result.error || 'Failed to activate preset',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('🚨 Network/fetch error:', error);
      toast({
        title: 'Error',
        description: 'Failed to activate preset',
        variant: 'destructive',
      });
    } finally {
      // Remove from toggling set
      setTogglingPresets(prev => {
        const newSet = new Set(prev);
        newSet.delete(preset.id);
        return newSet;
      });
      console.log('🔄 Toggle operation completed');
    }
  };

  const handleDeactivatePreset = async () => {
    console.log('🔄 Deactivating all presets');
    try {
      const response = await fetch('/api/menu-presets/deactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Deactivate API status:', response.status);
      const result = await response.json();
      console.log('📡 Deactivate API response:', result);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        console.log('✅ All presets deactivated');
        onPresetToggled('deactivate-all');
      } else {
        console.error('❌ Deactivate API Error:', result.error);
        toast({
          title: 'Error',
          description: result.error || 'Failed to deactivate preset',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('🚨 Deactivate network error:', error);
      toast({
        title: 'Error',
        description: 'Failed to deactivate preset',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePreset = async (preset: MenuPreset) => {
    try {
      const response = await fetch(`/api/menu-presets/${preset.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete preset',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete preset',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-4">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-[150px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-[100px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (presets.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center border border-primary/20">
          <Settings className="h-10 w-10 text-primary/70" />
        </div>
        <p className="text-xl font-semibold text-foreground mb-2">No menu presets found</p>
        <p className="text-muted-foreground max-w-md mx-auto">
          Create your first preset to customize the sidebar navigation for different use cases
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">
          Menu Presets ({presets.length})
        </h3>
      </div>

      {presets.map((preset) => (
        <Card key={preset.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">{preset.name}</CardTitle>
                {togglingPresets.has(preset.id) ? (
                  <Badge className="bg-gray-100 text-gray-600 cursor-wait transition-colors">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Loading...
                  </Badge>
                ) : preset.isActive ? (
                  <Badge
                    className="bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="hover:bg-secondary/80 cursor-pointer transition-colors"
                  >
                    <Circle className="h-3 w-3 mr-1" />
                    Inactive
                  </Badge>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(preset)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPreview(preset)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </DropdownMenuItem>
                  {!preset.isActive && (
                    <DropdownMenuItem onClick={() => handleActivatePreset(preset)}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Activate
                    </DropdownMenuItem>
                  )}
                  {preset.isActive && (
                    <DropdownMenuItem onClick={handleDeactivatePreset}>
                      <Circle className="mr-2 h-4 w-4" />
                      Deactivate
                    </DropdownMenuItem>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Preset</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{preset.name}"? This action cannot be undone.
                          {preset.isActive && (
                            <span className="block font-medium text-destructive mt-2">
                              This preset is currently active and will be deactivated.
                            </span>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeletePreset(preset)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {preset.description && (
                <p className="text-sm text-muted-foreground">{preset.description}</p>
              )}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{preset._count?.selectedGroups || 0} groups</span>
                <span>{preset._count?.selectedItems || 0} items</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Created {new Date(preset.createdAt).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
