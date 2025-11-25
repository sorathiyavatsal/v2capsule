'use client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import DocsCodeBlock from '@/components/docs-codeblock';
import { useState } from 'react';

export default function JavascriptSdkPage() {
    const [copied, setCopied] = useState<string | null>(null);
    const copy = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="space-y-12">
            {/* Installation */}
            <section>
                <h2 className="text-3xl font-bold mb-4">Installation</h2>
                <Card>
                    <CardHeader>
                        <CardTitle>@aws-sdk/client-s3</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DocsCodeBlock
                            id="aws-sdk-install"
                            language="bash"
                            code={`npm install @aws-sdk/client-s3`}
                            copy={copy}
                            copied={copied}
                        />
                    </CardContent>
                </Card>
            </section>

            {/* Initialization */}
            <section>
                <h2 className="text-3xl font-bold mb-4">Initialize Client</h2>
                <Card>
                    <CardHeader>
                        <CardTitle>JavaScript Example</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DocsCodeBlock
                            id="aws-sdk-init"
                            language="javascript"
                            code={`import { S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  endpoint: "http://your-server-ip:3000",
  region: "us-east-1",
  credentials: {
    accessKeyId: "YOUR_ACCESS_KEY",
    secretAccessKey: "YOUR_SECRET_KEY",
  },
  forcePathStyle: true, // Required for V2 Capsule
});`}
                            copy={copy}
                            copied={copied}
                        />
                    </CardContent>
                </Card>
            </section>

            {/* Operations */}
            <section>
                <h2 className="text-3xl font-bold mb-4">Common Operations</h2>
                <Card>
                    <CardHeader>
                        <CardTitle>Upload a File</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DocsCodeBlock
                            id="aws-sdk-upload"
                            language="javascript"
                            code={`import { PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";

const fileContent = fs.readFileSync("myfile.txt");

const command = new PutObjectCommand({
  Bucket: "my-bucket",
  Key: "myfile.txt",
  Body: fileContent,
});

await s3Client.send(command);`}
                            copy={copy}
                            copied={copied}
                        />
                    </CardContent>
                </Card>
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Download a File</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DocsCodeBlock
                            id="aws-sdk-download"
                            language="javascript"
                            code={`import { GetObjectCommand } from "@aws-sdk/client-s3";

const command = new GetObjectCommand({
  Bucket: "my-bucket",
  Key: "myfile.txt",
});

const response = await s3Client.send(command);
const content = await response.Body.transformToString();`}
                            copy={copy}
                            copied={copied}
                        />
                    </CardContent>
                </Card>
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>List Objects</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DocsCodeBlock
                            id="aws-sdk-list"
                            language="javascript"
                            code={`import { ListObjectsV2Command } from "@aws-sdk/client-s3";

const command = new ListObjectsV2Command({
  Bucket: "my-bucket",
});

const response = await s3Client.send(command);
response.Contents.forEach((obj) => {
  console.log(obj.Key - obj.Size bytes);
});`}
                            copy={copy}
                            copied={copied}
                        />
                    </CardContent>
                </Card>
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Delete a File</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DocsCodeBlock
                            id="aws-sdk-delete"
                            language="javascript"
                            code={`import { DeleteObjectCommand } from "@aws-sdk/client-s3";

const command = new DeleteObjectCommand({
  Bucket: "my-bucket",
  Key: "myfile.txt",
});

await s3Client.send(command);`}
                            copy={copy}
                            copied={copied}
                        />
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
