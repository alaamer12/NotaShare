// User type definition
export interface User {
  id: string;
  avatarUrl?: string;
  createdAt: number;
}

// Note type definition
export interface Note {
  id?: number;
  title: string;
  createdBy: string;
  createdAt: number;
  lastModifiedBy: string;
  lastModifiedAt: number;
  textBoxes: TextBox[];
  drawings: DrawingData[];
  canvasData?: any;
  textContent?: string;
  textDirection?: 'ltr' | 'rtl';
}

// TextBox type definition
export interface TextBox {
  id: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

// Drawing data type definition
export interface DrawingData {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
}

// Path type definition for drawings
export interface Path {
  points: Point[];
}

// Point type definition for drawing paths
export interface Point {
  x: number;
  y: number;
}

// Tool type definition
export type Tool = 'select' | 'text' | 'pen' | 'pan';

// Drawing options type definition
export interface DrawingOptions {
  color: string;
  strokeWidth: number;
}

// Canvas state type definition
export interface CanvasState {
  tool: Tool;
  drawingOptions: DrawingOptions;
  isPanning: boolean;
  lastPanPoint: Point | null;
  panOffset: Point;
  scale: number;
  isDragging: boolean;
  isDrawing: boolean;
  currentPath: Point[];
  selectedTextBoxId: string | null;
}

// Stats type definition
export interface Stats {
  id: string;
  uniqueUsers: number;
}
