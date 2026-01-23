import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Zap, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickFiltersProps {
  highPriorityOnly: boolean;
  delayedOnly: boolean;
  onHighPriorityToggle: () => void;
  onDelayedToggle: () => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

export function QuickFilters({
  highPriorityOnly,
  delayedOnly,
  onHighPriorityToggle,
  onDelayedToggle,
  onClearAll,
  hasActiveFilters,
}: QuickFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-secondary/30 rounded-lg border border-secondary">
      <span className="text-sm font-medium text-muted-foreground">Quick Filters:</span>

      <Button
        variant={highPriorityOnly ? 'default' : 'outline'}
        size="sm"
        onClick={onHighPriorityToggle}
        className={cn(
          'gap-2',
          highPriorityOnly && 'bg-danger/20 text-danger border-danger/20 hover:bg-danger/30'
        )}
      >
        <Zap className="w-4 h-4" />
        High Priority
      </Button>

      <Button
        variant={delayedOnly ? 'default' : 'outline'}
        size="sm"
        onClick={onDelayedToggle}
        className={cn(
          'gap-2',
          delayedOnly && 'bg-danger/20 text-danger border-danger/20 hover:bg-danger/30'
        )}
      >
        <AlertTriangle className="w-4 h-4" />
        Delayed
      </Button>

      {hasActiveFilters && (
        <>
          <div className="w-px h-5 bg-border" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Clear Filters
          </Button>
        </>
      )}

      {hasActiveFilters && (
        <Badge variant="secondary" className="ml-auto">
          {[highPriorityOnly, delayedOnly].filter(Boolean).length} active
        </Badge>
      )}
    </div>
  );
}
