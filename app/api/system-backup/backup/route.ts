import { NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getAuthFromCookie } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  // Public access - removed admin role check
  // const auth = await getAuthFromCookie(request);
  // if (!auth || auth.role !== "ADMIN") {
  //   return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  // }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), "backups");

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const dbPath = path.join(process.cwd(), "prisma/iot_dashboard.db");
    const backupDbPath = path.join(backupDir, `backup-${timestamp}.db`);
    const backupSqlPath = path.join(backupDir, `backup-${timestamp}.sql`);

    // Check if database file exists
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ message: "Database not found" }, { status: 404 });
    }

    // Create database backup (file copy)
    fs.copyFileSync(dbPath, backupDbPath);
    const dbStats = fs.statSync(backupDbPath);

    // Create SQL dump
    const dumpCommand = `sqlite3 "${dbPath}" .dump > "${backupSqlPath}"`;
    execSync(dumpCommand);

    const sqlStats = fs.statSync(backupSqlPath);

    // Compress the dumps if tar is available
    const compressedTarPath = path.join(backupDir, `backup-${timestamp}.tar.gz`);
    let compressedPath = null;
    try {
      const tarCommand = `cd "${backupDir}" && tar -czf "backup-${timestamp}.tar.gz" "backup-${timestamp}.db" "backup-${timestamp}.sql"`;
      execSync(tarCommand);
      compressedPath = compressedTarPath;
      const compressedStats = fs.statSync(compressedPath);

      // Clean up uncompressed files
      fs.unlinkSync(backupDbPath);
      fs.unlinkSync(backupSqlPath);
    } catch (error) {
      console.warn("Compression failed, keeping uncompressed files");
      compressedPath = null;
    }

    // Get backup verification (check the database file that's still available)
    let verification = 'UNKNOWN';
    const dbFileToVerify = compressedPath ? null : backupDbPath;
    if (dbFileToVerify) {
      try {
        const verifyCommand = `sqlite3 "${dbFileToVerify}" "PRAGMA integrity_check;"`;
        verification = execSync(verifyCommand, { encoding: 'utf8' }).trim();
      } catch (error) {
        verification = 'FAILED';
      }
    }

    const result = {
      message: "Full backup completed successfully",
      timestamp,
      database: {
        path: backupDbPath,
        size: fs.existsSync(backupDbPath) ? fs.statSync(backupDbPath).size : 0
      },
      sql: {
        path: backupSqlPath,
        size: fs.existsSync(backupSqlPath) ? fs.statSync(backupSqlPath).size : 0
      },
      compressed: compressedPath ? {
        path: compressedPath,
        size: fs.statSync(compressedPath).size
      } : null,
      verification,
      backupDir
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Full backup error:", error);
    return NextResponse.json(
      {
        message: "Failed to create full backup",
        error: error.message
      },
      { status: 500 }
    );
  }
}

// GET endpoint to list backup files (public access)
export async function GET(request: Request) {
  // Public access - no authentication required
  // const auth = await getAuthFromCookie(request);
  // if (!auth) {
  //   return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  // }

  try {
    const backupDir = path.join(process.cwd(), "backups");

    if (!fs.existsSync(backupDir)) {
      return NextResponse.json({ backups: [], message: "No backups directory found" });
    }

    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && (file.endsWith('.tar.gz') || file.endsWith('.db') || file.endsWith('.sql')))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          created: stats.mtime,
          path: filePath
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());

    return NextResponse.json({
      backups: files,
      totalBackups: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0)
    });
  } catch (error: any) {
    console.error("Listing backups error:", error);
    return NextResponse.json(
      {
        message: "Failed to list backups",
        error: error.message
      },
      { status: 500 }
    );
  }
}
