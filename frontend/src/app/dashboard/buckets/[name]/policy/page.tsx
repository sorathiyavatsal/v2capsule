'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';
import { PolicyEditor } from '@/components/policy-editor';

export default function BucketPolicyPage() {
    const params = useParams();
    const bucketName = decodeURIComponent(params.name as string);
    const queryClient = useQueryClient();

    // Fetch bucket policy
    const { data: policy, isLoading: isPolicyLoading } = useQuery({
        queryKey: ['bucket-policy', bucketName],
        queryFn: async () => {
            try {
                const res = await api.get(`/buckets/${bucketName}/policy`);
                return JSON.stringify(res.data, null, 2);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                if (err.response?.status === 404) {
                    return ''; // No policy
                }
                throw err;
            }
        },
    });

    // Save policy mutation
    const savePolicyMutation = useMutation({
        mutationFn: async (policyJson: string) => {
            await api.put(`/buckets/${bucketName}/policy`, JSON.parse(policyJson));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bucket-policy', bucketName] });
            alert('Bucket policy saved successfully!');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to save bucket policy');
        },
    });

    // Delete policy mutation
    const deletePolicyMutation = useMutation({
        mutationFn: async () => {
            await api.delete(`/buckets/${bucketName}/policy`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bucket-policy', bucketName] });
            alert('Bucket policy deleted successfully!');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to delete bucket policy');
        },
    });

    const handleSave = async (newPolicy: string) => {
        await savePolicyMutation.mutateAsync(newPolicy);
    };

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete the bucket policy? This will remove all access control rules defined in the policy.')) {
            await deletePolicyMutation.mutateAsync();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/dashboard/buckets/${bucketName}`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Bucket Policy</h1>
                    <p className="text-muted-foreground">{bucketName}</p>
                </div>
            </div>

            <div className="bg-card rounded-lg border p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <Shield className="h-5 w-5" />
                    <h2 className="text-xl font-semibold">Policy Editor</h2>
                </div>

                {isPolicyLoading ? (
                    <div>Loading policy...</div>
                ) : (
                    <PolicyEditor
                        initialPolicy={policy}
                        onSave={handleSave}
                        isLoading={savePolicyMutation.isPending}
                        bucketName={bucketName}
                    />
                )}

                <div className="mt-6 pt-6 border-t">
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={!policy || deletePolicyMutation.isPending}
                    >
                        Delete Policy
                    </Button>
                </div>
            </div>
        </div>
    );
}
