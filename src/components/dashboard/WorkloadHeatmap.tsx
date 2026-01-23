import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Task, User } from '@/types/taskflow';

export function WorkloadHeatmap() {
  // Fetch real users and tasks
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data as User[];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await api.get('/tasks');
      return res.data as Task[];
    },
  });

  const activeTasks = (tasks as Task[]).filter((t) => !t.isArchived);

  const employeeWorkload = (users as User[]).map((employee) => {
    const userId = (employee._id || employee.id) as string;

    // Tasks where this user is in assignments
    const assignedTasks = activeTasks.filter((t: Task) =>
      t.assignments?.some((a: any) => {
        if (!a || !a.userId) return false;
        const assigneeId =
          typeof a.userId === 'object' ? (a.userId as any)._id : a.userId;
        return assigneeId === userId;
      })
    );

    const highPriority = assignedTasks.filter((t) => t.priority === 'high').length;
    const total = assignedTasks.length;

    return {
      name: employee.name,
      department: employee.department || 'General',
      total,
      highPriority,
      intensity: Math.min(total / 4, 1), // Normalize to 0-1
    };
  }).filter((e) => e.total > 0);

  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return 'bg-muted';
    if (intensity < 0.3) return 'bg-primary/20';
    if (intensity < 0.6) return 'bg-primary/50';
    if (intensity < 0.8) return 'bg-primary/70';
    return 'bg-primary';
  };

  return (
    <div className="card-elevated p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Employee Workload</h3>
      <div className="space-y-3">
        {employeeWorkload.map((employee) => (
          <div key={employee.name} className="flex items-center gap-4">
            <div className="w-32 truncate">
              <p className="text-sm font-medium text-foreground truncate">{employee.name}</p>
              <p className="text-xs text-muted-foreground">{employee.department}</p>
            </div>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden flex">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex-1 transition-colors',
                      i < employee.total ? getIntensityColor(employee.intensity) : 'bg-muted',
                      i > 0 && 'border-l border-background/50'
                    )}
                  />
                ))}
              </div>
              <div className="w-20 text-right">
                <span className="text-sm font-medium">{employee.total}</span>
                <span className="text-xs text-muted-foreground ml-1">tasks</span>
                {employee.highPriority > 0 && (
                  <span className="text-xs text-danger ml-2">({employee.highPriority} high)</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
