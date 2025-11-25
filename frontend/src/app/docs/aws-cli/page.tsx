'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import DocsCodeBlock from '@/components/docs-codeblock';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Terminal, Upload, Download, FolderPlus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function AwsCliPage() {
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
                        <CardTitle>AWS CLI</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DocsCodeBlock
                            id="aws-cli-install"
                            language="bash"
                            code={`# macOS/Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Windows (PowerShell)
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi`}
                            copy={copy}
                            copied={copied}
                        />
                    </CardContent>
                </Card>
            </section>

            {/* Configuration */}
            <section>
                <h2 className="text-3xl font-bold mb-4">Configure</h2>
                <Card>
                    <CardHeader>
                        <CardTitle>Configure Profile</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DocsCodeBlock
                            id="aws-configure"
                            language="bash"
                            code={`aws configure --profile v2capsule

# When prompted:
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region name: us-east-1
# Default output format: json`}
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
                            id="aws-upload"
                            language="bash"
                            code={`aws s3 cp myfile.txt s3://my-bucket/myfile.txt \\
  --endpoint-url http://your-server-ip:3000 \\
  --profile v2capsule`}
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
                            id="aws-download"
                            language="bash"
                            code={`aws s3 cp s3://my-bucket/myfile.txt ./myfile.txt \\
  --endpoint-url http://your-server-ip:3000 \\
  --profile v2capsule`}
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
                            id="aws-list"
                            language="bash"
                            code={`aws s3 ls s3://my-bucket/ \\
  --endpoint-url http://your-server-ip:3000 \\
  --profile v2capsule`}
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
                            id="aws-delete"
                            language="bash"
                            code={`aws s3 rm s3://my-bucket/myfile.txt \\
  --endpoint-url http://your-server-ip:3000 \\
  --profile v2capsule`}
                            copy={copy}
                            copied={copied}
                        />
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
