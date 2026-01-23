import { Search, Filter, SlidersHorizontal, X, User, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import { cn } from '@/lib/utils';

interface TaskFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  priorityFilter: string;
  onPriorityChange: (value: string) => void;
  assigneeFilter?: string[];
  onAssigneeChange?: (value: string[]) => void;
  assignedByFilter?: string[];
  onAssignedByChange?: (value: string[]) => void;
  users?: any[];
  sortBy?: 'created' | 'due' | 'none';
  onSortChange?: (value: 'created' | 'due' | 'none') => void;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
}

export function TaskFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  assigneeFilter = [],
  onAssigneeChange,
  assignedByFilter = [],
  onAssignedByChange,
  users = [],
  sortBy = 'none',
  onSortChange,
  showAdvanced = false,
  onToggleAdvanced,
}: TaskFiltersProps) {
  const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all' || searchQuery !== '' || assigneeFilter.length > 0 || assignedByFilter.length > 0 || sortBy !== 'none';

  // Convert users to options for MultiSelect
  const assigneeOptions: Option[] = users.map((user: any) => ({
    label: user.name || user.email || 'Unknown',
    value: user._id || user.id,
  }));

  // Same options for assignedBy filter
  const assignedByOptions: Option[] = assigneeOptions;

  return (
    <div className="space-y-3 mb-6">
      {/* Main Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks by title, description, or assignee..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {onToggleAdvanced && (
          <Button
            variant={showAdvanced ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleAdvanced}
            className="gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Advanced
          </Button>
        )}
      </div>

      {/* Basic Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
            <SelectItem value="review">Review</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select value={priorityFilter} onValueChange={onPriorityChange}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-danger" />
                High
              </span>
            </SelectItem>
            <SelectItem value="medium">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning" />
                Medium
              </span>
            </SelectItem>
            <SelectItem value="low">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" />
                Low
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Assignee Filter */}
        {onAssigneeChange && (
          <div className="w-full sm:w-48">
            <MultiSelect
              options={assigneeOptions}
              selected={assigneeFilter}
              onChange={onAssigneeChange}
              placeholder="Assigned To"
            />
          </div>
        )}

        {/* Assigned By Filter */}
        {onAssignedByChange && (
          <div className="w-full sm:w-48">
            <MultiSelect
              options={assignedByOptions}
              selected={assignedByFilter}
              onChange={onAssignedByChange}
              placeholder="Assigned By"
            />
          </div>
        )}

        {/* Sort By Filter */}
        {onSortChange && (
          <Select value={sortBy} onValueChange={(value) => onSortChange(value as 'created' | 'due' | 'none')}>
            <SelectTrigger className="w-full sm:w-40">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Sort</SelectItem>
              <SelectItem value="created">Sort by Created Date</SelectItem>
              <SelectItem value="due">Sort by Due Date</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onSearchChange('');
              onStatusChange('all');
              onPriorityChange('all');
              if (onAssigneeChange) {
                onAssigneeChange([]);
              }
              if (onAssignedByChange) {
                onAssignedByChange([]);
              }
              if (onSortChange) {
                onSortChange('none');
              }
            }}
            className="w-full sm:w-auto gap-2"
          >
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
