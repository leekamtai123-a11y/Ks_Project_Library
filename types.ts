
export interface BookMetadata {
  name: string;
  authors: string[];
  theme: string;
  summary: string;
}

export type AnnotationType = 'highlight' | 'note' | 'shape' | 'draw';

export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  pageNumber: number;
  text?: string;
  color: string;
  timestamp: number;
  rect?: { x: number; y: number; width: number; height: number }; // For highlights/shapes
  path?: Point[]; // For freehand drawing
}

export interface Book {
  id: string;
  file: File;
  dataUrl: string;
  coverUrl?: string;
  metadata: BookMetadata;
  annotations: Annotation[];
  currentPage: number;
  totalPages: number;
  uploadDate: number;
  fileSize: number;
}

export interface GroundingSource {
  title: string;
  uri: string;
}
