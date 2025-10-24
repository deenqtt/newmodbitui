import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';
import { backupService } from './backup-service';
import { BackupType } from '@/lib/types/backup';
import { format, formatDistance, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';

// Extend jsPDF to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => any;
  }
}

export interface BackupReport {
  id: string;
  title: string;
  type: 'performance' | 'trend' | 'compliance' | 'summary';
  period: {
    start: Date;
    end: Date;
    type: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  };
  data: {
    summary: {
      totalBackups: number;
      totalSize: number;
      successRate: number;
      avgBackupTime: number;
      compressionRatio: number;
    };
    performance: {
      largestBackup: { name: string; size: number; created: Date };
      fastestBackup: { name: string; time: number; created: Date };
      slowestBackup: { name: string; time: number; created: Date };
    };
    trends: {
      dailyBackups: Array<{ date: Date; count: number; size: number }>;
      weeklyGrowth: number;
      monthlyGrowth: number;
    };
    compliance: {
      retentionCompliance: number;
      encryptionStatus: boolean;
      lastBackupAge: number;
      backupFrequency: number;
    };
  };
  generatedAt: Date;
  generatedBy: string;
  format: 'pdf' | 'html';
}

export interface ExportOptions {
  tableName: string;
  format: 'csv' | 'json';
  whereClause?: string;
  limit?: number;
  offset?: number;
  columns?: string[];
}

export interface ExportResult {
  filename: string;
  data: string;
  mimeType: string;
}

export class BackupReports {
  private static instance: BackupReports;
  private reportDir: string;

  constructor() {
    this.reportDir = path.join(process.cwd(), 'backups', 'reports');
    this.ensureReportDirectory();
  }

  public static getInstance(): BackupReports {
    if (!BackupReports.instance) {
      BackupReports.instance = new BackupReports();
    }
    return BackupReports.instance;
  }

