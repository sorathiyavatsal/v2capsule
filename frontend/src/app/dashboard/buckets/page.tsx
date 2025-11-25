'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Trash2, Folder } from 'lucide-react';
import { CustomConfirmDialog } from '@/components/custom-confirm-dialog';
import { useToast } from '@/hooks/use-toast';

interface Volume {
    id: number;
    name: string;
    path: string;
    isDefault: boolean;
}

export default function BucketsPage() {
    const [newBucketName, setNewBucketName] = useState('');
    const [selectedVolumeId, setSelectedVolumeId] = useState<string>('default');
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
    const queryClient = useQueryClient();

    const { data: buckets, isLoading, error } = useQuery({
        queryKey: ['buckets'],
        queryFn: async () => {
            const res = await api.get('/buckets');
            return res.data;
        },
    });

    const { data: volumes } = useQuery({
        queryKey: ['volumes'],
        queryFn: async () => {
            const res = await api.get('/volumes');
            return res.data as Volume[];
        },
    });

    const { toast } = useToast();

    const createBucketMutation = useMutation({
        mutationFn: async (data: { name: string; volumeId?: number }) => {
            await api.post('/buckets', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buckets'] });
            setNewBucketName('');
            setSelectedVolumeId('default');
            toast({
                title: 'Bucket created',
                description: 'The bucket has been created successfully.',
            });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            toast({
                title: 'Failed to create bucket',
                description: err.response?.data?.error || 'An unexpected error occurred',
                variant: 'destructive',
            });
        },
    });

    const deleteBucketMutation = useMutation({
        mutationFn: async (name: string) => {
            await api.delete(`/buckets/${name}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buckets'] });
            toast({
                title: 'Bucket deleted',
                description: 'The bucket has been deleted successfully.',
            });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            toast({
                title: 'Failed to delete bucket',
                description: err.response?.data?.error || 'An unexpected error occurred',
                variant: 'destructive',
            });
        },
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBucketName) return;

        const data: { name: string; volumeId?: number } = { name: newBucketName };
        if (selectedVolumeId && selectedVolumeId !== 'default') {
            data.volumeId = parseInt(selectedVolumeId);
        }

        createBucketMutation.mutate(data);
    };

    if (isLoading) return <div>Loading buckets...</div>;
    if (error) return <div>Error loading buckets</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Buckets</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Create New Bucket</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="bucketName">Bucket Name</Label>
                            <Input
                                id="bucketName"
                                placeholder="my-bucket"
                                value={newBucketName}
                                onChange={(e) => setNewBucketName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="volume">Storage Volume (Optional)</Label>
                            <Select value={selectedVolumeId} onValueChange={setSelectedVolumeId}>
                                <SelectTrigger id="volume">
                                    <SelectValue placeholder="Use default volume" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">Default Volume</SelectItem>
                                    {volumes?.map((vol) => (
                                        <SelectItem key={vol.id} value={vol.id.toString()}>
                                            {vol.name} {vol.isDefault && '(Default)'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                Choose a specific volume or leave as default
                            </p>
                        </div>

                        <Button type="submit" disabled={createBucketMutation.isPending}>
                            {createBucketMutation.isPending ? 'Creating...' : 'Create Bucket'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {buckets?.map((bucket: any) => (
                    <Card key={bucket.id} className="hover:bg-slate-50 transition-colors">
                        <CardContent className="p-6 flex items-center justify-between">
                            <Link href={`/dashboard/buckets/${bucket.name}`} className="flex items-center gap-3 flex-1">
                                <Folder className="h-8 w-8 text-blue-500" />
                                <div>
                                    <div className="font-semibold">{bucket.name}</div>
                                    <div className="text-xs text-gray-500">
                                        {new Date(bucket.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </Link>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setConfirmDialog({
                                        isOpen: true,
                                        title: 'Delete Bucket',
                                        description: `Are you sure you want to delete bucket ${bucket.name}? This action cannot be undone and all objects inside will be lost.`,
                                        onConfirm: () => deleteBucketMutation.mutate(bucket.name),
                                        variant: 'destructive',
                                    });
                                }}
                            >
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

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
                isLoading={deleteBucketMutation.isPending}
            />
        </div>
    );
}
