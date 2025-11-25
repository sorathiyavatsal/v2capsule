'use client';

import { useAuthStore } from '@/store/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
    Database,
    LayoutDashboard,
    Folder,
    HardDrive,
    Users,
    Settings,
    LogOut,
    ChevronRight,
    Search,
    Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, logout, _hasHydrated } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        if (_hasHydrated && !user) {
            router.push('/login');
        }
    }, [user, _hasHydrated, router]);

    if (!_hasHydrated) return null;
    if (!user) return null;

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/dashboard/buckets', label: 'Buckets', icon: Folder },
        { href: '/dashboard/volumes', label: 'Volumes', icon: HardDrive },
        { href: '/dashboard/settings', label: 'Settings', icon: Settings },
        ...(user.role === 'superadmin' ? [{ href: '/dashboard/users', label: 'Users', icon: Users }] : []),
    ];

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden selection:bg-primary selection:text-primary-foreground">
            {/* Sidebar */}
            <aside
                className={cn(
                    "relative z-20 flex flex-col border-r border-border/50 bg-card/50 backdrop-blur-xl transition-all duration-300 ease-in-out",
                    isSidebarCollapsed ? "w-16" : "w-64"
                )}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                            <Database className="h-4 w-4 text-white" />
                        </div>
                        {!isSidebarCollapsed && (
                            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                                V2 Capsule
                            </span>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <div
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                                        isActive
                                            ? "bg-primary/10 text-primary shadow-sm"
                                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                    )}
                                >
                                    <item.icon
                                        className={cn(
                                            "h-4 w-4 transition-colors",
                                            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                        )}
                                    />
                                    {!isSidebarCollapsed && (
                                        <span className="text-sm font-medium">{item.label}</span>
                                    )}
                                    {isActive && !isSidebarCollapsed && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-border/50">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className={cn("w-full h-auto p-2 hover:bg-muted/50 rounded-xl", isSidebarCollapsed ? "justify-center" : "justify-start")}>
                                <div className="flex items-center gap-3 w-full">
                                    <Avatar className="h-9 w-9 border border-border/50 shrink-0">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                                        <AvatarFallback>{user.email[0].toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    {!isSidebarCollapsed && (
                                        <div className="flex-1 text-left overflow-hidden min-w-0">
                                            <p className="text-sm font-medium truncate">{user.email}</p>
                                            <p className="text-xs text-muted-foreground capitalize truncate">{user.role}</p>
                                        </div>
                                    )}
                                    {!isSidebarCollapsed && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="end" sideOffset={10} className="w-56 rounded-xl border-border/50 backdrop-blur-xl bg-card/95">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" /> Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 cursor-pointer"
                                onClick={() => { logout(); router.push('/login'); }}
                            >
                                <LogOut className="mr-2 h-4 w-4" /> Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-muted/10">
                {/* Top Header */}
                <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-muted-foreground">
                        {/* Breadcrumbs or Page Title could go here */}
                        <div className="flex items-center gap-2 text-sm">
                            <span className="hover:text-foreground cursor-pointer transition-colors">Dashboard</span>
                            {pathname !== '/dashboard' && (
                                <>
                                    <ChevronRight className="h-4 w-4" />
                                    <span className="text-foreground font-medium capitalize">
                                        {pathname.split('/').pop()}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative w-64 hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search..."
                                className="pl-9 bg-muted/50 border-transparent focus:bg-background focus:border-primary/20 rounded-xl transition-all"
                            />
                        </div>
                        <Button variant="ghost" size="icon" className="rounded-xl relative">
                            <Bell className="h-5 w-5 text-muted-foreground" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background" />
                        </Button>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="h-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
