/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface CustomConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "destructive" | "default";
    isLoading?: boolean;
}

export function CustomConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Delete",
    cancelText = "Cancel",
    variant = "destructive",
    isLoading = false,
}: CustomConfirmDialogProps) {
    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-border/50 rounded-2xl shadow-2xl max-w-md">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-xl ${variant === 'destructive' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <AlertDialogTitle className="text-xl font-bold tracking-tight">
                            {title}
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-muted-foreground text-base">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2">
                    <AlertDialogCancel
                        onClick={onClose}
                        disabled={isLoading}
                        className="rounded-xl border-border/50 hover:bg-muted/50 mt-0"
                    >
                        {cancelText}
                    </AlertDialogCancel>
                    <Button
                        variant={variant}
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                        }}
                        disabled={isLoading}
                        className={`rounded-xl ${variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                    >
                        {isLoading ? "Processing..." : confirmText}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
