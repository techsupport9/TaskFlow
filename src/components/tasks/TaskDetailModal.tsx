import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Task, User } from '@/types/taskflow';
import { useAuth } from '@/contexts/AuthContext';
import { useTaskPermissions } from '@/hooks/useTaskPermissions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { 
  Calendar, User as UserIcon, MessageSquare, AlertTriangle, CheckCircle2, Send, 
  Trash2, UserPlus, ArrowRightLeft, X, Pencil
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, isPast, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onCompleteTask: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
}

export function TaskDetailModal({
  task,
  open,
  onOpenChange,
  onUpdateTask,
  onCompleteTask,
  onDeleteTask,
}: TaskDetailModalProps) {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showAddAssigneeDialog, setShowAddAssigneeDialog] = useState(false);
  const [showShiftAssigneeDialog, setShowShiftAssigneeDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [transferToUser, setTransferToUser] = useState('');
  const [newAssignees, setNewAssignees] = useState<string[]>([]);
  const [shiftFromUsers, setShiftFromUsers] = useState<string[]>([]);
  const [shiftToUsers, setShiftToUsers] = useState<string[]>([]);
  
  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editDueDate, setEditDueDate] = useState('');
  
  const permissions = useTaskPermissions(task);

  // Fetch users for transfer/assign
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
    enabled: open && !!user,
  });

  if (!task) return null;

  const taskId = (task as any)._id || task.id;
  const currentUserId = user?._id || (user as any)?.id;

  // Determine current user's assignment
  const myAssignment = task.assignments?.find((a: any) => {
    if (!a || !a.userId || !currentUserId) return false;
    const assigneeId = typeof a.userId === 'object' ? (a.userId as any)._id : a.userId;
    return assigneeId === currentUserId;
  });

  const isAssignee = !!myAssignment;
  const creatorId = typeof task.createdBy === 'object' ? (task.createdBy as any)._id : task.createdBy;
  const isCreator = !!currentUserId && creatorId === currentUserId;

  const isOverdue = isPast(new Date(task.dueDate)) && task.status !== 'completed';
  const daysUntilDue = differenceInDays(new Date(task.dueDate), new Date());

  const isCoreManager = user?.role === 'core_manager';

  // Get users who can be added as assignees based on role
  const getAddableUsers = () => {
    if (!user) return [];
    return users.filter((u: User) => {
      const uId = u._id || u.id;
      // Can't add self
      if (uId === currentUserId) return false;
      // Can't add someone already assigned
      const alreadyAssigned = task.assignments?.some((a: any) => {
        const assigneeId = typeof a.userId === 'object' ? (a.userId as any)._id : a.userId;
        return assigneeId === uId;
      });
      if (alreadyAssigned) return false;
      
      // Admin can add both Admins and Core Managers
      if (isAdmin) {
        return u.role === 'admin' || u.role === 'core_manager';
      }
      // Core Manager can only add other Core Managers
      if (isCoreManager) {
        return u.role === 'core_manager';
      }
      return false;
    });
  };

  // Get users for transfer based on role
  const getTransferableUsers = () => {
    if (!user) return [];
    return users.filter((u: User) => {
      const uId = u._id || u.id;
      // Can't transfer to self
      if (uId === currentUserId) return false;
      
      // Admin transferring task to another Admin
      if (isAdmin) {
        return u.role === 'admin';
      }
      
      // Core Manager transferring their assignment to another Core Manager
      if (isCoreManager && isAssignee) {
        // Can't transfer to someone already assigned
        const alreadyAssigned = task.assignments?.some((a: any) => {
          const assigneeId = typeof a.userId === 'object' ? (a.userId as any)._id : a.userId;
          return assigneeId === uId;
        });
        if (alreadyAssigned) return false;
        return u.role === 'core_manager';
      }
      
      return false;
    });
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !user) return;

    const comment = {
      id: `comment-${Date.now()}`,
      taskId,
      userId: user.id || user._id,
      userName: user.name,
      content: newComment,
      createdAt: new Date(),
    };

    onUpdateTask(taskId, { comments: [...task.comments, comment] });
    setNewComment('');
  };

  const handleTransfer = async () => {
    if (!transferToUser) return;
    
    try {
      if (isAdmin) {
        // Admin transfers entire task to another Admin
        await api.patch(`/tasks/${taskId}`, { transferTaskToAdmin: transferToUser });
      } else if (isCoreManager && isAssignee) {
        // Core Manager transfers their own assignment to another Core Manager
        await api.patch(`/tasks/${taskId}`, { 
          transferAssignment: { 
            fromUserId: currentUserId, 
            toUserId: transferToUser 
          } 
        });
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'completed'] });
      toast.success('Task transferred successfully');
      setShowTransferDialog(false);
      setTransferToUser('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to transfer task');
    }
  };

  // Admin can shift assignees (remove some, add others)
  const handleShiftAssignee = async () => {
    if (shiftFromUsers.length === 0 && shiftToUsers.length === 0) return;
    
    try {
      await api.patch(`/tasks/${taskId}`, { 
        shiftAssignee: { 
          fromUserIds: shiftFromUsers, 
          toUserIds: shiftToUsers 
        } 
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'completed'] });
      toast.success('Assignees shifted successfully');
      setShowShiftAssigneeDialog(false);
      setShiftFromUsers([]);
      setShiftToUsers([]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to shift assignees');
    }
  };

  const handleAddAssignees = async () => {
    if (newAssignees.length === 0) return;
    
    try {
      await api.patch(`/tasks/${taskId}`, { addAssignees: newAssignees });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Assignees added successfully');
      setShowAddAssigneeDialog(false);
      setNewAssignees([]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add assignees');
    }
  };

  const handleRemoveAssignee = async (assigneeId: string) => {
    try {
      await api.patch(`/tasks/${taskId}`, { removeAssignees: [assigneeId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Assignee removed');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove assignee');
    }
  };

  // Check if current user can remove assignees (admin or creator)
  const canRemoveAssignees = isAdmin || isCreator;

  // Check if user can edit task (admin or creator)
  const canEditTask = isAdmin || isCreator;

  // Open edit dialog with pre-populated values
  const openEditDialog = () => {
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditPriority(task.priority);
    setEditDueDate(format(new Date(task.dueDate), 'yyyy-MM-dd'));
    setShowEditDialog(true);
  };

  // Handle saving task edits
  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!editDueDate) {
      toast.error('Due date is required');
      return;
    }

    try {
      await api.patch(`/tasks/${taskId}`, {
        title: editTitle,
        description: editDescription,
        priority: editPriority,
        dueDate: new Date(editDueDate).toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'completed'] });
      toast.success('Task updated successfully');
      setShowEditDialog(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update task');
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'priorityHigh';
      case 'medium': return 'priorityMedium';
      case 'low': return 'priorityLow';
      default: return 'default';
    }
  };

  const transferableUsers = getTransferableUsers();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-semibold pr-8">{task.title}</DialogTitle>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Badge variant={getPriorityVariant(task.priority)}>{task.priority}</Badge>
                {isOverdue && (
                  <Badge variant="statusDelayed" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Delayed
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Description */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
              <p className="text-foreground">{task.description}</p>
            </div>

            {/* Assigned By */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {typeof task.createdBy === 'object' 
                    ? ((task.createdBy as any).name?.split(' ').map((n: string) => n[0]).join('') || '?')
                    : '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-muted-foreground">Assigned By</p>
                <p className="text-sm font-medium">
                  {typeof task.createdBy === 'object' ? (task.createdBy as any).name : 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {typeof task.createdBy === 'object' ? (task.createdBy as any).role?.replace('_', ' ') : ''}
                </p>
              </div>
            </div>

            {/* Assignees Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Assigned To ({task.assignments?.length || 0})
                </h4>
                {canRemoveAssignees && task.assignments && task.assignments.length > 0 && (
                  <span className="text-xs text-muted-foreground">Click × to remove</span>
                )}
              </div>
              
              {task.assignments && task.assignments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {task.assignments.map((a: any, index: number) => {
                    const u = a.userId;
                    if (!u) return null;
                    const userName = typeof u === 'object' ? (u as any).name : task.assignedToName;
                    const assigneeId = typeof u === 'object' ? (u as any)._id : u;
                    
                    return (
                      <div 
                        key={assigneeId || index}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 group"
                      >
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {userName?.split(' ').map((n: string) => n[0]).join('') || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="text-sm font-medium">{userName}</span>
                        </div>
                        {canRemoveAssignees && task.assignments.length > 1 && (
                          <button
                            onClick={() => handleRemoveAssignee(assigneeId)}
                            className="ml-1 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-danger/20 text-danger transition-opacity"
                            title="Remove assignee"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No assignees</p>
              )}
            </div>

            {/* Dates Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Created Date */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Created Date</p>
                  <p className="text-sm font-medium">
                    {format(new Date(task.createdAt || task.updatedAt || new Date()), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {/* Due Date */}
              <div className={cn(
                'flex items-center gap-3 p-3 rounded-lg',
                isOverdue ? 'bg-danger/10' : 'bg-secondary/50'
              )}>
                <Calendar className={cn('w-5 h-5', isOverdue ? 'text-danger' : 'text-muted-foreground')} />
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className={cn('text-sm font-medium', isOverdue && 'text-danger')}>
                    {format(new Date(task.dueDate), 'MMM d, yyyy')}
                    {isOverdue && ` (${Math.abs(daysUntilDue)} days overdue)`}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions based on role */}
            {(isAssignee || isAdmin || isCoreManager) && task.status !== 'completed' && (
              <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <span className="text-sm font-medium text-primary w-full mb-1">
                  Quick Actions ({isAdmin ? 'Admin' : 'Core Manager'})
                </span>

                {/* Edit Task - available to Admin and Creator */}
                {canEditTask && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={openEditDialog}
                    className="gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit Task
                  </Button>
                )}
                
                {/* ADMIN OPTIONS */}
                {isAdmin && (
                  <>
                    {/* 1. Add Core Managers + Admins */}
                    {getAddableUsers().length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowAddAssigneeDialog(true)}
                        className="gap-1"
                      >
                        <UserPlus className="w-3 h-3" />
                        Add Assignee
                      </Button>
                    )}

                    {/* 2. Transfer task to another Admin */}
                    {transferableUsers.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowTransferDialog(true)}
                        className="gap-1"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        Transfer to Admin
                      </Button>
                    )}

                    {/* 3. Shift assignee (remove one, add another) */}
                    {task.assignments && task.assignments.length > 0 && getAddableUsers().length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowShiftAssigneeDialog(true)}
                        className="gap-1"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        Shift Assignee
                      </Button>
                    )}
                  </>
                )}

                {/* CORE MANAGER OPTIONS */}
                {isCoreManager && !isAdmin && (
                  <>
                    {/* 1. Add Core Managers */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowAddAssigneeDialog(true)}
                      className="gap-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      Add Core Manager
                    </Button>

                    {/* 2. Transfer own assignment to another Core Manager */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowTransferDialog(true)}
                      className="gap-1"
                      disabled={!isAssignee}
                      title={!isAssignee ? "You must be assigned to transfer" : ""}
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      Transfer My Assignment
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Comments */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Comments ({task.comments?.length || 0})
              </h4>

              <div className="space-y-3 max-h-48 overflow-y-auto">
                {!task.comments || task.comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
                ) : (
                  task.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-secondary/30">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {comment.userName?.split(' ').map(n => n[0]).join('') || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{comment.userName}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {permissions.canAddComment && task.status !== 'completed' && (
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button size="icon" onClick={handleAddComment} disabled={!newComment.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t border-border justify-between">
              <div className="flex gap-2">
                {permissions.canComplete && task.status !== 'completed' && (
                  <Button
                    variant="default"
                    onClick={() => {
                      onCompleteTask(taskId);
                      onOpenChange(false);
                      toast.success('Task completed!');
                    }}
                    className="gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Complete
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                {permissions.canDelete && (
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(true)}
                    className="gap-2 text-danger hover:text-danger hover:bg-danger/10 border-danger/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (onDeleteTask) {
                  onDeleteTask(taskId);
                  onOpenChange(false);
                  toast.success('Task deleted');
                }
              }}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Task Dialog */}
      <AlertDialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAdmin ? 'Transfer Task to Another Admin' : 'Transfer Your Assignment'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAdmin 
                ? 'Transfer this entire task to another Admin. The task ownership will be transferred.'
                : 'Transfer your assignment to another Core Manager. You will be removed from the task.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2 max-h-64 overflow-y-auto">
            {transferableUsers.map((u: User) => {
              const uId = u._id || u.id;
              const isSelected = transferToUser === uId;
              return (
                <div 
                  key={uId}
                  onClick={() => setTransferToUser(uId)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                    isSelected ? "bg-primary/10 border border-primary" : "bg-secondary/50 hover:bg-secondary"
                  )}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {u.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.role === 'admin' ? 'Admin' : 'Core Manager'} • {u.department || 'No department'}
                    </p>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
                </div>
              );
            })}
            {transferableUsers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No users available to transfer</p>
            )}
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel onClick={() => setTransferToUser('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransfer} disabled={!transferToUser}>
              Transfer
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Assignee Dialog */}
      <AlertDialog open={showAddAssigneeDialog} onOpenChange={setShowAddAssigneeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAdmin ? 'Add Assignees (Admins & Core Managers)' : 'Add Core Managers'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAdmin 
                ? 'Select Admins or Core Managers to add to this task.'
                : 'Select Core Managers to add to this task.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2 max-h-64 overflow-y-auto">
            {getAddableUsers().map((u: User) => {
              const uId = u._id || u.id;
              const isSelected = newAssignees.includes(uId);
              return (
                <div 
                  key={uId}
                  onClick={() => {
                    if (isSelected) {
                      setNewAssignees(newAssignees.filter(id => id !== uId));
                    } else {
                      setNewAssignees([...newAssignees, uId]);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                    isSelected ? "bg-primary/10 border border-primary" : "bg-secondary/50 hover:bg-secondary"
                  )}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {u.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.role === 'admin' ? 'Admin' : 'Core Manager'} • {u.department || 'No department'}
                    </p>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
                </div>
              );
            })}
            {getAddableUsers().length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No users available to add</p>
            )}
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel onClick={() => setNewAssignees([])}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddAssignees} disabled={newAssignees.length === 0}>
              Add {newAssignees.length > 0 ? `(${newAssignees.length})` : ''}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shift Assignee Dialog (Admin only) - supports multiple selections */}
      <AlertDialog open={showShiftAssigneeDialog} onOpenChange={setShowShiftAssigneeDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Shift Assignees</AlertDialogTitle>
            <AlertDialogDescription>
              Select people to remove and add. You can select multiple.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            {/* Select users to remove */}
            <div>
              <label className="text-sm font-medium mb-2 block text-danger">
                Remove from task: {shiftFromUsers.length > 0 && `(${shiftFromUsers.length} selected)`}
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {task.assignments?.map((a: any) => {
                  const u = a.userId;
                  if (!u) return null;
                  const userName = typeof u === 'object' ? (u as any).name : 'Unknown';
                  const assigneeId = typeof u === 'object' ? (u as any)._id : u;
                  const userRole = typeof u === 'object' ? (u as any).role : '';
                  const isSelected = shiftFromUsers.includes(assigneeId);
                  return (
                    <div 
                      key={assigneeId}
                      onClick={() => {
                        if (isSelected) {
                          setShiftFromUsers(shiftFromUsers.filter(id => id !== assigneeId));
                        } else {
                          setShiftFromUsers([...shiftFromUsers, assigneeId]);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                        isSelected ? "bg-danger/10 border border-danger" : "bg-secondary/50 hover:bg-secondary"
                      )}
                    >
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs">
                          {userName.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {userRole === 'admin' ? 'Admin' : 'Core Manager'}
                        </p>
                      </div>
                      {isSelected && <X className="w-4 h-4 text-danger ml-auto" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Select users to add */}
            <div>
              <label className="text-sm font-medium mb-2 block text-success">
                Add to task: {shiftToUsers.length > 0 && `(${shiftToUsers.length} selected)`}
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {getAddableUsers().map((u: User) => {
                  const uId = u._id || u.id;
                  const isSelected = shiftToUsers.includes(uId);
                  return (
                    <div 
                      key={uId}
                      onClick={() => {
                        if (isSelected) {
                          setShiftToUsers(shiftToUsers.filter(id => id !== uId));
                        } else {
                          setShiftToUsers([...shiftToUsers, uId]);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                        isSelected ? "bg-success/10 border border-success" : "bg-secondary/50 hover:bg-secondary"
                      )}
                    >
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs">
                          {u.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.role === 'admin' ? 'Admin' : 'Core Manager'}
                        </p>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-success ml-auto" />}
                    </div>
                  );
                })}
                {getAddableUsers().length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No users available</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel onClick={() => { setShiftFromUsers([]); setShiftToUsers([]); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleShiftAssignee} 
              disabled={shiftFromUsers.length === 0 && shiftToUsers.length === 0}
            >
              Shift Assignees {(shiftFromUsers.length > 0 || shiftToUsers.length > 0) && 
                `(-${shiftFromUsers.length}/+${shiftToUsers.length})`}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Task Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Task
            </AlertDialogTitle>
            <AlertDialogDescription>
              Update the task details below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Task title"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Task description"
                rows={3}
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <div className="flex gap-2">
                {(['high', 'medium', 'low'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setEditPriority(p)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all capitalize",
                      editPriority === p
                        ? p === 'high'
                          ? "bg-red-500 text-white"
                          : p === 'medium'
                          ? "bg-amber-500 text-white"
                          : "bg-green-500 text-white"
                        : "bg-secondary/50 hover:bg-secondary text-foreground"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="edit-duedate">Due Date</Label>
              <Input
                id="edit-duedate"
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveEdit}>
              Save Changes
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
