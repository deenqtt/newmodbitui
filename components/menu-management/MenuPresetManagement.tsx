'use client';

import React, { useState, useEffect } from 'react';
import { MenuPreset } from '@/lib/types/preset';
import { useToast } from '@/hooks/use-toast';
import { useMenu } from '@/contexts/MenuContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Settings, Eye } from 'lucide-react';
import { MenuPresetList } from './MenuPresetList';
import { MenuPresetForm } from './MenuPresetForm';
import { MenuPresetPreviewModal } from './MenuPresetPreviewModal';

export function MenuPresetManagement() {
  const [presets, setPresets] = useState<MenuPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<MenuPreset | null>(null);
  const [editingPreset, setEditingPreset] = useState<MenuPreset | null>(null);
  const [previewingPreset, setPreviewingPreset] = useState<MenuPreset | null>(null);
  const [activeTab, setActiveTab] = useState('list');

  const [menuStructure, setMenuStructure] = useState<any[]>([]); // Cache menu structure
  const { toast } = useToast();
  const { refreshMenu } = useMenu();

  // Fetch presets
  const fetchPresets = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/menu-presets');
      const result = await response.json();

      if (result.success) {
        setPresets(result.data);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch presets',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch presets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  const handleCreatePreset = () => {
    setEditingPreset(null);
    setActiveTab('create');
  };

  const handleEditPreset = (preset: MenuPreset) => {
    setEditingPreset(preset);
    setActiveTab('create');
  };

  const handlePreviewPreset = (preset: MenuPreset) => {
    setPreviewingPreset(preset);
    setActiveTab('preview');
  };

  const handleFormSaved = () => {
    setEditingPreset(null);
    fetchPresets(); // Refresh after creating/editing
    setActiveTab('list');
  };

  const handlePresetToggled = async (presetId: string) => {
    await fetchPresets();
    // Also refresh the menu to update sidebar with new active preset
    await refreshMenu();
  };

  return (
    <div className="container mx-auto p-6 bg-background/50 min-h-screen">
      <div className="flex items-center justify-between mb-6 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Menu Presets
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            Create and manage custom menu configurations for different use cases
          </p>
        </div>
        <Button
          onClick={handleCreatePreset}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        >
          <Plus className="h-4 w-4" />
          Create Preset
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Available Presets
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {editingPreset ? 'Edit Preset' : 'Create Preset'}
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview Sidebar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Presets</CardTitle>
              <CardDescription>
                Manage and activate your menu presets. Only one preset can be active at a time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MenuPresetList
                presets={presets}
                loading={loading}
                onEdit={handleEditPreset}
                onPreview={handlePreviewPreset}
                onPresetToggled={handlePresetToggled}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{editingPreset ? 'Edit Preset' : 'Create New Preset'}</CardTitle>
              <CardDescription>
                Select menu groups and items that will be visible when this preset is active.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MenuPresetForm
                preset={editingPreset}
                onSave={handleFormSaved}
                onCancel={() => {
                  setEditingPreset(null);
                  setActiveTab('list');
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sidebar Preview</CardTitle>
              <CardDescription>
                Preview how the sidebar will look with the selected preset applied.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Eye className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Click "Preview" from any preset's dropdown menu to see how it will look.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Render modal as overlay */}
      <MenuPresetPreviewModal
        preset={previewingPreset}
        isOpen={!!previewingPreset}
        onClose={() => {
          setPreviewingPreset(null);
          setActiveTab('list');
        }}
      />
    </div>
  );
}
