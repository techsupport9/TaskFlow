import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TasksByStatusChartProps {
  pending: number;
  inProgress: number;
  completed: number;
  delayed: number;
}

export function TasksByStatusChart({ pending, inProgress, completed, delayed }: TasksByStatusChartProps) {
  const data = [
    { name: 'Pending', value: pending, color: 'hsl(215, 20%, 65%)' },
    { name: 'In Progress', value: inProgress, color: 'hsl(221, 83%, 53%)' },
    { name: 'Completed', value: completed, color: 'hsl(158, 64%, 42%)' },
    { name: 'Delayed', value: delayed, color: 'hsl(0, 84%, 60%)' },
  ];

  return (
    <div className="card-elevated p-6 h-full">
      <h3 className="text-lg font-semibold text-foreground mb-4">Tasks by Status</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis 
              dataKey="name" 
              type="category" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
