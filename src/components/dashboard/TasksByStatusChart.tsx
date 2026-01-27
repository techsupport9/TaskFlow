import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TasksByStatusChartProps {
  pending: number;
  completed: number;
  delayed: number;
}

const CustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  
  // Get the data entry from the chart context
  // In Recharts, the payload might be in a different structure
  const dataEntry = props.payload || props;
  const percent = dataEntry?.percent ?? 0;
  
  if (!value || value === 0) return null;
  
  return (
    <text
      x={x + width + 5}
      y={y + 15}
      fill="hsl(var(--foreground))"
      fontSize={11}
      fontWeight={500}
    >
      {value} ({percent}%)
    </text>
  );
};

export function TasksByStatusChart({ pending, completed, delayed }: TasksByStatusChartProps) {
  const total = pending + completed + delayed;
  const pendingPercent = total > 0 ? Math.round((pending / total) * 100) : 0;
  const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const delayedPercent = total > 0 ? Math.round((delayed / total) * 100) : 0;

  const data = [
    { name: 'Pending', value: pending, percent: pendingPercent, color: 'hsl(215, 20%, 65%)' },
    { name: 'Completed', value: completed, percent: completedPercent, color: 'hsl(158, 64%, 42%)' },
    { name: 'Delayed', value: delayed, percent: delayedPercent, color: 'hsl(0, 84%, 60%)' },
  ];

  return (
    <div className="card-elevated p-6 h-full">
      <h3 className="text-lg font-semibold text-foreground mb-4">Tasks by Status</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 100, top: 5, bottom: 5 }}>
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
              formatter={(value: number, name: string, props: any) => [
                `${props.payload.percent}% (${value} tasks)`,
                name
              ]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} label={(props: any) => {
              const entry = data.find((d) => d.value === props.value);
              return (
                <text
                  x={props.x + props.width + 5}
                  y={props.y + 15}
                  fill="hsl(var(--foreground))"
                  fontSize={11}
                  fontWeight={500}
                >
                  {props.value} ({entry?.percent ?? 0}%)
                </text>
              );
            }}>
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
