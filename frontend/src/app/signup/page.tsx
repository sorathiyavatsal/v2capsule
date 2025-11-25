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

export default function SignupPage() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const router = useRouter();
    const setAuth = useAuthStore((state) => state.setAuth);

    const signupMutation = useMutation({
        mutationFn: async () => {
            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }
            const res = await api.post('/auth/signup', { fullName, email, password });
            return res.data;
        },
        onSuccess: (data) => {
            setAuth(data.token, data.user);
            router.push('/dashboard');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (error: any) => {
            alert(error.message || error.response?.data?.error || 'Signup failed');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        signupMutation.mutate();
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
            <div className="mb-8 flex items-center gap-2">
                <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                    <Database className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-2xl font-bold tracking-tight">V2 Capsule</span>
            </div>

            <Card className="w-[400px] shadow-lg border-border">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
                    <CardDescription>
                        Enter your details below to create your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                                id="fullName"
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
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
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={signupMutation.isPending}>
                            {signupMutation.isPending ? 'Creating account...' : 'Create account'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="mt-4 text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="hover:text-primary underline underline-offset-4">
                    Login
                </Link>
            </div>
        </div>
    );
}
