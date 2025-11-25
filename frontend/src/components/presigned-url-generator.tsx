'use client';

import { useState } from 'react';
import { AxiosError } from 'axios';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Copy, Check, Link as LinkIcon, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface PresignedUrlGeneratorProps {
    bucketName: string;
    objectKey: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PresignedUrlGenerator({
    bucketName,
    objectKey,
    open,
    onOpenChange
}: PresignedUrlGeneratorProps) {
    const { toast } = useToast();
    const [operation, setOperation] = useState<'GET' | 'PUT' | 'DELETE'>('GET');
    const [expiresIn, setExpiresIn] = useState('3600'); // 1 hour default
    const [generatedUrl, setGeneratedUrl] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const expirationOptions = [
        { label: '5 minutes', value: '300' },
        { label: '15 minutes', value: '900' },
        { label: '1 hour', value: '3600' },
        { label: '6 hours', value: '21600' },
        { label: '12 hours', value: '43200' },
        { label: '1 day', value: '86400' },
        { label: '7 days', value: '604800' },
    ];

    const generateUrl = async () => {
        setIsGenerating(true);
        try {
            const response = await api.post('/presigned-url', {
                bucket: bucketName,
                key: objectKey,
                operation,
                expiresIn: parseInt(expiresIn)
            });

            setGeneratedUrl(response.data.url);
            setExpiresAt(response.data.expiresAt);

            toast({
                title: 'Pre-signed URL generated',
                description: `URL will expire in ${getExpirationLabel(expiresIn)}`,
            });
        } catch (error) {
            let errorMessage = 'An error occurred';
            if (error instanceof AxiosError && error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            toast({
                title: 'Failed to generate URL',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);

        toast({
            title: 'Copied to clipboard',
            description: 'Pre-signed URL has been copied',
        });
    };

    const getExpirationLabel = (seconds: string) => {
        const option = expirationOptions.find(opt => opt.value === seconds);
        return option?.label || `${seconds} seconds`;
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            // Reset state when closing
            setGeneratedUrl('');
            setExpiresAt('');
            setOperation('GET');
            setExpiresIn('3600');
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Generate Pre-Signed URL</DialogTitle>
                    <DialogDescription>
                        Create a temporary URL for secure access to this object
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Object Info */}
                    <div className="bg-slate-50 rounded-lg p-4">
                        <div className="text-sm">
                            <span className="font-medium">Object:</span>{' '}
                            <span className="text-muted-foreground">{objectKey}</span>
                        </div>
                        <div className="text-sm mt-1">
                            <span className="font-medium">Bucket:</span>{' '}
                            <span className="text-muted-foreground">{bucketName}</span>
                        </div>
                    </div>

                    {/* Configuration */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="operation">Operation</Label>
                            <Select value={operation} onValueChange={(value: 'GET' | 'PUT' | 'DELETE') => setOperation(value)}>
                                <SelectTrigger id="operation">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GET">GET (Download)</SelectItem>
                                    <SelectItem value="PUT">PUT (Upload)</SelectItem>
                                    <SelectItem value="DELETE">DELETE (Remove)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="expires">Expires In</Label>
                            <Select value={expiresIn} onValueChange={setExpiresIn}>
                                <SelectTrigger id="expires">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {expirationOptions.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            onClick={generateUrl}
                            disabled={isGenerating}
                            className="w-full"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <LinkIcon className="mr-2 h-4 w-4" />
                                    Generate URL
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Generated URL */}
                    {generatedUrl && (
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label>Generated URL</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={generatedUrl}
                                        readOnly
                                        className="font-mono text-xs"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={copyToClipboard}
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <p className="text-sm text-amber-800">
                                    <span className="font-medium">Expires:</span>{' '}
                                    {new Date(expiresAt).toLocaleString()}
                                </p>
                                <p className="text-xs text-amber-700 mt-1">
                                    This URL will be valid for {getExpirationLabel(expiresIn)}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
