import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { Upload, X } from 'lucide-react';

interface UniversalUploaderProps {
    bucketName: string;
    onUploadComplete: () => void;
}

const MULTIPART_THRESHOLD = 10 * 1024 * 1024; // 10MB
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB per part
const MAX_CONCURRENCY = 4; // Parallel uploads
const MAX_RETRIES = 3; // Per part

interface PartUpload {
    partNumber: number;
    chunk: Blob;
    start: number;
    end: number;
}

interface UploadedPart {
    PartNumber: number;
    ETag: string;
}

export function UniversalUploader({ bucketName, onUploadComplete }: UniversalUploaderProps) {
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadId, setUploadId] = useState<string | null>(null);
    const [uploadMethod, setUploadMethod] = useState<'standard' | 'multipart' | null>(null);
    const completedBytes = useRef(0);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    // Standard upload for small files (< 10MB)
    const uploadStandard = async (file: File) => {
        try {
            await axios.put(
                `${process.env.NEXT_PUBLIC_API_URL}/${bucketName}/${file.name}`,
                file,
                {
                    headers: { 'Content-Type': file.type || 'application/octet-stream' },
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                            setProgress(percentCompleted);
                        }
                    }
                }
            );

            toast({
                title: "Upload Successful",
                description: `File ${file.name} uploaded successfully.`,
            });

            setFile(null);
            onUploadComplete();
        } catch (error) {
            console.error("Standard upload failed:", error);
            throw error;
        }
    };

    // Upload a single part with retry logic
    const uploadPartWithRetry = async (
        part: PartUpload,
        uploadId: string,
        fileName: string
    ): Promise<UploadedPart> => {
        let retries = MAX_RETRIES;
        let lastError: any;

        while (retries > 0) {
            try {
                const partRes = await axios.put(
                    `${process.env.NEXT_PUBLIC_API_URL}/${bucketName}/${fileName}?partNumber=${part.partNumber}&uploadId=${uploadId}`,
                    part.chunk,
                    {
                        headers: { 'Content-Type': 'application/octet-stream' }
                    }
                );

                // Update progress
                completedBytes.current += part.chunk.size;
                setProgress(Math.round((completedBytes.current / file!.size) * 100));

                return {
                    PartNumber: part.partNumber,
                    ETag: partRes.headers['etag']
                };
            } catch (err) {
                lastError = err;
                retries--;
                if (retries > 0) {
                    console.warn(`Part ${part.partNumber} failed, retrying... (${retries} attempts left)`);
                    // Exponential backoff: 1s, 2s, 4s
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, MAX_RETRIES - retries)));
                }
            }
        }

        throw lastError;
    };

    // Upload parts with concurrency control
    const uploadPartsWithConcurrency = async (
        parts: PartUpload[],
        uploadId: string,
        fileName: string
    ): Promise<UploadedPart[]> => {
        const results: UploadedPart[] = [];
        const executing: Promise<void>[] = [];

        for (const part of parts) {
            const promise = uploadPartWithRetry(part, uploadId, fileName)
                .then(result => {
                    results.push(result);
                })
                .catch(err => {
                    throw err;
                });

            executing.push(promise);

            // Limit concurrency
            if (executing.length >= MAX_CONCURRENCY) {
                await Promise.race(executing);
                // Remove completed promises
                const completedIndex = executing.findIndex(p => {
                    return Promise.race([p, Promise.resolve('check')]).then(v => v === 'check');
                });
                if (completedIndex !== -1) {
                    executing.splice(completedIndex, 1);
                }
            }
        }

        // Wait for all remaining uploads
        await Promise.all(executing);
        return results;
    };

    // Multipart upload for large files (>= 10MB)
    const uploadMultipart = async (file: File) => {
        try {
            // 1. Initiate multipart upload
            const initRes = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/${bucketName}/${file.name}?uploads`,
                {},
                { headers: { 'Content-Type': file.type || 'application/octet-stream' } }
            );

            // Parse XML to get UploadId
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(initRes.data, "text/xml");
            const newUploadId = xmlDoc.getElementsByTagName("UploadId")[0]?.textContent;

            if (!newUploadId) throw new Error("Failed to get UploadId");
            setUploadId(newUploadId);

            // 2. Prepare parts
            const totalParts = Math.ceil(file.size / CHUNK_SIZE);
            const parts: PartUpload[] = [];

            for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
                const start = (partNumber - 1) * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunk = file.slice(start, end);

                parts.push({
                    partNumber,
                    chunk,
                    start,
                    end
                });
            }

            // 3. Upload parts with concurrency
            completedBytes.current = 0;
            const uploadedParts = await uploadPartsWithConcurrency(parts, newUploadId, file.name);

            // Sort parts by part number
            uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber);

            // 4. Complete multipart upload
            let partsXml = '';
            uploadedParts.forEach(part => {
                partsXml += `<Part><PartNumber>${part.PartNumber}</PartNumber><ETag>${part.ETag}</ETag></Part>`;
            });
            const completeBody = `<CompleteMultipartUpload>${partsXml}</CompleteMultipartUpload>`;

            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/${bucketName}/${file.name}?uploadId=${newUploadId}`,
                completeBody,
                { headers: { 'Content-Type': 'application/xml' } }
            );

            toast({
                title: "Upload Successful",
                description: `File ${file.name} uploaded successfully (${totalParts} parts).`,
            });

            setFile(null);
            setUploadId(null);
            onUploadComplete();
        } catch (error) {
            console.error("Multipart upload failed:", error);
            throw error;
        }
    };

    // Main upload function - automatically chooses method
    const uploadFile = async () => {
        if (!file) return;

        setIsUploading(true);
        setProgress(0);
        completedBytes.current = 0;

        try {
            // Determine upload method based on file size
            if (file.size < MULTIPART_THRESHOLD) {
                setUploadMethod('standard');
                await uploadStandard(file);
            } else {
                setUploadMethod('multipart');
                await uploadMultipart(file);
            }
        } catch (error) {
            console.error("Upload failed:", error);
            const errorMessage = error instanceof Error ? error.message : "An error occurred during upload.";
            toast({
                title: "Upload Failed",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
            setUploadMethod(null);
        }
    };

    const abortUpload = async () => {
        if (!file) return;

        try {
            if (uploadId && uploadMethod === 'multipart') {
                await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/${bucketName}/${file.name}?uploadId=${uploadId}`);
            }
            toast({ title: "Upload Aborted" });
        } catch (e) {
            console.error("Abort failed", e);
        } finally {
            setIsUploading(false);
            setFile(null);
            setUploadId(null);
            setProgress(0);
            setUploadMethod(null);
            completedBytes.current = 0;
        }
    };

    return (
        <div className="p-4 border rounded-lg bg-white shadow-sm">
            <h3 className="text-lg font-medium mb-4">Upload Files</h3>

            {!isUploading && (
                <div className="flex items-center gap-4">
                    <input
                        type="file"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-violet-50 file:text-violet-700
                            hover:file:bg-violet-100
                        "
                    />
                    <Button onClick={uploadFile} disabled={!file}>
                        <Upload className="w-4 h-4 mr-2" /> Upload
                    </Button>
                </div>
            )}

            {file && !isUploading && (
                <div className="mt-2 text-sm text-slate-600">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    {file.size >= MULTIPART_THRESHOLD && (
                        <span className="ml-2 text-violet-600">
                            • Will use parallel multipart upload
                        </span>
                    )}
                </div>
            )}

            {isUploading && (
                <div className="space-y-4">
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>
                            Uploading {file?.name}...
                            {uploadMethod === 'multipart' && (
                                <span className="ml-2 text-violet-600">
                                    ({Math.ceil(file!.size / CHUNK_SIZE)} parts, {MAX_CONCURRENCY} concurrent)
                                </span>
                            )}
                        </span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                    <Button variant="destructive" size="sm" onClick={abortUpload}>
                        <X className="w-4 h-4 mr-2" /> Cancel Upload
                    </Button>
                </div>
            )}
        </div>
    );
}
