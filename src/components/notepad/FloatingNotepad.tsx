import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Note } from '@/types/taskflow';
import { 
  X, 
  Plus, 
  Pin, 
  PinOff, 
  Trash2, 
  Minimize2,
  FileText,
  Loader2,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface FloatingNotepadProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
}

export function FloatingNotepad({ isOpen, onClose, onMinimize }: FloatingNotepadProps) {
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
      handleSaveNote();
    }
    setSelectedNote(note);
    setIsEditing(false);
    setEditTitle(note.title);
    setEditContent(note.content);
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
    }, 15000); // 15 seconds of inactivity before auto-save

    return () => clearTimeout(timer);
  }, [editTitle, editContent, isEditing, selectedNote]);

  // Get preview text from note content
  const getPreview = (content: string, maxLength: number = 60) => {
    if (!content) return 'No content';
    const text = content.replace(/\n/g, ' ').trim();
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-[600px] h-[700px] bg-card border border-border rounded-lg shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Quick Notes</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onMinimize}
            className="h-8 w-8 p-0"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Notes List */}
        <div className="w-48 flex flex-col border-r border-border bg-muted/20">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-8 text-xs"
              />
            </div>
          </div>

          {/* New Note Button */}
          <div className="p-2 border-b border-border">
            <Button
              size="sm"
              onClick={handleCreateNote}
              disabled={isCreating}
              className="w-full h-8 text-xs gap-1"
            >
              <Plus className="w-3 h-3" />
              New Note
            </Button>
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto p-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-8 px-2">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  {searchQuery ? 'No notes found' : 'No notes yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Pinned Notes */}
                {pinnedNotes.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase">
                      Pinned
                    </div>
                    {pinnedNotes.map((note: Note) => (
                      <div
                        key={note.id}
                        onClick={() => handleSelectNote(note)}
                        className={cn(
                          'p-2 rounded cursor-pointer transition-colors border text-xs',
                          selectedNote?.id === note.id
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-card hover:bg-muted/50 border-border'
                        )}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <h3 className="font-semibold line-clamp-1 flex-1 text-[11px]">
                            {note.title}
                          </h3>
                          <Pin className="w-2.5 h-2.5 text-primary flex-shrink-0 mt-0.5" />
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">
                          {getPreview(note.content, 50)}
                        </p>
                      </div>
                    ))}
                  </>
                )}

                {/* Unpinned Notes */}
                {unpinnedNotes.length > 0 && (
                  <>
                    {pinnedNotes.length > 0 && (
                      <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase mt-1">
                        Notes
                      </div>
                    )}
                    {unpinnedNotes.map((note: Note) => (
                      <div
                        key={note.id}
                        onClick={() => handleSelectNote(note)}
                        className={cn(
                          'p-2 rounded cursor-pointer transition-colors border text-xs',
                          selectedNote?.id === note.id
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-card hover:bg-muted/50 border-border'
                        )}
                      >
                        <h3 className="font-semibold line-clamp-1 mb-1 text-[11px]">
                          {note.title}
                        </h3>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">
                          {getPreview(note.content, 50)}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          {selectedNote ? (
            <>
              {/* Editor Header */}
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  {isEditing ? (
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="font-semibold text-sm h-7"
                      placeholder="Note title"
                    />
                  ) : (
                    <h3 className="font-semibold text-sm text-foreground">
                      {selectedNote.title}
                    </h3>
                  )}
                  {selectedNote.isPinned && (
                    <Pin className="w-3 h-3 text-primary" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsEditing(false);
                        setEditTitle(selectedNote.title);
                        setEditContent(selectedNote.content);
                      }}
                      className="h-7 w-7 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleTogglePin}
                        disabled={togglePinMutation.isPending}
                        className="h-7 w-7 p-0"
                      >
                        {selectedNote.isPinned ? (
                          <PinOff className="w-3 h-3" />
                        ) : (
                          <Pin className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsEditing(true);
                          setEditTitle(selectedNote.title);
                          setEditContent(selectedNote.content);
                          setTimeout(() => {
                            textareaRef.current?.focus();
                          }, 100);
                        }}
                        className="h-7 w-7 p-0"
                      >
                        <FileText className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDeleteNote}
                        disabled={deleteNoteMutation.isPending}
                        className="h-7 w-7 p-0 text-danger hover:text-danger hover:bg-danger/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 p-4 overflow-y-auto">
                {isEditing ? (
                  <Textarea
                    ref={textareaRef}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Start writing..."
                    className="min-h-full resize-none border-0 focus-visible:ring-0 text-sm leading-relaxed p-0"
                    style={{ minHeight: 'calc(100% - 20px)' }}
                  />
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-foreground text-sm leading-relaxed">
                      {selectedNote.content || 'No content'}
                    </pre>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Select a note to view
                </p>
                <Button 
                  size="sm" 
                  onClick={handleCreateNote}
                  disabled={isCreating}
                  className="mt-2"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Create Note
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
