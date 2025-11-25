'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Clock, Download, Trash2, RotateCcw, Tag } from 'lucide-react';

// Simple relative time formatter
const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
};

interface Version {
    versionId: string;
    key: string;
    size: number;
    lastModified: string;
    etag: string;
    isLatest: boolean;
    isDeleteMarker: boolean;
}

interface VersionHistoryProps {
    bucketName: string;
    objectKey: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function VersionHistory({ bucketName, objectKey, open, onOpenChange }: VersionHistoryProps) {
    const queryClient = useQueryClient();

    // Fetch versions
    const { data: versions, isLoading } = useQuery({
        queryKey: ['object-versions', bucketName, objectKey],
        queryFn: async () => {
            const res = await api.get(`/s3/${bucketName}/${objectKey}?versions`);
            return res.data as Version[];
        },
        enabled: open,
    });

    // Delete version mutation
    const deleteVersionMutation = useMutation({
        mutationFn: async (versionId: string) => {
            await api.delete(`/s3/${bucketName}/${objectKey}?versionId=${versionId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['object-versions', bucketName, objectKey] });
            queryClient.invalidateQueries({ queryKey: ['bucket-objects', bucketName] });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to delete version');
        },
    });

    // Restore version mutation
    const restoreVersionMutation = useMutation({
        mutationFn: async (versionId: string) => {
            await api.post(`/buckets/${bucketName}/objects/${objectKey}/restore`, { versionId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['object-versions', bucketName, objectKey] });
            queryClient.invalidateQueries({ queryKey: ['bucket-objects', bucketName] });
            alert('Version restored successfully!');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to restore version');
        },
    });

    const handleDownload = (versionId: string) => {
        const url = `/s3/${bucketName}/${objectKey}?versionId=${versionId}`;
        window.open(url, '_blank');
    };

    const handleDelete = (versionId: string) => {
        if (confirm('Are you sure you want to permanently delete this version?')) {
            deleteVersionMutation.mutate(versionId);
        }
    };

    const handleRestore = (versionId: string) => {
        if (confirm('Are you sure you want to restore this version as the latest?')) {
            restoreVersionMutation.mutate(versionId);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Version History
                    </DialogTitle>
                    <DialogDescription>
                        View and manage all versions of <span className="font-mono">{objectKey}</span>
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="py-8 text-center text-muted-foreground">
                        Loading versions...
                    </div>
                ) : !versions || versions.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                        No versions found
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Version ID</TableHead>
                                    <TableHead>Modified</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {versions.map((version: Version) => (
                                    <TableRow key={version.versionId}>
                                        <TableCell className="font-mono text-xs">
                                            {version.versionId.substring(0, 8)}...
                                        </TableCell>
                                        <TableCell>
                                            {formatRelativeTime(new Date(version.lastModified))}
                                        </TableCell>
                                        <TableCell>
                                            {version.isDeleteMarker ? '-' : formatSize(version.size)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {version.isLatest && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                                                        <Tag className="h-3 w-3" />
                                                        Latest
                                                    </span>
                                                )}
                                                {version.isDeleteMarker && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                                                        Delete Marker
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {!version.isDeleteMarker && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDownload(version.versionId)}
                                                            title="Download this version"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                        {!version.isLatest && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRestore(version.versionId)}
                                                                disabled={restoreVersionMutation.isPending}
                                                                title="Restore this version"
                                                            >
                                                                <RotateCcw className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(version.versionId)}
                                                    disabled={deleteVersionMutation.isPending}
                                                    title="Delete this version"
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
