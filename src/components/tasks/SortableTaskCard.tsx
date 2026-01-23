import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from './TaskCard';
import { Task } from '@/types/taskflow';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableTaskCardProps {
  task: Task;
  onClick?: () => void;
  compact?: boolean;
}

export function SortableTaskCard({ task, onClick, compact = false }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id || (task as any)._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'z-50'
      )}
    >
      {/* Drag Handle - only on hover */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-muted/30 rounded-l',
          'touch-none' // Prevent touch events from interfering
        )}
        onClick={(e) => {
          // Prevent card click when clicking drag handle
          e.stopPropagation();
        }}
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      
      {/* Task Card */}
      <div className="relative">
        <TaskCard task={task} onClick={onClick} compact={compact} />
      </div>
    </div>
  );
}
