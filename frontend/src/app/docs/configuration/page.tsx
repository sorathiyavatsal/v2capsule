'use client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import DocsCodeBlock from '@/components/docs-codeblock';
import { useState } from 'react';

export default function ConfigurationPage() {
    const [copied, setCopied] = useState<string | null>(null);
    const copy = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="space-y-12">
            <section>
                <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
                    Endpoint &amp; Credentials
                </h2>
                <Card>
                    <CardHeader>
                        <CardTitle>Endpoint URL</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                    </CardContent>
                </Card>
            </section>

            <section>
                <Card>
                    <CardHeader>
                        <CardTitle>Region</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
