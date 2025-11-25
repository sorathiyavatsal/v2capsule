'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import DocsCodeBlock from '@/components/docs-codeblock';
import { useState } from 'react';

export default function PythonSdkPage() {
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
                        <CardTitle>boto3</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DocsCodeBlock
                            id="boto3-install"
                            language="bash"
                            code={`pip install boto3`}
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
                        <CardTitle>Python Example</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DocsCodeBlock
                            id="boto3-init"
                            language="python"
                            code={`import boto3

s3 = boto3.client(
    's3',
    endpoint_url='http://your-server-ip:3000',
    aws_access_key_id='YOUR_ACCESS_KEY',
    aws_secret_access_key='YOUR_SECRET_KEY',
    region_name='us-east-1'
)`}
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
                            id="boto3-upload"
                            language="python"
                            code={`# Upload from file
s3.upload_file('local-file.txt', 'my-bucket', 'remote-file.txt')

# Upload from bytes
s3.put_object(
    Bucket='my-bucket',
    Key='data.json',
    Body=b'{"key": "value"}'
)`}
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
                            id="boto3-download"
                            language="python"
                            code={`# Download to file
s3.download_file('my-bucket', 'remote-file.txt', 'local-file.txt')

# Get object content
response = s3.get_object(Bucket='my-bucket', Key='data.json')
content = response['Body'].read()`}
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
                            id="boto3-list"
                            language="python"
                            code={`response = s3.list_objects_v2(Bucket='my-bucket')

for obj in response.get('Contents', []):
    print(f"{obj['Key']} - {obj['Size']} bytes")`}
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
                            id="boto3-delete"
                            language="python"
                            code={`s3.delete_object(Bucket='my-bucket', Key='file-to-delete.txt')`}
                            copy={copy}
                            copied={copied}
                        />
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
