import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { Upload, X } from 'lucide-react';

interface MultipartUploaderProps {
    bucketName: string;
    onUploadComplete: () => void;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export function MultipartUploader({ bucketName, onUploadComplete }: MultipartUploaderProps) {
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadId, setUploadId] = useState<string | null>(null);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const uploadFile = async () => {
        if (!file) return;

        setIsUploading(true);
        setProgress(0);

        try {
            // 1. Initiate
            const initRes = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/${bucketName}/${file.name}?uploads`,
                {},
                { headers: { 'Content-Type': file.type } }
            );

            // Parse XML to get UploadId
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(initRes.data, "text/xml");
            const newUploadId = xmlDoc.getElementsByTagName("UploadId")[0]?.textContent;

            if (!newUploadId) throw new Error("Failed to get UploadId");
            setUploadId(newUploadId);

            // 2. Upload Parts
            const totalParts = Math.ceil(file.size / CHUNK_SIZE);
            const parts: { PartNumber: number; ETag: string }[] = [];

            for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
                const start = (partNumber - 1) * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunk = file.slice(start, end);

                let retries = 3;
                let uploaded = false;

                while (retries > 0 && !uploaded) {
                    try {
                        const partRes = await axios.put(
                            `${process.env.NEXT_PUBLIC_API_URL}/${bucketName}/${file.name}?partNumber=${partNumber}&uploadId=${newUploadId}`,
                            chunk,
                            {
                                headers: { 'Content-Type': 'application/octet-stream' }
                            }
                        );

                        parts.push({
                            PartNumber: partNumber,
                            ETag: partRes.headers['etag']
                        });
                        uploaded = true;
                    } catch (err) {
                        console.warn(`Part ${partNumber} failed, retrying... (${retries} attempts left)`);
                        retries--;
                        if (retries === 0) throw err;
                        // Exponential backoff: 1s, 2s, 4s
                        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, 3 - retries)));
                    }
                }

                setProgress(Math.round((partNumber / totalParts) * 100));
            }

            // 3. Complete
            let partsXml = '';
            parts.forEach(part => {
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
                description: `File ${file.name} uploaded successfully.`,
            });

            setFile(null);
            setUploadId(null);
            onUploadComplete();

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
        }
    };

    const abortUpload = async () => {
        if (!uploadId || !file) return;
        try {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/${bucketName}/${file.name}?uploadId=${uploadId}`);
            toast({ title: "Upload Aborted" });
            setIsUploading(false);
            setFile(null);
            setUploadId(null);
            setProgress(0);
        } catch (e) {
            console.error("Abort failed", e);
        }
    };

    return (
        <div className="p-4 border rounded-lg bg-white shadow-sm">
            <h3 className="text-lg font-medium mb-4">Multipart Upload (Large Files)</h3>

            {!isUploading && (
                <div className="flex items-center gap-4">
                    <input type="file" onChange={handleFileChange} className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-violet-50 file:text-violet-700
                        hover:file:bg-violet-100
                    "/>
                    <Button onClick={uploadFile} disabled={!file}>
                        <Upload className="w-4 h-4 mr-2" /> Upload
                    </Button>
                </div>
            )}

            {isUploading && (
                <div className="space-y-4">
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>Uploading {file?.name}...</span>
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
