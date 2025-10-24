'use client';

import React, { useState, useEffect } from 'react';
import { MenuPreset } from '@/lib/types/preset';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, X, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SidebarItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  items?: SidebarItem[];
}

interface MenuPresetPreviewModalProps {
  preset: MenuPreset | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MenuPresetPreviewModal({
  preset,
  isOpen,
  onClose
}: MenuPresetPreviewModalProps) {
  console.log('[MODAL] Component rendered with:', { preset: preset?.name, isOpen });
  const [sidebarData, setSidebarData] = useState<SidebarItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch full menu structure for preview
  useEffect(() => {
    if (!isOpen) return;

    const fetchSidebarData = async () => {
      setLoading(true);
      console.log('[PREVIEW] Starting to fetch sidebar data for preset:', preset?.name);

      try {
        const response = await fetch('/api/menu/structure');
        console.log('[PREVIEW] Response status:', response.status);

        const result = await response.json();
        console.log('[PREVIEW] API response:', result);

        if (result.success) {
          // Filter the simple menu structure based on preset
          let filteredData = result.data;
          console.log('[PREVIEW] Raw data received:', result.data?.length, 'groups');

          if (preset) {
            // Filter groups and items based on preset
            const allowedGroupIds = new Set(preset.selectedGroups.map((sg: any) => sg.groupId));
            const allowedItemIds = new Set(preset.selectedItems.map((si: any) => si.itemId));

            console.log('[PREVIEW] Filtering preset:', {
              groupIds: Array.from(allowedGroupIds),
              itemIds: Array.from(allowedItemIds),
              selectedGroups: preset.selectedGroups,
              selectedItems: preset.selectedItems
            });

            filteredData = result.data
              .filter((group: any) => allowedGroupIds.has(group.id))
              .map((group: any) => ({
                ...group,
                items: group.items.filter((item: any) => allowedItemIds.has(item.id))
              }))
              .filter((group: any) => group.items.length > 0);
          }

          console.log('[PREVIEW] Filtered data:', filteredData?.length, 'groups');

          // Transform to sidebar format
          const sidebar: SidebarItem[] = filteredData.map((group: any) => ({
            id: group.id,
            label: group.label,
            path: group.name, // Groups don't have paths, just use name
            icon: group.name, // Use group name as icon identifier
            items: (group.items || []).map((item: any) => ({
              id: item.id,
              label: item.label,
              path: item.path,
              icon: item.icon
            })).filter((item: any) => item.label && item.id) // Filter valid items
          })).filter((group: any) => group.items && group.items.length > 0); // Filter groups with items

          console.log('[PREVIEW] Final sidebar data:', sidebar.length, 'groups');
          setSidebarData(sidebar);
        } else {
          console.error('[PREVIEW] API returned error:', result.error);
          toast({
            title: 'Error',
            description: `Failed to load sidebar preview: ${result.error}`,
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Preview Modal Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        toast({
          title: 'Error',
          description: `Failed to load sidebar preview: ${errorMessage}`,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSidebarData();
  }, [isOpen, preset?.id]); // Remove toast from dependencies to prevent infinite re-runs

  const toggleExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const renderSidebar = (items: SidebarItem[], level = 0): React.ReactNode => {
    return items.map((item) => {
      const isExpanded = expandedItems.has(item.id);
      const hasChildren = item.items && item.items.length > 0;
      const isGroup = level === 0;

      return (
        <div key={item.id} className={`${level > 0 ? 'ml-4' : ''}`}>
          <div
            className={`
              flex items-center p-2 rounded-md cursor-pointer transition-all duration-200
              hover:bg-accent/50 dark:hover:bg-accent/30 hover:shadow-sm
              ${level === 0
                ? 'font-semibold text-foreground text-base'
                : 'text-muted-foreground text-sm hover:text-foreground'
              }
            `}
            onClick={() => hasChildren && toggleExpansion(item.id)}
          >
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-4 w-4 mr-2 hover:bg-accent/30 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpansion(item.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            )}
            {!hasChildren && <div className="w-4 mr-2" />}
            <div className="flex-1 flex items-center">
              <div className="p-1 rounded-md bg-muted/30 dark:bg-muted/10">
                <Settings className="h-3 w-3 text-primary/70" />
              </div>
              <span className="ml-2 font-medium">{item.label}</span>
              {isGroup && (
                <Badge
                  variant="outline"
                  className="ml-2 text-xs border-primary/30 text-primary bg-primary/5 dark:bg-primary/10"
                >
                  Group
                </Badge>
              )}
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div className="mt-2 ml-4 border-l-2 border-border/30 pl-2">
              {renderSidebar(item.items!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl dark:shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Sidebar Preview</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              How the sidebar will look with "{preset?.name || 'No Preset'}" applied
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 bg-background/50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading preview...</span>
            </div>
          ) : sidebarData.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center border border-primary/20">
                <Settings className="h-8 w-8 text-primary/60" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-2">No menu items selected</p>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {preset ? 'Please select menu groups and items in the preset.' : 'No preset selected for preview.'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] w-full">
              <div className="bg-gradient-to-br from-background to-muted/30 dark:from-background dark:to-muted/10 rounded-lg p-5 border border-border/50 shadow-inner">
                <div className="mb-4 text-xs text-muted-foreground font-bold uppercase tracking-wider border-b border-border/50 pb-2">
                  Navigation Sidebar Preview
                </div>
                <div className="space-y-1">
                  {renderSidebar(sidebarData)}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/30 dark:bg-muted/10 border-t border-border flex justify-end">
          <Button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm hover:shadow-md transition-shadow"
          >
            Close Preview
          </Button>
        </div>
      </div>
    </div>
  );
}
