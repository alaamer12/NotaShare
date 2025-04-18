import React from 'react';
import { User, Note } from '@/types';
import { Menu } from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  uniqueUsers: number;
  toggleSidebar: () => void;
  currentNote: Note | null;
}

const Header = ({ currentUser, uniqueUsers, toggleSidebar, currentNote }: HeaderProps) => {
  return (
    <header className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <button
              onClick={toggleSidebar}
              className="px-2 inline-flex items-center justify-center text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <Menu size={24} />
            </button>
            <div className="flex-shrink-0 flex items-center ml-4">
              <h1 className="text-xl font-bold text-blue-600">NotaShare</h1>
            </div>
            {currentNote && (
              <div className="ml-6 flex items-center">
                <span className="text-gray-500 text-sm">
                  {currentNote.title}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                {uniqueUsers} {uniqueUsers === 1 ? 'user' : 'users'}
              </span>
            </div>
            {currentUser && (
              <div className="ml-4 flex items-center">
                <img
                  className="h-8 w-8 rounded-full"
                  src={currentUser.avatarUrl || 'https://ui-avatars.com/api/?name=User'}
                  alt={`User Avatar`}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 