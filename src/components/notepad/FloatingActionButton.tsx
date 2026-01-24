import { Button } from '@/components/ui/button';
import { FileText, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  onClick: () => void;
  isOpen: boolean;
  isMinimized?: boolean;
}

export function FloatingActionButton({ onClick, isOpen, isMinimized = false }: FloatingActionButtonProps) {
  // Don't show FAB when notepad is open and not minimized
  if (isOpen && !isMinimized) {
    return null;
  }

  return (
    <Button
      onClick={onClick}
      size="lg"
      className={cn(
        'fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-40',
        'bg-primary hover:bg-primary/90 text-primary-foreground',
        'transition-all duration-300 hover:scale-110',
        isMinimized && 'animate-pulse'
      )}
      aria-label={isMinimized ? "Restore Notepad" : "Open Notepad"}
      title={isMinimized ? "Restore Notepad" : "Open Notepad"}
    >
      {isMinimized ? (
        <Maximize2 className="w-6 h-6" />
      ) : (
        <FileText className="w-6 h-6" />
      )}
    </Button>
  );
}
