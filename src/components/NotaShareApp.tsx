import React, { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { useNotes } from '@/hooks/useNotes';
import Header from './Header';
import Sidebar from './Sidebar';
import Canvas from './Canvas';
import { toast } from '@/hooks/use-toast';
import { FilePlus } from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const NotaShareApp = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Get current user
  const { currentUser, isLoading: isUserLoading, uniqueUsers } = useUser();

  // Initialize notes
  const {
    notes,
    currentNote,
    isLoading: isNotesLoading,
    error,
    createNote,
    loadNote,
    saveCurrentNote
  } = useNotes(currentUser?.id);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }, [error]);

  // Create a new note if none exists on initial load
  useEffect(() => {
    if (!isUserLoading && !isNotesLoading && notes.length === 0 && currentUser) {
      createNote();
    }
  }, [isUserLoading, isNotesLoading, notes.length, createNote, currentUser]);

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Handle new note with save confirmation
  const handleNewNoteClick = () => {
    if (hasUnsavedChanges) {
      setShowSaveDialog(true);
    } else {
      createNewNote();
    }
  };

  // Create a new note
  const createNewNote = async () => {
    const newNote = await createNote();
    if (newNote) {
      toast({
        title: 'Success',
        description: 'New note created'
      });
      setHasUnsavedChanges(false);
    }
  };

  // Handle note selection
  const handleNoteSelect = async (noteId: number) => {
    if (hasUnsavedChanges) {
      // Save current note before loading a new one
      if (currentNote) {
        await saveCurrentNote(currentNote);
      }
    }
    await loadNote(noteId);
    setHasUnsavedChanges(false);
  };

  // Handle save current note
  const handleSaveNote = async () => {
    if (currentNote) {
      await saveCurrentNote(currentNote);
      setHasUnsavedChanges(false);
      toast({
        title: 'Success',
        description: 'Note saved successfully'
      });
    }
  };

  // Set has unsaved changes when canvas is modified
  const onCanvasChange = () => {
    setHasUnsavedChanges(true);
  };

  // Loading state
  if (isUserLoading || isNotesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-medium text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50">
      <Header
        currentUser={currentUser}
        uniqueUsers={uniqueUsers}
        toggleSidebar={toggleSidebar}
        currentNote={currentNote}
      />
      
      <div className="fixed right-5 bottom-5 z-50">
        <button
          onClick={handleNewNoteClick}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg flex items-center justify-center"
          title="New Note"
        >
          <FilePlus size={24} />
        </button>
      </div>
      
      <Sidebar
        notes={notes}
        currentNote={currentNote}
        isOpen={isSidebarOpen}
        onNoteSelect={handleNoteSelect}
        closeSidebar={() => setIsSidebarOpen(false)}
      />
      
      <div 
        className={`flex-1 overflow-hidden transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        {currentNote && currentUser && (
          <Canvas
            currentNote={currentNote}
            currentUserId={currentUser.id}
            saveCurrentNote={saveCurrentNote}
            onCanvasChange={onCanvasChange}
          />
        )}
      </div>

      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Would you like to save before creating a new note?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowSaveDialog(false);
              createNewNote();
            }}>
              Don't save
            </AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              await handleSaveNote();
              setShowSaveDialog(false);
              createNewNote();
            }}>
              Save changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NotaShareApp; 