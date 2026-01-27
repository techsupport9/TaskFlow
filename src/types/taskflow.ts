export type UserRole = 'super_admin' | 'admin' | 'core_manager';

export type TaskPriority = 'high' | 'medium' | 'low';

export type TaskStatus = 'pending' | 'completed' | 'delayed' | 'archived';

export type NotificationType = 'task_assigned' | 'task_completed' | 'task_delayed' | 'task_commented' | 'task_transferred' | 'task_updated' | 'task_removed';

export type AuditAction = 'created' | 'updated' | 'completed' | 'archived' | 'restored' | 'deleted' | 'transferred';

export interface Company {
  id: string;
  name: string;
  logo?: string;
  createdAt: Date;
}

export interface Team {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  managerId: string;
  members: string[];
  createdAt: Date;
}

export interface User {
  _id?: string;
  id: string; // Keep id for frontend compatibility, but often Mongoose sends _id
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  companyId: string;
  department?: string;
  teamId?: string;
  managedTeams?: string[];
  visibilityScope?: string[];
  createdAt: Date;
}

// Assignment Sub-document
export interface TaskAssignment {
  userId: string;
  userName?: string; // Cache
  status: 'pending' | 'completed';
  progress: number;
  completedAt?: Date | string;
}

export type VisibilityScope = 'public' | 'team' | 'private' | 'custom';

export interface Task {
  _id?: string; // Handle MongoDB _id
  id: string;   // Frontend friendly ID
  companyId: string;
  teamId?: string;

  // Replaced assignedTo with assignments array
  assignments: TaskAssignment[];

  // Backwards compatibility helpers
  assignedTo?: string;
  assignedToName?: string;

  visibility: VisibilityScope;
  allowedViewers?: string[];

  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: Date | string;
  status: TaskStatus; // Overall status
  progress: number;   // Overall progress

  comments: TaskComment[];
  subtasks?: string[];
  parentTaskId?: string;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt?: Date | string;
  archivedAt?: Date | string;
  isArchived: boolean;
  delayDays?: number;
  order?: number;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
}

export interface ArchivedTask extends Task {
  archivedAt: Date;
  completedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  taskId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface TaskAuditLog {
  id: string;
  taskId: string;
  action: AuditAction;
  changedBy: string;
  previousState?: Partial<Task>;
  newState: Partial<Task>;
  timestamp: Date;
}

export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  action: string;
  targetType: 'task' | 'user' | 'company';
  targetId: string;
  details: Record<string, unknown>;
  createdAt: Date;
}

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  delayedTasks: number;
  pendingTasks: number;
  slaComplianceRate: number;
  averageCompletionTime: number;
}

export interface Note {
  _id?: string;
  id: string;
  title: string;
  content: string;
  userId: string;
  isPinned: boolean;
  color: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
