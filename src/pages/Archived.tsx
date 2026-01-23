import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types/taskflow';
import { Search, CheckCircle, Calendar, CheckCircle2, RotateCcw, Loader2, AlertTriangle, Info, Trash2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Archived() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Fetch completed tasks
  const { data: archivedTasks = [], isLoading } = useQuery({
    queryKey: ['tasks', 'completed'],
    queryFn: async () => {
      const res = await api.get('/tasks?completed=true');
      return res.data;
    },
    enabled: !!user,
    refetchInterval: 2000, // Poll for real-time updates
  });

  // Restore task mutation
  const restoreMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await api.patch(`/tasks/${taskId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task restored and set to review');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to restore task');
    }
  });

  // Delete task mutation (admin only)
  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await api.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task permanently deleted');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    }
  });

  const filteredTasks = archivedTasks.filter((task: Task) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query) ||
      task.assignedToName?.toLowerCase().includes(query)
    );
  });

  // Calculate days until auto-deletion (7 days from completion)
  const getDaysUntilDeletion = (task: Task) => {
    const completedDate = task.completedAt ? new Date(task.completedAt) : (task.archivedAt ? new Date(task.archivedAt) : null);
    if (!completedDate) return null;
    const deletionDate = new Date(completedDate);
    deletionDate.setDate(deletionDate.getDate() + 7);
    return differenceInDays(deletionDate, new Date());
  };

  // Only task creators (non-admin) can restore tasks
  const canRestore = (task: Task) => {
    if (isAdmin) return false; // Admin cannot restore, only delete
    const creatorId = typeof task.createdBy === 'object' ? (task.createdBy as any)._id : task.createdBy;
    return creatorId === (user?._id || user?.id);
  };

  // Handle taskId from URL params (from notification clicks)
  useEffect(() => {
    const taskIdFromUrl = searchParams.get('taskId');
    if (taskIdFromUrl && archivedTasks.length > 0) {
      // Find the task in archived tasks
      const task = archivedTasks.find((t: Task) => (t.id || (t as any)._id) === taskIdFromUrl);
      if (task) {
        setSelectedTask(task);
        setDetailModalOpen(true);
        // Remove taskId from URL to clean it up
        searchParams.delete('taskId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, archivedTasks, setSearchParams]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    // For archived tasks, we might not allow updates, but keeping the handler for consistency
    toast.info('Completed tasks cannot be updated');
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Permanently delete this task? This cannot be undone.')) {
      deleteMutation.mutate(taskId);
      setDetailModalOpen(false);
      setSelectedTask(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-success" />
              Completed Tasks
            </h1>
            <p className="text-muted-foreground">
              Completed tasks will be automatically deleted after 7 days.
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {isLoading ? '...' : `${archivedTasks.length} completed`}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search completed tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Archived Tasks Table */}
        <div className="card-elevated overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Task</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Assigned To</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Priority</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Completed</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Auto-Delete</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No completed tasks found.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task: Task) => {
                      const daysLeft = getDaysUntilDeletion(task);
                      const isUrgent = daysLeft !== null && daysLeft <= 3;
                      
                      return (
                        <tr 
                          key={task._id || task.id} 
                          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => handleTaskClick(task)}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-success" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{task.title}</p>
                                <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-foreground">
                            {task.assignments && task.assignments.length > 0
                              ? task.assignments
                                  .map((a: any) => {
                                    const u = a.userId;
                                    if (!u) return null;
                                    if (typeof u === 'object') return (u as any).name;
                                    return task.assignedToName || null;
                                  })
                                  .filter(Boolean)
                                  .join(', ')
                              : task.assignedToName || 'Unassigned'}
                          </td>
                          <td className="p-4">
                            <Badge 
                              variant={
                                task.priority === 'high' ? 'priorityHigh' : 
                                task.priority === 'medium' ? 'priorityMedium' : 'priorityLow'
                              }
                            >
                              {task.priority}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              {task.completedAt 
                                ? format(new Date(task.completedAt), 'MMM d, yyyy')
                                : 'N/A'}
                            </div>
                          </td>
                          <td className="p-4">
                            {daysLeft !== null ? (
                              <span className={cn(
                                "text-sm font-medium",
                                isUrgent ? "text-danger" : "text-muted-foreground"
                              )}>
                                {isUrgent && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                                {daysLeft <= 0 ? 'Pending deletion' : `${daysLeft} days`}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {canRestore(task) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => restoreMutation.mutate(task._id || task.id)}
                                  disabled={restoreMutation.isPending}
                                  className="gap-1"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Restore
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Permanently delete this task? This cannot be undone.')) {
                                      deleteMutation.mutate(task._id || task.id);
                                    }
                                  }}
                                  disabled={deleteMutation.isPending}
                                  className="gap-1 text-danger hover:text-danger hover:bg-danger/10 border-danger/20"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Auto-Delete Policy</p>
              <p className="text-sm text-muted-foreground mt-1">
                Completed tasks will be automatically deleted after 7 days. Admins can permanently delete tasks at any time.
              </p>
            </div>
          </div>
        </div>

        {/* Task Detail Modal */}
        <TaskDetailModal
          task={selectedTask}
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          onUpdateTask={handleUpdateTask}
          onCompleteTask={() => {}} // Completed tasks can't be completed again
          onDeleteTask={handleDeleteTask}
        />
      </div>
    </DashboardLayout>
  );
}
