import os from 'os';
import { statfs } from 'fs/promises';
import fs from 'fs-extra';
import path from 'path';

export interface DriveInfo {
    path: string;
    total: number;
    free: number;
    used: number;
    available: number;
    filesystem?: string;
}

/**
 * Detect available disk drives/volumes on the system
 */
export async function detectDrives(): Promise<DriveInfo[]> {
    const platform = os.platform();
    const drives: DriveInfo[] = [];

    if (platform === 'win32') {
        // Windows: Check common drive letters
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

        for (const letter of letters) {
            const drivePath = `${letter}:\\`;
            try {
                // Check if drive exists
                if (await fs.pathExists(drivePath)) {
                    const stats = await statfs(drivePath);
                    drives.push({
                        path: drivePath,
                        total: stats.blocks * stats.bsize,
                        free: stats.bfree * stats.bsize,
                        available: stats.bavail * stats.bsize,
                        used: (stats.blocks - stats.bfree) * stats.bsize,
                    });
                }
            } catch (err) {
                // Drive not accessible, skip
                continue;
            }
        }
    } else {
        // Linux/Unix: Check common mount points
        const mountPoints = ['/', '/mnt', '/media', '/home'];

        for (const mountPoint of mountPoints) {
            try {
                if (await fs.pathExists(mountPoint)) {
                    const stats = await statfs(mountPoint);
                    drives.push({
                        path: mountPoint,
                        total: stats.blocks * stats.bsize,
                        free: stats.bfree * stats.bsize,
                        available: stats.bavail * stats.bsize,
                        used: (stats.blocks - stats.bfree) * stats.bsize,
                    });
                }
            } catch (err) {
                continue;
            }
        }
    }

    return drives;
}

/**
 * Get capacity information for a specific path
 */
export async function getPathCapacity(volumePath: string): Promise<DriveInfo> {
    try {
        const stats = await statfs(volumePath);
        return {
            path: volumePath,
            total: stats.blocks * stats.bsize,
            free: stats.bfree * stats.bsize,
            available: stats.bavail * stats.bsize,
            used: (stats.blocks - stats.bfree) * stats.bsize,
        };
    } catch (err: any) {
        throw new Error(`Failed to get capacity for path ${volumePath}: ${err.message}`);
    }
}

/**
 * Validate if a path is writable
 */
export async function validateVolumePath(volumePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
        // Check if path exists
        const exists = await fs.pathExists(volumePath);

        if (!exists) {
            // Try to create it
            try {
                await fs.ensureDir(volumePath);
            } catch (err: any) {
                return { valid: false, error: `Cannot create directory: ${err.message}` };
            }
        }

        // Check if writable
        const testFile = path.join(volumePath, '.write-test');
        try {
            await fs.writeFile(testFile, 'test');
            await fs.unlink(testFile);
        } catch (err: any) {
            return { valid: false, error: `Path is not writable: ${err.message}` };
        }

        // Prevent directory traversal
        const normalized = path.normalize(volumePath);
        if (normalized.includes('..')) {
            return { valid: false, error: 'Invalid path: directory traversal detected' };
        }

        return { valid: true };
    } catch (err: any) {
        return { valid: false, error: err.message };
    }
}
