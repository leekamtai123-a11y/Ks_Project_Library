
export interface BookMetadata {
  name: string;
  authors: string[];
  theme: string;
  summary: string;
}

export type AnnotationType = 'highlight' | 'note' | 'shape';

export interface Annotation {
  id: string;
  type: AnnotationType;
  pageNumber: number;
  text?: string;
  color: string;
  timestamp: number;
  rect?: { x: number; y: number; width: number; height: number }; // For highlights/shapes
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
