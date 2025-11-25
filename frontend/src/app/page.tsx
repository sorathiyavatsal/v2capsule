'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ArrowRight, Check, Shield, Zap, Database, Code, Lock, Cloud, Server, HardDrive, Users, BarChart, FileText } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                            <Database className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">V2 Capsule</span>
                    </div>
                    <div className="hidden md:flex items-center gap-6">
                        <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Features
                        </Link>
                        <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            How It Works
                        </Link>
                        <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Pricing
                        </Link>
                        <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Docs
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/login">
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-accent">
                                Login
                            </Button>
                        </Link>
                        <Link href="/signup">
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative container mx-auto px-6 py-24 md:py-32 text-center overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-violet-500/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

                <h1 className="relative text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-gradient-to-b from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent leading-tight">
                    Storage Reimagined <br /> for the Modern Web
                </h1>
                <p className="relative text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
                    Self-hosted, S3-compatible object storage designed for NAS systems.
                    Secure, fast, and completely under your control. Deploy once, scale forever.
                </p>
                <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link href="/signup">
                        <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8 text-lg shadow-xl shadow-primary/20">
                            Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                    <Link href="/docs">
                        <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-accent h-12 px-8 text-lg">
                            <FileText className="mr-2 h-5 w-5" />
                            Documentation
                        </Button>
                    </Link>
                </div>

                {/* Stats */}
                <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto">
                    {[
                        { label: 'Uptime', value: '99.9%' },
                        { label: 'API Requests/sec', value: '10K+' },
                        { label: 'Storage Nodes', value: 'Unlimited' },
                        { label: 'Active Users', value: '1000+' },
                    ].map((stat, i) => (
                        <div key={i} className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">{stat.value}</div>
                            <div className="text-sm text-muted-foreground">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="container mx-auto px-6 py-24">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4">Powerful Features</h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Everything you need to build, deploy, and scale your storage infrastructure
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        {
                            icon: Zap,
                            title: 'Blazing Fast',
                            description: 'Optimized for local NAS environments with minimal latency and high throughput. Lightning-fast object retrieval.',
                        },
                        {
                            icon: Shield,
                            title: 'Secure by Default',
                            description: 'Built-in JWT authentication, role-based access control, and per-bucket access keys for granular security.',
                        },
                        {
                            icon: Database,
                            title: 'S3 Compatible',
                            description: 'Drop-in replacement for AWS S3. Works seamlessly with existing tools, SDKs, and libraries.',
                        },
                        {
                            icon: Server,
                            title: 'Multi-Volume Support',
                            description: 'Distribute your data across multiple storage volumes. Automatic failover and load balancing.',
                        },
                        {
                            icon: Lock,
                            title: 'Per-Bucket Credentials',
                            description: 'Generate unique access keys for each bucket. Rotate credentials without affecting other buckets.',
                        },
                        {
                            icon: Users,
                            title: 'User Management',
                            description: 'Role-based access control with superadmin and user roles. Manage teams effortlessly.',
                        },
                        {
                            icon: Cloud,
                            title: 'Self-Hosted',
                            description: 'Complete control over your data. No vendor lock-in, no hidden costs, no data mining.',
                        },
                        {
                            icon: Code,
                            title: 'Developer Friendly',
                            description: 'RESTful API, comprehensive documentation, and SDK support for all major programming languages.',
                        },
                        {
                            icon: BarChart,
                            title: 'Real-Time Analytics',
                            description: 'Monitor storage usage, track API requests, and view detailed metrics in real-time.',
                        },
                    ].map((feature, i) => (
                        <div
                            key={i}
                            className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-primary/5"
                        >
                            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                <feature.icon className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="container mx-auto px-6 py-24">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4">How It Works</h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Get started in minutes with our simple three-step process
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {[
                        {
                            step: '01',
                            title: 'Create Your Account',
                            description: 'Sign up and configure your storage volumes. Point V2 Capsule to your NAS directories.',
                        },
                        {
                            step: '02',
                            title: 'Create Buckets',
                            description: 'Organize your data into buckets. Each bucket gets unique S3-compatible access credentials.',
                        },
                        {
                            step: '03',
                            title: 'Start Uploading',
                            description: 'Use any S3-compatible client or SDK. Upload, download, and manage objects with ease.',
                        },
                    ].map((item, i) => (
                        <div key={i} className="relative">
                            <div className="text-6xl font-bold text-primary/10 mb-4">{item.step}</div>
                            <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                            <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                            {i < 2 && (
                                <div className="hidden md:block absolute top-12 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Use Cases */}
            <section className="container mx-auto px-6 py-24">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4">Perfect For</h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        V2 Capsule adapts to your storage needs
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {[
                        {
                            title: 'Media Storage',
                            description: 'Store and serve images, videos, and audio files for your applications. CDN-ready with fast delivery.',
                        },
                        {
                            title: 'Backup & Archive',
                            description: 'Reliable long-term storage for backups, logs, and archival data. Version control and lifecycle policies.',
                        },
                        {
                            title: 'Application Data',
                            description: 'Store user uploads, generated files, and application assets. Seamless integration with your stack.',
                        },
                        {
                            title: 'Development & Testing',
                            description: 'Local S3-compatible storage for development. Test your applications without cloud costs.',
                        },
                    ].map((useCase, i) => (
                        <div key={i} className="p-6 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border">
                            <h3 className="text-lg font-bold mb-2">{useCase.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{useCase.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="container mx-auto px-6 py-24">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h2>
                    <p className="text-lg text-muted-foreground">Choose the plan that fits your storage needs</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {/* Smart Plan */}
                    <div className="relative p-8 rounded-2xl bg-card border border-border flex flex-col shadow-sm hover:shadow-lg transition-shadow">
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-foreground mb-2">Smart</h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-foreground">$0</span>
                                <span className="text-muted-foreground">/mo</span>
                            </div>
                            <p className="text-muted-foreground mt-4">Perfect for personal projects and testing</p>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Check className="h-5 w-5 text-primary shrink-0" /> 10 GB Storage
                            </li>
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Check className="h-5 w-5 text-primary shrink-0" /> 1 User
                            </li>
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Check className="h-5 w-5 text-primary shrink-0" /> 3 Buckets
                            </li>
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Check className="h-5 w-5 text-primary shrink-0" /> Basic Support
                            </li>
                        </ul>
                        <Link href="/signup">
                            <Button className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground">
                                Get Started
                            </Button>
                        </Link>
                    </div>

                    {/* Standard Plan */}
                    <div className="relative p-8 rounded-2xl bg-card border-2 border-primary flex flex-col shadow-2xl shadow-primary/10 scale-105 z-10">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-1 rounded-full text-sm font-medium shadow-lg">
                            Most Popular
                        </div>
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-foreground mb-2">Standard</h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-foreground">$29</span>
                                <span className="text-muted-foreground">/mo</span>
                            </div>
                            <p className="text-muted-foreground mt-4">For growing teams and small businesses</p>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Check className="h-5 w-5 text-primary shrink-0" /> 1 TB Storage
                            </li>
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Check className="h-5 w-5 text-primary shrink-0" /> 5 Users
                            </li>
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Check className="h-5 w-5 text-primary shrink-0" /> Unlimited Buckets
                            </li>
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Check className="h-5 w-5 text-primary shrink-0" /> Priority Support
                            </li>
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Check className="h-5 w-5 text-primary shrink-0" /> API Access
                            </li>
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Check className="h-5 w-5 text-primary shrink-0" /> Advanced Analytics
                            </li>
                        </ul>
                        <Link href="/signup">
                            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                                Get Started
                            </Button>
                        </Link>
                    </div>

                    {/* Premium Plan */}
                    <div className="relative p-8 rounded-2xl bg-card border border-border flex flex-col shadow-sm hover:shadow-lg transition-shadow">
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-foreground mb-2">Premium</h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-foreground">$99</span>
                                <span className="text-muted-foreground">/mo</span>
                            </div>
                            <p className="text-muted-foreground mt-4">Enterprise-grade power and security</p>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Check className="h-5 w-5 text-primary shrink-0" /> Unlimited Storage
                            </li>
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Check className="h-5 w-5 text-primary shrink-0" /> Unlimited Users
                            </li>
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Check className="h-5 w-5 text-primary shrink-0" /> Unlimited Buckets
                            </li>
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Check className="h-5 w-5 text-primary shrink-0" /> 24/7 Dedicated Support
                            </li>
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Check className="h-5 w-5 text-primary shrink-0" /> Custom Integrations
                            </li>
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Check className="h-5 w-5 text-primary shrink-0" /> SLA Guarantee
                            </li>
                        </ul>
                        <Button className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground">
                            Contact Sales
                        </Button>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="container mx-auto px-6 py-24">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-12 md:p-16 text-center">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[100px] rounded-full" />
                    <div className="relative">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Get Started?</h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                            Join thousands of developers who trust V2 Capsule for their storage needs
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/signup">
                                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8 text-lg shadow-xl shadow-primary/20">
                                    Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Link href="/docs">
                                <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-accent h-12 px-8 text-lg">
                                    View Documentation
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border bg-muted/30 py-12">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                                    <Database className="h-5 w-5 text-primary-foreground" />
                                </div>
                                <span className="text-lg font-bold">V2 Capsule</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Self-hosted S3-compatible object storage for the modern web.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Product</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
                                <li><Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                                <li><Link href="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Company</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><Link href="#" className="hover:text-foreground transition-colors">About</Link></li>
                                <li><Link href="#" className="hover:text-foreground transition-colors">Blog</Link></li>
                                <li><Link href="#" className="hover:text-foreground transition-colors">Contact</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><Link href="#" className="hover:text-foreground transition-colors">Privacy</Link></li>
                                <li><Link href="#" className="hover:text-foreground transition-colors">Terms</Link></li>
                                <li><Link href="#" className="hover:text-foreground transition-colors">Security</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
                        <p>&copy; 2025 V2 Capsule. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
