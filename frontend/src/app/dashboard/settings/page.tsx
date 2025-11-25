'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth';
import { User, Lock, Mail, Shield, Calendar } from 'lucide-react';
import { CustomConfirmDialog } from '@/components/custom-confirm-dialog';

export default function SettingsPage() {
    const { user } = useAuthStore();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
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

    const passwordChangeMutation = useMutation({
        mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
            await api.post('/auth/change-password', data);
        },
        onSuccess: () => {
            alert('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to change password');
        },
    });

    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            alert('New password must be at least 6 characters');
            return;
        }

        setConfirmDialog({
            isOpen: true,
            title: 'Change Password',
            description: 'Are you sure you want to change your password? You will need to use the new password for future logins.',
            onConfirm: () => passwordChangeMutation.mutate({ currentPassword, newPassword }),
            variant: 'default',
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
                <p className="text-sm text-muted-foreground">Manage your account settings and preferences</p>
            </div>

            {/* User Profile */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Profile Information
                    </CardTitle>
                    <CardDescription>
                        Your account details and role information
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-muted-foreground flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Email Address
                            </Label>
                            <div className="font-medium bg-muted/50 p-3 rounded-lg border border-border/50">
                                {user?.email}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-muted-foreground flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Role
                            </Label>
                            <div className="font-medium bg-muted/50 p-3 rounded-lg border border-border/50 capitalize">
                                {user?.role}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-muted-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Account Created
                            </Label>
                            <div className="font-medium bg-muted/50 p-3 rounded-lg border border-border/50">
                                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                }) : 'N/A'}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-muted-foreground flex items-center gap-2">
                                <User className="h-4 w-4" />
                                User ID
                            </Label>
                            <div className="font-mono text-sm bg-muted/50 p-3 rounded-lg border border-border/50">
                                #{user?.id}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                            <strong>Note:</strong> API credentials are managed per bucket. Visit individual bucket settings to view and manage access keys.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Security */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Security
                    </CardTitle>
                    <CardDescription>
                        Update your password to keep your account secure
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input
                                id="currentPassword"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password (min. 6 characters)"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={passwordChangeMutation.isPending}
                            className="rounded-xl"
                        >
                            {passwordChangeMutation.isPending ? 'Changing Password...' : 'Change Password'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

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
                isLoading={passwordChangeMutation.isPending}
            />
        </div>
    );
}
