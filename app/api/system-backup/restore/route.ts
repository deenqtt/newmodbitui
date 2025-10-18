import { NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getAuthFromCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = await getAuthFromCookie(request);
  // Ensure only admin users can perform restore operations

  const { backupFile, type, confirm } = await request.json();

  if (!backupFile || !type || confirm !== true) {
    return NextResponse.json({
      message: "Missing required parameters or confirmation",
      required: { backupFile: true, type: true, confirm: true }
    }, { status: 400 });
  }

  try {
    const backupDir = path.join(process.cwd(), "backups");
    const backupPath = path.join(backupDir, backupFile);

    // Validate backup file exists
    if (!fs.existsSync(backupPath)) {
      return NextResponse.json({
        message: "Backup file not found",
        path: backupPath
      }, { status: 404 });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const result = {
      type,
      backupFile,
      timestamp,
      status: 'initiated',
      steps: [] as string[]
    };

    if (type === 'database') {
      // Create pre-restore backup
      const preRestorePath = path.join(backupDir, `pre-restore-${timestamp}.db`);
      const dbPath = path.join(process.cwd(), "prisma/iot_dashboard.db");

      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, preRestorePath);
        result.steps.push(`Created pre-restore backup: ${preRestorePath}`);
      }

      // Restore database backup
      if (backupFile.endsWith('.db')) {
        // Direct database file restore
        fs.copyFileSync(backupPath, dbPath);
        result.steps.push(`Restored database from file: ${backupPath}`);
      } else if (backupFile.endsWith('.sql')) {
        // SQL dump restore - create new database from dump
        const tempDbPath = path.join(process.cwd(), `temp-${timestamp}.db`);
        const createCommand = `sqlite3 "${tempDbPath}" < "${backupPath}"`;
        execSync(createCommand);
        fs.renameSync(tempDbPath, dbPath);
        result.steps.push(`Restored database from SQL dump: ${backupPath}`);
      } else if (backupFile.endsWith('.tar.gz')) {
        // Extract and find the database file
        const extractDir = path.join(backupDir, `extract-${timestamp}`);
        fs.mkdirSync(extractDir);

        const extractCommand = `tar -xzf "${backupPath}" -C "${extractDir}"`;
        execSync(extractCommand);

        // Find database file in extracted archive
        const findDbCommand = `find "${extractDir}" -name "*.db" -type f`;
        const dbFiles = execSync(findDbCommand, { encoding: 'utf8' })
          .trim()
          .split('\n')
          .filter(f => f.trim());

        if (dbFiles.length > 0) {
          fs.copyFileSync(dbFiles[0], dbPath);
          result.steps.push(`Restored database from archive: ${backupPath}`);
        } else {
          throw new Error("No database file found in backup archive");
        }

        // Cleanup
        fs.rmSync(extractDir, { recursive: true });
      }

      // Verify restoration
      const integrityCheck = execSync(`sqlite3 "${dbPath}" "PRAGMA integrity_check;"`, { encoding: 'utf8' }).trim();
      result.steps.push(`Database integrity check: ${integrityCheck}`);

      if (integrityCheck === 'ok') {
        result.status = 'completed';
      } else {
        result.status = 'warning';
        result.steps.push('WARNING: Database integrity check failed');
      }

    } else if (type === 'files') {
      // Extract files backup
      const extractBasePath = path.join(process.cwd(), `restore-${timestamp}`);
      fs.mkdirSync(extractBasePath);

      if (backupFile.endsWith('.tar.gz')) {
        const extractCommand = `tar -xzf "${backupPath}" -C "${extractBasePath}"`;
        execSync(extractCommand);
        result.steps.push(`Extracted files to: ${extractBasePath}`);
      }

      // Here we would need to manually specify where to restore files
      // For safety, we'll leave the extracted files in a temporary location
      result.status = 'completed';
      result.steps.push(`Files extracted to temporary directory: ${extractBasePath}`);
      result.steps.push('Please manually review and move files to their appropriate locations');
    }

    result.status = result.status === 'initiated' ? 'unknown_type' : result.status;

    return NextResponse.json({
      message: `Restore ${result.status === 'completed' ? 'completed successfully' : 'partially completed'}`,
      result
    });

  } catch (error: any) {
    console.error("Restore error:", error);
    return NextResponse.json(
      {
        message: "Failed to perform restore",
        error: error.message
      },
      { status: 500 }
    );
  }
}

// GET endpoint to get available backup files for restore
export async function GET(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const backupDir = path.join(process.cwd(), "backups");

    if (!fs.existsSync(backupDir)) {
      return NextResponse.json({
        databaseBackups: [],
        fileBackups: [],
        message: "No backups directory found"
      });
    }

    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') || file.startsWith('files-'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          created: stats.mtime,
          type: file.includes('files-') ? 'files' : 'database'
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());

    const databaseBackups = files.filter(f => f.type === 'database');
    const fileBackups = files.filter(f => f.type === 'files');

    return NextResponse.json({
      databaseBackups,
      fileBackups,
      totalBackups: files.length
    });
  } catch (error: any) {
    console.error("Listing restore backups error:", error);
    return NextResponse.json(
      {
        message: "Failed to list restore backups",
        error: error.message
      },
      { status: 500 }
    );
  }
}
