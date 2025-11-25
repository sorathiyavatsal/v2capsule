import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bell, Trash2, Play, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Webhook {
    id: number;
    bucketId: number;
    eventType: string;
    webhookUrl: string;
    isActive: boolean;
    createdAt: string;
}

interface EventNotificationsProps {
    bucketName: string;
}

const EVENT_TYPES = [
    { value: 's3:ObjectCreated:*', label: 'All Object Create Events' },
    { value: 's3:ObjectCreated:Put', label: 'Object Put' },
    { value: 's3:ObjectCreated:Copy', label: 'Object Copy' },
    { value: 's3:ObjectCreated:CompleteMultipartUpload', label: 'Multipart Upload Complete' },
    { value: 's3:ObjectRemoved:*', label: 'All Object Remove Events' },
    { value: 's3:ObjectRemoved:Delete', label: 'Object Delete' },
    { value: 's3:ObjectRemoved:DeleteMarkerCreated', label: 'Delete Marker Created' },
];

export function EventNotifications({ bucketName }: EventNotificationsProps) {
    const queryClient = useQueryClient();
    const [newWebhookUrl, setNewWebhookUrl] = useState('');
    const [newEventType, setNewEventType] = useState('s3:ObjectCreated:*');
    const [isTesting, setIsTesting] = useState<number | null>(null);

    const { data: webhooks, isLoading } = useQuery<Webhook[]>({
        queryKey: ['webhooks', bucketName],
        queryFn: async () => {
            const res = await api.get(`/buckets/${bucketName}/notifications`);
            return res.data;
        },
    });

    const createWebhookMutation = useMutation({
        mutationFn: async (data: { eventType: string; webhookUrl: string }) => {
            await api.post(`/buckets/${bucketName}/notifications`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webhooks', bucketName] });
            setNewWebhookUrl('');
            alert('Webhook registered successfully');
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { error?: string } } };
            alert(error.response?.data?.error || 'Failed to register webhook');
        },
    });

    const deleteWebhookMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/buckets/${bucketName}/notifications/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webhooks', bucketName] });
        },
    });

    const testWebhookMutation = useMutation({
        mutationFn: async (webhookUrl: string) => {
            await api.post(`/buckets/${bucketName}/notifications/test`, { webhookUrl });
        },
        onSuccess: () => {
            alert('Test event sent successfully');
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { error?: string } } };
            alert(error.response?.data?.error || 'Failed to send test event');
        },
    });

    const handleAddWebhook = () => {
        if (!newWebhookUrl) {
            alert('Please enter a webhook URL');
            return;
        }
        createWebhookMutation.mutate({ eventType: newEventType, webhookUrl: newWebhookUrl });
    };

    const handleTestWebhook = async (id: number, url: string) => {
        setIsTesting(id);
        try {
            await testWebhookMutation.mutateAsync(url);
        } finally {
            setIsTesting(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Event Notifications
                </CardTitle>
                <CardDescription>
                    Configure webhooks to receive real-time notifications for bucket events
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Add New Webhook */}
                <div className="grid gap-4 p-4 border rounded-lg bg-muted/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Event Type</Label>
                            <Select value={newEventType} onValueChange={setNewEventType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {EVENT_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Webhook URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="https://api.example.com/webhook"
                                    value={newWebhookUrl}
                                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                                />
                                <Button
                                    onClick={handleAddWebhook}
                                    disabled={createWebhookMutation.isPending}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Webhooks List */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Event Type</TableHead>
                                <TableHead>Webhook URL</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-4">
                                        Loading webhooks...
                                    </TableCell>
                                </TableRow>
                            ) : webhooks?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                        No webhooks configured
                                    </TableCell>
                                </TableRow>
                            ) : (
                                webhooks?.map((webhook) => (
                                    <TableRow key={webhook.id}>
                                        <TableCell>
                                            <Badge variant="outline">{webhook.eventType}</Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm truncate max-w-[300px]" title={webhook.webhookUrl}>
                                            {webhook.webhookUrl}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                                                {webhook.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleTestWebhook(webhook.id, webhook.webhookUrl)}
                                                    disabled={isTesting === webhook.id}
                                                    title="Test Webhook"
                                                >
                                                    <Play className={`h-4 w-4 ${isTesting === webhook.id ? 'animate-pulse text-blue-500' : ''}`} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => {
                                                        if (confirm('Are you sure you want to delete this webhook?')) {
                                                            deleteWebhookMutation.mutate(webhook.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
