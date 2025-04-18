import React, { useState, useEffect, useRef } from 'react';
import { Tool, DrawingOptions } from '@/types';
import { 
  MousePointer, 
  Type, 
  Pencil, 
  Move,
  Plus
} from 'lucide-react';

interface ToolbarProps {
  tool: Tool;
  drawingOptions: DrawingOptions;
  setTool: (tool: Tool) => void;
  setDrawingOptions: (color: string, strokeWidth: number) => void;
  onNewNote: () => void;
}

const Toolbar = ({
  tool,
  drawingOptions,
  setTool,
  setDrawingOptions,
  onNewNote
}: ToolbarProps) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  
  // Available colors
  const colors = [
    '#9b87f5', // Primary purple
    '#000000', // Black
    '#FF5252', // Red
    '#4CAF50', // Green
    '#2196F3', // Blue
    '#FFC107', // Amber
    '#7E69AB', // Secondary purple
    '#E5DEFF', // Soft purple
  ];
  
  // Available stroke widths
  const strokeWidths = [1, 2, 3, 5, 8];

  // Handle tool button click
  const handleToolClick = (selectedTool: Tool) => {
    // Only update if different tool is selected
    if (tool !== selectedTool) {
      setTool(selectedTool);
    }
  };

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setIsColorPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 flex items-center bg-white shadow-lg rounded-full px-2 py-1 z-50">
      <button
        onClick={onNewNote}
        className="p-2 rounded-full hover:bg-gray-100 flex items-center justify-center text-blue-600"
        title="New Note"
      >
        <Plus size={20} />
      </button>
      
      <div className="w-px h-6 mx-1 bg-gray-200" />
      
      <button
        onClick={() => handleToolClick('select')}
        className={`p-2 rounded-full hover:bg-gray-100 flex items-center justify-center ${
          tool === 'select' ? 'bg-blue-600 text-white' : 'text-gray-700'
        }`}
        title="Select Tool"
      >
        <MousePointer size={20} />
      </button>
      
      <button
        onClick={() => handleToolClick('text')}
        className={`p-2 rounded-full hover:bg-gray-100 flex items-center justify-center ${
          tool === 'text' ? 'bg-blue-600 text-white' : 'text-gray-700'
        }`}
        title="Text Tool"
      >
        <Type size={20} />
      </button>
      
      <button
        onClick={() => handleToolClick('pen')}
        className={`p-2 rounded-full hover:bg-gray-100 flex items-center justify-center ${
          tool === 'pen' ? 'bg-blue-600 text-white' : 'text-gray-700'
        }`}
        title="Pen Tool"
      >
        <Pencil size={20} />
      </button>
      
      <button
        onClick={() => handleToolClick('pan')}
        className={`p-2 rounded-full hover:bg-gray-100 flex items-center justify-center ${
          tool === 'pan' ? 'bg-blue-600 text-white' : 'text-gray-700'
        }`}
        title="Pan Tool"
      >
        <Move size={20} />
      </button>
      
      {tool === 'pen' && (
        <>
          <div className="w-px h-6 mx-1 bg-gray-200" />
          
          <div className="relative" ref={colorPickerRef}>
            <button
              onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
              className="p-2 rounded-full hover:bg-gray-100 flex items-center justify-center"
              title="Color Picker"
            >
              <div 
                className="w-5 h-5 rounded-full border border-gray-300"
                style={{ backgroundColor: drawingOptions.color }}
              />
            </button>
            
            {isColorPickerOpen && (
              <div className="absolute top-full left-0 mt-2 p-2 bg-white shadow-lg rounded-lg grid grid-cols-4 gap-1 z-50">
                {colors.map((color) => (
                  <div
                    key={color}
                    className={`w-6 h-6 rounded-full cursor-pointer ${color === drawingOptions.color ? 'ring-2 ring-blue-500' : 'border border-gray-300'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setDrawingOptions(color, drawingOptions.strokeWidth);
                      setIsColorPickerOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          
          <div className="px-2">
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={drawingOptions.strokeWidth}
              onChange={(e) => setDrawingOptions(
                drawingOptions.color,
                parseInt(e.target.value)
              )}
              className="w-24"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Toolbar;
