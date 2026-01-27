import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Task } from '@/types/taskflow';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

export function TaskCompletionTrend() {
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await api.get('/tasks');
      return res.data;
    },
  });

  const { data: completedTasks = [] } = useQuery({
    queryKey: ['tasks', 'completed'],
    queryFn: async () => {
      const res = await api.get('/tasks?completed=true');
      return res.data;
    },
  });

  const allTasks = [...tasks, ...completedTasks] as Task[];

  // Get last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return startOfDay(date);
  });

  const chartData = days.map((day) => {
    const dayStr = format(day, 'MMM d');
    
    // Tasks created on this day
    const created = allTasks.filter((t: Task) => {
      const createdDate = new Date(t.createdAt || t.updatedAt || 0);
      return format(startOfDay(createdDate), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
    }).length;

    // Tasks completed on this day
    const completed = allTasks.filter((t: Task) => {
      if (t.status !== 'completed' || !t.completedAt) return false;
      const completedDate = new Date(t.completedAt);
      return format(startOfDay(completedDate), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
    }).length;

    return {
      date: dayStr,
      Created: created,
      Completed: completed,
    };
  });

  const totalCreated = chartData.reduce((sum, d) => sum + d.Created, 0);
  const totalCompleted = chartData.reduce((sum, d) => sum + d.Completed, 0);
  const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;

  return (
    <div className="card-elevated p-6 h-full">
      <h3 className="text-lg font-semibold text-foreground mb-4">Task Completion Trend (7 Days)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={11}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={11}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value: number, name: string) => [
                `${value} tasks`,
                name
              ]}
            />
            <Legend 
              formatter={(value) => (
                <span className="text-xs text-muted-foreground">{value}</span>
              )}
            />
            <Line 
              type="monotone" 
              dataKey="Created" 
              stroke="hsl(215, 20%, 65%)" 
              strokeWidth={2}
              dot={{ fill: 'hsl(215, 20%, 65%)', r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="Completed" 
              stroke="hsl(158, 64%, 42%)" 
              strokeWidth={2}
              dot={{ fill: 'hsl(158, 64%, 42%)', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-muted-foreground">Total Created: </span>
            <span className="font-semibold text-foreground">{totalCreated}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Completed: </span>
            <span className="font-semibold text-success">{totalCompleted}</span>
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Completion Rate: </span>
          <span className="font-semibold text-primary">{completionRate}%</span>
        </div>
      </div>
    </div>
  );
}
