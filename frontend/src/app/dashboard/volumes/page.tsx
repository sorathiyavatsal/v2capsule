'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { HardDrive, Plus, Trash2, Edit, RefreshCw } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomConfirmDialog } from '@/components/custom-confirm-dialog';

interface Volume {
    id: number;
    name: string;
    path: string;
    capacity: number;
    used: number;
    isDefault: boolean;
    createdAt: string;
    objectCount?: number;
    usagePercent?: number;
}

interface DriveInfo {
    path: string;
    total: number;
    free: number;
    used: number;
    available: number;
}

export default function VolumesPage() {
    const queryClient = useQueryClient();
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [detectDialogOpen, setDetectDialogOpen] = useState(false);
    const [newVolumeName, setNewVolumeName] = useState('');
    const [newVolumePath, setNewVolumePath] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
        variant?: 'destructive' | 'default';
    }>({
        isOpen: false,
        title: '',
        description: '',
        onConfirm: () => { },
    });

    // Queries
    const { data: volumes, isLoading } = useQuery({
        queryKey: ['volumes'],
        queryFn: async () => {
            const res = await api.get('/volumes');
            return res.data as Volume[];
        },
    });

    const { data: drives } = useQuery({
        queryKey: ['drives'],
        queryFn: async () => {
            const res = await api.get('/volumes/detect');
            return res.data.drives as DriveInfo[];
        },
        enabled: detectDialogOpen,
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data: { name: string; path: string; isDefault: boolean }) => {
            await api.post('/volumes', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['volumes'] });
            setAddDialogOpen(false);
            resetForm();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to create volume');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/volumes/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['volumes'] });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to delete volume');
        },
    });

    // Handlers
    const resetForm = () => {
        setNewVolumeName('');
        setNewVolumePath('');
        setIsDefault(false);
    };

    const handleCreate = () => {
        if (!newVolumeName || !newVolumePath) {
            alert('Name and path are required');
            return;
        }
        createMutation.mutate({
            name: newVolumeName,
            path: newVolumePath,
            isDefault,
        });
    };

    const handleDelete = (volume: Volume) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Volume',
            description: `Are you sure you want to delete volume "${volume.name}"? This action cannot be undone.`,
            onConfirm: () => deleteMutation.mutate(volume.id),
            variant: 'destructive',
        });
    };

    const handleSelectDrive = (drive: DriveInfo) => {
        setNewVolumePath(drive.path);
        setDetectDialogOpen(false);
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getHealthStatus = (usagePercent: number) => {
        if (usagePercent >= 90) return { color: 'text-red-600', label: 'Critical' };
        if (usagePercent >= 80) return { color: 'text-yellow-600', label: 'Warning' };
        return { color: 'text-green-600', label: 'Healthy' };
    };

    if (isLoading) return <div>Loading volumes...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Storage Volumes</h1>
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Volume
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Storage Volume</DialogTitle>
                            <DialogDescription>
                                Add a new storage volume to distribute your data across multiple drives.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Volume Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Volume 2"
                                    value={newVolumeName}
                                    onChange={(e) => setNewVolumeName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="path">Storage Path</Label>
                                    <Dialog open={detectDialogOpen} onOpenChange={setDetectDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <HardDrive className="mr-2 h-4 w-4" />
                                                Detect Drives
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Available Drives</DialogTitle>
                                                <DialogDescription>
                                                    Select a drive to use for storage
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-2">
                                                {drives?.map((drive) => (
                                                    <Card
                                                        key={drive.path}
                                                        className="cursor-pointer hover:bg-accent"
                                                        onClick={() => handleSelectDrive(drive)}
                                                    >
                                                        <CardContent className="p-4">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="font-medium">{drive.path}</p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {formatBytes(drive.available)} available of {formatBytes(drive.total)}
                                                                    </p>
                                                                </div>
                                                                <HardDrive className="h-8 w-8 text-muted-foreground" />
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                                {!drives || drives.length === 0 && (
                                                    <p className="text-center text-muted-foreground py-4">
                                                        No drives detected
                                                    </p>
                                                )}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <Input
                                    id="path"
                                    placeholder="e.g., D:\storage"
                                    value={newVolumePath}
                                    onChange={(e) => setNewVolumePath(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="default"
                                    checked={isDefault}
                                    onCheckedChange={(checked) => setIsDefault(checked as boolean)}
                                />
                                <label
                                    htmlFor="default"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Set as default volume
                                </label>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} disabled={createMutation.isPending}>
                                {createMutation.isPending ? 'Creating...' : 'Create Volume'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Volumes Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {volumes?.map((volume) => {
                    const health = getHealthStatus(volume.usagePercent || 0);
                    return (
                        <Card key={volume.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <HardDrive className="h-5 w-5" />
                                        {volume.name}
                                        {volume.isDefault && (
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                Default
                                            </span>
                                        )}
                                    </CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(volume)}
                                        disabled={volume.isDefault}
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <p className="text-sm text-muted-foreground">Path</p>
                                    <p className="text-sm font-mono truncate">{volume.path}</p>
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Storage Usage</span>
                                        <span className={health.color}>{volume.usagePercent}%</span>
                                    </div>
                                    <Progress value={volume.usagePercent} className="h-2" />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatBytes(volume.used)} / {formatBytes(volume.capacity)}
                                    </p>
                                </div>

                                <div className="flex justify-between text-sm pt-2 border-t">
                                    <span className="text-muted-foreground">Objects</span>
                                    <span className="font-medium">{volume.objectCount || 0}</span>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Status</span>
                                    <span className={health.color}>{health.label}</span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {volumes?.length === 0 && (
                <Card>
                    <CardContent className="text-center py-12">
                        <HardDrive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No volumes configured</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            Add a storage volume to get started
                        </p>
                        <Button onClick={() => setAddDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add First Volume
                        </Button>
                    </CardContent>
                </Card>
            )}

            <CustomConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }}
                title={confirmDialog.title}
                description={confirmDialog.description}
                variant={confirmDialog.variant}
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
}
