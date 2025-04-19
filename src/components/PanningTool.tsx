import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Move } from 'lucide-react';

interface PanningToolProps {
  onPanStart?: () => void;
  onPanEnd?: () => void;
  onPan?: (dx: number, dy: number) => void;
  isActive?: boolean;
  children: React.ReactNode;
}

const PanningTool: React.FC<PanningToolProps> = ({
  onPanStart,
  onPanEnd,
  onPan,
  isActive = false,
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [viewportDimensions, setViewportDimensions] = useState({ width: 0, height: 0 });
  
  // Calculate and update viewport dimensions
  const updateViewportDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setViewportDimensions({ width, height });
    }
  }, []);

  // Recalculate viewport on resize
  useEffect(() => {
    updateViewportDimensions();
    
    const handleResize = () => {
      updateViewportDimensions();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateViewportDimensions]);

  // Handle space key down and up
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isSpaceDown) {
        setIsSpaceDown(true);
        document.body.style.cursor = 'grab';
        // Prevent default space bar behavior (scrolling)
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceDown(false);
        document.body.style.cursor = 'default';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.body.style.cursor = 'default';
    };
  }, [isSpaceDown]);

  // Handle panning logic
  const panningModeActive = isSpaceDown || isActive;

  const handleStartPanning = (e: React.MouseEvent) => {
    if (panningModeActive && containerRef.current) {
      setIsPanning(true);
      setInitialPosition({ x: e.clientX, y: e.clientY });
      document.body.style.cursor = 'grabbing';
      
      if (onPanStart) {
        onPanStart();
      }
      
      // Prevent default behavior to avoid drawing while panning
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handlePanning = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - initialPosition.x;
      const dy = e.clientY - initialPosition.y;
      
      setOffset({ x: offset.x + dx, y: offset.y + dy });
      setInitialPosition({ x: e.clientX, y: e.clientY });
      
      if (onPan) {
        onPan(dx, dy);
      }
      
      // Prevent default behavior to avoid drawing while panning
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleStopPanning = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      document.body.style.cursor = isSpaceDown ? 'grab' : 'default';
      
      if (onPanEnd) {
        onPanEnd();
      }
      
      // Prevent default behavior
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Calculate canvas size based on viewport
  const canvasSize = {
    width: Math.max(viewportDimensions.width * 3, 2000),
    height: Math.max(viewportDimensions.height * 3, 2000)
  };

  return (
    <div 
      ref={containerRef} 
      className="panning-container w-full h-full relative overflow-hidden"
      onMouseDown={panningModeActive ? handleStartPanning : undefined}
      onMouseMove={isPanning ? handlePanning : undefined}
      onMouseUp={isPanning ? handleStopPanning : undefined}
      onMouseLeave={isPanning ? handleStopPanning : undefined}
    >
      {/* Main panning area - this div shifts for panning */}
      <div 
        ref={contentRef}
        className="panning-content absolute"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          transition: isPanning ? 'none' : 'transform 0.1s ease',
          // Dynamically sized canvas based on viewport
          width: `${canvasSize.width}px`,
          height: `${canvasSize.height}px`,
          // Center the canvas in the viewport
          left: `-${(canvasSize.width - viewportDimensions.width) / 2}px`,
          top: `-${(canvasSize.height - viewportDimensions.height) / 2}px`
        }}
      >
        {/* This is important - we create a centered viewport to contain
            all children, ensuring the canvas has room to pan in all directions */}
        <div className="viewport-center absolute" style={{
          // Make the viewport-center fill the entire panning area
          width: '100%',
          height: '100%',
          // Position it in the center of the panning area
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          // Add a visible border to help with debugging
          border: process.env.NODE_ENV === 'development' ? '1px dashed rgba(0,0,255,0.2)' : 'none'
        }}>
          {children}
        </div>
      </div>
      
      {panningModeActive && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.8, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-md shadow-lg flex items-center z-50"
          style={{ pointerEvents: 'none' }}
        >
          <Move size={16} className="mr-2" />
          <span className="text-sm">Panning Mode {isPanning ? '(Active)' : ''}</span>
        </motion.div>
      )}
    </div>
  );
};

export default React.memo(PanningTool); 