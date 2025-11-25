'use client';
/* eslint-disable @typescript-eslint/no-unused-vars */
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Terminal, Key, Upload, Download, FolderPlus, Trash2, Code, Copy } from 'lucide-react';
import DocsCodeBlock from '@/components/docs-codeblock';
import { useState } from 'react';

export default function OverviewPage() {
    const [copied, setCopied] = useState<string | null>(null);

    const copy = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="space-y-12">
            {/* Quick Start */}
            <section>
                <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
                    <Terminal className="h-6 w-6 text-primary" /> Quick Start
                </h2>
                <Card>
                    <CardHeader>
                        <CardTitle>Get Your Credentials</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                            <li>Log in to your V2 Capsule dashboard</li>
                            <li>Navigate to <strong className="text-foreground">Buckets</strong> and create a new bucket</li>
                            <li>Click on your bucket and go to <strong className="text-foreground">Settings</strong></li>
                            <li>Copy your <strong className="text-foreground">Access Key ID</strong> and <strong className="text-foreground">Secret Access Key</strong></li>
                        </ol>
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-3">
                            <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                <strong>Important:</strong> Each bucket has its own unique credentials. Keep your secret key secure and never commit it to version control.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* Configuration */}
            <section>
                <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
                    <Key className="h-6 w-6 text-primary" /> Configuration
                </h2>
                <Card>
                    <CardHeader>
                        <CardTitle>Endpoint &amp; Credentials</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold mb-1">Endpoint URL</h4>
                            <DocsCodeBlock
                                id="endpoint"
                                language="text"
                                code={`http://your-server-ip:3000`}
                                copy={copy}
                                copied={copied}
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                Replace <code className="bg-muted px-1 py-0.5 rounded">your-server-ip</code> with your V2 Capsule server address.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-1">Region</h4>
                            <DocsCodeBlock
                                id="region"
                                language="text"
                                code={`us-east-1`}
                                copy={copy}
                                copied={copied}
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                V2 Capsule uses <code className="bg-muted px-1 py-0.5 rounded">us-east-1</code> as the default region.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
