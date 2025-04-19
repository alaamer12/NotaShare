import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import { Note } from '@/types';
import { PenTool, Eraser, Trash2, Save, Undo, Redo, FileText, Type, AlignLeft, AlignRight, Settings, MoreHorizontal, ChevronDown, Check, Move, XCircle, ZoomIn, Text, Download, Circle, EraserIcon, Text as TextIcon } from 'lucide-react';
import TextToolButton from './TextToolButton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TextareaAutosize from 'react-textarea-autosize';
import { AnimatePresence, motion } from 'framer-motion';
import PanningTool from './PanningTool';

interface CanvasProps {
  currentNote: Note | null;
  currentUserId: string;
  saveCurrentNote: (note: any) => Promise<any>;
  onCanvasChange?: () => void;
}

// Optional interface for path chunking
interface PathChunk {
  id: string;
  paths: any[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

const Canvas = ({ currentNote, currentUserId, saveCurrentNote, onCanvasChange }: CanvasProps) => {
  const canvasRef = useRef<any>(null);
  const [mode, setMode] = useState<'draw' | 'erase' | 'text' | 'pan'>('draw');
  const [penColor, setPenColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [quickText, setQuickText] = useState('');
  const [textDirection, setTextDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [saveCanvasData, setSaveCanvasData] = useState<any>(null);
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [showText, setShowText] = useState(true);
  
  // Add viewport tracking for performance optimization
  const [viewport, setViewport] = useState({
    width: 0,
    height: 0,
    x: 0,
    y: 0
  });
  const viewportRef = useRef<HTMLDivElement>(null);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  
  // Update viewport dimensions and position
  const updateViewport = useCallback(() => {
    if (!isMounted.current || !viewportRef.current) return;
    
    const rect = viewportRef.current.getBoundingClientRect();
    setViewport({
      width: rect.width,
      height: rect.height,
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY
    });
  }, []);
  
  // Setup viewport tracking
  useEffect(() => {
    isMounted.current = true;
    updateViewport();
    
    const handleResize = () => {
      updateViewport();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      isMounted.current = false;
      window.removeEventListener('resize', handleResize);
    };
  }, [updateViewport]);
  
  // Optimize canvas rendering based on viewport
  useEffect(() => {
    if (!canvasRef.current || !viewport.width || !viewport.height) return;
    
    // When viewport changes, we might need to adjust the canvas
    // or only render visible elements for performance
    const optimizeCanvasForViewport = () => {
      if (!canvasRef.current?.exportPaths) return;
      
      // We could implement path chunking here for very large drawings
      // Only render paths that intersect with the current viewport
    };
    
    optimizeCanvasForViewport();
  }, [viewport, panOffset, scale]);

  const resetZoom = () => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
    
    // Reset the canvas view if reference is available
    if (canvasRef.current) {
      const canvasElement = canvasRef.current as any;
      if (canvasElement.clearSelection) {
        canvasElement.clearSelection();
      }
      
      // Reset panning offset in the DOM
      const canvasWrapper = document.querySelector('.sketch-canvas-container');
      if (canvasWrapper) {
        canvasWrapper.scrollLeft = 0;
        canvasWrapper.scrollTop = 0;
      }
    }
    
    // Update viewport after reset
    updateViewport();
  };
  
  // Canvas options with performance optimizations
  const canvasOptions = useMemo(() => ({
    strokeWidth: strokeWidth,
    strokeColor: penColor,
    canvasColor: 'white',
    eraserWidth: strokeWidth + 2, // Scale eraser width based on stroke width
    allowOnlyPointerType: 'all',
    style: {
      width: '100%',
      height: '100%',
      border: 'none'
    },
    // Add any additional optimizations the library supports
    throttleTime: 16, // ~60fps - adjust based on performance needs
    preserveBackgroundImageAspectRatio: 'none' // optimize background rendering
  }), [strokeWidth, penColor]);
  
  // Load canvas data when note changes with optimization
  useEffect(() => {
    if (!currentNote || !canvasRef.current) return;
    
    let isLoading = true;
    
    const loadWithOptimization = async () => {
      try {
        if (currentNote.canvasData) {
          // Check if we need to process the data for performance
          // For very large datasets, we could implement a chunking strategy here
          const pathCount = currentNote.canvasData.length || 0;
          
          if (pathCount > 1000) {
            console.log(`Loading large canvas with ${pathCount} paths`);
            
            // For extremely large drawings, we could implement progressive loading
            // For now, we'll let the library handle it, but monitor performance
            await canvasRef.current?.loadPaths(currentNote.canvasData);
          } else {
            // Standard loading for smaller datasets
            await canvasRef.current?.loadPaths(currentNote.canvasData);
          }
        }
        
        // Load existing text content
        if (currentNote.textContent) {
          setQuickText(currentNote.textContent);
        }
        
        // Load existing text direction
        if (currentNote.textDirection) {
          setTextDirection(currentNote.textDirection);
        }
      } catch (error) {
        console.error('Error loading canvas data:', error);
      }
      
      if (isMounted.current) {
        isLoading = false;
      }
    };
    
    loadWithOptimization();
    
    // Cleanup if component unmounts during loading
    return () => {
      isLoading = false;
    };
  }, [currentNote]);
  
  // Preserve canvas data when switching modes - optimized
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // When switching to text mode, we need to ensure we don't lose canvas data
    const captureCanvasState = async () => {
      if (mode === 'text' && canvasRef.current) {
        try {
          // Store the current canvas state to ensure it's not lost
          const paths = await canvasRef.current.exportPaths();
          if (paths && paths.length > 0) {
            setSaveCanvasData(paths);
          }
        } catch (error) {
          console.error('Error capturing canvas state:', error);
        }
      }
    };
    
    captureCanvasState();
    
    // When exiting text mode, restore the canvas
    const wasTextMode = mode !== 'text' && saveCanvasData && canvasRef.current;
    if (wasTextMode) {
      // Use RAF for smoother transitions
      requestAnimationFrame(() => {
        if (canvasRef.current && isMounted.current) {
          canvasRef.current.loadPaths(saveCanvasData);
        }
      });
    }
  }, [mode, saveCanvasData]);
  
  // Focus text area when text mode is selected
  useEffect(() => {
    if (mode === 'text' && textareaRef.current) {
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        if (textareaRef.current && isMounted.current) {
          textareaRef.current.focus();
        }
      });
    }
  }, [mode]);
  
  // Handle tool change - optimized
  const handleToolChange = useCallback((newMode: 'draw' | 'erase' | 'text' | 'pan') => {
    // Before changing mode, always capture current canvas state
    if (canvasRef.current) {
      canvasRef.current.exportPaths().then(paths => {
        if (paths && paths.length > 0) {
          setSaveCanvasData(paths);
        }
      });
    }

    // If switching to text mode, make sure we don't lose drawings
    if (newMode === 'text' && canvasRef.current) {
      // We're already storing the paths above, nothing else needed
    }
    
    // If switching from text to any other mode, restore the saved paths
    const isLeavingTextMode = mode === 'text' && newMode !== 'text' && saveCanvasData && canvasRef.current;
    
    setMode(newMode);
    
    if (newMode === 'erase') {
      canvasRef.current?.eraseMode(true);
    } else if (newMode === 'draw') {
      canvasRef.current?.eraseMode(false);
    }
    
    if (isLeavingTextMode) {
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        if (canvasRef.current && isMounted.current) {
          canvasRef.current?.loadPaths(saveCanvasData);
        }
      });
    }
  }, [mode, saveCanvasData]);
  
  // Handle clear canvas
  const handleClear = () => {
    if (confirm("Are you sure you want to clear the canvas?")) {
      canvasRef.current?.clearCanvas();
      if (onCanvasChange) onCanvasChange();
    }
  };
  
  // Handle undo
  const handleUndo = () => {
    canvasRef.current?.undo();
    if (onCanvasChange) onCanvasChange();
  };
  
  // Handle redo
  const handleRedo = () => {
    canvasRef.current?.redo();
    if (onCanvasChange) onCanvasChange();
  };
  
  // Handle save canvas
  const handleSave = useCallback(async () => {
    if (!currentNote) return;
    
    try {
      setAutoSaveStatus('saving');
      
      // Use a more efficient approach when there are many paths
      let paths;
      
      if (canvasRef.current) {
        paths = await canvasRef.current.exportPaths();
        
        // Cache the paths in memory for performance
        if (paths && paths.length > 0) {
          setSaveCanvasData(paths);
        }
      } else if (saveCanvasData) {
        // Fallback to cached data if canvas ref is not available
        paths = saveCanvasData;
      }
      
      if (!paths) return;
      
      // Save to the note with optimized update
      const updatedNote = {
        ...currentNote,
        canvasData: paths,
        lastModifiedBy: currentUserId,
        lastModifiedAt: Date.now()
      };
      
      await saveCurrentNote(updatedNote);
      
      if (isMounted.current) {
        setAutoSaveStatus('saved');
        
        // Clear status after delay
        setTimeout(() => {
          if (isMounted.current) {
            setAutoSaveStatus('idle');
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error saving canvas:', error);
      if (isMounted.current) {
        setAutoSaveStatus('idle');
      }
    }
  }, [currentNote, currentUserId, saveCurrentNote]);
  
  // Handle saving text content
  const handleSaveText = useCallback((text: string, direction: 'ltr' | 'rtl') => {
    if (!currentNote) return;
    
    try {
      setAutoSaveStatus('saving');
      
      // First, get current canvas paths to ensure we don't lose them
      const saveTextWithPaths = async () => {
        try {
          let paths = saveCanvasData;
          
          // Only export paths if we don't have cached ones
          if (canvasRef.current && (!paths || paths.length === 0)) {
            paths = await canvasRef.current.exportPaths();
            
            // Cache paths for future use
            if (paths && paths.length > 0) {
              setSaveCanvasData(paths);
            }
          }
          
          // Prepare updated note with both text and canvas data
          const updatedNote = {
            ...currentNote,
            textContent: text,
            textDirection: direction,
            ...(paths && paths.length > 0 ? { canvasData: paths } : {}),
            lastModifiedBy: currentUserId,
            lastModifiedAt: Date.now()
          };
          
          // Save to database/storage
          await saveCurrentNote(updatedNote);
          
          if (isMounted.current) {
            setQuickText(text);
            setTextDirection(direction);
            
            if (onCanvasChange) {
              onCanvasChange();
            }
            
            // Ensure canvas data doesn't get lost
            if (paths && paths.length > 0 && canvasRef.current) {
              requestAnimationFrame(() => {
                if (canvasRef.current && isMounted.current) {
                  canvasRef.current.loadPaths(paths);
                }
              });
            }
            
            setAutoSaveStatus('saved');
            
            // Clear status after delay
            setTimeout(() => {
              if (isMounted.current) {
                setAutoSaveStatus('idle');
              }
            }, 2000);
          }
        } catch (error) {
          console.error('Error in saveTextWithPaths:', error);
          if (isMounted.current) {
            setAutoSaveStatus('idle');
          }
        }
      };
      
      saveTextWithPaths();
    } catch (error) {
      console.error('Error saving text content:', error);
      if (isMounted.current) {
        setAutoSaveStatus('idle');
      }
    }
  }, [currentNote, currentUserId, onCanvasChange, saveCanvasData]);
  
  // Handle quick text change
  const handleQuickTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuickText(e.target.value);
  };
  
  // Handle quick text save on Enter
  const handleQuickTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // First ensure we capture any current canvas state before saving text
      if (canvasRef.current) {
        canvasRef.current.exportPaths().then(paths => {
          setSaveCanvasData(paths);
        });
      }
      
      // Small delay to ensure paths are exported before saving
      setTimeout(() => {
        handleSaveText(quickText, textDirection);
      }, 10);
    }
  };
  
  // Handle direction change
  const handleDirectionChange = (direction: 'ltr' | 'rtl') => {
    setTextDirection(direction);
    if (currentNote && quickText) {
      handleSaveText(quickText, direction);
    }
  };
  
  // Auto-save every 30 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      handleSave();
      
      // Also save text if there's any
      if (quickText && currentNote) {
        handleSaveText(quickText, textDirection);
      }
    }, 30000);
    
    return () => clearInterval(autoSaveInterval);
  }, [currentNote, currentUserId, quickText, textDirection]);
  
  // Setup canvas change detection
  useEffect(() => {
    if (canvasRef.current && onCanvasChange) {
      const handleCanvasChange = () => {
        onCanvasChange();
      };
      
      canvasRef.current.onChange = handleCanvasChange;
      
      return () => {
        if (canvasRef.current) {
          canvasRef.current.onChange = null;
        }
      };
    }
  }, [onCanvasChange]);
  
  // Handle stroke width change
  const handleStrokeWidthChange = (width: number) => {
    setStrokeWidth(width);
    
    // Update canvas settings with new width
    if (canvasRef.current) {
      canvasRef.current.setStrokeWidth(width);
      canvasRef.current.setEraserWidth(width + 2);
    }
  };
  
  // Handle pan with debounced viewport update
  const handlePan = useCallback((dx: number, dy: number) => {
    setCanvasOffset(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    // Schedule viewport update after panning
    // Using requestAnimationFrame to avoid excessive updates
    requestAnimationFrame(updateViewport);
  }, [updateViewport]);

  // Handle pan start - optimized
  const handlePanStart = useCallback(() => {
    // When panning starts, we don't want to change canvas mode
    // This allows drawing to still work after panning
    
    // Using this opportunity to update viewport
    updateViewport();
  }, [updateViewport]);

  // Handle pan end - optimized
  const handlePanEnd = useCallback(() => {
    // When panning ends, ensure viewport is updated to reflect new position
    updateViewport();
  }, [updateViewport]);

  // When switching to pan mode, ensure canvas is still usable after panning
  useEffect(() => {
    if (canvasRef.current) {
      if (mode === 'draw') {
        canvasRef.current.eraseMode(false);
      } else if (mode === 'erase') {
        canvasRef.current.eraseMode(true);
      }
      // Don't reset or modify the canvas when entering 'text' mode
      // This preserves drawings when switching to text mode
    }
  }, [mode]);
  
  // Handler for drawing on canvas with viewport awareness
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Only handle this event if we're not in panning mode
    if (mode !== 'pan' && canvasRef.current) {
      // This lets us debug the coordinates after panning
      if (process.env.NODE_ENV === 'development') {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        console.log('Canvas mouse coordinates:', { 
          x, y, 
          offset: canvasOffset, 
          mode,
          clientX: e.clientX,
          clientY: e.clientY,
          viewport
        });
      }
    }
  }, [mode, canvasOffset, viewport]);
  
  // Available colors
  const colors = [
    '#000000', // Black
    '#424242', // Dark Grey
    '#1E88E5', // Blue
    '#43A047', // Green
    '#E53935', // Red
    '#5E35B1', // Purple
    '#FB8C00', // Orange
    '#00ACC1', // Teal
    '#EC407A', // Pink
    '#FDD835', // Yellow
  ];

  // Format for save status
  const getSaveStatusText = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved!';
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#f8f9fa]" ref={viewportRef}>
      <div className="p-3 bg-white shadow-sm z-10 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex space-x-1 bg-gray-50 p-1 rounded-lg shadow-sm">
            <button 
              className={`p-2.5 rounded-md transition-all duration-150 ${mode === 'draw' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => handleToolChange('draw')}
              title="Draw"
            >
              <PenTool size={18} />
            </button>
            <button 
              className={`p-2.5 rounded-md transition-all duration-150 ${mode === 'erase' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => handleToolChange('erase')}
              title="Erase"
            >
              <Eraser size={18} />
            </button>
            <button 
              className={`p-2.5 rounded-md transition-all duration-150 ${mode === 'text' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => handleToolChange('text')}
              title="Quick Text"
            >
              <Type size={18} />
            </button>
            <button 
              className={`p-2.5 rounded-md transition-all duration-150 ${mode === 'pan' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => handleToolChange('pan')}
              title="Pan Canvas"
            >
              <Move size={18} />
            </button>
            
            <div className="h-6 mx-0.5 border-l border-gray-300 my-auto"></div>
            
            <button
              className="p-2.5 rounded-md text-gray-600 hover:bg-gray-100 transition-all duration-150"
              onClick={handleUndo}
              title="Undo"
            >
              <Undo size={18} />
            </button>
            <button
              className="p-2.5 rounded-md text-gray-600 hover:bg-gray-100 transition-all duration-150"
              onClick={handleRedo}
              title="Redo"
            >
              <Redo size={18} />
            </button>
            
            <div className="h-6 mx-0.5 border-l border-gray-300 my-auto"></div>
            
            <div className="relative">
              <button
                className="p-2.5 rounded-md text-gray-600 hover:bg-gray-100 transition-all duration-150 flex items-center"
                onClick={() => setShowColorPicker(!showColorPicker)}
                title="Colors"
              >
                <div 
                  className="w-5 h-5 rounded-full mr-1 shadow-inner" 
                  style={{ backgroundColor: penColor }} 
                />
                <ChevronDown size={15} />
              </button>
              
              {showColorPicker && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-1 p-2 bg-white shadow-lg rounded-lg z-20 w-64"
                >
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {colors.map((color) => (
                      <button
                        key={color}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${color === penColor ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          setPenColor(color);
                          setShowColorPicker(false);
                        }}
                      >
                        {color === penColor && <Check size={14} color="#fff" strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                  
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Stroke Width</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">1</span>
                      <input
                        type="range"
                        min="1"
                        max="12"
                        value={strokeWidth}
                        onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <span className="text-xs text-gray-500">12</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
            
            <div className="h-6 mx-0.5 border-l border-gray-300 my-auto"></div>
            
            <button
              className="p-2.5 rounded-md text-red-500 hover:bg-red-50 transition-all duration-150"
              onClick={handleClear}
              title="Clear Canvas"
            >
              <Trash2 size={18} />
            </button>
            
            <div className="h-6 mx-0.5 border-l border-gray-300 my-auto"></div>
            
            <TextToolButton onSave={handleSaveText} initialText={quickText} initialDirection={textDirection} />
          </div>
          
          <div className="flex items-center">
            {autoSaveStatus !== 'idle' && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`text-sm mr-2 ${autoSaveStatus === 'saving' ? 'text-blue-500' : 'text-green-500'}`}
              >
                {getSaveStatusText()}
              </motion.span>
            )}
            
            <button
              className="p-2.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all duration-150 flex items-center shadow-sm"
              onClick={handleSave}
              title="Save"
            >
              <Save size={18} className="mr-1" />
              <span>Save</span>
            </button>
          </div>
        </div>
        
        {mode === 'text' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm"
          >
            <div className="p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-1 bg-gray-50 p-1 rounded-md">
                  <button
                    onClick={() => handleDirectionChange('ltr')}
                    className={`p-1.5 rounded ${textDirection === 'ltr' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                    title="Left to Right"
                  >
                    <AlignLeft size={14} />
                  </button>
                  <button
                    onClick={() => handleDirectionChange('rtl')}
                    className={`p-1.5 rounded ${textDirection === 'rtl' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                    title="Right to Left"
                  >
                    <AlignRight size={14} />
                  </button>
                </div>
                
                <div className="text-xs text-gray-500">Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Enter</kbd> to save</div>
              </div>
              
              <TextareaAutosize
                ref={textareaRef}
                value={quickText}
                onChange={handleQuickTextChange}
                onKeyDown={handleQuickTextKeyDown}
                className={`w-full p-3 outline-none border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${textDirection === 'rtl' ? 'text-right' : 'text-left'}`}
                dir={textDirection}
                placeholder={textDirection === 'rtl' ? "اكتب هنا ثم اضغط Enter للحفظ..." : "Type here and press Enter to save..."}
                minRows={2}
                maxRows={5}
              />
              
              <div className="mt-3">
                <div className="flex items-center text-xs text-gray-500 mb-1.5">
                  <FileText size={14} className="mr-1" />
                  <span>Markdown Preview</span>
                </div>
                <div className="p-3 rounded-md border border-gray-200 bg-gray-50 prose prose-sm max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p dir={textDirection} style={{textAlign: textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                      h1: ({node, ...props}) => <h1 dir={textDirection} style={{textAlign: textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                      h2: ({node, ...props}) => <h2 dir={textDirection} style={{textAlign: textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                      h3: ({node, ...props}) => <h3 dir={textDirection} style={{textAlign: textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                      h4: ({node, ...props}) => <h4 dir={textDirection} style={{textAlign: textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                      h5: ({node, ...props}) => <h5 dir={textDirection} style={{textAlign: textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                      h6: ({node, ...props}) => <h6 dir={textDirection} style={{textAlign: textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                      ul: ({node, ...props}) => <ul dir={textDirection} style={{textAlign: textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                      ol: ({node, ...props}) => <ol dir={textDirection} style={{textAlign: textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                      li: ({node, ...props}) => <li dir={textDirection} style={{textAlign: textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                      blockquote: ({node, ...props}) => <blockquote dir={textDirection} style={{
                        textAlign: textDirection === 'rtl' ? 'right' : 'left',
                        borderLeftWidth: textDirection === 'rtl' ? 0 : 4,
                        borderRightWidth: textDirection === 'rtl' ? 4 : 0,
                        borderLeftColor: 'rgba(59, 130, 246, 0.5)',
                        borderRightColor: 'rgba(59, 130, 246, 0.5)',
                        backgroundColor: 'rgba(239, 246, 255, 0.6)'
                      }} {...props} />,
                      code: ({node, className, children, ...props}: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match;
                        return isInline 
                          ? <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm" {...props}>{children}</code>
                          : (
                            <pre className="p-3 bg-gray-800 text-white rounded-md overflow-x-auto">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          );
                      }
                    }}
                  >
                    {quickText || "*Markdown preview will appear here*"}
                  </ReactMarkdown>
                </div>
                <div className="mt-2 text-xs text-gray-400 flex items-center">
                  <code className="p-1 bg-gray-100 rounded mr-1">**bold**</code>
                  <code className="p-1 bg-gray-100 rounded mr-1">*italic*</code>
                  <code className="p-1 bg-gray-100 rounded mr-1"># Header</code>
                  <code className="p-1 bg-gray-100 rounded">- List</code>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      
      <div className="flex-grow relative w-full h-full">
        {/* Canvas background with subtle grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2UyZThmMCIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ3aGl0ZSIvPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        
        {/* Fixed position text overlay - Optimized with conditional rendering */}
        {currentNote?.textContent && showText && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-2 z-20 max-w-md p-4 bg-white/95 rounded-lg shadow-lg prose prose-sm"
            dir={currentNote.textDirection || 'ltr'}
            style={{ 
              maxHeight: '50%', 
              overflowY: 'auto',
              textAlign: currentNote.textDirection === 'rtl' ? 'right' : 'left',
              right: currentNote.textDirection === 'rtl' ? '2px' : 'auto',
              left: currentNote.textDirection === 'rtl' ? 'auto' : '2px',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(229, 231, 235, 0.8)',
            }}
          >
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({node, ...props}) => <p dir={currentNote.textDirection || 'ltr'} style={{textAlign: currentNote.textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                h1: ({node, ...props}) => <h1 dir={currentNote.textDirection || 'ltr'} style={{textAlign: currentNote.textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                h2: ({node, ...props}) => <h2 dir={currentNote.textDirection || 'ltr'} style={{textAlign: currentNote.textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                h3: ({node, ...props}) => <h3 dir={currentNote.textDirection || 'ltr'} style={{textAlign: currentNote.textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                h4: ({node, ...props}) => <h4 dir={currentNote.textDirection || 'ltr'} style={{textAlign: currentNote.textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                h5: ({node, ...props}) => <h5 dir={currentNote.textDirection || 'ltr'} style={{textAlign: currentNote.textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                h6: ({node, ...props}) => <h6 dir={currentNote.textDirection || 'ltr'} style={{textAlign: currentNote.textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                ul: ({node, ...props}) => <ul dir={currentNote.textDirection || 'ltr'} style={{textAlign: currentNote.textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                ol: ({node, ...props}) => <ol dir={currentNote.textDirection || 'ltr'} style={{textAlign: currentNote.textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                li: ({node, ...props}) => <li dir={currentNote.textDirection || 'ltr'} style={{textAlign: currentNote.textDirection === 'rtl' ? 'right' : 'left'}} {...props} />,
                blockquote: ({node, ...props}) => <blockquote dir={currentNote.textDirection || 'ltr'} style={{
                  textAlign: currentNote.textDirection === 'rtl' ? 'right' : 'left',
                  borderLeftWidth: currentNote.textDirection === 'rtl' ? 0 : 4,
                  borderRightWidth: currentNote.textDirection === 'rtl' ? 4 : 0,
                  borderLeftColor: 'rgba(59, 130, 246, 0.5)',
                  borderRightColor: 'rgba(59, 130, 246, 0.5)',
                  backgroundColor: 'rgba(239, 246, 255, 0.6)'
                }} {...props} />,
                code: ({node, className, children, ...props}: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match;
                  return isInline 
                    ? <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm" {...props}>{children}</code>
                    : (
                      <pre className="p-3 bg-gray-800 text-white rounded-md overflow-x-auto">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    );
                }
              }}
            >
              {currentNote.textContent}
            </ReactMarkdown>
            <button 
              onClick={() => setShowText(false)}
              className="absolute top-1 right-1 text-gray-500 hover:text-gray-700 rounded-full p-1 hover:bg-gray-100"
              title="Hide Text"
            >
              <XCircle size={18} />
            </button>
          </motion.div>
        )}
        
        {/* Toggle text button - Only render when needed */}
        {currentNote?.textContent && !showText && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowText(true)}
            className="absolute top-2 left-2 z-20 p-2 bg-white/90 rounded-md shadow-md flex items-center space-x-1 text-gray-700 hover:bg-white hover:text-blue-600"
            title="Show Text"
          >
            <Text size={16} />
            <span className="text-xs font-medium">Show Text</span>
          </motion.button>
        )}
        
        {/* Canvas reset zoom button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          onClick={resetZoom}
          className="absolute bottom-4 left-4 z-20 p-2 bg-white/90 rounded-md shadow-md flex items-center space-x-1 text-gray-700 hover:bg-white hover:text-blue-600"
          title="Reset View"
        >
          <ZoomIn size={16} />
          <span className="text-xs font-medium">Reset View</span>
        </motion.button>
        
        {/* Optimized PanningTool with memoized props */}
        <PanningTool
          onPan={handlePan}
          onPanStart={handlePanStart}
          onPanEnd={handlePanEnd}
          isActive={mode === 'pan'}
        >
          <div 
            className={`absolute inset-0 transition-all duration-300 ${mode === 'erase' ? 'cursor-crosshair' : ''}`}
            onMouseDown={handleCanvasMouseDown}
            style={{ 
              pointerEvents: mode === 'text' ? 'none' : 'auto',
              // Ensure the canvas doesn't get hidden or unmounted when text mode is active
              display: 'block', 
              visibility: 'visible'
            }}
          >
            <ReactSketchCanvas
              ref={canvasRef}
              {...canvasOptions}
              width="100%"
              height="100%"
              // Add a key that doesn't force remounting
              key="sketch-canvas"
            />
          </div>
        </PanningTool>
      </div>
    </div>
  );
};

// Wrap with memo for preventing unnecessary re-renders
export default React.memo(Canvas);
