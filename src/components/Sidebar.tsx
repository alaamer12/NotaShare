import React from 'react';
import { Note } from '@/types';
import { X, History, Clock } from 'lucide-react';

interface SidebarProps {
  notes: Note[];
  currentNote: Note | null;
  isOpen: boolean;
  onNoteSelect: (noteId: number) => void;
  closeSidebar: () => void;
}

const Sidebar = ({ notes, currentNote, isOpen, onNoteSelect, closeSidebar }: SidebarProps) => {
  // Format date for display
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      className={`fixed inset-y-0 left-0 w-64 bg-white shadow-md transform transition-transform duration-300 ease-in-out z-20 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b">
        <div className="flex items-center">
          <History size={18} className="text-blue-600 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Note History</h2>
        </div>
        <button
          onClick={closeSidebar}
          className="text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="overflow-y-auto h-[calc(100vh-4rem)]">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-gray-500">No notes yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {notes.map((note) => (
              <li key={note.id}>
                <button
                  onClick={() => {
                    if (note.id) onNoteSelect(note.id);
                    closeSidebar();
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 focus:outline-none ${
                    currentNote?.id === note.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {note.title}
                    </span>
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <Clock size={12} className="mr-1" />
                      <span>
                        {formatDate(note.lastModifiedAt)}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Sidebar; 