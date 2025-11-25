import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

export default function DocsCodeBlock({ id, language, code, copy, copied }: {
    id: string;
    language: string;
    code: string;
    copy: (code: string, id: string) => void;
    copied: string | null;
}) {
    return (
        <div className="relative group">
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="ghost" onClick={() => copy(code, id)} className="h-8 px-2">
                    <Copy className="h-4 w-4" />
                    {copied === id ? 'Copied!' : 'Copy'}
                </Button>
            </div>
            <pre className="bg-muted/50 border border-border rounded-xl p-4 overflow-x-auto">
                <code className={`text-sm font-mono language-${language}`}>{code}</code>
            </pre>
        </div>
    );
}
