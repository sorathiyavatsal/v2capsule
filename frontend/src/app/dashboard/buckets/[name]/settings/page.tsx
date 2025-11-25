'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, HardDrive, AlertCircle, Copy, Eye, EyeOff, RefreshCw, Key, Lock, History } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { CustomConfirmDialog } from '@/components/custom-confirm-dialog';
import { EventNotifications } from '@/components/event-notifications';
import { KeyManagement } from '@/components/key-management';

interface Volume {
    id: number;
    name: string;
    path: string;
    isDefault: boolean;
}

interface Bucket {
    id: number;
    name: string;
    volumeId: number;
    createdAt: string;
    encryptionEnabled: boolean;
    encryptionType: string;
    encryptionKeyId?: string;
    versioningEnabled: boolean;
}

interface Distribution {
    volumeId: number;
    volumeName: string;
    objectCount: number;
    totalSize: number;
}

interface DistributionData {
    bucketName: string;
    currentVolumeId: number;
    distribution: Distribution[];
    summary: {
        totalObjects: number;
        totalSize: number;
        volumeCount: number;
    };
}

export default function BucketSettingsPage() {
    const params = useParams();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const router = useRouter();
    const bucketName = decodeURIComponent(params.name as string);
    const [selectedVolumeId, setSelectedVolumeId] = useState<string>('');
    const [showSecretKey, setShowSecretKey] = useState(false);
    const [encryptionEnabled, setEncryptionEnabled] = useState(false);
    const [encryptionType, setEncryptionType] = useState('SSE-S3');
    const [versioningEnabled, setVersioningEnabled] = useState(false);
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

    // Fetch bucket details
    const { data: buckets } = useQuery({
        queryKey: ['buckets'],
        queryFn: async () => {
            const res = await api.get('/buckets');
            return res.data as Bucket[];
        },
    });

    const bucket = buckets?.find(b => b.name === bucketName);

    // Update state when bucket loads
    useEffect(() => {
        if (bucket) {
            if (bucket.encryptionEnabled !== encryptionEnabled) {
                setEncryptionEnabled(bucket.encryptionEnabled || false);
            }
            if (bucket.encryptionType !== encryptionType) {
                setEncryptionType(bucket.encryptionType || 'SSE-S3');
            }
            if (bucket.versioningEnabled !== versioningEnabled) {
                setVersioningEnabled(bucket.versioningEnabled || false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bucket]);

    // Fetch bucket keys
    const { data: keys, refetch: refetchKeys } = useQuery({
        queryKey: ['bucket-keys', bucketName],
        queryFn: async () => {
            const res = await api.get(`/buckets/${bucketName}/keys`);
            return res.data;
        },
        enabled: !!bucketName,
    });

    // Fetch volumes
    const { data: volumes } = useQuery({
        queryKey: ['volumes'],
        queryFn: async () => {
            const res = await api.get('/volumes');
            return res.data as Volume[];
        },
    });

    // Fetch object distribution
    const { data: distribution } = useQuery({
        queryKey: ['bucket-distribution', bucketName],
        queryFn: async () => {
            const res = await api.get(`/buckets/${bucketName}/distribution`);
            return res.data as DistributionData;
        },
        enabled: !!bucketName,
    });

    // Update bucket volume mutation
    const updateVolumeMutation = useMutation({
        mutationFn: async (volumeId: number) => {
            await api.patch(`/buckets/${bucketName}`, { volumeId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buckets'] });
            queryClient.invalidateQueries({ queryKey: ['bucket-distribution', bucketName] });
            alert('Bucket volume updated successfully!');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to update bucket volume');
        },
    });

    // Regenerate keys mutation
    const regenerateKeysMutation = useMutation({
        mutationFn: async () => {
            await api.post(`/buckets/${bucketName}/keys/regenerate`);
        },
        onSuccess: () => {
            refetchKeys();
            alert('Keys regenerated successfully!');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to regenerate keys');
        },
    });

    // Update encryption mutation
    const updateEncryptionMutation = useMutation({
        mutationFn: async (data: { encryptionEnabled: boolean; encryptionType: string }) => {
            await api.patch(`/buckets/${bucketName}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buckets'] });
            alert('Encryption settings updated successfully!');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to update encryption settings');
        },
    });

    // Update versioning mutation
    const updateVersioningMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            await api.patch(`/buckets/${bucketName}`, { versioningEnabled: enabled });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buckets'] });
            alert('Versioning settings updated successfully!');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to update versioning settings');
            // Revert state on error
            if (bucket) setVersioningEnabled(bucket.versioningEnabled || false);
        },
    });

    const handleUpdateEncryption = () => {
        setConfirmDialog({
            isOpen: true,
            title: 'Update Encryption Settings',
            description: 'Changing encryption settings will only apply to new objects. Existing objects will remain as they are.',
            onConfirm: () => updateEncryptionMutation.mutate({ encryptionEnabled, encryptionType }),
            variant: 'default',
        });
    };

    const handleUpdateVersioning = (checked: boolean) => {
        setVersioningEnabled(checked);
        setConfirmDialog({
            isOpen: true,
            title: checked ? 'Enable Versioning' : 'Suspend Versioning',
            description: checked
                ? 'Enabling versioning will keep multiple variants of an object in the same bucket. You can retrieve, restore, and delete specific versions.'
                : 'Suspending versioning will stop creating new versions for objects. Existing versions will be preserved.',
            onConfirm: () => updateVersioningMutation.mutate(checked),
            variant: 'default',
        });
    };

    const handleUpdateVolume = () => {
        if (!selectedVolumeId) {
            alert('Please select a volume');
            return;
        }

        setConfirmDialog({
            isOpen: true,
            title: 'Update Bucket Volume',
            description: 'Are you sure you want to change the bucket\'s volume? New uploads will use the new volume, but existing objects will remain on their current volumes.',
            onConfirm: () => updateVolumeMutation.mutate(parseInt(selectedVolumeId)),
            variant: 'default',
        });
    };

    const handleRegenerateKeys = () => {
        setConfirmDialog({
            isOpen: true,
            title: 'Regenerate Access Keys',
            description: 'Are you sure you want to regenerate access keys? The old keys will stop working immediately.',
            onConfirm: () => regenerateKeysMutation.mutate(),
            variant: 'destructive',
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add a toast here
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const currentVolume = volumes?.find(v => v.id === bucket?.volumeId);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/dashboard/buckets/${bucketName}`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Bucket Settings</h1>
                    <p className="text-muted-foreground">{bucketName}</p>
                </div>
            </div>

            {/* API Credentials */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        API Credentials
                    </CardTitle>
                    <CardDescription>
                        Access keys for this specific bucket
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Access Key ID</Label>
                        <div className="flex items-center gap-2">
                            <Input value={keys?.accessKey || 'Loading...'} readOnly className="font-mono bg-muted" />
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(keys?.accessKey)}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Secret Access Key</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                value={keys?.secretKey || 'Loading...'}
                                type={showSecretKey ? 'text' : 'password'}
                                readOnly
                                className="font-mono bg-muted"
                            />
                            <Button variant="outline" size="icon" onClick={() => setShowSecretKey(!showSecretKey)}>
                                {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(keys?.secretKey)}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={handleRegenerateKeys}
                            disabled={regenerateKeysMutation.isPending}
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${regenerateKeysMutation.isPending ? 'animate-spin' : ''}`} />
                            Regenerate Keys
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Volume Assignment */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HardDrive className="h-5 w-5" />
                        Volume Assignment
                    </CardTitle>
                    <CardDescription>
                        Choose which volume new uploads should be stored on
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Current Volume</Label>
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                            <HardDrive className="h-4 w-4" />
                            <span className="font-medium">{currentVolume?.name || 'Loading...'}</span>
                            {currentVolume?.isDefault && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    Default
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newVolume">New Volume</Label>
                        <Select value={selectedVolumeId} onValueChange={setSelectedVolumeId}>
                            <SelectTrigger id="newVolume">
                                <SelectValue placeholder="Select a volume" />
                            </SelectTrigger>
                            <SelectContent>
                                {volumes?.map((vol) => (
                                    <SelectItem key={vol.id} value={vol.id.toString()}>
                                        {vol.name} {vol.isDefault && '(Default)'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                            <p className="font-medium">Important:</p>
                            <p>Changing the volume only affects new uploads. Existing objects will remain on their current volumes.</p>
                        </div>
                    </div>

                    <Button
                        onClick={handleUpdateVolume}
                        disabled={!selectedVolumeId || updateVolumeMutation.isPending}
                    >
                        {updateVolumeMutation.isPending ? 'Updating...' : 'Update Volume'}
                    </Button>
                </CardContent>
            </Card>

            {/* Object Distribution */}
            <Card>
                <CardHeader>
                    <CardTitle>Object Distribution</CardTitle>
                    <CardDescription>
                        See how your objects are distributed across volumes
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {distribution && distribution.distribution.length > 0 ? (
                        <div className="space-y-4">
                            {distribution.distribution.map((dist) => (
                                <div key={dist.volumeId} className="flex items-center justify-between p-3 border rounded-md">
                                    <div className="flex items-center gap-3">
                                        <HardDrive className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">{dist.volumeName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {dist.objectCount} objects • {formatBytes(Number(dist.totalSize))}
                                            </p>
                                        </div>
                                    </div>
                                    {dist.volumeId === bucket?.volumeId && (
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                            Current
                                        </span>
                                    )}
                                </div>
                            ))}

                            <div className="pt-4 border-t">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">Total</span>
                                    <span>
                                        {distribution.summary.totalObjects} objects • {formatBytes(distribution.summary.totalSize)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                                    <span>Volumes Used</span>
                                    <span>{distribution.summary.volumeCount}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No objects in this bucket yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Versioning Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Bucket Versioning
                    </CardTitle>
                    <CardDescription>
                        Keep multiple variants of an object in the same bucket
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="versioning"
                            checked={versioningEnabled}
                            onCheckedChange={(checked) => handleUpdateVersioning(checked as boolean)}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="versioning">Enable Versioning</Label>
                            <p className="text-sm text-muted-foreground">
                                {versioningEnabled
                                    ? 'Versioning is currently enabled for this bucket.'
                                    : 'Versioning is currently suspended for this bucket.'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Event Notifications */}
            <EventNotifications bucketName={bucketName} />

            {/* Encryption Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Server-Side Encryption
                    </CardTitle>
                    <CardDescription>
                        Configure default encryption for new objects
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="encryption"
                            checked={encryptionEnabled}
                            onCheckedChange={(checked) => setEncryptionEnabled(checked as boolean)}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="encryption">Enable Encryption</Label>
                            <p className="text-sm text-muted-foreground">
                                Automatically encrypt new objects uploaded to this bucket
                            </p>
                        </div>
                    </div>

                    {encryptionEnabled && (
                        <div className="space-y-2 pl-6">
                            <Label>Encryption Type</Label>
                            <Select value={encryptionType} onValueChange={setEncryptionType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SSE-S3">SSE-S3 (AES-256)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                SSE-S3 uses keys managed by the system.
                            </p>
                        </div>
                    )}

                    <Button
                        onClick={handleUpdateEncryption}
                        disabled={updateEncryptionMutation.isPending}
                    >
                        {updateEncryptionMutation.isPending ? 'Updating...' : 'Save Changes'}
                    </Button>
                </CardContent>
            </Card>

            {/* Key Management */}
            <KeyManagement
                bucketName={bucketName}
                currentKeyId={bucket?.encryptionKeyId}
                encryptionEnabled={bucket?.encryptionEnabled || false}
            />

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
                isLoading={updateVolumeMutation.isPending || regenerateKeysMutation.isPending || updateEncryptionMutation.isPending || updateVersioningMutation.isPending}
            />
        </div>
    );
}
