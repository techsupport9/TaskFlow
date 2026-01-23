import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Task, User } from '@/types/taskflow';

export function DepartmentPerformance() {
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

  // Build department-level completion rates based on current data
  const departments = Array.from(
    new Set((users as User[]).map((u) => u.department || 'General'))
  );

  const data = departments.map((dept) => {
    const deptUsers = (users as User[]).filter(
      (u) => (u.department || 'General') === dept
    );
    const deptUserIds = deptUsers.map(
      (u) => (u._id || u.id) as string
    );

    const deptTasks = activeTasks.filter((t: Task) =>
      t.assignments?.some((a: any) => {
        if (!a || !a.userId) return false;
        const assigneeId =
          typeof a.userId === 'object' ? (a.userId as any)._id : a.userId;
        return deptUserIds.includes(assigneeId as string);
      })
    );

    const total = deptTasks.length;
    const completed = deptTasks.filter((t) => t.status === 'completed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      department: dept,
      completionRate,
    };
  });

  return (
    <div className="card-elevated p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Department Completion Rate
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="department"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value: number) => [`${value}%`, 'Completion']}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-muted-foreground">{value}</span>
              )}
            />
            <Line
              type="monotone"
              dataKey="completionRate"
              name="Completion Rate"
              stroke="hsl(221, 83%, 53%)"
              strokeWidth={2}
              dot={{ fill: 'hsl(221, 83%, 53%)', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
