'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Globe } from 'lucide-react';
import Link from 'next/link';
import { CORSConfig } from '@/components/cors-config';

export default function BucketCORSPage() {
    const params = useParams();
    const bucketName = decodeURIComponent(params.name as string);
    const queryClient = useQueryClient();

    // Fetch CORS configuration
    const { data: corsRules, isLoading: isCorsLoading } = useQuery({
        queryKey: ['bucket-cors', bucketName],
        queryFn: async () => {
            try {
                const res = await api.get(`/buckets/${bucketName}/cors`);
                return res.data;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                if (err.response?.status === 404) {
                    return []; // No CORS config
                }
                throw err;
            }
        },
    });

    // Save CORS mutation
    const saveCORSMutation = useMutation({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mutationFn: async (rules: any) => {
            await api.put(`/buckets/${bucketName}/cors`, rules);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bucket-cors', bucketName] });
            alert('CORS configuration saved successfully!');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to save CORS configuration');
        },
    });

    // Delete CORS mutation
    const deleteCORSMutation = useMutation({
        mutationFn: async () => {
            await api.delete(`/buckets/${bucketName}/cors`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bucket-cors', bucketName] });
            alert('CORS configuration deleted successfully!');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to delete CORS configuration');
        },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSave = async (rules: any) => {
        await saveCORSMutation.mutateAsync(rules);
    };

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete the CORS configuration? This will remove all CORS rules.')) {
            await deleteCORSMutation.mutateAsync();
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
                    <h1 className="text-3xl font-bold">CORS Configuration</h1>
                    <p className="text-muted-foreground">{bucketName}</p>
                </div>
            </div>

            <div className="bg-card rounded-lg border p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <Globe className="h-5 w-5" />
                    <h2 className="text-xl font-semibold">CORS Rules</h2>
                </div>

                {isCorsLoading ? (
                    <div>Loading CORS configuration...</div>
                ) : (
                    <CORSConfig
                        initialRules={corsRules}
                        onSave={handleSave}
                        isLoading={saveCORSMutation.isPending}
                    />
                )}

                {corsRules && corsRules.length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteCORSMutation.isPending}
                        >
                            Delete CORS Configuration
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
