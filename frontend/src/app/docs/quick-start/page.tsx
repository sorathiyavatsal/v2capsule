'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
/* eslint-disable @typescript-eslint/no-unused-vars */
import DocsCodeBlock from '@/components/docs-codeblock';
import { useState } from 'react';

export default function QuickStartPage() {
    const [copied, setCopied] = useState<string | null>(null);
    const copy = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="space-y-12">
            <section>
                <h2 className="text-3xl font-bold mb-4">Quick Start</h2>
                <Card>
                    <CardHeader>
                        <CardTitle>Get Your Credentials</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                            <li>Log in to your V2 Capsule dashboard</li>
                            <li>Navigate to <strong className="text-foreground">Buckets</strong> and create a new bucket</li>
                            <li>Open the bucket settings to view its <strong className="text-foreground">Access Key ID</strong> and <strong className="text-foreground">Secret Access Key</strong></li>
                        </ol>
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-3">
                            <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                <strong>Important:</strong> Keep your secret key secure and never commit it to version control.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
