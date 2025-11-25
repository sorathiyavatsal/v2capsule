'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { File, Upload, ArrowLeft, Download, Trash2, CheckCircle, AlertCircle, Folder, FolderPlus, ChevronRight, Eye, Settings, Info, Link as LinkIcon, Copy, Shield, Globe } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { CustomConfirmDialog } from '@/components/custom-confirm-dialog';
import { ObjectMetadataViewer } from '@/components/object-metadata-viewer';
import { PresignedUrlGenerator } from '@/components/presigned-url-generator';
import { UniversalUploader } from '@/components/universal-uploader';
import { CopyObjectDialog } from '@/components/copy-object-dialog';

// Breadcrumb component
const Breadcrumb = ({ path, onNavigate }: { path: string; onNavigate: (path: string) => void }) => {
    const parts = path.split('/').filter(Boolean);

    return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-slate-100 p-2 rounded-md">
            <Button variant="ghost" size="sm" className="h-auto p-1" onClick={() => onNavigate('')}>
                root
            </Button>
            {parts.map((part, index, arr) => (
                <div key={index} className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1"
                        onClick={() => {
                            const newPath = arr.slice(0, index + 1).join('/');
                            onNavigate(newPath);
                        }}
                    >
                        {part}
                    </Button>
                </div>
            ))}
        </div>
    );
};

