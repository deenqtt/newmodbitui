// File: components/backup/BackupDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingPage } from '@/components/loading-page';
import { showToast } from '@/lib/toast-utils';
import { BackupStats, BackupType } from '@/lib/types/backup';

// Icons
import {
  Database,
  FolderOpen,
  HardDrive,
  Trash2,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
  FileDown,
  FileText
} from 'lucide-react';

interface BackupResult {
  result: {
    id: string;
    configId: string;
    type: BackupType;
    status: string;
    size: number;
    path: string;
    startedAt: string;
    completedAt?: string;
    error?: string;
    metadata?: any;
  };
  message: string;
}

export function BackupDashboard() {
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [cleanupInProgress, setCleanupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);

  // Database backup form
  const [dbBackupName, setDbBackupName] = useState('daily-database');
  const [dbRetentionDays, setDbRetentionDays] = useState(30);
  const [dbCompress, setDbCompress] = useState(true);
  const [dbIncludeWal, setDbIncludeWal] = useState(true);
  const [dbVerifyIntegrity, setDbVerifyIntegrity] = useState(true);

  // Filesystem backup form
  const [fsBackupName, setFsBackupName] = useState('daily-filesystem');
  const [fsPaths, setFsPaths] = useState('/home/ubuntu/Alfi/RnD/Development/newmodbitui/config,\n/home/ubuntu/Alfi/RnD/Development/newmodbitui/uploads');
  const [fsExcludePatterns, setFsExcludePatterns] = useState('node_modules,\n.git,\nbackups');
  const [fsRetentionDays, setFsRetentionDays] = useState(30);
  const [fsCompress, setFsCompress] = useState(true);

  // Data cleanup form
  const [cleanupRetentionDays, setCleanupRetentionDays] = useState(90);

  // Database restore
  const [availableBackups, setAvailableBackups] = useState<Array<{
    name: string;
    path: string;
    size: number;
    created: Date;
    isCompressed: boolean;
  }>>([]);
  const [restoreVerifyBefore, setRestoreVerifyBefore] = useState(true);

  // Database analysis
  const [dbAnalysis, setDbAnalysis] = useState<{
    tableStats: Array<{
      tableName: string;
      rowCount: number;
      sizeBytes: number;
      lastModified?: Date;
    }>;
    summary: {
      totalTables: number;
      totalRows: number;
      totalSizeBytes: number;
      databasePath: string;
      createdDate?: Date;
      lastModified?: Date;
    };
  } | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    loadBackupStats();
    loadAvailableBackups();
  }, []);

  const loadBackupStats = async () => {
    try {
      const response = await fetch('/api/backup');
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to load backup stats:', error);
      showToast.error('Failed to load backup statistics');
    } finally {
      setLoading(false);
    }
  };

  const performDatabaseBackup = async () => {
    setBackupInProgress(true);
    try {
      const config = {
        name: dbBackupName,
        retentionDays: dbRetentionDays,
        compress: dbCompress,
        includeWal: dbIncludeWal,
        verifyIntegrity: dbVerifyIntegrity
      };

      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: BackupType.DATABASE,
          config
        }),
      });

      const result: BackupResult = await response.json();

      if (response.ok) {
        showToast.success(result.message);
        loadBackupStats(); // Refresh stats
      } else {
        showToast.error(result.message || 'Database backup failed');
      }
    } catch (error) {
      console.error('Database backup error:', error);
      showToast.error('Failed to perform database backup');
    } finally {
      setBackupInProgress(false);
    }
  };

  const performFilesystemBackup = async () => {
    setBackupInProgress(true);
    try {
      const config = {
        name: fsBackupName,
        paths: fsPaths.split('\n').map(p => p.trim()).filter(p => p),
        excludePatterns: fsExcludePatterns.split('\n').map(p => p.trim()).filter(p => p),
        retentionDays: fsRetentionDays,
        compress: fsCompress
      };

      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: BackupType.FILESYSTEM,
          config
        }),
      });

      const result: BackupResult = await response.json();

      if (response.ok) {
        showToast.success(result.message);
        loadBackupStats(); // Refresh stats
      } else {
        showToast.error(result.message || 'Filesystem backup failed');
      }
    } catch (error) {
      console.error('Filesystem backup error:', error);
      showToast.error('Failed to perform filesystem backup');
    } finally {
      setBackupInProgress(false);
    }
  };

  const performDataCleanup = async () => {
    setCleanupInProgress(true);
    try {
      const response = await fetch('/api/backup/cleanup-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retentionDays: cleanupRetentionDays
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showToast.success(result.message);
        loadBackupStats(); // Refresh stats
      } else {
        showToast.error(result.message || 'Data cleanup failed');
      }
    } catch (error) {
      console.error('Data cleanup error:', error);
      showToast.error('Failed to perform data cleanup');
    } finally {
      setCleanupInProgress(false);
    }
  };

  const performBackupCleanup = async (type: BackupType) => {
    setCleanupInProgress(true);
    try {
      const response = await fetch('/api/backup/cleanup', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          days: type === BackupType.DATABASE ? dbRetentionDays : fsRetentionDays,
          maxBackups: 10
        }),
      });

      const result = await response.json();


      if (response.ok) {
        showToast.success(result.message);
        loadBackupStats(); // Refresh stats
      } else {
        showToast.error(result.message || 'Backup cleanup failed');
      }
    } catch (error) {
      console.error('Backup cleanup error:', error);
      showToast.error('Failed to perform backup cleanup');
    } finally {
      setCleanupInProgress(false);
    }
  };

  const loadAvailableBackups = async () => {
    try {
      const response = await fetch('/api/backup/restore');
      const data = await response.json();

      if (response.ok) {
        setAvailableBackups(data.backups);
      } else {
        console.error('Failed to load available backups:', data.message);
      }
    } catch (error) {
      console.error('Failed to load available backups:', error);
    }
  };

  const loadDatabaseAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const response = await fetch('/api/backup/analysis');
      const data = await response.json();

      if (response.ok) {
        setDbAnalysis(data.analysis);
        showToast.success('Database analysis completed!');
      } else {
        showToast.error(data.message || 'Database analysis failed');
      }
    } catch (error) {
      console.error('Failed to analyze database:', error);
      showToast.error('Failed to analyze database');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const performDatabaseRestore = async (backupPath: string) => {
    if (!confirm('⚠️ WARNING: This will replace the current database with the selected backup. This action cannot be undone. Are you sure you want to proceed?')) {
      return;
    }

    setRestoreInProgress(true);
    try {
      const response = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          backupPath,
          verifyBeforeRestore: restoreVerifyBefore
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showToast.success(result.message);
        // Reload the page to ensure all components reconnect to the restored database
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        showToast.error(result.message || 'Database restore failed');
      }
    } catch (error) {
      console.error('Database restore error:', error);
      showToast.error('Failed to restore database');
    } finally {
      setRestoreInProgress(false);
    }
  };

  const verifyBackup = async (backupPath: string) => {
    try {
      const response = await fetch('/api/backup/restore', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ backupPath }),
      });

      const result = await response.json();

      if (response.ok) {
        showToast.success(result.verification.valid
          ? 'Backup verification successful!'
          : `Backup verification failed: ${result.verification.message}`
        );
      } else {
        showToast.error('Backup verification failed');
      }
    } catch (error) {
      console.error('Backup verification error:', error);
      showToast.error('Failed to verify backup');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const handleTableExport = async (tableName: string, format: 'csv' | 'json' = 'csv') => {
    try {
      const response = await fetch('/api/backup/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableName,
          format,
          limit: 10000 // Limit for performance
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Export failed');
      }

      if (format === 'csv') {
        // For CSV, download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tableName}_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast.success(`Table ${tableName} exported successfully!`);
      } else {
        // For JSON, handle as data
        const data = await response.json();
        showToast.success(`Table ${tableName} exported successfully!`);
        console.log('Export data:', data);
      }
    } catch (error) {
      console.error(`Export error for table ${tableName}:`, error);
      showToast.error(`Failed to export table ${tableName}`);
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Backup Management</h1>
          <p className="text-muted-foreground">
            Manage database and filesystem backups with automated retention policies
          </p>
        </div>
        <Button onClick={loadBackupStats} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Total Backups</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold text-card-foreground">
            {stats?.totalBackups || 0}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Total Size</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold text-card-foreground">
            {formatBytes(stats?.totalSize || 0)}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Space Used</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold text-card-foreground">
            {formatBytes(stats?.spaceUsed || 0)}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Last Backup</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {formatDate(stats?.lastBackup)}
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Backup, Analysis, and Scheduling */}
      <Tabs defaultValue="backup" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database Backup
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Database Analyzer
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Schedule Manager
          </TabsTrigger>
        </TabsList>

        {/* Database Backup Tab */}
        <TabsContent value="backup" className="space-y-6 mt-6">
          {/* Database Backup Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Backup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="db-name">Backup Name</Label>
                  <Input
                    id="db-name"
                    value={dbBackupName}
                    onChange={(e) => setDbBackupName(e.target.value)}
                    placeholder="e.g., daily-database"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-retention">Retention (days)</Label>
                  <Input
                    id="db-retention"
                    type="number"
                    value={dbRetentionDays}
                    onChange={(e) => setDbRetentionDays(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={dbCompress}
                    onChange={(e) => setDbCompress(e.target.checked)}
                  />
                  <span className="text-sm">Compress backup</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={dbIncludeWal}
                    onChange={(e) => setDbIncludeWal(e.target.checked)}
                  />
                  <span className="text-sm">Include WAL files</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={dbVerifyIntegrity}
                    onChange={(e) => setDbVerifyIntegrity(e.target.checked)}
                  />
                  <span className="text-sm">Verify integrity</span>
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={performDatabaseBackup}
                  disabled={backupInProgress}
                  className="flex-1"
                >
                  {backupInProgress ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4 mr-2" />
                  )}
                  {backupInProgress ? 'Backing up...' : 'Backup Database'}
                </Button>
                <Button
                  onClick={() => performBackupCleanup(BackupType.DATABASE)}
                  variant="outline"
                  disabled={cleanupInProgress}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clean Old DB Backups
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Database Restore Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Database Restore
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Restore database from available backup files
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Database restore will replace the current database entirely. Always create a backup before restoring.
                  This operation requires server restart and may cause temporary service interruption.
                </AlertDescription>
              </Alert>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={restoreVerifyBefore}
                    onChange={(e) => setRestoreVerifyBefore(e.target.checked)}
                  />
                  <span className="text-sm">Verify backup integrity before restore</span>
                </label>
              </div>

              <Button onClick={loadAvailableBackups} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Backup List
              </Button>

              {availableBackups.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Available Database Backups:</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableBackups.map((backup) => (
                      <div key={backup.path} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">{backup.name}</span>
                            {backup.isCompressed && (
                              <Badge variant="secondary" className="text-xs">Compressed</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Size: {formatBytes(backup.size)} | Created: {formatDate(backup.created)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verifyBackup(backup.path)}
                          >
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => performDatabaseRestore(backup.path)}
                            disabled={restoreInProgress}
                          >
                            {restoreInProgress ? (
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Download className="h-3 w-3 mr-1" />
                            )}
                            Restore
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No database backups available</p>
                  <p className="text-xs mt-1">Create a database backup first</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filesystem Backup Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Filesystem Backup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fs-name">Backup Name</Label>
                  <Input
                    id="fs-name"
                    value={fsBackupName}
                    onChange={(e) => setFsBackupName(e.target.value)}
                    placeholder="e.g., daily-filesystem"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fs-retention">Retention (days)</Label>
                  <Input
                    id="fs-retention"
                    type="number"
                    value={fsRetentionDays}
                    onChange={(e) => setFsRetentionDays(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fs-paths">Paths to Backup (one per line)</Label>
                  <Textarea
                    id="fs-paths"
                    value={fsPaths}
                    onChange={(e) => setFsPaths(e.target.value)}
                    rows={3}
                    placeholder="/path/to/important/data&#10;/another/path"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fs-exclude">Exclude Patterns (one per line)</Label>
                  <Textarea
                    id="fs-exclude"
                    value={fsExcludePatterns}
                    onChange={(e) => setFsExcludePatterns(e.target.value)}
                    rows={3}
                    placeholder="node_modules&#10;.git&#10;*.log"
                  />
                </div>
              </div>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={fsCompress}
                  onChange={(e) => setFsCompress(e.target.checked)}
                />
                <span className="text-sm">Compress backup</span>
              </label>

              <div className="flex gap-2">
                <Button
                  onClick={performFilesystemBackup}
                  disabled={backupInProgress}
                  className="flex-1"
                >
                  {backupInProgress ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FolderOpen className="h-4 w-4 mr-2" />
                  )}
                  {backupInProgress ? 'Backing up...' : 'Backup Filesystem'}
                </Button>
                <Button
                  onClick={() => performBackupCleanup(BackupType.FILESYSTEM)}
                  variant="outline"
                  disabled={cleanupInProgress}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clean Old FS Backups
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Cleanup Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Data Retention & Cleanup
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Clean up old logged data from the database to maintain performance and storage efficiency
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This will permanently delete logged data, bill logs, and alarm logs older than the specified retention period.
                  This action cannot be undone.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="cleanup-retention">Retention Period (days)</Label>
                <Input
                  id="cleanup-retention"
                  type="number"
                  value={cleanupRetentionDays}
                  onChange={(e) => setCleanupRetentionDays(Number(e.target.value))}
                  min="1"
                  max="365"
                />
                <p className="text-xs text-muted-foreground">
                  Keep data for the last {cleanupRetentionDays} days. Older data will be permanently deleted.
                </p>
              </div>

              <Button
                onClick={performDataCleanup}
                disabled={cleanupInProgress}
                variant="destructive"
              >
                {cleanupInProgress ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {cleanupInProgress ? 'Cleaning up...' : 'Clean Old Data'}
              </Button>
            </CardContent>
          </Card>

          {/* Backup Directory Info */}
          <Card>
            <CardHeader>
              <CardTitle>Backup Storage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Backup Directory:</strong> /home/ubuntu/Alfi/RnD/Development/newmodbitui/backups
                </p>
                <p className="text-sm">
                  <strong>Structure:</strong>
                </p>
                <ul className="text-sm text-muted-foreground ml-4 space-y-1">
                  <li>• backups/database/ - Database backups</li>
                  <li>• backups/filesystem/ - Filesystem backups</li>
                  <li>• backups/logs/ - Backup operation logs</li>
                  <li>• backups/temp/ - Temporary files</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Analyzer Tab */}
        <TabsContent value="analysis" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Analyzer
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Analyze database structure, table sizes, and data distribution
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={loadDatabaseAnalysis} disabled={analysisLoading}>
                {analysisLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Analyze Database
                  </>
                )}
              </Button>

              {dbAnalysis && (
                <div className="space-y-4">
                  {/* Summary Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{dbAnalysis.summary.totalTables}</div>
                      <div className="text-sm text-muted-foreground">Total Tables</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{dbAnalysis.summary.totalRows.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Total Rows</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{formatBytes(dbAnalysis.summary.totalSizeBytes)}</div>
                      <div className="text-sm text-muted-foreground">Total Size</div>
                    </div>
                  </div>

                  {/* Database File Information */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Database Information:</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Path:</strong> {dbAnalysis.summary.databasePath}</p>
                      <p><strong>Created:</strong> {formatDate(dbAnalysis.summary.createdDate)}</p>
                      <p><strong>Last Modified:</strong> {formatDate(dbAnalysis.summary.lastModified)}</p>
                    </div>
                  </div>

                  {/* Table Details with Export Options */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Table Details:</h4>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-2">
                          <FileText className="h-3 w-3" />
                          Generate Report
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                          <FileDown className="h-3 w-3" />
                          Export All CSV
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {dbAnalysis.tableStats.map((table) => (
                        <div key={table.tableName} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20 transition-colors">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{table.tableName}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Rows: {table.rowCount.toLocaleString()} |
                              Size: {formatBytes(table.sizeBytes)} |
                              Last Modified: {formatDate(table.lastModified)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Progress bar for size visualization */}
                            <div className="w-20">
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full"
                                  style={{
                                    width: `${Math.min((table.sizeBytes / dbAnalysis.summary.totalSizeBytes) * 100, 100)}%`
                                  }}
                                />
                              </div>
                            </div>
                            {/* Export button for individual table */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTableExport(table.tableName, 'csv')}
                              className="gap-1"
                            >
                              <FileDown className="h-3 w-3" />
                              CSV
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!dbAnalysis && !analysisLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Analyze Database" to view detailed statistics</p>
                  <p className="text-xs mt-1">Get insights into your database structure and usage</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Manager Tab */}
        <TabsContent value="schedules" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Schedule Manager
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage automated backup schedules with cron-based execution
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Schedule Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">0</div>
                  <div className="text-sm text-muted-foreground">Total Schedules</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-muted-foreground">Active Schedules</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-muted-foreground">Running Now</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">
                    Next: Never
                  </div>
                </div>
              </div>

              {/* Create New Schedule Button */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Backup Schedules</h3>
                <Button className="gap-2">
                  <Clock className="h-4 w-4" />
                  Create Schedule
                </Button>
              </div>

              {/* Schedules List */}
              <div className="space-y-3">
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No backup schedules configured</p>
                  <p className="text-sm mt-1">Create automated backup schedules to run daily, weekly, or monthly</p>
                </div>
              </div>

              {/* Schedule Types Info */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Schedule Types:</strong> DAILY (every day), WEEKLY (specific day of week), MONTHLY (specific day of month).
                  All schedules use Asia/Jakarta timezone.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Granular Restore Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Granular Restore Options
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Advanced restore options with selective table recovery
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Point-in-time recovery and selective table restore provide advanced recovery options.
                  Use schema analysis first to understand backup compatibility.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="gap-2">
                  <Database className="h-4 w-4" />
                  Schema Analysis
                </Button>
                <Button variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Selective Restore
                </Button>
                <Button variant="outline" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Point-in-Time (Coming Soon)
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                <p><strong>Features Available:</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Schema comparison between current database and backup</li>
                  <li>Selective table restoration from backup files</li>
                  <li>Data integrity validation before restore</li>
                  <li>Emergency rollback capabilities</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
