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

  const { data: completedTasks = [] } = useQuery({
    queryKey: ['tasks', 'completed'],
    queryFn: async () => {
      const res = await api.get('/tasks?completed=true');
      return res.data as Task[];
    },
  });

  const activeTasks = (tasks as Task[]).filter((t) => !t.isArchived);
  const allTasks = [...activeTasks, ...(completedTasks as Task[])];

  const employeeWorkload = (users as User[]).map((employee) => {
    const userId = (employee._id || employee.id) as string;

    // All tasks (active + completed) assigned to this user
    const allAssignedTasks = allTasks.filter((t: Task) =>
      t.assignments?.some((a: any) => {
        if (!a || !a.userId) return false;
        const assigneeId =
          typeof a.userId === 'object' ? (a.userId as any)._id : a.userId;
        return assigneeId === userId;
      })
    );

    const taskGiven = allAssignedTasks.length;
    const taskCompleted = allAssignedTasks.filter((t: Task) => t.status === 'completed').length;
    const pendingTask = activeTasks.filter((t: Task) => 
      t.status === 'pending' && t.assignments?.some((a: any) => {
        if (!a || !a.userId) return false;
        const assigneeId = typeof a.userId === 'object' ? (a.userId as any)._id : a.userId;
        return assigneeId === userId;
      })
    ).length;
    const efficiency = taskGiven > 0 ? Math.round((taskCompleted / taskGiven) * 100) : 0;

    return {
      name: employee.name,
      department: employee.department || 'General',
      taskGiven,
      taskCompleted,
      pendingTask,
      efficiency,
    };
  }).filter((e) => e.taskGiven > 0);

  return (
    <div className="card-elevated p-4">
      <h3 className="text-base font-semibold text-foreground mb-3">Employee Workload</h3>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
        {employeeWorkload.map((employee) => {
          const completedPercent = employee.taskGiven > 0 
            ? Math.round((employee.taskCompleted / employee.taskGiven) * 100) 
            : 0;
          const pendingPercent = employee.taskGiven > 0 
            ? Math.round((employee.pendingTask / employee.taskGiven) * 100) 
            : 0;
          
          return (
            <div key={employee.name} className="border border-border rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{employee.name}</p>
                  <p className="text-[10px] text-muted-foreground">{employee.department}</p>
                </div>
                <div className="text-right ml-2">
                  <p className="text-lg font-bold text-primary">{employee.efficiency}%</p>
                  <p className="text-[9px] text-muted-foreground">Efficiency</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="text-center p-1.5 bg-muted/50 rounded">
                  <p className="text-sm font-semibold text-foreground">{employee.taskGiven}</p>
                  <p className="text-[9px] text-muted-foreground">Given</p>
                </div>
                <div className="text-center p-1.5 bg-success/10 rounded">
                  <p className="text-sm font-semibold text-success">{employee.taskCompleted}</p>
                  <p className="text-[9px] text-muted-foreground">{completedPercent}%</p>
                </div>
                <div className="text-center p-1.5 bg-warning/10 rounded">
                  <p className="text-sm font-semibold text-warning">{employee.pendingTask}</p>
                  <p className="text-[9px] text-muted-foreground">{pendingPercent}%</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