  private ensureReportDirectory(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * Generate comprehensive backup report
   */
  public async generateBackupReport(
    type: BackupReport['type'] = 'summary',
    periodType: BackupReport['period']['type'] = 'monthly',
    generatedBy: string = 'system'
  ): Promise<BackupReport> {
    console.log(`📊 Generating ${type} backup report for ${periodType} period`);

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (periodType) {
      case 'weekly':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarterly':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), quarterStart + 3, 0);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Generate report data
    const [
      backupStats,
      databaseAnalysis,
      availableBackups
    ] = await Promise.all([
      backupService.getBackupStats(),
      backupService.getDatabaseAnalysis(),
      Promise.all([
        backupService.getAvailableBackups(),
        backupService.getAvailableBackups(BackupType.FILESYSTEM)
      ]).then(([db, fs]) => [...db, ...fs])
    ]);

    const reportData = this.generateReportData(backupStats, databaseAnalysis, availableBackups, startDate, endDate);

    const report: BackupReport = {
      id: uuidv4(),
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Backup Report - ${format(startDate, 'MMM yyyy')}`,
      type,
      period: {
        start: startDate,
        end: endDate,
        type: periodType
      },
      data: reportData,
      generatedAt: now,
      generatedBy,
      format: 'pdf' // Default format
    };

    console.log(`✅ Backup report generated: ${report.title}`);
    return report;
  }

  /**
   * Generate PDF report
   */
  public async generatePDFReport(report: BackupReport): Promise<Buffer> {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text(report.title, 20, 30);

    doc.setFontSize(12);
    doc.text(`Period: ${format(report.period.start, 'MMM dd, yyyy')} - ${format(report.period.end, 'MMM dd, yyyy')}`, 20, 45);
    doc.text(`Generated: ${format(report.generatedAt, 'MMM dd, yyyy HH:mm:ss')}`, 20, 55);
    doc.text(`Generated by: ${report.generatedBy}`, 20, 65);

    let yPosition = 80;

    // Summary Table
    doc.setFontSize(14);
    doc.text('Summary Statistics', 20, yPosition);
    yPosition += 10;

    doc.autoTable({
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: [
        ['Total Backups', report.data.summary.totalBackups.toString()],
        ['Total Size', this.formatBytes(report.data.summary.totalSize)],
        ['Success Rate', `${report.data.summary.successRate.toFixed(1)}%`],
        ['Avg Backup Time', `${report.data.summary.avgBackupTime.toFixed(1)}s`],
        ['Compression Ratio', `${report.data.summary.compressionRatio.toFixed(2)}x`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 20;

    // Performance Metrics
    doc.setFontSize(14);
    doc.text('Performance Metrics', 20, yPosition);
    yPosition += 10;

    doc.autoTable({
      startY: yPosition,
      head: [['Metric', 'Details']],
      body: [
        ['Largest Backup', `${report.data.performance.largestBackup.name} (${this.formatBytes(report.data.performance.largestBackup.size)})`],
        ['Fastest Backup', `${report.data.performance.fastestBackup.name} (${report.data.performance.fastestBackup.time.toFixed(1)}s)`],
        ['Slowest Backup', `${report.data.performance.slowestBackup.name} (${report.data.performance.slowestBackup.time.toFixed(1)}s)`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [39, 174, 96] },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 20;

    // Compliance Section
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
    }

    doc.setFontSize(14);
    doc.text('Compliance Status', 20, yPosition);
    yPosition += 10;

    doc.autoTable({
      startY: yPosition,
      head: [['Compliance Check', 'Status', 'Details']],
      body: [
        ['Retention Policy', report.data.compliance.retentionCompliance > 80 ? '✓ PASS' : '✗ FAIL', `${report.data.compliance.retentionCompliance.toFixed(1)}% compliant`],
        ['Encryption', report.data.compliance.encryptionStatus ? '✓ ENABLED' : '✗ DISABLED', 'Backup encryption status'],
        ['Backup Freshness', report.data.compliance.lastBackupAge < 7 ? '✓ RECENT' : '✗ STALE', `${report.data.compliance.lastBackupAge} days old`],
        ['Backup Frequency', report.data.compliance.backupFrequency > 80 ? '✓ GOOD' : '✗ POOR', `${report.data.compliance.backupFrequency.toFixed(1)}% target met`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [142, 68, 173] },
    });

    return Buffer.from(doc.output('arraybuffer'));
  }

  /**
   * Export table data to CSV using efficient CLI approach
   */
  public async exportTableToCSV(options: ExportOptions): Promise<{
    filename: string;
    data: string;
    mimeType: string;
  }> {
    const { tableName, whereClause, limit, offset, columns: specifiedColumns } = options;
    const exportFormat = options.format;
    console.log(`📤 Exporting table ${tableName} to ${exportFormat.toUpperCase()}`);

    try {
      const dbPath = path.join(process.cwd(), 'prisma', 'iot_dashboard.db');

      // Get columns first
      let exportColumns: string[];
      if (specifiedColumns && specifiedColumns.length > 0) {
        exportColumns = specifiedColumns;
      } else {
        // Use sqlite3 CLI to get column names
        const { execSync } = require('child_process');
        const schemaInfo = execSync(`sqlite3 "${dbPath}" "PRAGMA table_info(\`${tableName}\`)"`).toString();
        const lines = schemaInfo.trim().split('\n');
        exportColumns = lines.map((line: string) => {
          const parts = line.split('|');
          return parts[1] || ''; // name is second column
        }).filter((name: string) => name);
      }

      // Build CSV header
      let csvContent = exportColumns.join(',') + '\n';

      // Build WHERE clause
      const sqlWhereClause = whereClause ? `WHERE ${whereClause}` : '';
      const sqlLimit = limit || 10000;
      const sqlOffset = offset || 0;

      // Use SQLite .mode csv command for efficient export
      const selectColumns = exportColumns.map((c: string) => `\`${c}\``).join(', ');
      const sqlQuery = `SELECT ${selectColumns} FROM \`${tableName}\` ${sqlWhereClause} LIMIT ${sqlLimit} OFFSET ${sqlOffset}`;

      const { execSync } = require('child_process');
      const csvData = execSync(`sqlite3 -csv "${dbPath}" "${sqlQuery}"`).toString();

      csvContent += csvData;

      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const filename = `${tableName}_export_${timestamp}.csv`;

      return {
        filename,
        data: csvContent,
        mimeType: 'text/csv'
      };

    } catch (error) {
      console.error(`❌ CSV export failed for table ${tableName}:`, error);
      throw new Error(`Failed to export table ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate report data from backup statistics
   */
  private generateReportData(backupStats: any, databaseAnalysis: any, availableBackups: any[], startDate: Date, endDate: Date) {
    // Calculate summary metrics
    const summary = {
      totalBackups: backupStats.totalBackups,
      totalSize: backupStats.totalSize,
      successRate: backupStats.successRate,
      avgBackupTime: this.calculateAverageBackupTime(availableBackups),
      compressionRatio: this.calculateCompressionRatio(availableBackups)
    };

    // Performance metrics
    const performance = {
      largestBackup: availableBackups.reduce((max, backup) =>
        backup.size > max.size ? backup : max,
        availableBackups[0] || { name: 'None', size: 0, created: new Date() }
      ),
      fastestBackup: availableBackups.filter(b => b.fastestTime).reduce((min, backup) =>
        (backup.fastestTime || Infinity) < (min.fastestTime || Infinity) ? backup : min,
        availableBackups[0] || { name: 'None', time: 0, created: new Date() }
      ),
      slowestBackup: availableBackups.filter(b => b.slowestTime).reduce((max, backup) =>
        (backup.slowestTime || 0) > (max.slowestTime || 0) ? backup : max,
        availableBackups[0] || { name: 'None', time: 0, created: new Date() }
      )
    };

    // Trends analysis
    const trends = {
      dailyBackups: this.generateDailyBackupTrend(availableBackups, startDate, endDate),
      weeklyGrowth: this.calculateWeeklyGrowth(availableBackups),
      monthlyGrowth: this.calculateMonthlyGrowth(availableBackups)
    };

    // Compliance analysis
    const compliance = {
      retentionCompliance: this.calculateRetentionCompliance(availableBackups),
      encryptionStatus: false, // Would implement encryption check
      lastBackupAge: backupStats.lastBackup ?
        Math.floor((Date.now() - backupStats.lastBackup.getTime()) / (1000 * 60 * 60 * 24)) : Infinity,
      backupFrequency: this.calculateBackupFrequency(availableBackups, startDate, endDate)
    };

    return { summary, performance, trends, compliance };
  }

  /**
   * Calculate average backup time (mock implementation)
   */
  private calculateAverageBackupTime(backups: any[]): number {
    return 120; // Mock: 2 minutes average
  }

  /**
   * Calculate compression ratio (mock implementation)
   */
  private calculateCompressionRatio(backups: any[]): number {
    const compressed = backups.filter(b => b.isCompressed).length;
    return compressed > 0 ? backups.length / compressed : 1;
  }

  /**
   * Generate daily backup trend data
   */
  private generateDailyBackupTrend(backups: any[], startDate: Date, endDate: Date): Array<{ date: Date; count: number; size: number }> {
    const dailyData: { [key: string]: { count: number; size: number } } = {};

    backups.forEach(backup => {
      const dateKey = format(backup.created, 'yyyy-MM-dd');
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { count: 0, size: 0 };
      }
      dailyData[dateKey].count++;
      dailyData[dateKey].size += backup.size;
    });

    const result: Array<{ date: Date; count: number; size: number }> = [];
    let current = new Date(startDate);

    while (current <= endDate) {
      const dateKey = format(current, 'yyyy-MM-dd');
      const data = dailyData[dateKey] || { count: 0, size: 0 };
      result.push({
        date: new Date(current),
        count: data.count,
        size: data.size
      });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  /**
   * Calculate weekly growth rate
   */
  private calculateWeeklyGrowth(backups: any[]): number {
    // Simple growth calculation - would be more sophisticated
    const totalBackups = backups.length;
    const oldBackups = backups.filter(b => b.created < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;

    if (oldBackups === 0) return 0;
    return ((totalBackups - oldBackups) / oldBackups) * 100;
  }

  /**
   * Calculate monthly growth rate
   */
  private calculateMonthlyGrowth(backups: any[]): number {
    // Simple growth calculation
    const totalBackups = backups.length;
    const oldBackups = backups.filter(b => b.created < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;

    if (oldBackups === 0) return 0;
    return ((totalBackups - oldBackups) / oldBackups) * 100;
  }

  /**
   * Calculate retention compliance
   */
  private calculateRetentionCompliance(backups: any[]): number {
    // Compare actual vs expected based on timing
    const recentBackups = backups.filter(b => b.created > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const expectedBackups = 30; // Daily backups expected

    return Math.min((recentBackups.length / expectedBackups) * 100, 100);
  }

  /**
   * Calculate backup frequency compliance
   */
  private calculateBackupFrequency(backups: any[], startDate: Date, endDate: Date): number {
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalBackups = backups.length;

    // Assuming we want at least 80% of days to have backups
    return Math.min((totalBackups / daysDiff) * 100, 100);
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Save report to file (optional)
   */
  public async saveReportToFile(report: BackupReport, format: 'pdf' | 'html' = 'pdf'): Promise<string> {
    const filename = `backup-report-${report.id}.${format}`;
    const filepath = path.join(this.reportDir, filename);

    if (report.format === 'pdf') {
      const pdfBuffer = await this.generatePDFReport(report);
      fs.writeFileSync(filepath, pdfBuffer);
    } else {
      const htmlContent = this.generateHTMLReport(report);
      fs.writeFileSync(filepath, htmlContent, 'utf-8');
    }

    return filepath;
  }

  /**
   * Generate HTML report (simplified)
   */
  private generateHTMLReport(report: BackupReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${report.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.title}</h1>
        <p><strong>Period:</strong> ${format(report.period.start, 'MMM dd, yyyy')} - ${format(report.period.end, 'MMM dd, yyyy')}</p>
        <p><strong>Generated:</strong> ${format(report.generatedAt, 'MMM dd, yyyy HH:mm:ss')}</p>
        <p><strong>Generated by:</strong> ${report.generatedBy}</p>
    </div>

    <div class="section">
        <h2>Summary Statistics</h2>
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Total Backups</td><td>${report.data.summary.totalBackups}</td></tr>
            <tr><td>Total Size</td><td>${this.formatBytes(report.data.summary.totalSize)}</td></tr>
            <tr><td>Success Rate</td><td>${report.data.summary.successRate.toFixed(1)}%</td></tr>
            <tr><td>Avg Backup Time</td><td>${report.data.summary.avgBackupTime.toFixed(1)}s</td></tr>
            <tr><td>Compression Ratio</td><td>${report.data.summary.compressionRatio.toFixed(2)}x</td></tr>
        </table>
    </div>

    <!-- Additional sections would be added here -->
</body>
</html>`;
  }
}

export const backupReports = BackupReports.getInstance();
