import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus } from 'lucide-react';

interface CORSRule {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    maxAgeSeconds?: number;
}

interface CORSConfigProps {
    initialRules?: CORSRule[];
    onSave: (rules: CORSRule[]) => Promise<void>;
    isLoading?: boolean;
}

const HTTP_METHODS = ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'];

export function CORSConfig({ initialRules, onSave, isLoading }: CORSConfigProps) {
    const [rules, setRules] = useState<CORSRule[]>(initialRules || [
        {
            allowedOrigins: ['*'],
            allowedMethods: ['GET', 'HEAD'],
            allowedHeaders: ['*'],
            exposedHeaders: [],
            maxAgeSeconds: 3600,
        }
    ]);

    const addRule = () => {
        setRules([...rules, {
            allowedOrigins: [''],
            allowedMethods: [],
            allowedHeaders: [],
            exposedHeaders: [],
            maxAgeSeconds: 3600,
        }]);
    };

    const removeRule = (index: number) => {
        setRules(rules.filter((_, i) => i !== index));
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateRule = (index: number, field: keyof CORSRule, value: any) => {
        const newRules = [...rules];
        newRules[index] = { ...newRules[index], [field]: value };
        setRules(newRules);
    };

    const updateOrigins = (index: number, value: string) => {
        const origins = value.split(',').map(o => o.trim()).filter(Boolean);
        updateRule(index, 'allowedOrigins', origins);
    };

    const updateHeaders = (index: number, field: 'allowedHeaders' | 'exposedHeaders', value: string) => {
        const headers = value.split(',').map(h => h.trim()).filter(Boolean);
        updateRule(index, field, headers);
    };

    const toggleMethod = (ruleIndex: number, method: string) => {
        const rule = rules[ruleIndex];
        const methods = rule.allowedMethods.includes(method)
            ? rule.allowedMethods.filter(m => m !== method)
            : [...rule.allowedMethods, method];
        updateRule(ruleIndex, 'allowedMethods', methods);
    };

    const handleSave = async () => {
        await onSave(rules);
    };

    return (
        <div className="space-y-6">
            {rules.map((rule, index) => (
                <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">CORS Rule {index + 1}</CardTitle>
                        {rules.length > 1 && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeRule(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Allowed Origins (comma-separated)</Label>
                            <Input
                                value={rule.allowedOrigins.join(', ')}
                                onChange={(e) => updateOrigins(index, e.target.value)}
                                placeholder="https://example.com, https://app.example.com, *"
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                Use * to allow all origins
                            </p>
                        </div>

                        <div>
                            <Label>Allowed Methods</Label>
                            <div className="flex flex-wrap gap-4 mt-2">
                                {HTTP_METHODS.map(method => (
                                    <div key={method} className="flex items-center space-x-2">
                                        <Checkbox
                                            checked={rule.allowedMethods.includes(method)}
                                            onCheckedChange={() => toggleMethod(index, method)}
                                        />
                                        <label className="text-sm font-medium">{method}</label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label>Allowed Headers (comma-separated)</Label>
                            <Input
                                value={rule.allowedHeaders?.join(', ') || ''}
                                onChange={(e) => updateHeaders(index, 'allowedHeaders', e.target.value)}
                                placeholder="Content-Type, Authorization, *"
                            />
                        </div>

                        <div>
                            <Label>Exposed Headers (comma-separated)</Label>
                            <Input
                                value={rule.exposedHeaders?.join(', ') || ''}
                                onChange={(e) => updateHeaders(index, 'exposedHeaders', e.target.value)}
                                placeholder="ETag, x-amz-request-id"
                            />
                        </div>

                        <div>
                            <Label>Max Age (seconds)</Label>
                            <Input
                                type="number"
                                value={rule.maxAgeSeconds || 3600}
                                onChange={(e) => updateRule(index, 'maxAgeSeconds', parseInt(e.target.value))}
                                placeholder="3600"
                            />
                        </div>
                    </CardContent>
                </Card>
            ))}

            <div className="flex justify-between">
                <Button variant="outline" onClick={addRule}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Rule
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save CORS Configuration'}
                </Button>
            </div>
        </div>
    );
}
