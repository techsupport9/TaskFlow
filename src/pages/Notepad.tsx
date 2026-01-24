import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Note } from '@/types/taskflow';
import { 
  Plus, 
  Search, 
  Pin, 
  PinOff, 
  Trash2, 
  Edit2, 
  Save, 
  X,
  FileText,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Notepad() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch all notes
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const res = await api.get('/notes');
      return res.data.map((n: any) => ({
        ...n,
        id: n._id || n.id,
        createdAt: new Date(n.createdAt),
        updatedAt: new Date(n.updatedAt),
      }));
    },
    enabled: !!user,
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (newNote: { title?: string; content?: string }) => {
      return await api.post('/notes', newNote);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      const newNote = {
        ...data.data,
        id: data.data._id || data.data.id,
        createdAt: new Date(data.data.createdAt),
        updatedAt: new Date(data.data.updatedAt),
      };
      setSelectedNote(newNote);
      setIsEditing(true);
      setEditTitle(newNote.title);
      setEditContent(newNote.content);
      setIsCreating(false);
      toast.success('Note created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create note');
      setIsCreating(false);
    }
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Note> }) => {
      return await api.patch(`/notes/${id}`, updates);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      const updatedNote = {
        ...data.data,
        id: data.data._id || data.data.id,
        createdAt: new Date(data.data.createdAt),
        updatedAt: new Date(data.data.updatedAt),
      };
      setSelectedNote(updatedNote);
      setIsEditing(false);
      toast.success('Note saved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save note');
    }
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setSelectedNote(null);
      setIsEditing(false);
      toast.success('Note deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete note');
    }
  });

  // Toggle pin mutation
  const togglePinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      return await api.patch(`/notes/${id}`, { isPinned });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      if (selectedNote?.id === data.data._id) {
        setSelectedNote(prev => prev ? { ...prev, isPinned: data.data.isPinned } : null);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update note');
    }
  });

  // Filter notes based on search
  const filteredNotes = notes.filter((note: Note) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query)
    );
  });

  // Separate pinned and unpinned notes
  const pinnedNotes = filteredNotes.filter((n: Note) => n.isPinned);
  const unpinnedNotes = filteredNotes.filter((n: Note) => !n.isPinned);

  // Handle creating a new note
  const handleCreateNote = () => {
    setIsCreating(true);
    createNoteMutation.mutate({});
  };

  // Handle selecting a note
  const handleSelectNote = (note: Note) => {
    if (isEditing && selectedNote) {
      // Save current note before switching
      handleSaveNote();
    }
    setSelectedNote(note);
    setIsEditing(false);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  // Handle starting edit
  const handleStartEdit = () => {
    if (selectedNote) {
      setIsEditing(true);
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
      // Focus textarea after a brief delay
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  // Handle saving note
  const handleSaveNote = () => {
    if (!selectedNote) return;
    
    updateNoteMutation.mutate({
      id: selectedNote.id,
      updates: {
        title: editTitle.trim() || 'Untitled Note',
        content: editContent,
      }
    });
  };

  // Handle deleting note
  const handleDeleteNote = () => {
    if (!selectedNote) return;
    if (confirm('Are you sure you want to delete this note?')) {
      deleteNoteMutation.mutate(selectedNote.id);
    }
  };

  // Handle toggle pin
  const handleTogglePin = () => {
    if (!selectedNote) return;
    togglePinMutation.mutate({
      id: selectedNote.id,
      isPinned: !selectedNote.isPinned,
    });
  };

  // Auto-save on content change (debounced - 15 seconds of inactivity)
  useEffect(() => {
    if (!isEditing || !selectedNote) return;

    const timer = setTimeout(() => {
      if (editTitle !== selectedNote.title || editContent !== selectedNote.content) {
        updateNoteMutation.mutate({
          id: selectedNote.id,
          updates: {
            title: editTitle.trim() || 'Untitled Note',
            content: editContent,
          }
        });
      }
    }, 15000); // Auto-save after 15 seconds of inactivity

    return () => clearTimeout(timer);
  }, [editTitle, editContent, isEditing, selectedNote]);

  // Get preview text from note content
  const getPreview = (content: string, maxLength: number = 100) => {
    if (!content) return 'No content';
    const text = content.replace(/\n/g, ' ').trim();
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-80px)] gap-4">
        {/* Sidebar - Notes List */}
        <div className="w-80 flex flex-col border-r border-border bg-card">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-foreground">Notes</h1>
              <Button
                size="sm"
                onClick={handleCreateNote}
                disabled={isCreating}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                New Note
              </Button>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <FileText className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No notes found' : 'No notes yet'}
                </p>
                {!searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateNote}
                    className="mt-4 gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create your first note
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {/* Pinned Notes */}
                {pinnedNotes.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                      Pinned
                    </div>
                    {pinnedNotes.map((note: Note) => (
                      <div
                        key={note.id}
                        onClick={() => handleSelectNote(note)}
                        className={cn(
                          'p-3 rounded-lg cursor-pointer transition-colors border',
                          selectedNote?.id === note.id
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-card hover:bg-muted/50 border-border'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-sm text-foreground line-clamp-1 flex-1">
                            {note.title}
                          </h3>
                          <Pin className="w-3 h-3 text-primary flex-shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {getPreview(note.content)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(note.updatedAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                  </>
                )}

                {/* Unpinned Notes */}
                {unpinnedNotes.length > 0 && (
                  <>
                    {pinnedNotes.length > 0 && (
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase mt-2">
                        Notes
                      </div>
                    )}
                    {unpinnedNotes.map((note: Note) => (
                      <div
                        key={note.id}
                        onClick={() => handleSelectNote(note)}
                        className={cn(
                          'p-3 rounded-lg cursor-pointer transition-colors border',
                          selectedNote?.id === note.id
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-card hover:bg-muted/50 border-border'
                        )}
                      >
                        <h3 className="font-semibold text-sm text-foreground line-clamp-1 mb-1">
                          {note.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {getPreview(note.content)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(note.updatedAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          {selectedNote ? (
            <>
              {/* Editor Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  {isEditing ? (
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="font-semibold text-lg max-w-md"
                      placeholder="Note title"
                    />
                  ) : (
                    <h2 className="font-semibold text-lg text-foreground">
                      {selectedNote.title}
                    </h2>
                  )}
                  {selectedNote.isPinned && (
                    <Pin className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setEditTitle(selectedNote.title);
                          setEditContent(selectedNote.content);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveNote}
                        disabled={updateNoteMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleTogglePin}
                        disabled={togglePinMutation.isPending}
                      >
                        {selectedNote.isPinned ? (
                          <PinOff className="w-4 h-4" />
                        ) : (
                          <Pin className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleStartEdit}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDeleteNote}
                        disabled={deleteNoteMutation.isPending}
                        className="text-danger hover:text-danger hover:bg-danger/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {isEditing ? (
                  <Textarea
                    ref={textareaRef}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Start writing..."
                    className="min-h-full resize-none border-0 focus-visible:ring-0 text-base leading-relaxed p-0"
                    style={{ minHeight: 'calc(100vh - 300px)' }}
                  />
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-foreground text-base leading-relaxed">
                      {selectedNote.content || 'No content'}
                    </pre>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border text-xs text-muted-foreground">
                <p>
                  Last updated: {format(new Date(selectedNote.updatedAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">
                  Select a note to view or edit
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Or create a new note to get started
                </p>
                <Button onClick={handleCreateNote} disabled={isCreating}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Note
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
