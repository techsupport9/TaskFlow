import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SLAComplianceChartProps {
  onTime: number;
  delayed: number;
}

export function SLAComplianceChart({ onTime, delayed }: SLAComplianceChartProps) {
  const total = onTime + delayed;
  const onTimePercent = total > 0 ? Math.round((onTime / total) * 100) : 0;
  const delayedPercent = total > 0 ? Math.round((delayed / total) * 100) : 0;

  const data = [
    { name: 'On Time', value: onTime, percent: onTimePercent, color: 'hsl(158, 64%, 42%)' },
    { name: 'Delayed', value: delayed, percent: delayedPercent, color: 'hsl(0, 84%, 60%)' },
  ];

  const complianceRate = onTimePercent;

  return (
    <div className="card-elevated p-6 h-full">
      <h3 className="text-lg font-semibold text-foreground mb-4">Overall Delay</h3>
      <div className="h-64 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value: number, name: string, props: any) => [
                `${props.payload.percent}% (${value} tasks)`,
                name
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center Label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center -mt-8">
            <p className="text-4xl font-bold text-foreground">{complianceRate}%</p>
            <p className="text-sm text-muted-foreground">Compliance</p>
          </div>
        </div>
      </div>
    </div>
  );
}
