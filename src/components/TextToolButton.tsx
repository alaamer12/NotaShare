import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import TextTool from './TextTool';

interface TextToolButtonProps {
  onSave?: (text: string, direction: 'ltr' | 'rtl') => void;
  initialText?: string;
  initialDirection?: 'ltr' | 'rtl';
}

const TextToolButton: React.FC<TextToolButtonProps> = ({ 
  onSave, 
  initialText = '',
  initialDirection = 'ltr'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleTextTool = () => {
    setIsOpen(!isOpen);
  };

  const handleSave = (text: string, direction: 'ltr' | 'rtl') => {
    if (onSave) {
      onSave(text, direction);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={toggleTextTool}
        className={`p-2 rounded-md ${isOpen ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'} hover:bg-gray-200`}
        title="Advanced Text Editor"
      >
        <FileText size={20} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-full max-w-3xl p-2">
            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
              <div className="p-4 bg-gray-50 flex justify-between items-center border-b">
                <h3 className="text-lg font-medium">Markdown Editor</h3>
                <button 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={handleClose}
                >
                  &times;
                </button>
              </div>
              <div className="p-4">
                <TextTool 
                  onSave={handleSave} 
                  onClose={handleClose} 
                  initialText={initialText}
                  initialDirection={initialDirection}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TextToolButton; 