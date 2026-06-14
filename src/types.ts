export type ToolType = 'pen' | 'line' | 'arrow' | 'curved-arrow' | 'circle' | 'polygon' | 'connected-circle' | 'masking' | 'player-move' | 'spotlight' | 'lens' | 'name-tag' | 'eraser' | null;

export interface Point {
  x: number;
  y: number;
  r?: number;
  timestamp?: number;
}

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface Particle {
  initialAngle: number;
  speed: number;
}

export interface Shape {
  id: string;
  type: ToolType;
  points: Point[];
  color: string;
  strokeWidth: number;
  text?: string;
  isClosed?: boolean; 
  isFilled?: boolean; 
  isDashed?: boolean; 
  isFreehand?: boolean; 
  img?: ImageBitmap | HTMLCanvasElement; 
  bgImg?: ImageBitmap | HTMLCanvasElement; 
  box?: Rect; 
  timestamp: number; 
  freezeFrameId?: string;
  spotlightConfig?: {
    size: number;
    intensity: number;
    rotation: number;
    particles: Particle[];
  };
  lensConfig?: {
      radius: number;
      zoom: number;
  };
  ringConfig?: {
      tilt: number; 
      isFilled?: boolean;
  };
}

export interface FreezeFrame {
    id: string;
    timestamp: number;
    duration: number;
}

export interface ColorPreset {
  id: number;
  value: string;
}

export interface MaskSettings {
  enabled: boolean;
  sensitivity: number;
  showOverlay: boolean;
  keyColor?: string;
  smoothness?: number;
  shadowTolerance?: number;
}

export interface MaskLayerCache {
  foreground: ImageBitmap | null; 
  overlay: ImageBitmap | null;    
  timestamp: number;
  processedAt: number;
}

export interface TimelineMarker {
  id: string;
  time: number;
  label: string;
  color: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  shortcut: string;
  leadLagEnabled?: boolean;
  preTime?: number;
  postTime?: number;
}

export interface TagEvent {
  id: string;
  tagId: string;
  startTime: number;
  endTime: number;
  notes?: string;
}

export interface Playlist {
  id: string;
  name: string;
  events: TagEvent[]; 
}

// --- Project Types ---

export interface ProjectData {
  shapes: Shape[];
  freezeFrames: FreezeFrame[];
  tags: Tag[];
  tagEvents: TagEvent[];
  playlists: Playlist[];
  markers: TimelineMarker[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  lastModified: number;
  fileName?: string;
  data: ProjectData;
}
