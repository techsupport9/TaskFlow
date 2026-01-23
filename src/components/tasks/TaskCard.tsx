import { Task } from '@/types/taskflow';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, MessageSquare, AlertTriangle } from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  compact?: boolean;
}

const getPriorityVariant = (priority: string) => {
  switch (priority) {
    case 'high': return 'priorityHigh';
    case 'medium': return 'priorityMedium';
    case 'low': return 'priorityLow';
    default: return 'default';
  }
};

const getStatusVariant = (status: string, isOverdue: boolean) => {
  if (isOverdue) return 'statusDelayed';
  switch (status) {
    case 'pending': return 'statusPending';
    case 'in_progress': return 'statusProgress';
    case 'completed': return 'statusCompleted';
    case 'review': return 'statusProgress';
    default: return 'default';
  }
};

const getStatusLabel = (status: string, isOverdue: boolean, daysDelayed?: number) => {
  if (isOverdue) {
    return daysDelayed && daysDelayed > 0 ? `Delayed (${daysDelayed}d)` : 'Delayed';
  }
  switch (status) {
    case 'pending': return 'Pending';
    case 'in_progress': return 'In Progress';
    case 'completed': return 'Completed';
    case 'review': return 'Review';
    default: return status;
  }
};

export function TaskCard({ task, onClick, compact = false }: TaskCardProps) {
  const isOverdue = isPast(new Date(task.dueDate)) && task.status !== 'completed';
  const daysUntilDue = differenceInDays(new Date(task.dueDate), new Date());
  const daysDelayed = isOverdue ? Math.abs(daysUntilDue) : 0;
  const assignees = task.assignments || [{ userId: '?', userName: task.assignedToName }];
  const isNearDue = daysUntilDue >= 0 && daysUntilDue <= 2 && task.status !== 'completed';

  // List view - compact horizontal layout
  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'card-elevated px-3 py-2 cursor-pointer transition-all duration-200 hover:bg-muted/50 group flex items-center gap-3',
          isOverdue && 'border-danger/30 ring-1 ring-danger/20',
          isNearDue && !isOverdue && 'border-warning/30 ring-1 ring-warning/20'
        )}
      >
        {/* Title */}
        <h3 className="font-medium text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1 flex-1 min-w-0">
          {task.title}
        </h3>

        {/* Badges */}
        <div className="flex gap-1 flex-shrink-0">
          <Badge variant={getPriorityVariant(task.priority) as any} className="text-[9px] px-1 py-0">
            {task.priority}
          </Badge>
          <Badge variant={getStatusVariant(task.status, isOverdue) as any} className="text-[9px] px-1 py-0">
            {getStatusLabel(task.status, isOverdue, daysDelayed)}
          </Badge>
        </div>

        {/* Assignees */}
        <div className="flex items-center -space-x-1 flex-shrink-0">
          {assignees.slice(0, 2).map((a: any, i) => {
            const uName = a.userId?.name || a.userName || task.assignedToName || '?';
            return (
              <Avatar key={i} className="w-4 h-4 border border-background">
                <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                  {uName.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            );
          })}
          {assignees.length > 2 && (
            <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[7px] border border-background">
              +{assignees.length - 2}
            </div>
          )}
        </div>

        {/* Due Date */}
        <div className={cn(
          'flex items-center gap-0.5 text-[9px] flex-shrink-0',
          isOverdue && 'text-danger',
          isNearDue && !isOverdue && 'text-warning',
          !isOverdue && !isNearDue && 'text-muted-foreground'
        )}>
          {isOverdue ? (
            <>
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>{format(new Date(task.dueDate), 'MMM d')}</span>
              {daysDelayed > 0 && (
                <span className="font-semibold">({daysDelayed}d)</span>
              )}
            </>
          ) : (
            <>
              <Calendar className="w-2.5 h-2.5" />
              <span>{format(new Date(task.dueDate), 'MMM d')}</span>
            </>
          )}
        </div>
      </div>
    );
  }

  // Grid view - compact card
  return (
    <div
      onClick={onClick}
      className={cn(
        'card-elevated p-2.5 cursor-pointer transition-all duration-200 hover:scale-[1.02] group',
        isOverdue && 'border-danger/30 ring-1 ring-danger/20',
        isNearDue && !isOverdue && 'border-warning/30 ring-1 ring-warning/20'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-1.5 mb-1.5">
        <h3 className="font-medium text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1 flex-1 min-w-0">
          {task.title}
        </h3>
      </div>

      {/* Badges */}
      <div className="flex gap-1 mb-1.5">
        <Badge variant={getPriorityVariant(task.priority) as any} className="text-[9px] px-1 py-0">
          {task.priority}
        </Badge>
        <Badge variant={getStatusVariant(task.status, isOverdue) as any} className="text-[9px] px-1 py-0">
          {getStatusLabel(task.status, isOverdue, daysDelayed)}
        </Badge>
      </div>

      {/* Description */}
      <p className="text-[10px] text-muted-foreground line-clamp-1 mb-1.5">
        {task.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1.5 border-t border-border">
        {/* Assignees */}
        <div className="flex items-center -space-x-1">
          {assignees.slice(0, 2).map((a: any, i) => {
            const uName = a.userId?.name || a.userName || task.assignedToName || '?';
            return (
              <Avatar key={i} className="w-4 h-4 border border-background">
                <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                  {uName.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            );
          })}
          {assignees.length > 2 && (
            <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[7px] border border-background">
              +{assignees.length - 2}
            </div>
          )}
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center gap-0.5">
              <MessageSquare className="w-2.5 h-2.5" />
              <span>{task.comments.length}</span>
            </div>
          )}
          <div className={cn(
            'flex items-center gap-0.5',
            isOverdue && 'text-danger',
            isNearDue && !isOverdue && 'text-warning'
          )}>
            {isOverdue ? (
              <>
                <AlertTriangle className="w-2.5 h-2.5" />
                <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                {daysDelayed > 0 && (
                  <span className="font-semibold">({daysDelayed}d)</span>
                )}
              </>
            ) : (
              <>
                <Calendar className="w-2.5 h-2.5" />
                <span>{format(new Date(task.dueDate), 'MMM d')}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
