'use client';

import { ReactNode } from 'react';
import DocsSidebar from '@/components/docs-sidebar';
import { cn } from '@/lib/utils';

export default function DocsLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            {/* Sidebar */}
            <aside className="hidden w-64 border-r border-border/30 bg-muted/20 lg:block">
                <DocsSidebar />
            </aside>

            {/* Main Content */}
            <main className={cn('flex-1 w-full overflow-y-auto', 'lg:ml-0')}>
                <div className="container mx-auto px-6 py-8 lg:pl-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
