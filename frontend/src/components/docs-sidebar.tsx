import Link from 'next/link';
import { usePathname } from 'next/navigation';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Home, Code, Terminal, Cpu, Layers, BookOpen, Settings, Rocket } from 'lucide-react';

const sections = [
    { href: '/docs', label: 'Overview', icon: Home },
    { href: '/docs/quick-start', label: 'Quick Start', icon: Rocket },
    { href: '/docs/configuration', label: 'Configuration', icon: Settings },
    { href: '/docs/aws-cli', label: 'AWS CLI', icon: Terminal },
    { href: '/docs/python', label: 'Python SDK', icon: Code },
    { href: '/docs/javascript', label: 'JavaScript SDK', icon: Cpu },
    { href: '/docs/best-practices', label: 'Best Practices', icon: BookOpen },
];

export default function DocsSidebar() {
    const pathname = usePathname();
    return (
        <nav className="flex flex-col h-full p-4 space-y-2">
            {sections.map((s) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const Icon = s.icon as any;
                const active = pathname === s.href;
                return (
                    <Link
                        key={s.href}
                        href={s.href}
                        className={`flex items-center gap-2 p-2 rounded-md transition-colors 
              ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/30'}`}
                    >
                        <Icon className="h-4 w-4" />
                        {s.label}
                    </Link>
                );
            })}
        </nav>
    );
}
