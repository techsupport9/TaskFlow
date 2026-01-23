import { Task, User } from '@/types/taskflow';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';
import { mockEmployees } from '@/data/mockTasks';

export interface TaskPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
  canTransfer: boolean;
  canCreateSubtask: boolean;
  canArchive: boolean;
  canComplete: boolean;
  canAddComment: boolean;
  canRestore: boolean;
}

const defaultPermissions: TaskPermissions = {
  canEdit: false,
  canDelete: false,
  canAssign: false,
  canTransfer: false,
  canCreateSubtask: false,
  canArchive: false,
  canComplete: false,
  canAddComment: false,
  canRestore: false,
};

export function useTaskPermissions(task: Task | null | undefined): TaskPermissions {
  const { user } = useAuth();

  return useMemo(() => {
    // Return default permissions if user or task is null/undefined
    if (!user || !task) {
      return defaultPermissions;
    }

    // Extra safety check - ensure task has expected properties
    if (typeof task !== 'object') {
      return defaultPermissions;
    }

    const currentUserId = user._id || (user as any).id;

    // Creator: handle both raw ID and populated user - with null safety
    let createdById: string | undefined;
    if (task.createdBy) {
      createdById = typeof task.createdBy === 'object' 
        ? (task.createdBy as any)?._id 
        : task.createdBy;
    }
    const isCreator = !!currentUserId && !!createdById && createdById === currentUserId;

    // Assignee: check assignments array
    const isAssignee = !!(
      currentUserId &&
      task.assignments?.some((a: any) => {
        if (!a || !a.userId) return false;
        const assigneeId =
          typeof a.userId === 'object' ? (a.userId as any)?._id : a.userId;
        return assigneeId === currentUserId;
      })
    );
    const isAdmin = user.role === 'admin';
    const isCoreManager = user.role === 'core_manager';

    // Check if user is in the same team - with null safety
    let taskTeamId: string | undefined;
    if (task.teamId) {
      taskTeamId = typeof task.teamId === 'object' 
        ? (task.teamId as any)?._id 
        : task.teamId;
    }
    const isSameTeam = !!user.teamId && !!taskTeamId && taskTeamId === user.teamId;

    // Check if user manages the task's team
    const managesTeam = taskTeamId ? (user.managedTeams?.includes(taskTeamId) || false) : false;

    return {
      // Super admins have no task permissions; Admins own tasks; Core managers execute
      canEdit: isAdmin || (isCoreManager && isCreator),
      canDelete: isAdmin || (isCoreManager && isCreator),
      canAssign: isAdmin,
      canTransfer: isAdmin && managesTeam,
      canCreateSubtask: isAdmin,
      canArchive: isAdmin,
      canComplete: isAdmin || isAssignee,
      canAddComment: isAdmin || isAssignee || (isCoreManager && isCreator),
      canRestore: isAdmin,
    };
  }, [user, task]);
}

/**
 * Hook to check if user can view a task based on visibility scope
 */
export function useCanViewTask(task: Task | null | undefined): boolean {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user || !task || typeof task !== 'object') return false;

    // Admins can view all
    if (user.role === 'admin') return true;

    const currentUserId = user._id || (user as any).id;

    // Check if task is assigned to user via assignments
    if (
      currentUserId &&
      task.assignments?.some((a: any) => {
        if (!a || !a.userId) return false;
        const assigneeId =
          typeof a.userId === 'object' ? (a.userId as any)?._id : a.userId;
        return assigneeId === currentUserId;
      })
    ) {
      return true;
    }

    // Check if user created the task
    let createdById: string | undefined;
    if (task.createdBy) {
      createdById = typeof task.createdBy === 'object'
        ? (task.createdBy as any)?._id
        : task.createdBy;
    }
    if (currentUserId && createdById && createdById === currentUserId) return true;

    // Check if in explicit visibility scope (custom)
    if (
      currentUserId &&
      task.allowedViewers?.some((viewerId: any) => {
        if (!viewerId) return false;
        const vId =
          typeof viewerId === 'object' ? (viewerId as any)?._id : viewerId;
        return vId === currentUserId;
      })
    ) {
      return true;
    }

    // Check if same team and manager
    if (user.role === 'manager' && task.teamId === user.teamId) return true;

    return false;
  }, [user, task]);
}

/**
 * Hook to get list of users a task can be transferred to
 */
export function useTransferableUsers(task: Task | null | undefined): string[] {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user || !task || typeof task !== 'object') return [];

    // NOTE: This hook still uses mockEmployees; real implementation would
    // fetch from backend. For now we only filter out already-assigned users.

    let taskTeamId: string | undefined;
    if (task.teamId) {
      taskTeamId = typeof task.teamId === 'object' 
        ? (task.teamId as any)?._id 
        : task.teamId;
    }

    // Collect current assignee IDs from assignments
    const currentAssigneeIds = (task.assignments || []).map((a: any) => {
      if (!a || !a.userId) return null;
      return typeof a.userId === 'object'
        ? (a.userId as any)?._id
        : a.userId;
    }).filter(Boolean) as string[];

    const isOnTaskTeam = (emp: User) => emp.teamId === taskTeamId;

    if (user.role === 'admin') {
      return mockEmployees
        .filter((emp: User) => !currentAssigneeIds.includes(emp.id))
        .map((emp: User) => emp.id);
    }

    if (user.role === 'manager' && taskTeamId === user.teamId) {
      return mockEmployees
        .filter(
          (emp: User) =>
            isOnTaskTeam(emp) && !currentAssigneeIds.includes(emp.id)
        )
        .map((emp: User) => emp.id);
    }

    if (user.role === 'team_member' && taskTeamId === user.teamId) {
      return mockEmployees
        .filter(
          (emp: User) =>
            isOnTaskTeam(emp) && !currentAssigneeIds.includes(emp.id)
        )
        .map((emp: User) => emp.id);
    }

    return [];
  }, [user, task]);
}
