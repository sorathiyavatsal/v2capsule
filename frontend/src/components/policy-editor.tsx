import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, FileJson, BookOpen } from 'lucide-react';

interface PolicyEditorProps {
    initialPolicy?: string;
    onSave: (policy: string) => Promise<void>;
    isLoading?: boolean;
    bucketName?: string;
}

const POLICY_EXAMPLES = {
    'public-read': {
        name: 'Public Read Access',
        description: 'Allow anyone to read objects (download only)',
        policy: {
            Version: "2012-10-17",
            Statement: [
                {
                    Sid: "PublicReadGetObject",
                    Effect: "Allow",
                    Principal: "*",
                    Action: "s3:GetObject",
                    Resource: "arn:aws:s3:::BUCKET_NAME/*"
                }
            ]
        }
    },
    'authenticated-read': {
        name: 'Authenticated Read Access',
        description: 'Only authenticated users can read objects',
        policy: {
            Version: "2012-10-17",
            Statement: [
                {
                    Sid: "AuthenticatedReadGetObject",
                    Effect: "Allow",
                    Principal: {
                        AWS: "*"
                    },
                    Action: "s3:GetObject",
                    Resource: "arn:aws:s3:::BUCKET_NAME/*",
                    Condition: {
                        StringLike: {
                            "aws:userid": "*"
                        }
                    }
                }
            ]
        }
    },
    'deny-upload': {
        name: 'Deny Upload (Read-Only)',
        description: 'Allow read but explicitly deny all write operations',
        policy: {
            Version: "2012-10-17",
            Statement: [
                {
                    Sid: "AllowPublicRead",
                    Effect: "Allow",
                    Principal: "*",
                    Action: "s3:GetObject",
                    Resource: "arn:aws:s3:::BUCKET_NAME/*"
                },
                {
                    Sid: "DenyAllWrites",
                    Effect: "Deny",
                    Principal: "*",
                    Action: [
                        "s3:PutObject",
                        "s3:DeleteObject",
                        "s3:PutObjectAcl"
                    ],
                    Resource: "arn:aws:s3:::BUCKET_NAME/*"
                }
            ]
        }
    },
    'full-access': {
        name: 'Full Public Access',
        description: 'Allow all operations (read, write, delete)',
        policy: {
            Version: "2012-10-17",
            Statement: [
                {
                    Sid: "PublicFullAccess",
                    Effect: "Allow",
                    Principal: "*",
                    Action: "s3:*",
                    Resource: [
                        "arn:aws:s3:::BUCKET_NAME",
                        "arn:aws:s3:::BUCKET_NAME/*"
                    ]
                }
            ]
        }
    },
    'specific-ip': {
        name: 'IP-Based Access Control',
        description: 'Allow access only from specific IP addresses',
        policy: {
            Version: "2012-10-17",
            Statement: [
                {
                    Sid: "IPBasedAccess",
                    Effect: "Allow",
                    Principal: "*",
                    Action: "s3:*",
                    Resource: "arn:aws:s3:::BUCKET_NAME/*",
                    Condition: {
                        IpAddress: {
                            "aws:SourceIp": [
                                "192.168.1.0/24",
                                "10.0.0.0/8"
                            ]
                        }
                    }
                }
            ]
        }
    }
};

export function PolicyEditor({ initialPolicy, onSave, isLoading, bucketName = 'example-bucket' }: PolicyEditorProps) {
    const [policy, setPolicy] = useState(initialPolicy || '');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialPolicy) {
            // Format it nicely if it's valid JSON
            try {
                const parsed = JSON.parse(initialPolicy);
                const formatted = JSON.stringify(parsed, null, 2);
                if (formatted !== policy) {
                    setPolicy(formatted);
                }
            } catch {
                if (initialPolicy !== policy) {
                    setPolicy(initialPolicy);
                }
            }
        } else if (!policy) {
            // Default template - only set if policy is empty
            setPolicy(JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                    {
                        Sid: "PublicReadGetObject",
                        Effect: "Allow",
                        Principal: "*",
                        Action: "s3:GetObject",
                        Resource: `arn:aws:s3:::${bucketName}/*`
                    }
                ]
            }, null, 2));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialPolicy]);

    const handleFormat = () => {
        try {
            const parsed = JSON.parse(policy);
            setPolicy(JSON.stringify(parsed, null, 2));
            setError(null);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            setError('Invalid JSON: ' + message);
        }
    };

    const handleLoadExample = (exampleKey: string) => {
        const example = POLICY_EXAMPLES[exampleKey as keyof typeof POLICY_EXAMPLES];
        if (example) {
            // Replace BUCKET_NAME placeholder with actual bucket name
            const policyStr = JSON.stringify(example.policy, null, 2);
            const updatedPolicy = policyStr.replace(/BUCKET_NAME/g, bucketName);
            setPolicy(updatedPolicy);
            setError(null);
        }
    };

    const handleSave = async () => {
        try {
            // Validate JSON first
            JSON.parse(policy);
            setError(null);
            await onSave(policy);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            setError('Invalid JSON: ' + message);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h3 className="text-lg font-medium">Bucket Policy (JSON)</h3>
                <div className="flex gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <Select onValueChange={handleLoadExample}>
                            <SelectTrigger className="w-[250px]">
                                <SelectValue placeholder="Load example policy..." />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(POLICY_EXAMPLES).map(([key, example]) => (
                                    <SelectItem key={key} value={key}>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{example.name}</span>
                                            <span className="text-xs text-muted-foreground">{example.description}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleFormat}>
                        <FileJson className="mr-2 h-4 w-4" />
                        Format JSON
                    </Button>
                </div>
            </div>

            <Textarea
                value={policy}
                onChange={(e) => {
                    setPolicy(e.target.value);
                    setError(null);
                }}
                className="font-mono min-h-[400px]"
                placeholder='{ "Version": "2012-10-17", "Statement": [] }'
            />

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Policy'}
                </Button>
            </div>
        </div>
    );
}
