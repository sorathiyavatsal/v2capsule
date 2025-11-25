'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Database } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();
    const setAuth = useAuthStore((state) => state.setAuth);

    const loginMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/auth/login', { email, password });
            return res.data;
        },
        onSuccess: (data) => {
            setAuth(data.token, data.user);
            router.push('/dashboard');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (error: any) => {
            alert(error.response?.data?.error || 'Login failed');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        loginMutation.mutate();
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
            <div className="mb-8 flex items-center gap-2">
                <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                    <Database className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-2xl font-bold tracking-tight">V2 Capsule</span>
            </div>

            <Card className="w-[350px] shadow-lg border-border">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Login</CardTitle>
                    <CardDescription>
                        Enter your email and password to access your dashboard.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                            {loginMutation.isPending ? 'Logging in...' : 'Login'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="mt-4 text-sm text-muted-foreground">
                <Link href="/" className="hover:text-primary underline underline-offset-4 mr-4">
                    Back to Home
                </Link>
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="hover:text-primary underline underline-offset-4">
                    Sign up
                </Link>
            </div>
        </div>
    );
}
