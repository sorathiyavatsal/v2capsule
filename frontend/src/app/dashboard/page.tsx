'use client';

import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HardDrive, Database, File, Activity, ArrowUpRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Volume {
    id: number;
    name: string;
    capacity: number;
    used: number;
    objectCount: number;
}

interface Bucket {
    id: number;
    name: string;
    createdAt: string;
}

export default function DashboardPage() {
    const { user } = useAuthStore();

    const { data: volumes, isLoading: isLoadingVolumes } = useQuery({
        queryKey: ['volumes'],
        queryFn: async () => {
            const res = await api.get('/volumes');
            return res.data as Volume[];
        },
    });

    const { data: buckets, isLoading: isLoadingBuckets } = useQuery({
        queryKey: ['buckets'],
        queryFn: async () => {
            const res = await api.get('/buckets');
            return res.data as Bucket[];
        },
    });

    if (!user) return null;

    // Calculate stats
    const totalBuckets = buckets?.length || 0;
    const totalObjects = volumes?.reduce((acc, vol) => acc + Number(vol.objectCount || 0), 0) || 0;
    const totalUsed = volumes?.reduce((acc, vol) => acc + Number(vol.used || 0), 0) || 0;
    const totalCapacity = volumes?.reduce((acc, vol) => acc + Number(vol.capacity || 0), 0) || 0;
    const usagePercent = totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0;

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const stats = [
        {
            title: 'Total Storage',
            value: formatBytes(totalUsed),
            subValue: `of ${formatBytes(totalCapacity)} used`,
            icon: HardDrive,
            gradient: 'from-blue-500 to-cyan-500',
            progress: usagePercent,
        },
        {
            title: 'Active Buckets',
            value: totalBuckets.toString(),
            subValue: 'Object containers',
            icon: Database,
            gradient: 'from-violet-500 to-purple-500',
        },
        {
            title: 'Total Objects',
            value: totalObjects.toLocaleString(),
            subValue: 'Files stored',
            icon: File,
            gradient: 'from-emerald-500 to-green-500',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                        Dashboard
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Overview of your storage infrastructure.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link href="/dashboard/buckets">
                        <Button className="rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                            <Plus className="mr-2 h-4 w-4" /> New Bucket
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.map((stat, i) => (
                    <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 group overflow-hidden relative">
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity`} />
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient} bg-opacity-10`}>
                                <stat.icon className="h-4 w-4 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold tracking-tight">{stat.value}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stat.subValue}
                            </p>
                            {stat.progress !== undefined && (
                                <Progress value={stat.progress} className="h-1 mt-3" />
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Recent Activity / Quick Access */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Recent Buckets
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoadingBuckets ? (
                            <div className="text-sm text-muted-foreground">Loading...</div>
                        ) : buckets && buckets.length > 0 ? (
                            <div className="space-y-4">
                                {buckets.slice(0, 5).map((bucket) => (
                                    <div key={bucket.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                <Database className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{bucket.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Created {new Date(bucket.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <Link href={`/dashboard/buckets/${bucket.name}`}>
                                            <Button variant="ghost" size="icon" className="rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ArrowUpRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No buckets found. Create one to get started.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Storage Distribution Placeholder */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HardDrive className="h-5 w-5 text-blue-500" />
                            Volume Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoadingVolumes ? (
                            <div className="text-sm text-muted-foreground">Loading...</div>
                        ) : volumes && volumes.length > 0 ? (
                            <div className="space-y-4">
                                {volumes.slice(0, 5).map((vol) => {
                                    const percent = vol.capacity > 0 ? (vol.used / vol.capacity) * 100 : 0;
                                    return (
                                        <div key={vol.id} className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium">{vol.name}</span>
                                                <span className="text-muted-foreground">
                                                    {formatBytes(vol.used)} / {formatBytes(vol.capacity)}
                                                </span>
                                            </div>
                                            <Progress value={percent} className={cn(
                                                "h-2",
                                                percent > 90 ? "bg-red-500" : percent > 80 ? "bg-yellow-500" : "bg-primary"
                                            )} />
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No volumes detected.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


