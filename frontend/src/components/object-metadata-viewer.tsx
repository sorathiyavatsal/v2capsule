'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface ObjectMetadata {
    key: string;
    size: number;
    lastModified: string;
    contentType: string;
    etag: string;
    versionId?: string;
    customMetadata?: Record<string, string>;
    encryption?: {
        algorithm: string;
    };
}

interface ObjectMetadataViewerProps {
    bucketName: string;
    objectKey: string;
    metadata: ObjectMetadata;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function MetadataRow({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex justify-between items-start py-2 border-b last:border-0">
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-sm text-right max-w-xs break-all">{value}</span>
                {copyable && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={handleCopy}
                    >
                        {copied ? (
                            <Check className="h-3 w-3 text-green-500" />
                        ) : (
                            <Copy className="h-3 w-3" />
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}

export function ObjectMetadataViewer({
    bucketName,
    objectKey,
    metadata,
    open,
    onOpenChange
}: ObjectMetadataViewerProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Object Metadata</DialogTitle>
                    <DialogDescription>
                        Detailed information about the object
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Basic Information */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Basic Information</h3>
                        <div className="bg-slate-50 rounded-lg p-4 space-y-1">
                            <MetadataRow label="Bucket" value={bucketName} copyable />
                            <MetadataRow label="Key" value={objectKey} copyable />
                            <MetadataRow label="Size" value={formatBytes(metadata.size)} />
                            <MetadataRow
                                label="Last Modified"
                                value={new Date(metadata.lastModified).toLocaleString()}
                            />
                        </div>
                    </div>

                    {/* Technical Details */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Technical Details</h3>
                        <div className="bg-slate-50 rounded-lg p-4 space-y-1">
                            <MetadataRow label="Content-Type" value={metadata.contentType} copyable />
                            <MetadataRow label="ETag" value={metadata.etag} copyable />
                            {metadata.versionId && (
                                <MetadataRow label="Version ID" value={metadata.versionId} copyable />
                            )}
                        </div>
                    </div>

                    {/* Encryption */}
                    {metadata.encryption && (
                        <div>
                            <h3 className="text-sm font-semibold mb-3">Encryption</h3>
                            <div className="bg-slate-50 rounded-lg p-4 space-y-1">
                                <MetadataRow
                                    label="Algorithm"
                                    value={metadata.encryption.algorithm}
                                />
                            </div>
                        </div>
                    )}

                    {/* Custom Metadata */}
                    {metadata.customMetadata && Object.keys(metadata.customMetadata).length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold mb-3">Custom Metadata</h3>
                            <div className="bg-slate-50 rounded-lg p-4 space-y-1">
                                {Object.entries(metadata.customMetadata).map(([key, value]) => (
                                    <MetadataRow
                                        key={key}
                                        label={key}
                                        value={value}
                                        copyable
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
