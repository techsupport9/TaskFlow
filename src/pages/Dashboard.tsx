import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { SLAComplianceChart } from '@/components/dashboard/SLAComplianceChart';
import { TasksByStatusChart } from '@/components/dashboard/TasksByStatusChart';
import { WorkloadHeatmap } from '@/components/dashboard/WorkloadHeatmap';
import { TaskCard } from '@/components/tasks/TaskCard';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  Users,
  Zap
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { isPast } from 'date-fns';
import { Task } from '@/types/taskflow';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function Dashboard() {
  const { user, company, isSuperAdmin, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Fetch Active Tasks (not for super_admin)
  const { data: activeTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await api.get('/tasks');
      return res.data;
    },
    enabled: !isSuperAdmin,
    refetchInterval: 2000,
  });

  // Fetch Completed Tasks separately
  const { data: completedTasks = [] } = useQuery({
    queryKey: ['tasks', 'completed'],
    queryFn: async () => {
      const res = await api.get('/tasks?completed=true');
      return res.data;
    },
    enabled: !isSuperAdmin,
    refetchInterval: 2000,
  });

  // Combine all tasks for total calculations
  const allTasks = [...activeTasks, ...completedTasks];

  // Helper to check if user is assigned to a task
  const isUserAssigned = (task: Task) => {
    if (!user) return false;
    const myId = (user._id || (user as any).id) as string;
    return task.assignments?.some((a: any) => {
      if (!a || !a.userId) return false;
      const assigneeId = typeof a.userId === 'object' ? (a.userId as any)._id : a.userId;
      return assigneeId === myId;
    });
  };

  // Filter tasks for current user (Core Manager view)
  const myActiveTasks = activeTasks.filter((t: Task) => isUserAssigned(t));
  const myCompletedTasks = completedTasks.filter((t: Task) => isUserAssigned(t));
  const myAllTasks = [...myActiveTasks, ...myCompletedTasks];

  // Stats calculations based on role
  const isManagerView = user?.role === 'core_manager';
  const relevantActiveTasks = isManagerView ? myActiveTasks : activeTasks;
  const relevantCompletedTasks = isManagerView ? myCompletedTasks : completedTasks;
  const relevantAllTasks = isManagerView ? myAllTasks : allTasks;

  // Pending tasks (status === 'pending')
  const pendingTasks = relevantActiveTasks.filter((t: Task) => t.status === 'pending');

  // In Progress tasks
  const inProgressTasks = relevantActiveTasks.filter((t: Task) => t.status === 'in_progress');

  // Delayed tasks (past due date and not completed)
  const delayedTasks = relevantActiveTasks.filter((t: Task) => 
    isPast(new Date(t.dueDate)) && t.status !== 'completed'
  );

  // Completed count
  const completedCount = relevantCompletedTasks.length;

  // Urgent Tasks (high priority or overdue)
  const urgentTasks = relevantActiveTasks
    .filter((t: Task) => t.priority === 'high' || (t.dueDate && isPast(new Date(t.dueDate))))
    .slice(0, 3);

  // Priority distribution for chart
  const highPriorityCount = relevantActiveTasks.filter((t: Task) => t.priority === 'high').length;
  const mediumPriorityCount = relevantActiveTasks.filter((t: Task) => t.priority === 'medium').length;
  const lowPriorityCount = relevantActiveTasks.filter((t: Task) => t.priority === 'low').length;

  const priorityData = [
    { name: 'High', value: highPriorityCount, color: 'hsl(0, 84%, 60%)' },
    { name: 'Medium', value: mediumPriorityCount, color: 'hsl(38, 92%, 50%)' },
    { name: 'Low', value: lowPriorityCount, color: 'hsl(158, 64%, 42%)' },
  ];

  // Handle task card click - navigate to tasks page
  const handleTaskClick = () => {
    navigate('/tasks');
  };

  // Super Admin Dashboard - different view
  if (isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user?.name.split(' ')[0]}
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your organization's admins from the Team page.
            </p>
          </div>

          <div className="card-elevated p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Super Admin Panel</h2>
            <p className="text-muted-foreground mb-6">
              As a Super Admin, your role is to manage Admins who will handle task assignments and team operations.
            </p>
            <Link to="/team">
              <Button variant="gradient" size="lg">
                <Users className="w-5 h-5 mr-2" />
                Manage Admins
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user?.name.split(' ')[0]}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin
                ? `Here's what's happening at ${company?.name} today.`
                : "Here is your daily agenda."}
            </p>
          </div>
          <Link to="/tasks">
            <Button variant="gradient">
              View All Tasks
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title={isAdmin ? "Pending Tasks" : "My Pending Tasks"}
            value={pendingTasks.length}
            icon={<CheckSquare className="w-6 h-6" />}
          />
          <StatsCard
            title="In Progress"
            value={inProgressTasks.length}
            icon={<Clock className="w-6 h-6" />}
            iconClassName="bg-primary/10 text-primary"
          />
          <StatsCard
            title="Delayed"
            value={delayedTasks.length}
            icon={<AlertTriangle className="w-6 h-6" />}
            iconClassName="bg-danger/10 text-danger"
          />
          <StatsCard
            title="Completed"
            value={completedCount}
            icon={<UserCheck className="w-6 h-6" />}
            iconClassName="bg-success/10 text-success"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tasks by Status - Bar Chart */}
          <TasksByStatusChart
            pending={pendingTasks.length}
            inProgress={inProgressTasks.length}
            completed={completedCount}
            delayed={delayedTasks.length}
          />
          
          {/* Priority Distribution - Pie Chart */}
          <div className="card-elevated p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-warning" />
              Priority Distribution
            </h3>
            <div className="h-64">
              {(highPriorityCount + mediumPriorityCount + lowPriorityCount) > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value} tasks`, '']}
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
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No active tasks
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SLA & Workload Row - Admin Only */}
        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SLAComplianceChart
              onTime={completedCount}
              delayed={delayedTasks.length}
            />
            <WorkloadHeatmap />
          </div>
        )}

        {/* Core Manager Performance */}
        {!isAdmin && (
          <div className="card-elevated p-6">
            <h3 className="font-semibold mb-4 text-lg">My Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <p className="text-muted-foreground text-sm">Completion Rate</p>
                <p className="text-3xl font-bold text-primary">
                  {myAllTasks.length > 0 ? Math.round((myCompletedTasks.length / myAllTasks.length) * 100) : 0}%
                </p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <p className="text-muted-foreground text-sm">Total Assigned</p>
                <p className="text-3xl font-bold text-foreground">{myAllTasks.length}</p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <p className="text-muted-foreground text-sm">Active Tasks</p>
                <p className="text-3xl font-bold text-foreground">{myActiveTasks.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Urgent Tasks */}
        {urgentTasks.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-danger" />
                {isAdmin ? "Attention Required" : "My Urgent Tasks"}
              </h2>
              <Link to="/tasks" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {urgentTasks.map((task: Task) => (
                <TaskCard 
                  key={task._id || task.id} 
                  task={task} 
                  onClick={handleTaskClick}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
