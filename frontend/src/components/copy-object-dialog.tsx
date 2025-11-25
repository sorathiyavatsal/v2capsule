import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { AxiosError } from 'axios';

interface CopyObjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sourceBucket: string;
    sourceKey: string;
    onSuccess?: () => void;
}

interface Bucket {
    id: number;
    name: string;
}

export function CopyObjectDialog({ open, onOpenChange, sourceBucket, sourceKey, onSuccess }: CopyObjectDialogProps) {
    const [destBucket, setDestBucket] = useState(sourceBucket);
    const [destKey, setDestKey] = useState(sourceKey);
    const [buckets, setBuckets] = useState<Bucket[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            setDestBucket(sourceBucket);
            setDestKey(sourceKey);
            fetchBuckets();
        }
    }, [open, sourceBucket, sourceKey]);

    const fetchBuckets = async () => {
        try {
            const res = await api.get('/buckets');
            setBuckets(res.data);
        } catch (error) {
            console.error('Failed to fetch buckets', error);
        }
    };

    const handleCopy = async () => {
        setLoading(true);
        try {
            await api.put(`/${destBucket}/${destKey}`, null, {
                headers: {
                    'x-amz-copy-source': `/${sourceBucket}/${sourceKey}`,
                    'x-amz-metadata-directive': 'COPY'
                }
            });
            toast({ title: 'Object copied successfully' });
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            let errorMessage = 'Copy failed';
            if (error instanceof AxiosError && error.response?.data) {
                // Try to parse XML error if possible, or just use text
                // The backend returns XML for S3 routes.
                // We might need to parse it, or just show generic error.
                // For now, let's assume the backend might return JSON for some errors or we just show generic.
                // Actually, our backend returns XML for S3 routes.
                errorMessage = `Error: ${error.response.status} ${error.response.statusText}`;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            toast({
                title: 'Copy failed',
                description: errorMessage,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Copy Object</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Source</Label>
                        <div className="text-sm text-muted-foreground">{sourceBucket}/{sourceKey}</div>
                    </div>
                    <div className="grid gap-2">
                        <Label>Destination Bucket</Label>
                        <Select value={destBucket} onValueChange={setDestBucket}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select bucket" />
                            </SelectTrigger>
                            <SelectContent>
                                {buckets.map((b) => (
                                    <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Destination Key</Label>
                        <Input value={destKey} onChange={(e) => setDestKey(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleCopy} disabled={loading}>
                        {loading ? 'Copying...' : 'Copy'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
