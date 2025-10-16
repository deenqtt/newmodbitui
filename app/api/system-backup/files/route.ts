import { NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getAuthFromCookie } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  // Public access - removed admin role check
  // const auth = await getAuthFromCookie(request);
  // // Public access - removed admin role check
  // if (!auth || auth.role !== Role.ADMIN) {
  //   return NextResponse.json({ message: "Forbidden" //   return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  // }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), "backups");

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const fileBackupPath = path.join(backupDir, `files-${timestamp}.tar.gz`);

    // Files and directories to backup
    const pathsToBackup = [
      'public/images',
      'public/snapshots',
      'middleware',
      'scripts',
      'prisma/migrations',
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'next.config.mjs',
      'tailwind.config.ts',
      'postcss.config.js',
      'reset-db.sh',
      'update.sh'
    ];

    // Sensitive files to backup securely (encrypt if possible)
    const sensitiveFiles = [
      '.env.local',
      '.env',
      'cookies.txt'
    ];

    // Create a temporary structure for backup
    const tempDir = path.join(backupDir, `temp-files-${timestamp}`);
    fs.mkdirSync(tempDir, { recursive: true });

    let totalFiles = 0;
    let totalSize = 0;

    // Copy regular files
    for (const filePath of pathsToBackup) {
      const srcPath = path.join(process.cwd(), filePath);
      const destPath = path.join(tempDir, filePath);

      if (fs.existsSync(srcPath)) {
        if (fs.statSync(srcPath).isDirectory()) {
          // Copy directory recursively
          const copyDir = (src: string, dest: string) => {
            if (!fs.existsSync(dest)) {
              fs.mkdirSync(dest, { recursive: true });
            }
            const items = fs.readdirSync(src);
            for (const item of items) {
              const srcItem = path.join(src, item);
              const destItem = path.join(dest, item);
              if (fs.statSync(srcItem).isDirectory()) {
                copyDir(srcItem, destItem);
              } else {
                fs.copyFileSync(srcItem, destItem);
                totalFiles++;
                totalSize += fs.statSync(srcItem).size;
              }
            }
          };
          copyDir(srcPath, destPath);
        } else {
          // Copy single file
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.copyFileSync(srcPath, destPath);
          totalFiles++;
          totalSize += fs.statSync(srcPath).size;
        }
      }
    }

    // Create sensitive files archive
    const sensitiveDir = path.join(tempDir, 'sensitive');
    fs.mkdirSync(sensitiveDir);

    for (const sensitiveFile of sensitiveFiles) {
      const srcPath = path.join(process.cwd(), sensitiveFile);
      if (fs.existsSync(srcPath)) {
        const destPath = path.join(sensitiveDir, sensitiveFile);
        fs.copyFileSync(srcPath, destPath);
        totalFiles++;
        totalSize += fs.statSync(srcPath).size;
      }
    }

    // Create log files archive if they exist
    const logsDir = path.join(tempDir, 'logs');
    fs.mkdirSync(logsDir);

    // Try to find and copy log files
    const potentialLogFiles = [
      'reset-db.log',
      'middleware/ec25_enhanced.log'
    ];

    for (const logFile of potentialLogFiles) {
      const srcPath = path.join(process.cwd(), logFile);
      if (fs.existsSync(srcPath)) {
        const destPath = path.join(logsDir, path.basename(logFile));
        fs.copyFileSync(srcPath, destPath);
        totalFiles++;
        totalSize += fs.statSync(srcPath).size;
      }
    }

    // Create the compressed archive
    const tarCommand = `cd "${tempDir}" && tar -czf "${fileBackupPath}" .`;
    execSync(tarCommand, { cwd: backupDir });

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true });

    const finalStats = fs.statSync(fileBackupPath);

    const result = {
      message: "Files backup completed successfully",
      timestamp,
      archivePath: fileBackupPath,
      totalFiles,
      uncompressedSize: totalSize,
      compressedSize: finalStats.size,
      compressionRatio: totalSize > 0 ? (finalStats.size / totalSize) : 0,
      backedUpPaths: pathsToBackup,
      sensitiveFiles: sensitiveFiles.length,
      logFiles: 0, // Will be calculated
      backupDir
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Files backup error:", error);
    return NextResponse.json(
      {
        message: "Failed to create files backup",
        error: error.message
      },
      { status: 500 }
    );
  }
}
