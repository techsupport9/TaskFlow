import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskFilters } from '@/components/tasks/TaskFilters';
import { QuickFilters } from '@/components/tasks/QuickFilters';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { Button } from '@/components/ui/button';
// import { mockTasks, mockEmployees } from '@/data/mockTasks'; // Removed mock data
import { Task, TaskPriority } from '@/types/taskflow';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, LayoutGrid, List, Loader2 } from 'lucide-react';
import { isPast } from 'date-fns';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export default function Tasks() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [assignedByFilter, setAssignedByFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'created' | 'due' | 'none'>('none');
  const [highPriorityOnly, setHighPriorityOnly] = useState(false);
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [taskView, setTaskView] = useState<'assigned-to-me' | 'assigned-by-me'>('assigned-to-me');

  // Fetch Tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await api.get('/tasks');
      return response.data;
    },
    enabled: !!user,
    refetchInterval: 2000, // Poll every 2 seconds for real-time updates
  });

  // Fetch Users for assignee filter
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
    enabled: !!user,
  });

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async (newTask: any) => {
      return await api.post('/tasks', newTask);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully');
      setCreateModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create task');
    }
  });

  // Update Task Mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      return await api.patch(`/tasks/${id}`, updates);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'completed'] });
      // Update selected task in modal if open
      if (selectedTask?.id === data.data._id || selectedTask?.id === data.data.id) {
        setSelectedTask(prev => prev ? { ...prev, ...data.data } : null);
      }
      toast.success('Task updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update task');
    }
  });

  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'completed'] });
      setDetailModalOpen(false);
      setSelectedTask(null);
      toast.success('Task deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete task');
    }
  });


  // Note: Core Managers only see "My Tasks" - no tabs needed
  // Admin sees all tasks directly

  // Filter out archived and completed tasks - they should be in the Completed window
  const activeTasks = useMemo(() => tasks.filter((t: Task) => !t.isArchived && t.status !== 'completed'), [tasks]);

  // Separate tasks into assigned to me and assigned by me (for Core Managers)
  const { myTasks, tasksAssignedByMe } = useMemo(() => {
    const assignedToMe: Task[] = [];
    const assignedByMe: Task[] = [];

    if (!user) return { myTasks: [], tasksAssignedByMe: [] };

    const myId = user.id || user._id;

    activeTasks.forEach((task: Task) => {
      // Check if user is in the assignments array (assigned to me)
      const isAssigned = task.assignments?.some((a: any) => {
        if (!a || !a.userId) return false;
        const aId = typeof a.userId === 'object' ? a.userId._id : a.userId;
        return aId === myId;
      });

      // Legacy check
      const isLegacyAssigned = task.assignedTo && (
        task.assignedTo === myId ||
        (typeof task.assignedTo === 'object' && (task.assignedTo as any)?._id === myId)
      );

      // Check if user created the task (assigned by me)
      const creatorId = typeof task.createdBy === 'object' 
        ? (task.createdBy as any)?._id 
        : task.createdBy;
      const isCreatedByMe = creatorId === myId;

      if (isAssigned || isLegacyAssigned) {
        assignedToMe.push(task);
      }
      
      if (isCreatedByMe) {
        assignedByMe.push(task);
      }
    });

    return { myTasks: assignedToMe, tasksAssignedByMe: assignedByMe };
  }, [activeTasks, user]);

  const filterTasks = (taskList: Task[]) => {
    return taskList.filter(task => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          task.title.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query)) ||
          (task.assignedToName && task.assignedToName.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Assignee filter - check if any selected assignee is in the task's assignments
      if (assigneeFilter.length > 0) {
        const hasSelectedAssignee = task.assignments?.some((a: any) => {
          if (!a || !a.userId) return false;
          const assigneeId = typeof a.userId === 'object' ? (a.userId as any)._id : a.userId;
          return assigneeFilter.includes(assigneeId);
        });
        if (!hasSelectedAssignee) return false;
      }

      // Assigned By filter - check if task creator matches selected users
      if (assignedByFilter.length > 0) {
        const creatorId = typeof task.createdBy === 'object' 
          ? (task.createdBy as any)?._id 
          : task.createdBy;
        if (!creatorId || !assignedByFilter.includes(creatorId)) {
          return false;
        }
      }

      // Quick filters for My Tasks tab
      if (highPriorityOnly && task.priority !== 'high') {
        return false;
      }

      if (delayedOnly && !(isPast(new Date(task.dueDate)) && task.status !== 'completed')) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'delayed') {
          if (!(isPast(new Date(task.dueDate)) && task.status !== 'completed')) {
            return false;
          }
        } else if (task.status !== statusFilter) {
          return false;
        }
      }

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  };

  // Sort tasks based on sortBy option
  const sortTasks = (taskList: Task[]) => {
    if (sortBy === 'none') return taskList;
    
    const sorted = [...taskList];
    sorted.sort((a, b) => {
      if (sortBy === 'created') {
        const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return dateB - dateA; // Newest first
      } else if (sortBy === 'due') {
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        return dateA - dateB; // Earliest due date first
      }
      return 0;
    });
    return sorted;
  };

  const filteredMyTasks = useMemo(() => sortTasks(filterTasks(myTasks)), [myTasks, searchQuery, statusFilter, priorityFilter, assigneeFilter, assignedByFilter, sortBy, highPriorityOnly, delayedOnly]);
  const filteredTasksAssignedByMe = useMemo(() => sortTasks(filterTasks(tasksAssignedByMe)), [tasksAssignedByMe, searchQuery, statusFilter, priorityFilter, assigneeFilter, assignedByFilter, sortBy]);
  const filteredAllTasks = useMemo(() => sortTasks(filterTasks(activeTasks)), [activeTasks, searchQuery, statusFilter, priorityFilter, assigneeFilter, assignedByFilter, sortBy]);

  const handleCreateTask = (taskData: {
    title: string;
    description: string;
    assignments: string[];
    priority: TaskPriority;
    dueDate: string;
  }) => {
    createTaskMutation.mutate(taskData);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    updateTaskMutation.mutate({ id: taskId, updates });
  };

  const handleCompleteTask = (taskId: string) => {
    updateTaskMutation.mutate({
      id: taskId,
      updates: { status: 'completed' }
    });
    setDetailModalOpen(false);
    setSelectedTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
  };

  const renderTaskList = (taskList: Task[], emptyMessage: string) => {
    if (taskList.length === 0) {
      return (
        <div className="card-elevated p-12 text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }

    // Group tasks into rows of 6 for the 3|3 layout
    const rows: Task[][] = [];
    for (let i = 0; i < taskList.length; i += 6) {
      rows.push(taskList.slice(i, i + 6));
    }

    if (viewMode === 'list') {
      // List view: compact horizontal rows with 3|3 split
      return (
        <div className="max-h-[calc(100vh-320px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent space-y-4">
          {rows.map((row, rowIndex) => {
            const leftTasks = row.slice(0, 3);
            const rightTasks = row.slice(3);
            return (
              <div key={rowIndex} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  {leftTasks.map((task) => (
                    <TaskCard
                      key={task.id || (task as any)._id}
                      task={task}
                      onClick={() => handleTaskClick(task)}
                      compact={true}
                    />
                  ))}
                </div>
                <div className="flex flex-col gap-1">
                  {rightTasks.map((task) => (
                    <TaskCard
                      key={task.id || (task as any)._id}
                      task={task}
                      onClick={() => handleTaskClick(task)}
                      compact={true}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Grid view: 6 cards per row (3 | 3 with gap in middle)
    return (
      <div className="max-h-[calc(100vh-320px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent space-y-4">
        {rows.map((row, rowIndex) => {
          const leftTasks = row.slice(0, 3);
          const rightTasks = row.slice(3);
          return (
            <div key={rowIndex} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {leftTasks.map((task) => (
                  <TaskCard
                    key={task.id || (task as any)._id}
                    task={task}
                    onClick={() => handleTaskClick(task)}
                    compact={false}
                  />
                ))}
              </div>
              {/* Right 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {rightTasks.map((task) => (
                  <TaskCard
                    key={task.id || (task as any)._id}
                    task={task}
                    onClick={() => handleTaskClick(task)}
                    compact={false}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
            <p className="text-muted-foreground">
              {isLoading ? (
                <span className="flex items-center gap-2">Connecting to Backend... <Loader2 className="w-3 h-3 animate-spin" /></span>
              ) : (
                isAdmin
                  ? `${filteredAllTasks.length} active task${filteredAllTasks.length !== 1 ? 's' : ''}`
                  : `${filteredMyTasks.length} assigned to you • ${filteredTasksAssignedByMe.length} assigned by you`
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center border border-border rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="px-3"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="px-3"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Create Task Button (Admins and Core Managers) */}
            {(user?.role === 'admin' || user?.role === 'core_manager') && (
              <Button variant="gradient" onClick={() => setCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <TaskFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
          assigneeFilter={assigneeFilter}
          onAssigneeChange={setAssigneeFilter}
          assignedByFilter={assignedByFilter}
          onAssignedByChange={setAssignedByFilter}
          users={users}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {/* Task View Tabs - Core Managers see "Assigned To You" and "Assigned By You" */}
        {!isAdmin ? (
          <Tabs value={taskView} onValueChange={(v) => setTaskView(v as 'assigned-to-me' | 'assigned-by-me')} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="assigned-to-me" className="flex items-center gap-2">
                Task assigned to you
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                  {filteredMyTasks.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="assigned-by-me" className="flex items-center gap-2">
                Task assigned by you
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                  {filteredTasksAssignedByMe.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assigned-to-me" className="mt-6">
              {/* Quick Filters for Assigned To Me */}
              <QuickFilters
                highPriorityOnly={highPriorityOnly}
                delayedOnly={delayedOnly}
                onHighPriorityToggle={() => setHighPriorityOnly(!highPriorityOnly)}
                onDelayedToggle={() => setDelayedOnly(!delayedOnly)}
                onClearAll={() => {
                  setHighPriorityOnly(false);
                  setDelayedOnly(false);
                }}
                hasActiveFilters={highPriorityOnly || delayedOnly}
              />
              {renderTaskList(filteredMyTasks, 'No tasks assigned to you. Great job!')}
            </TabsContent>

            <TabsContent value="assigned-by-me" className="mt-6">
              {renderTaskList(filteredTasksAssignedByMe, 'No tasks assigned by you.')}
            </TabsContent>
          </Tabs>
        ) : (
          /* Admin sees all tasks directly */
          renderTaskList(filteredAllTasks, 'No tasks found matching your filters.')
        )}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
        }}
        onCreateTask={handleCreateTask}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onUpdateTask={handleUpdateTask}
        onCompleteTask={handleCompleteTask}
        onDeleteTask={handleDeleteTask}
      />
    </DashboardLayout>
  );
}
