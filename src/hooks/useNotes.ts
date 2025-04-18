import { useState, useEffect, useCallback } from 'react';
import { Note, TextBox, DrawingData } from '@/types';
import { getNotes, saveNote, getNote } from '@/utils/db';
import { createThumbnail } from '@/utils/canvasUtils';
import { v4 as uuidv4 } from 'uuid';

export const useNotes = (currentUserId: string | undefined) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load all notes
  const loadNotes = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      setIsLoading(true);
      const allNotes = await getNotes();
      
      // Sort by last modified date (descending)
      allNotes.sort((a, b) => b.lastModifiedAt - a.lastModifiedAt);
      
      setNotes(allNotes);
      
      // If no current note but we have notes, set the most recent one
      if (!currentNote && allNotes.length > 0) {
        setCurrentNote(allNotes[0]);
      }
    } catch (err) {
      console.error('Error loading notes:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [currentNote, currentUserId]);

  // Create a new note
  const createNote = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      const now = Date.now();
      const newNote: Note = {
        title: `Note ${now}`,
        createdBy: currentUserId,
        createdAt: now,
        lastModifiedBy: currentUserId,
        lastModifiedAt: now,
        textBoxes: [],
        drawings: []
      };
      
      const noteId = await saveNote(newNote);
      const savedNote = await getNote(noteId);
      
      setNotes(prevNotes => [savedNote, ...prevNotes]);
      setCurrentNote(savedNote);
      
      return savedNote;
    } catch (err) {
      console.error('Error creating note:', err);
      setError(err as Error);
      return null;
    }
  }, [currentUserId]);

  // Load a specific note
  const loadNote = useCallback(async (noteId: number) => {
    try {
      const note = await getNote(noteId);
      setCurrentNote(note);
      return note;
    } catch (err) {
      console.error('Error loading note:', err);
      setError(err as Error);
      return null;
    }
  }, []);

  // Save current note with updates
  const saveCurrentNote = useCallback(async (updatedNote: Partial<Note>) => {
    if (!currentNote || !currentUserId) return null;
    
    try {
      const noteToSave: Note = {
        ...currentNote,
        ...updatedNote,
        lastModifiedBy: currentUserId,
        lastModifiedAt: Date.now()
      };
      
      await saveNote(noteToSave);
      
      // Update local state
      setCurrentNote(noteToSave);
      setNotes(prevNotes => {
        const updatedNotes = prevNotes.map(note => 
          note.id === noteToSave.id ? noteToSave : note
        );
        // Sort by last modified date (descending)
        return updatedNotes.sort((a, b) => b.lastModifiedAt - a.lastModifiedAt);
      });
      
      return noteToSave;
    } catch (err) {
      console.error('Error saving note:', err);
      setError(err as Error);
      return null;
    }
  }, [currentNote, currentUserId]);

  // Add a new text box
  const addTextBox = useCallback((x: number, y: number) => {
    const newTextBox: TextBox = {
      id: uuidv4(),
      content: '',
      x,
      y,
      width: 200,
      height: 100,
      zIndex: Date.now() // Use timestamp as zIndex
    };
    
    return newTextBox;
  }, []);

  // Initialize
  useEffect(() => {
    if (currentUserId) {
      loadNotes();
    }
  }, [currentUserId, loadNotes]);

  return {
    notes,
    currentNote,
    isLoading,
    error,
    loadNotes,
    createNote,
    loadNote,
    saveCurrentNote,
    addTextBox
  };
}; 