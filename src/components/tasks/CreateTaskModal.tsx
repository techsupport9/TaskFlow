import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MultiSelect } from '@/components/ui/multi-select';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { User, TaskPriority } from '@/types/taskflow';
import { 
  FileText, 
  Users, 
  Flag, 
  Calendar,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTask: (task: {
    title: string;
    description: string;
    assignments: string[];
    priority: TaskPriority;
    dueDate: string;
  }) => void;
}

export function CreateTaskModal({ open, onOpenChange, onCreateTask }: CreateTaskModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setAssignedUsers([]);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
    }
  }, [open]);

  // Fetch Users for Assignment
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
    enabled: !!user,
  });

  const getAssignableUsers = () => {
    if (!user) return [];

    // Admin can assign to any admin or core_manager
    if (user.role === 'admin') {
      return users.filter(
        (u: User) => u.role === 'admin' || u.role === 'core_manager'
      );
    }

    // Core Manager can assign to themselves and ALL other Core Managers
    if (user.role === 'core_manager') {
      return users.filter((u: User) => u.role === 'core_manager');
    }

    return [];
  };

  const assignableUsers = getAssignableUsers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || assignedUsers.length === 0 || !dueDate) return;
    
    setIsSubmitting(true);

    try {
      onCreateTask({
        title,
        description,
        assignments: assignedUsers,
        priority,
        dueDate,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityConfig = {
    high: { color: 'bg-red-500', label: 'High', border: 'border-red-500' },
    medium: { color: 'bg-amber-500', label: 'Medium', border: 'border-amber-500' },
    low: { color: 'bg-green-500', label: 'Low', border: 'border-green-500' },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            Create New Task
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">
            {/* Assigned By - Show who is creating the task */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserCheck className="w-4 h-4" />
                <span>Assigned By:</span>
              </div>
              <div className="flex items-center gap-2">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    {user?.name?.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-sm font-medium">{user?.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({user?.role === 'admin' ? 'Admin' : 'Core Manager'})
                  </span>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Task Title
              </Label>
              <Input
                id="title"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 text-base"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Add details about this task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Assign To - Dropdown */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Assign To
              </Label>
              <MultiSelect
                options={assignableUsers.map((u: User) => ({ 
                  label: `${u.name} (${u.role === 'admin' ? 'Admin' : 'Core Manager'})`, 
                  value: u._id || u.id 
                }))}
                selected={assignedUsers}
                onChange={setAssignedUsers}
                placeholder="Select assignees..."
              />
              {assignedUsers.length === 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Select at least one assignee
                </p>
              )}
            </div>

            {/* Priority & Due Date Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Flag className="w-4 h-4 text-muted-foreground" />
                  Priority
                </Label>
                <div className="flex gap-2">
                  {(['high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-lg border-2 transition-all text-sm font-medium capitalize",
                        priority === p 
                          ? `${priorityConfig[p].border} bg-opacity-10` 
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-full", priorityConfig[p].color)} />
                        {priorityConfig[p].label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="dueDate" className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Due Date
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-border bg-secondary/30 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              disabled={isSubmitting || !title || assignedUsers.length === 0 || !dueDate}
              className="px-6"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
