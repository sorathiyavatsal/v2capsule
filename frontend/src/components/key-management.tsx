import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, RefreshCw, Copy, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface KeyManagementProps {
    bucketName: string;
    currentKeyId?: string;
    encryptionEnabled: boolean;
}

export function KeyManagement({ bucketName, currentKeyId, encryptionEnabled }: KeyManagementProps) {
    const queryClient = useQueryClient();
    const [showKey, setShowKey] = useState(false);
    const [newKey, setNewKey] = useState('');

    const generateKeyMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post(`/buckets/${bucketName}/encryption/generate-key`);
            return res.data;
        },
        onSuccess: (data) => {
            setNewKey(data.key);
            queryClient.invalidateQueries({ queryKey: ['bucket', bucketName] });
            alert('New encryption key generated successfully');
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { error?: string } } };
            alert(error.response?.data?.error || 'Failed to generate key');
        },
    });

    const rotateKeyMutation = useMutation({
        mutationFn: async () => {
            await api.post(`/buckets/${bucketName}/encryption/rotate-key`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bucket', bucketName] });
            alert('Encryption key rotated successfully');
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { error?: string } } };
            alert(error.response?.data?.error || 'Failed to rotate key');
        },
    });

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard');
    };

    if (!encryptionEnabled) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        Encryption Key Management
                    </CardTitle>
                    <CardDescription>
                        Encryption is not enabled for this bucket
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Enable encryption in bucket settings to manage encryption keys.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Encryption Key Management
                </CardTitle>
                <CardDescription>
                    Manage encryption keys for server-side encryption (SSE-S3)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Current Key Info */}
                <div className="space-y-2">
                    <Label>Current Key ID</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            value={currentKeyId || 'No key configured'}
                            readOnly
                            className="font-mono text-sm"
                        />
                        <Badge variant={currentKeyId ? 'default' : 'secondary'}>
                            {currentKeyId ? 'Active' : 'Not Set'}
                        </Badge>
                    </div>
                </div>

                {/* Generate New Key */}
                <div className="space-y-2">
                    <Label>Generate New Key</Label>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => generateKeyMutation.mutate()}
                            disabled={generateKeyMutation.isPending}
                        >
                            <Key className="h-4 w-4 mr-2" />
                            Generate Key
                        </Button>
                    </div>
                    {newKey && (
                        <div className="mt-2 space-y-2">
                            <Label>New Key (Save this securely!)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={newKey}
                                    type={showKey ? 'text' : 'password'}
                                    readOnly
                                    className="font-mono text-sm"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowKey(!showKey)}
                                >
                                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => copyToClipboard(newKey)}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                This key will only be shown once. Make sure to save it securely.
                            </p>
                        </div>
                    )}
                </div>

                {/* Rotate Key */}
                <div className="space-y-2">
                    <Label>Rotate Encryption Key</Label>
                    <p className="text-sm text-muted-foreground">
                        Rotate the encryption key to re-encrypt all objects with a new key.
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => {
                            if (confirm('Are you sure you want to rotate the encryption key? This will re-encrypt all objects.')) {
                                rotateKeyMutation.mutate();
                            }
                        }}
                        disabled={rotateKeyMutation.isPending || !currentKeyId}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Rotate Key
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