export default function BucketDetailsPage() {
    const params = useParams();
    const bucketName = params.name as string;
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State
    const [currentPath, setCurrentPath] = useState('');
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
    const [currentUploadIndex, setCurrentUploadIndex] = useState(0);

    const [newFolderOpen, setNewFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const [previewOpen, setPreviewOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [previewItem, setPreviewItem] = useState<any>(null);

    const [metadataOpen, setMetadataOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [metadataItem, setMetadataItem] = useState<any>(null);

    const [presignedUrlOpen, setPresignedUrlOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [presignedUrlItem, setPresignedUrlItem] = useState<any>(null);
    const [multipartUploadOpen, setMultipartUploadOpen] = useState(false);
    const [copyDialogOpen, setCopyDialogOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [copyItem, setCopyItem] = useState<any>(null);



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
    const { data: objects, isLoading, error } = useQuery({
        queryKey: ['objects', bucketName, currentPath],
        queryFn: async () => {
            const res = await api.get(`/buckets/${bucketName}/objects`, {
                params: { path: currentPath }
            });
            return res.data.objects;
        },
    });

    // Stats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalSize = objects?.reduce((acc: number, obj: any) => acc + (obj.size || 0), 0) || 0;
    const objectCount = objects?.length || 0;

    // Mutations
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const key = currentPath ? `${currentPath}/${file.name}` : file.name;

            await api.put(`/${bucketName}/${key}`, file, {
                headers: {
                    'Content-Type': file.type,
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    setUploadProgress(percentCompleted);
                },
            });
        },
    });

    const createFolderMutation = useMutation({
        mutationFn: async (name: string) => {
            const folderPath = currentPath ? `${currentPath}/${name}` : name;
            await api.post(`/buckets/${bucketName}/folder`, { path: folderPath });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['objects', bucketName, currentPath] });
            setNewFolderOpen(false);
            setNewFolderName('');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to create folder');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (key: string) => {
            await api.delete(`/${bucketName}/${key}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['objects', bucketName, currentPath] });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to delete item');
        },
    });

    // Handlers
    const resetUploadState = () => {
        setUploadStatus('idle');
        setUploadProgress(0);
        setErrorMessage('');
        setSelectedFiles(null);
        setCurrentUploadIndex(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFiles(e.target.files);
            setUploadStatus('idle');
            setErrorMessage('');
        }
    };

    const handleUpload = async () => {
        if (!selectedFiles || selectedFiles.length === 0) return;

        setUploadStatus('uploading');
        setUploadProgress(0);
        setErrorMessage('');

        for (let i = 0; i < selectedFiles.length; i++) {
            setCurrentUploadIndex(i);
            try {
                await uploadMutation.mutateAsync(selectedFiles[i]);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                setUploadStatus('error');
                setErrorMessage(`Failed to upload ${selectedFiles[i].name}: ${err.response?.data?.error || err.message}`);
                return;
            }
        }

        queryClient.invalidateQueries({ queryKey: ['objects', bucketName, currentPath] });
        setUploadStatus('success');
        setTimeout(() => {
            setUploadOpen(false);
            resetUploadState();
        }, 1500);
    };

    const handleCreateFolder = () => {
        if (newFolderName) {
            createFolderMutation.mutate(newFolderName);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDelete = (obj: any) => {
        const key = obj.path || (currentPath ? `${currentPath}/${obj.name}` : obj.name);
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Item',
            description: `Are you sure you want to delete ${obj.name}? This action cannot be undone.`,
            onConfirm: () => deleteMutation.mutate(key),
            variant: 'destructive',
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlePreview = (obj: any) => {
        const key = obj.path || (currentPath ? `${currentPath}/${obj.name}` : obj.name);
        const url = `${process.env.NEXT_PUBLIC_API_URL}/${bucketName}/${key}`;

        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(obj.name);
        const isText = /\.(txt|md|json|js|ts|css|html)$/i.test(obj.name);
        const isPdf = /\.pdf$/i.test(obj.name);

        if (isImage || isText || isPdf) {
            setPreviewItem({ ...obj, url, type: isImage ? 'image' : isText ? 'text' : 'pdf' });
            setPreviewOpen(true);
        } else {
            window.open(url, '_blank');
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (isLoading) return <div>Loading objects...</div>;
    if (error) return <div>Error loading objects</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/buckets">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">{bucketName}</h1>
                        <Breadcrumb path={currentPath} onNavigate={setCurrentPath} />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href={`/dashboard/buckets/${bucketName}/cors`}>
                        <Button variant="outline">
                            <Globe className="mr-2 h-4 w-4" />
                            CORS
                        </Button>
                    </Link>
                    <Link href={`/dashboard/buckets/${bucketName}/policy`}>
                        <Button variant="outline">
                            <Shield className="mr-2 h-4 w-4" />
                            Policy
                        </Button>
                    </Link>
                    <Link href={`/dashboard/buckets/${bucketName}/settings`}>
                        <Button variant="outline">
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Size</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatSize(totalSize)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Object Count</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{objectCount}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions & List */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Objects</CardTitle>
                    <div className="flex gap-2">
                        <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <FolderPlus className="mr-2 h-4 w-4" />
                                    New Folder
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create New Folder</DialogTitle>
                                </DialogHeader>
                                <div className="py-4">
                                    <Input
                                        placeholder="Folder Name"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleCreateFolder} disabled={createFolderMutation.isPending}>
                                        {createFolderMutation.isPending ? 'Creating...' : 'Create'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={uploadOpen} onOpenChange={(open) => {
                            if (!open && uploadStatus === 'uploading') return;
                            setUploadOpen(open);
                            if (!open) resetUploadState();
                        }}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload File
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Upload File</DialogTitle>
                                    <DialogDescription>
                                        Upload to <strong>{currentPath ? `${bucketName}/${currentPath}` : bucketName}</strong>
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 py-4">
                                    {uploadStatus === 'idle' && (
                                        <div className="grid w-full max-w-sm items-center gap-1.5">
                                            <input
                                                type="file"
                                                multiple
                                                ref={fileInputRef}
                                                onChange={handleFileSelect}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            />
                                            {selectedFiles && selectedFiles.length > 0 && (
                                                <p className="text-sm text-muted-foreground">{selectedFiles.length} file(s) selected</p>
                                            )}
                                        </div>
                                    )}

                                    {uploadStatus === 'uploading' && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>Uploading {selectedFiles?.[currentUploadIndex]?.name} ({currentUploadIndex + 1}/{selectedFiles?.length})...</span>
                                                <span>{uploadProgress}%</span>
                                            </div>
                                            <Progress value={uploadProgress} className="h-2" />
                                        </div>
                                    )}

                                    {uploadStatus === 'success' && (
                                        <div className="flex flex-col items-center justify-center text-green-600 gap-2 py-4">
                                            <CheckCircle className="h-12 w-12" />
                                            <p className="font-medium">All Files Uploaded!</p>
                                        </div>
                                    )}

                                    {uploadStatus === 'error' && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
                                                <AlertCircle className="h-5 w-5" />
                                                <p className="text-sm font-medium">{errorMessage}</p>
                                            </div>
                                            <Button variant="outline" onClick={resetUploadState} className="w-full">
                                                Try Again
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {uploadStatus === 'idle' && (
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" onClick={() => setUploadOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button onClick={handleUpload} disabled={!selectedFiles || selectedFiles.length === 0}>
                                            Upload {selectedFiles && selectedFiles.length > 1 ? `(${selectedFiles.length})` : ''}
                                        </Button>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {objects?.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            {currentPath ? 'Folder is empty.' : 'No objects in this bucket.'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {objects?.map((obj: any) => (
                                <div
                                    key={obj.name}
                                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                                >
                                    <div
                                        className="flex items-center gap-3 flex-1 cursor-pointer"
                                        onClick={() => {
                                            if (obj.isDirectory) {
                                                setCurrentPath(currentPath ? `${currentPath}/${obj.name}` : obj.name);
                                            } else {
                                                handlePreview(obj);
                                            }
                                        }}
                                    >
                                        {obj.isDirectory ? (
                                            <Folder className="h-8 w-8 text-yellow-500" />
                                        ) : (
                                            <File className="h-8 w-8 text-blue-500" />
                                        )}
                                        <div>
                                            <div className="font-medium">{obj.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {obj.isDirectory ? 'Folder' : `${formatSize(obj.size)} • ${new Date(obj.lastModified).toLocaleString()}`}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!obj.isDirectory && (
                                            <Button variant="ghost" size="icon" onClick={() => handlePreview(obj)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {!obj.isDirectory && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setCopyItem(obj);
                                                    setCopyDialogOpen(true);
                                                }}
                                                title="Copy Object"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {!obj.isDirectory && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setMetadataItem(obj);
                                                    setMetadataOpen(true);
                                                }}
                                                title="View Metadata"
                                            >
                                                <Info className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {!obj.isDirectory && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setPresignedUrlItem(obj);
                                                    setPresignedUrlOpen(true);
                                                }}
                                                title="Generate Pre-Signed URL"
                                            >
                                                <LinkIcon className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" asChild>
                                            <a
                                                href={`${process.env.NEXT_PUBLIC_API_URL}/${bucketName}/${obj.path || (currentPath ? `${currentPath}/${obj.name}` : obj.name)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                download
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Download className="h-4 w-4" />
                                            </a>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(obj)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Preview Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{previewItem?.name}</DialogTitle>
                    </DialogHeader>
                    {previewItem?.type === 'image' && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewItem.url} alt={previewItem.name} className="max-w-full h-auto" />
                    )}
                    {previewItem?.type === 'pdf' && (
                        <iframe src={previewItem.url} className="w-full h-[600px]" />
                    )}
                    {previewItem?.type === 'text' && (
                        <iframe src={previewItem.url} className="w-full h-[600px] border rounded" />
                    )}
                </DialogContent>
            </Dialog>

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

            {/* Universal Uploader - handles both small and large files automatically */}
            <Dialog open={multipartUploadOpen} onOpenChange={setMultipartUploadOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Files</DialogTitle>
                        <DialogDescription>
                            Automatically optimizes upload based on file size. Large files use parallel multipart upload.
                        </DialogDescription>
                    </DialogHeader>
                    <UniversalUploader
                        bucketName={bucketName}
                        onUploadComplete={() => {
                            setMultipartUploadOpen(false);
                            queryClient.invalidateQueries({ queryKey: ['objects', bucketName, currentPath] });
                        }}
                    />
                </DialogContent>
            </Dialog>

            {metadataItem && (
                <ObjectMetadataViewer
                    bucketName={bucketName}
                    objectKey={metadataItem.path || (currentPath ? `${currentPath}/${metadataItem.name}` : metadataItem.name)}
                    metadata={{
                        key: metadataItem.name,
                        size: metadataItem.size,
                        lastModified: metadataItem.lastModified,
                        contentType: metadataItem.contentType || 'application/octet-stream',
                        etag: metadataItem.etag || '-',
                        versionId: metadataItem.versionId,
                        customMetadata: metadataItem.customMetadata,
                        encryption: metadataItem.encryption
                    }}
                    open={metadataOpen}
                    onOpenChange={setMetadataOpen}
                />
            )}

            {presignedUrlItem && (
                <PresignedUrlGenerator
                    bucketName={bucketName}
                    objectKey={presignedUrlItem.path || (currentPath ? `${currentPath}/${presignedUrlItem.name}` : presignedUrlItem.name)}
                    open={presignedUrlOpen}
                    onOpenChange={setPresignedUrlOpen}
                />
            )}

            {copyItem && (
                <CopyObjectDialog
                    open={copyDialogOpen}
                    onOpenChange={setCopyDialogOpen}
                    sourceBucket={bucketName}
                    sourceKey={currentPath ? `${currentPath}/${copyItem.name}` : copyItem.name}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['objects', bucketName] });
                    }}
                />
            )}
        </div>
    );
}
