'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, User } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { CustomConfirmDialog } from '@/components/custom-confirm-dialog';

export default function UsersPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuthStore();
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
        variant?: 'destructive' | 'default';
    }>({
        isOpen: false,
        title: '',
        description: '',
        onConfirm: () => { },
    });

    const { data: users, isLoading, error } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await api.get('/users');
            return res.data;
        },
        enabled: currentUser?.role === 'superadmin',
    });

    const createUserMutation = useMutation({
        mutationFn: async () => {
            await api.post('/users', { email, password, role: 'user' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setEmail('');
            setPassword('');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to create user');
        },
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/users/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to delete user');
        },
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        createUserMutation.mutate();
    };

    if (currentUser?.role !== 'superadmin') {
        return <div>Access Denied. Super Admin only.</div>;
    }

    if (isLoading) return <div>Loading users...</div>;
    if (error) return <div>Error loading users</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">User Management</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Create New User</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="flex gap-4 items-end">
                        <div className="space-y-2 flex-1">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                type="email"
                                placeholder="user@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2 flex-1">
                            <label className="text-sm font-medium">Password</label>
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={createUserMutation.isPending}>
                            {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="grid gap-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {users?.map((u: any) => (
                    <Card key={u.id}>
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-100 p-2 rounded-full">
                                    <User className="h-6 w-6 text-slate-600" />
                                </div>
                                <div>
                                    <div className="font-semibold">{u.email}</div>
                                    <div className="text-xs text-gray-500">Role: {u.role}</div>
                                    <div className="text-xs text-gray-400 font-mono mt-1">Access Key: {u.accessKey}</div>
                                </div>
                            </div>
                            {u.id !== currentUser.id && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setConfirmDialog({
                                            isOpen: true,
                                            title: 'Delete User',
                                            description: `Are you sure you want to delete user ${u.email}? This action cannot be undone.`,
                                            onConfirm: () => deleteUserMutation.mutate(u.id),
                                            variant: 'destructive',
                                        });
                                    }}
                                >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <CustomConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }}
                title={confirmDialog.title}
                description={confirmDialog.description}
                variant={confirmDialog.variant}
                isLoading={deleteUserMutation.isPending}
            />
        </div>
    );
}
