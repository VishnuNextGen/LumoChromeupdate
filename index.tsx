import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, RotateCcw, RotateCw, Trash2, Upload,
  Maximize, Minimize, MousePointer2, Circle, Pen,
  MoveUpRight, Hexagon, GitCommitVertical, Settings2,
  ChevronRight, ChevronLeft, Type, Video, Undo2, Redo2,
  Download, X, AlertTriangle, LogOut, Minus, Layers, Eye, EyeOff,
  SlidersHorizontal, CornerUpRight, Volume2, VolumeX, Flag, User, Flashlight, ZoomIn, Cylinder,
  Activity, Spline, Slash, MoreHorizontal, PaintBucket,
  Tags, FolderPlus, Folder, FolderOpen, Film, ListPlus, Filter, Keyboard, Plus, Save, Edit2, Check,
  GripVertical, PlayCircle, StopCircle, Pencil, Trash, PlusCircle, FileUp, FileDown, MessageSquare, Scissors, GripHorizontal,
  SkipBack, SkipForward, ZoomOut, Snowflake, Clock, Timer, LayoutGrid, MoreVertical, Calendar, Disc, Code, Zap,
  ChevronsUp, ChevronsDown, Tag, Eraser, Pipette
} from 'lucide-react';

// --- Types ---

import type { 
  ToolType, Point, Rect, Particle, Shape, FreezeFrame, 
  ColorPreset, MaskSettings, MaskLayerCache, TimelineMarker, 
  Tag as TagData, TagEvent, Playlist, ProjectData, Project
} from './src/types';

import { saveVideoLocally, loadVideoLocally } from './src/utils/db';
import { formatTime, getDistance, clamp, getVideoLayout } from './src/utils/math';
import { fadeColor, adjustBrightness, shiftColor, rgbToHsl } from './src/utils/colors';
import { LumoPitchLogo, LoginScreen } from './src/components/LoginScreen';

const INITIAL_COLORS: ColorPreset[] = [
  { id: 1, value: '#ef4444' },
  { id: 2, value: '#ffff00' },
  { id: 3, value: '#3b82f6' },
  { id: 4, value: '#22c55e' },
  { id: 5, value: '#ffffff' },
  { id: 6, value: '#00eaff' },
  { id: 7, value: '#f97316' },
  { id: 8, value: '#d946ef' },
  { id: 9, value: '#000000' },
];

const DEFAULT_TAGS: TagData[] = [
  { id: '1', name: 'Goal', color: '#22c55e', shortcut: '1', leadLagEnabled: true, preTime: 10, postTime: 10 },
  { id: '2', name: 'Foul', color: '#ef4444', shortcut: '2', leadLagEnabled: false },
  { id: '3', name: 'Shot', color: '#3b82f6', shortcut: '3', leadLagEnabled: false },
  { id: '4', name: 'Corner', color: '#f59e0b', shortcut: '4', leadLagEnabled: false },
  { id: '5', name: 'Pass', color: '#ffffff', shortcut: '5', leadLagEnabled: false },
];

// --- Helper Functions ---

import { 
  createParticles, drawArrowHead, drawDashedLine, drawLabel, 
  getShimmerGradient, drawFreehandArrow, drawProArrow, draw3DRing, 
  drawSpotlight, drawLens, drawNameTag, drawActiveChain, 
  drawHead, drawCurvedArrow, drawTangentLine, drawFrame, 
  drawShapeOnCanvas, drawPreview, getFilteredEvents, getVideoSpacePoint 
} from './src/utils/drawing';

// --- Components ---



import { auth, loginWithGoogle, logout, saveUserProfile, getUserProjects, createProjectDoc, updateProjectDoc, deleteProjectDoc, testConnection } from './firebase';

import { RecordingTimer } from './src/components/RecordingTimer';
import { EventPlaybar } from './src/components/EventPlaybar';

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<'home' | 'workspace'>('home');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  
  // Transient blob store for current session
  const [projectBlobs, setProjectBlobs] = useState<Map<string, string>>(new Map());
  const [videoFolderHandle, setVideoFolderHandle] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editing state for projects
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{name: string, description: string}>({ name: '', description: '' });

  useEffect(() => {
      testConnection(); // Verify connection on load
      const unsubscribe = auth.onAuthStateChanged(async (u) => {
          setUser(u);
          if (u) {
              await saveUserProfile(u);
              const userProjs = await getUserProjects(u.uid);
              const loadedProjs = userProjs.map((p: any) => ({
                 id: p.id,
                 name: p.name,
                 description: p.description,
                 createdAt: p.createdAt && p.createdAt.toMillis ? p.createdAt.toMillis() : Date.now(),
                 lastModified: p.updatedAt && p.updatedAt.toMillis ? p.updatedAt.toMillis() : Date.now(),
                 fileName: p.fileName,
                 ownerId: p.ownerId,
                 data: p.data ? JSON.parse(p.data) : {}
              }));
              setProjects(loadedProjs.sort((a,b) => b.lastModified - a.lastModified));
          } else {
              setProjects([]);
          }
          setAuthLoading(false);
      });
      return () => unsubscribe();
  }, []);

  const createProject = async (file: File) => {
      if (!user) {
          setErrorMessage("Please sign in to create projects.");
          return;
      }
      
      const newId = Date.now().toString();
      const url = URL.createObjectURL(file);
      await saveVideoLocally(newId, file);
      
      const newProject: Project = {
          id: newId,
          name: file.name.split('.')[0] || 'Untitled Project',
          description: '',
          createdAt: Date.now(),
          lastModified: Date.now(),
          fileName: file.name,
          data: {
              shapes: [],
              freezeFrames: [],
              tags: DEFAULT_TAGS,
              tagEvents: [],
              playlists: [{ id: 'p1', name: 'Highlights', events: [] }, { id: 'p2', name: 'Defense', events: [] }],
              markers: []
          }
      };
      
      // Save to Firebase
      await createProjectDoc({ ...newProject, ownerId: user.uid });
      
      setProjects(prev => [newProject, ...prev]);
      setProjectBlobs(prev => new Map(prev).set(newId, url));
      setActiveProject(newProject);
      setView('workspace');
  };

  const deleteProjectAction = async (id: string) => {
      if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
          await deleteProjectDoc(id);
          setProjects(prev => prev.filter(p => p.id !== id));
          setProjectBlobs(prev => {
              const newMap = new Map(prev);
              const url = newMap.get(id);
              if (url && typeof url === 'string') URL.revokeObjectURL(url);
              newMap.delete(id);
              return newMap;
          });
      }
  };

  const startEditingProject = (p: Project) => {
      setEditingProjectId(p.id);
      setEditForm({ name: p.name, description: p.description });
  };

  const saveEditingProject = async () => {
      if (editingProjectId) {
          const p = projects.find(x => x.id === editingProjectId);
          if (p) {
              const updatedProject = { ...p, name: editForm.name, description: editForm.description, lastModified: Date.now() };
              await updateProjectDoc(updatedProject);
              setProjects(prev => prev.map(x => x.id === editingProjectId ? updatedProject : x));
          }
          setEditingProjectId(null);
      }
  };

  const updateProjectData = (id: string, data: ProjectData) => {
      const p = projects.find(x => x.id === id);
      if (p) {
          const updatedProject = { ...p, data, lastModified: Date.now() };
          setProjects(prev => prev.map(x => x.id === id ? updatedProject : x));
          setActiveProject(prev => prev && prev.id === id ? updatedProject : prev);
          
          // Fire and forget Firebase update so it doesn't block UI thread on slow networks
          updateProjectDoc(updatedProject).catch(console.error);
      }
  };

  const mountWorkspaceFolder = async () => {
      try {
          if (!('showDirectoryPicker' in window)) {
              setErrorMessage("Your browser does not support the File System Access API. Please use Chrome, Edge, or Opera.");
              return;
          }
          const handle = await (window as any).showDirectoryPicker({
              id: 'lumopitch_workspace',
              mode: 'read',
              startIn: 'videos'
          });
          setVideoFolderHandle(handle);
      } catch (err: any) {
          if (err.name !== 'AbortError') {
              console.error(err);
              if (window.self !== window.top) {
                  setErrorMessage("Browsers block folder access inside embedded previews. Please open this app in a New Tab (top right button) to link a folder.");
              } else {
                  setErrorMessage("Failed to access folder: " + err.message);
              }
          }
      }
  };

  const openProject = async (project: Project) => {
      let blobUrl = projectBlobs.get(project.id);
      
      // Try folder access first if available
      if (!blobUrl && videoFolderHandle && project.fileName) {
          try {
              const fileHandle = await videoFolderHandle.getFileHandle(project.fileName);
              const file = await fileHandle.getFile();
              blobUrl = URL.createObjectURL(file);
              setProjectBlobs(prev => new Map(prev).set(project.id, blobUrl!));
          } catch (e) {
              console.log("File not found in mounted video folder:", project.fileName);
          }
      }

      if (!blobUrl) {
          // Fallback to try load from IndexedDB
          const file = await loadVideoLocally(project.id);
          if (file) {
              blobUrl = URL.createObjectURL(file);
              setProjectBlobs(prev => new Map(prev).set(project.id, blobUrl!));
          }
      }
      
      if (blobUrl) {
          setActiveProject(project);
          setView('workspace');
      } else {
          // Ask user to re-upload to match file path
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.accept = 'video/*';
          fileInput.onchange = async (e) => {
              const target = e.target as HTMLInputElement;
              if (target.files && target.files[0]) {
                  const url = URL.createObjectURL(target.files[0]);
                  await saveVideoLocally(project.id, target.files[0]);
                  setProjectBlobs(prev => new Map(prev).set(project.id, url));
                  setActiveProject(project);
                  setView('workspace');
              }
          };
          setErrorMessage(`Video file "${project.fileName || 'Unknown File'}" is missing. Please select the file to resume the project.`);
          setTimeout(() => fileInput.click(), 100);
      }
  };

  if (authLoading) {
      return (
          <div className="w-screen h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
      );
  }

  if (!user) {
      return <LoginScreen onLogin={loginWithGoogle} />;
  }

  // --- Home Screen ---
  if (view === 'home') {
      return (
          <>
          {errorMessage && (
              <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-900 border border-red-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-start gap-3 max-w-md">
                  <AlertTriangle className="w-6 h-6 shrink-0 text-red-400" />
                  <div>
                      <h3 className="font-bold text-sm">Notice</h3>
                      <p className="text-sm text-red-200 mt-1">{errorMessage}</p>
                  </div>
                  <button onClick={() => setErrorMessage(null)} className="ml-auto text-red-400 hover:text-white mt-0.5">
                      <X className="w-5 h-5" />
                  </button>
              </div>
          )}
          <div className="w-screen h-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
             <div className="p-8 border-b border-[#222] flex justify-between items-center bg-[#111]">
                 <div className="flex items-center gap-3">
                     <div className="flex items-center justify-center">
                         <LumoPitchLogo className="w-10 h-10" />
                     </div>
                     <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Lumo Pitch <span className="text-gray-500 font-normal text-lg">Projects</span></h1>
                 </div>
                 <div className="flex items-center gap-4">
                     <div className="flex items-center gap-3 bg-[#222] px-4 py-2 rounded-lg border border-[#333]">
                         {auth.currentUser?.photoURL ? (
                             <img src={auth.currentUser.photoURL} alt="Profile" className="w-6 h-6 rounded-full" />
                         ) : (
                             <User className="w-5 h-5 text-gray-400" />
                         )}
                         <span className="text-sm font-medium text-gray-300">{user.displayName || user.email}</span>
                         <button onClick={logout} className="ml-2 text-gray-500 hover:text-red-400 transition-colors" title="Log Out">
                             <LogOut className="w-4 h-4" />
                         </button>
                     </div>
                     <button
                         onClick={mountWorkspaceFolder}
                         className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 border ${videoFolderHandle ? 'bg-purple-900/40 text-purple-300 border-purple-500/50' : 'bg-[#222] text-gray-300 border-[#333] hover:bg-[#333]'}`}
                         title={videoFolderHandle ? "Video folder linked. Projects will auto-load." : "Link a local folder containing your videos to auto-load projects."}
                     >
                         <FolderOpen className="w-5 h-5" />
                         {videoFolderHandle ? 'Folder Linked' : 'Link Video Folder'}
                     </button>
                     <label className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium cursor-pointer transition-colors flex items-center gap-2">
                         <PlusCircle className="w-5 h-5" />
                         New Project
                         <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && createProject(e.target.files[0])} />
                     </label>
                 </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8">
                 {projects.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                         <LayoutGrid className="w-16 h-16 opacity-20" />
                         <p className="text-lg">No projects yet. Start by uploading a video.</p>
                     </div>
                 ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {projects.map(project => {
                             const hasSource = projectBlobs.has(project.id);
                             const isEditing = editingProjectId === project.id;
                             return (
                                 <motion.div 
                                    key={project.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-[#161616] border border-[#333] rounded-xl overflow-hidden hover:border-blue-500/50 transition-colors group"
                                 >
                                     <div className="p-5 space-y-4">
                                         <div className="flex justify-between items-start">
                                             <div className="flex-1 min-w-0">
                                                 {isEditing ? (
                                                     <input 
                                                        className="bg-[#111] border border-[#333] rounded px-2 py-1 text-lg font-bold text-white focus:outline-none focus:border-blue-500 w-full mb-1"
                                                        value={editForm.name}
                                                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                                        placeholder="Project Name"
                                                        autoFocus
                                                     />
                                                 ) : (
                                                     <div className="flex items-center gap-2">
                                                         <h3 className="text-lg font-bold text-white truncate">{project.name}</h3>
                                                         <button onClick={() => startEditingProject(project)} className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="w-3.5 h-3.5" /></button>
                                                     </div>
                                                 )}
                                                 
                                                 <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                     <Calendar className="w-3 h-3" />
                                                     {new Date(project.lastModified).toLocaleDateString()}
                                                 </div>
                                             </div>
                                             
                                             {!isEditing && (
                                                 <div className="relative group/menu shrink-0 ml-2">
                                                     <button className="p-2 text-gray-400 hover:text-white rounded hover:bg-[#222]">
                                                         <MoreVertical className="w-4 h-4" />
                                                     </button>
                                                     <div className="absolute right-0 top-full bg-[#222] border border-[#333] rounded shadow-xl py-1 w-32 hidden group-hover/menu:block z-10">
                                                         <button 
                                                            onClick={() => startEditingProject(project)}
                                                            className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#333] flex items-center gap-2"
                                                         >
                                                             <Edit2 className="w-3 h-3" /> Edit
                                                         </button>
                                                         <button 
                                                            onClick={() => deleteProjectAction(project.id)}
                                                            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-900/20 flex items-center gap-2"
                                                         >
                                                             <Trash2 className="w-3 h-3" /> Delete
                                                         </button>
                                                     </div>
                                                 </div>
                                             )}
                                         </div>
                                         
                                         {isEditing ? (
                                             <textarea 
                                                 className="w-full bg-[#111] border border-[#333] rounded p-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500 resize-none h-20"
                                                 placeholder="Add description..."
                                                 value={editForm.description}
                                                 onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                             />
                                         ) : (
                                             <p className="text-sm text-gray-400 line-clamp-3 h-20">
                                                 {project.description || "No description"}
                                             </p>
                                         )}

                                         <div className="flex justify-between items-center pt-2">
                                             {isEditing ? (
                                                 <div className="flex gap-2 w-full">
                                                     <button onClick={() => setEditingProjectId(null)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium">Cancel</button>
                                                     <button onClick={saveEditingProject} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium">Save</button>
                                                 </div>
                                             ) : (
                                                 <>
                                                     <div className="flex gap-2">
                                                         <div className="px-2 py-1 bg-[#222] rounded text-xs text-gray-400 border border-[#333]">
                                                             {project.data.tagEvents.length} Events
                                                         </div>
                                                         <div className="px-2 py-1 bg-[#222] rounded text-xs text-gray-400 border border-[#333]">
                                                             {project.data.shapes.length} Shapes
                                                         </div>
                                                     </div>
                                                     {hasSource ? (
                                                         <button 
                                                            onClick={() => openProject(project)}
                                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                                                         >
                                                             Open Project
                                                         </button>
                                                     ) : (
                                                         <label className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">
                                                             Reload Video
                                                             <input 
                                                                type="file" 
                                                                accept="video/*" 
                                                                className="hidden" 
                                                                onChange={(e) => {
                                                                    if (e.target.files?.[0]) {
                                                                        const url = URL.createObjectURL(e.target.files[0]);
                                                                        setProjectBlobs(prev => new Map(prev).set(project.id, url));
                                                                    }
                                                                }}
                                                             />
                                                         </label>
                                                     )}
                                                 </>
                                             )}
                                         </div>
                                     </div>
                                 </motion.div>
                             );
                         })}
                     </div>
                 )}
             </div>
          </div>
          </>
      );
  }

  // --- Workspace ---
  const projectBlob = activeProject ? projectBlobs.get(activeProject.id) : null;
  if (!activeProject || !projectBlob) return null;

  return (
    <Workspace 
        videoUrl={projectBlob} 
        project={activeProject}
        onUpdateProject={(data) => updateProjectData(activeProject.id, data)}
        onClose={() => setView('home')} 
    />
  );
};

const Workspace = ({ 
    videoUrl, 
    project, 
    onUpdateProject,
    onClose 
}: { 
    videoUrl: string, 
    project: Project, 
    onUpdateProject: (data: ProjectData) => void,
    onClose: () => void 
}) => {
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0); // Default speed 1x
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  
  // Freeze Frame State
  const [freezeFrames, setFreezeFrames] = useState<FreezeFrame[]>(project.data.freezeFrames);
  const triggeredFreezeFrames = useRef<Set<string>>(new Set());
  const [activeFreezeFrameId, setActiveFreezeFrameId] = useState<string | null>(null); 
  const [countdownValue, setCountdownValue] = useState(0); 
  const countdownInterval = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Drawing State
  const [tool, setTool] = useState<ToolType>(null);
  const [colors, setColors] = useState<ColorPreset[]>(INITIAL_COLORS);
  const [activeColorId, setActiveColorId] = useState<number>(6); 
  const [strokeWidth, setStrokeWidth] = useState(6);
  const [shapes, setShapes] = useState<Shape[]>(project.data.shapes);
  const [redoStack, setRedoStack] = useState<Shape[][]>([]);
  
  // Name Tag State

  // Interaction State
  const [isDrawing, setIsDrawing] = useState(false);
  const [activePoints, setActivePoints] = useState<Point[]>([]); 
  const activePointsRef = useRef<Point[]>([]);
  
  // Sync state to ref (for anything that still sets state)
  useEffect(() => {
      activePointsRef.current = activePoints;
  }, [activePoints]);

  const [currentDragStart, setCurrentDragStart] = useState<Point | null>(null); 
  const mousePosRef = useRef<Point | null>(null); 

  // Arrow Settings
  const [arrowSettings, setArrowSettings] = useState({
      isDashed: false,
      isFreehand: false
  });

  // Player Dragger State
  const [playerMoveState, setPlayerMoveState] = useState<'idle' | 'selecting' | 'moving'>('idle');
  const [playerSelectionRect, setPlayerSelectionRect] = useState<Rect | null>(null); 
  const [capturedSprite, setCapturedSprite] = useState<{ sprite: ImageBitmap, patch: ImageBitmap, box: Rect } | null>(null);
  
  // Spotlight State
  const [spotlightSettings, setSpotlightSettings] = useState({
    size: 45, intensity: 0.75, rotation: 0.45 
  });

  // Lens State
  const [lensSettings, setLensSettings] = useState({ size: 75, zoom: 2.0 });
  const [nameTagSettings, setNameTagSettings] = useState<{
    names: { id: string, text: string }[],
    activeId: string | null,
    size: number,
    tempName: string
  }>({ 
      names: [{ id: '1', text: 'De Bruyne' }, { id: '2', text: 'Haaland' }], 
      activeId: '1', 
      size: 20, 
      tempName: '' 
  });
  const [ringSettings, setRingSettings] = useState({ tilt: 65, isFilled: false, size: 85 });

  // Masking State
  const [maskSettings, setMaskSettings] = useState<MaskSettings>({ enabled: false, sensitivity: 40, showOverlay: true, keyColor: '#4ade80', smoothness: 20, shadowTolerance: 30 });
  const [maskCache, setMaskCache] = useState<MaskLayerCache>({ foreground: null, overlay: null, timestamp: -1, processedAt: 0 });
  const [isProcessingMask, setIsProcessingMask] = useState(false);
  const [isPickingColor, setIsPickingColor] = useState(false);

  // Markers State
  const [markers, setMarkers] = useState<TimelineMarker[]>(project.data.markers);
  const [markerModal, setMarkerModal] = useState<{ isOpen: boolean; x: number; y: number; mode: 'create' | 'edit'; markerId?: string; time?: number; tempLabel: string; tempColor: string; } | null>(null);

  // --- Tagging & Playlist State ---
  const [tags, setTags] = useState<TagData[]>(project.data.tags);
  const [tagEvents, setTagEvents] = useState<TagEvent[]>(project.data.tagEvents);
  const [isTaggingMode, setIsTaggingMode] = useState(false);
  const [activeRecording, setActiveRecording] = useState<{ tagId: string, startTime: number } | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>(project.data.playlists);
  const [activePlaylistId, setActivePlaylistId] = useState<string>('p1');
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  const [tagSettingsOpen, setTagSettingsOpen] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tempTag, setTempTag] = useState<Partial<TagData>>({});

  // Playlist Management State
  const [playlistModal, setPlaylistModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit'; playlistId?: string; tempName: string } | null>(null);
  const [playlistDeleteId, setPlaylistDeleteId] = useState<string | null>(null);
  const [autoplay, setAutoplay] = useState<{ active: boolean; playlistId: string | null; eventIndex: number }>({ active: false, playlistId: null, eventIndex: -1 });
  const [draggingEventIndex, setDraggingEventIndex] = useState<number | null>(null);

  // Sidebar Resizing State
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [eventSectionHeight, setEventSectionHeight] = useState(40);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingSection, setIsResizingSection] = useState(false);

  // Timeline Editing State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, eventId: string } | null>(null);
  const [editEventModal, setEditEventModal] = useState<{ isOpen: boolean, eventId: string, startTime: number, endTime: number, notes: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  // Recording State
  const [isScreenRecording, setIsScreenRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordingStateRef = useRef<{ rafId: number; stream: MediaStream } | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const exportSettingsRef = useRef<{ active: boolean, playlistId: string | null, withFreezeFrames: boolean }>({ active: false, playlistId: null, withFreezeFrames: true });

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
    if (recordingStateRef.current) {
        cancelAnimationFrame(recordingStateRef.current.rafId);
        recordingStateRef.current.stream.getTracks().forEach(track => track.stop());
        recordingStateRef.current = null;
    }
    recordingStartTimeRef.current = null;
    setIsScreenRecording(false);
  }, []);

  const toggleScreenRecording = async () => {
    setRecordingError(null);
    if (isScreenRecording) {
      stopRecording();
      return;
    }

    try {
      const video = videoRef.current;
      const overlayCanvas = canvasRef.current;

      if (!video || !overlayCanvas) {
         throw new Error("Video or canvas not found.");
      }

      // Create a composite canvas tailored to the video's intrinsic dimensions for broadcast quality
      const compCanvas = document.createElement('canvas');
      const vWidth = video.videoWidth || 1920;
      const vHeight = video.videoHeight || 1080;
      compCanvas.width = vWidth;
      compCanvas.height = vHeight;
      const ctx = compCanvas.getContext('2d', { alpha: false, desynchronized: true });
      if (!ctx) throw new Error("Could not create drawing context.");

      const stream = compCanvas.captureStream(60); // 60 FPS for smooth telestrations

      // Try grabbing audio from video if possible
      let hasAudio = false;
      try {
           const anyVideo = video as any;
           let audioStream: MediaStream | null = null;
           if (typeof anyVideo.captureStream === 'function') {
               audioStream = anyVideo.captureStream();
           } else if (typeof anyVideo.mozCaptureStream === 'function') {
               audioStream = anyVideo.mozCaptureStream();
           }
           if (audioStream) {
               audioStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
                   stream.addTrack(track);
                   hasAudio = true;
               });
           }
      } catch (e) {
           console.warn("Could not capture audio stream from video", e);
      }

      const possibleTypes = hasAudio ? [
        'video/mp4; codecs="avc1.424028, mp4a.40.2"',
        'video/mp4; codecs=avc1.424028',
        'video/mp4',
        'video/webm; codecs=vp9,opus',
        'video/webm; codecs=vp8,opus',
        'video/webm',
        ''
      ] : [
        'video/mp4; codecs=avc1.424028',
        'video/mp4',
        'video/webm; codecs=vp9',
        'video/webm; codecs=vp8',
        'video/webm',
        ''
      ];

      let mimeType = '';
      for (const type of possibleTypes) {
        if (type === '' || MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      const options: any = mimeType ? { mimeType } : {};
      options.videoBitsPerSecond = 30000000; // 30 Mbps for high broadcast quality
      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const format = mimeType || 'video/webm';
        let ext = 'webm';
        if (format.includes('mp4')) ext = 'mp4';
        
        const blob = new Blob(recordedChunksRef.current, { type: format });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        
        const baseName = project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'telestration-recording';
        a.download = `${baseName}-${Date.now()}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        recordedChunksRef.current = [];
        setIsScreenRecording(false);
      };

      // Composite rendering loop
      const drawFrame = (now: number) => {
         if (!recordingStateRef.current) return;
         recordingStateRef.current.rafId = requestAnimationFrame(drawFrame);
         
         if (video.readyState >= 2) { 
             ctx.drawImage(video, 0, 0, compCanvas.width, compCanvas.height);
             
             // Draw the overlay canvas
             const layout = getVideoLayout(overlayCanvas, video);
             if (layout.w > 0 && layout.h > 0) {
                 ctx.drawImage(
                    overlayCanvas, 
                    layout.x, layout.y, layout.w, layout.h, 
                    0, 0, compCanvas.width, compCanvas.height
                 );
             }
         }
      };

      const initialRaf = requestAnimationFrame(drawFrame);
      recordingStateRef.current = { rafId: initialRaf, stream };

      recordedChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsScreenRecording(true);
    } catch (err: any) {
      console.error("Error starting canvas recording:", err);
      setRecordingError(err.message || "Failed to start canvas recording.");
      stopRecording();
    }
  };

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ghostCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null); 
  const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed
  const currentColor = colors.find(c => c.id === activeColorId)?.value || '#00eaff';

  // --- Data Sync ---
  // Debounced update to parent
  useEffect(() => {
    const timeout = setTimeout(() => {
        onUpdateProject({
            shapes, freezeFrames, tags, tagEvents, playlists, markers
        });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [shapes, freezeFrames, tags, tagEvents, playlists, markers]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  useEffect(() => {
      if (isTimelineExpanded) {
          setTimelineZoom(5);
      } else {
          setTimelineZoom(1);
      }
  }, [isTimelineExpanded]);

  useEffect(() => {
    if (isPlaying) {
      setShapes(prev => prev.filter(s => !!s.freezeFrameId));
      setRedoStack([]);
      setActivePoints([]);
      setIsDrawing(false);
      setCurrentDragStart(null);
      setPlayerMoveState('idle');
      setPlayerSelectionRect(null);
      setCapturedSprite(null);
    }
  }, [isPlaying]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (!activeFreezeFrameId) {
        if (countdownInterval.current) {
            clearInterval(countdownInterval.current);
            countdownInterval.current = null;
        }
        return;
    }

    const ff = freezeFrames.find(f => f.id === activeFreezeFrameId);
    if (!ff) return;

    const startCountdown = () => {
        if (countdownInterval.current) return;
        setCountdownValue(prev => {
            let remaining = prev > 0 ? prev : ff.duration;
            countdownInterval.current = window.setInterval(() => {
                remaining -= 0.1;
                setCountdownValue(remaining);
                if (remaining <= 0) {
                    if (countdownInterval.current) clearInterval(countdownInterval.current);
                    countdownInterval.current = null;
                    if (videoRef.current) {
                        videoRef.current.play();
                        setIsPlaying(true);
                    }
                    setActiveFreezeFrameId(null);
                    setCountdownValue(0);
                }
            }, 100);
            return remaining;
        });
    };

    if (maskSettings.enabled) {
        const isMaskSynced = maskCache.timestamp !== -1 && Math.abs(maskCache.timestamp - ff.timestamp) < 0.15;
        if (maskCache.processedAt > 0 && isMaskSynced) {
            timer = setTimeout(() => {
                startCountdown();
            }, 0);
        }
    } else {
        startCountdown();
    }

    return () => {
        if (timer) clearTimeout(timer);
        // Do NOT clear interval here because we want it to persist across re-renders 
        // that are triggered by maskCache updates, BUT we rely on the 
        // !activeFreezeFrameId branch above to clear it when freeze frame ends.
    };
  }, [activeFreezeFrameId, maskSettings.enabled, maskCache.processedAt, maskCache.timestamp, freezeFrames]);

  // Dynamic Timeline Calculation
  const timelineLanes = useMemo(() => {
      let allEvents = [...tagEvents];
      
      // Inject pseudo-event for live recording
      if (isTaggingMode && activeRecording) {
          allEvents.push({
              id: 'RECORDING_PSEUDO',
              tagId: activeRecording.tagId,
              startTime: activeRecording.startTime,
              endTime: currentTime,
              notes: 'Recording...'
          });
      }

      if (filterTagId) {
          allEvents = allEvents.filter(e => e.tagId === filterTagId);
      }
      
      // Sort by start time
      allEvents.sort((a, b) => a.startTime - b.startTime);

      const lanes: TagEvent[][] = [];
      
      allEvents.forEach(event => {
          let placed = false;
          // Try to fit in existing lane
          for (let i = 0; i < lanes.length; i++) {
              const lane = lanes[i];
              const lastEvent = lane[lane.length - 1];
              // 0.05 buffer to prevent visual overlap
              if (event.startTime >= lastEvent.endTime + 0.05) {
                  lane.push(event);
                  placed = true;
                  break;
              }
          }
          // Create new lane
          if (!placed) {
              lanes.push([event]);
          }
      });
      return lanes;
  }, [tagEvents, activeRecording, currentTime, isTaggingMode, filterTagId]);

  // ... (Toggle Play, Mute, Zoom, Manual Seek, etc. same as before)
  const togglePlay = () => {
    if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
        countdownInterval.current = null;
        setActiveFreezeFrameId(null);
        setCountdownValue(0);
        if (videoRef.current) videoRef.current.play();
        setIsPlaying(true);
        return;
    }
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        if (autoplay.active) {
            setAutoplay({ active: false, playlistId: null, eventIndex: -1 });
        }
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleZoomIn = () => {
      setTimelineZoom(prev => Math.min(20, prev + 1));
  };

  const handleZoomOut = () => {
      setTimelineZoom(prev => Math.max(1, prev - 1));
  };

  useEffect(() => {
      if (timelineContainerRef.current) {
          const container = timelineContainerRef.current;
          if (timelineZoom > 1) {
              const scrollWidth = container.scrollWidth;
              const clientWidth = container.clientWidth;
              const progress = currentTime / (duration || 1);
              const center = (progress * scrollWidth) - (clientWidth / 2);
              container.scrollLeft = center;
          } else {
              container.scrollLeft = 0;
          }
      }
  }, [currentTime, timelineZoom, duration]);

  const getFilteredEvents = () => {
      let events = [...tagEvents];
      if (filterTagId) {
          events = events.filter(e => e.tagId === filterTagId);
      }
      return events.sort((a, b) => a.startTime - b.startTime);
  };

  const handleManualSeek = (time: number) => {
      if (videoRef.current) {
          videoRef.current.currentTime = time;
          setCurrentTime(time);
          triggeredFreezeFrames.current.clear();
          if (countdownInterval.current) {
              clearInterval(countdownInterval.current);
              countdownInterval.current = null;
              setActiveFreezeFrameId(null);
              setCountdownValue(0);
              setIsPlaying(false);
          }
      }
  };

  const jumpPrevEvent = () => {
    const events = getFilteredEvents();
    if (!events.length || !videoRef.current) return;
    const now = videoRef.current.currentTime;
    const prev = [...events].reverse().find(e => e.startTime < now - 0.5);
    if (prev) {
        handleManualSeek(prev.startTime);
    } else if (now > 0.5) {
        handleManualSeek(0);
    }
  };

  const jumpNextEvent = () => {
      const events = getFilteredEvents();
      if (!events.length || !videoRef.current) return;
      const now = videoRef.current.currentTime;
      const next = events.find(e => e.startTime > now + 0.5);
      if (next) {
          handleManualSeek(next.startTime);
      }
  };

  const addFreezeFrame = () => {
      const current = videoRef.current?.currentTime || 0;
      const existing = freezeFrames.find(ff => Math.abs(ff.timestamp - current) < 0.5);
      if (!existing) {
          const newFFId = Date.now().toString();
          const newFF: FreezeFrame = {
              id: newFFId,
              timestamp: current,
              duration: 5
          };
          setFreezeFrames(prev => [...prev, newFF]);

          // Attach all current temporary shapes (no freezeFrameId) to this new freeze frame
          setShapes(prev => prev.map(s => {
              if (!s.freezeFrameId) {
                  return { ...s, freezeFrameId: newFFId };
              }
              return s;
          }));
      }
  };

  const deleteFreezeFrame = (id: string) => {
      setFreezeFrames(prev => prev.filter(ff => ff.id !== id));
      setShapes(prev => prev.filter(s => s.freezeFrameId !== id));
  };

  const updateFreezeFrameDuration = (id: string, duration: number) => {
      setFreezeFrames(prev => prev.map(ff => ff.id === id ? { ...ff, duration } : ff));
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      let time = videoRef.current.currentTime;
      const prevTime = lastTimeRef.current;
      
      if (time < prevTime - 0.5) {
          triggeredFreezeFrames.current.clear();
      }
      
      setCurrentTime(time);

      if (isPlaying) {
          let ff = undefined;
          if (exportSettingsRef.current.active && !exportSettingsRef.current.withFreezeFrames) {
              // skip freeze frames during an export that requested to ignore them
          } else {
              if (time > prevTime && (time - prevTime) < 1.0) {
                  const candidates = freezeFrames.filter(f => f.timestamp > prevTime && f.timestamp <= time + 0.05 && !triggeredFreezeFrames.current.has(f.id));
                  if (candidates.length > 0) {
                      candidates.sort((a, b) => a.timestamp - b.timestamp);
                      ff = candidates[0];
                  }
              } else {
                  ff = freezeFrames.find(f => Math.abs(f.timestamp - time) < 0.1 && !triggeredFreezeFrames.current.has(f.id)); 
              }
          }

          if (ff) {
              videoRef.current.pause();
              videoRef.current.currentTime = ff.timestamp;
              time = ff.timestamp;
              setCurrentTime(time);
              setIsPlaying(false);
              triggeredFreezeFrames.current.add(ff.id);
              setActiveFreezeFrameId(ff.id);
              setCountdownValue(ff.duration);
              if (countdownInterval.current) {
                  clearInterval(countdownInterval.current);
                  countdownInterval.current = null;
              }
          }
      }
      
      lastTimeRef.current = time;

      if (autoplay.active && autoplay.playlistId) {
          const playlist = playlists.find(p => p.id === autoplay.playlistId);
          if (playlist && playlist.events.length > autoplay.eventIndex) {
              const currentEvent = playlist.events[autoplay.eventIndex];
              if (time >= currentEvent.endTime) {
                  const nextIndex = autoplay.eventIndex + 1;
                  if (nextIndex < playlist.events.length) {
                      const nextEvent = playlist.events[nextIndex];
                      setAutoplay(prev => ({ ...prev, eventIndex: nextIndex }));
                      if (videoRef.current) {
                          videoRef.current.currentTime = nextEvent.startTime;
                          if (videoRef.current.paused) videoRef.current.play();
                      }
                  } else {
                      setAutoplay({ active: false, playlistId: null, eventIndex: -1 });
                      setIsPlaying(false);
                      videoRef.current.pause();

                      if (exportSettingsRef.current.active) {
                          stopRecording();
                          exportSettingsRef.current = { active: false, playlistId: null, withFreezeFrames: true };
                      }
                  }
              }
          }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.muted = isMuted;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    handleManualSeek(time);
    setMaskCache({ foreground: null, overlay: null, timestamp: -1, processedAt: 0 });
  };

  // ... (Playlist, Tagging, Marker, Drawing logic - same as before)
  const savePlaylist = () => {
      if (!playlistModal) return;
      if (playlistModal.mode === 'create') {
          const newId = Date.now().toString();
          setPlaylists(prev => [...prev, { id: newId, name: playlistModal.tempName || 'New Playlist', events: [] }]);
          setActivePlaylistId(newId);
      } else if (playlistModal.mode === 'edit' && playlistModal.playlistId) {
          setPlaylists(prev => prev.map(p => p.id === playlistModal.playlistId ? { ...p, name: playlistModal.tempName } : p));
      }
      setPlaylistModal(null);
  };

  const confirmDeletePlaylist = () => {
      if (playlistDeleteId) {
          setPlaylists(prev => prev.filter(p => p.id !== playlistDeleteId));
          if (activePlaylistId === playlistDeleteId) {
              setActivePlaylistId(playlists.find(p => p.id !== playlistDeleteId)?.id || '');
          }
          setPlaylistDeleteId(null);
      }
  };

  const removeEventFromPlaylist = (playlistId: string, eventIndex: number) => {
      setPlaylists(prev => prev.map(p => {
          if (p.id === playlistId) {
              const newEvents = [...p.events];
              newEvents.splice(eventIndex, 1);
              return { ...p, events: newEvents };
          }
          return p;
      }));
  };

  const reorderPlaylistEvents = (playlistId: string, fromIndex: number, toIndex: number) => {
      setPlaylists(prev => prev.map(p => {
          if (p.id === playlistId) {
              const newEvents = [...p.events];
              const [moved] = newEvents.splice(fromIndex, 1);
              newEvents.splice(toIndex, 0, moved);
              return { ...p, events: newEvents };
          }
          return p;
      }));
  };

  const exportPlaylistVideo = async (playlistId: string, withFreezeFrames: boolean) => {
      const playlist = playlists.find(p => p.id === playlistId);
      if (!playlist || playlist.events.length === 0) return;

      if (isScreenRecording) {
          stopRecording();
      }

      exportSettingsRef.current = { active: true, playlistId, withFreezeFrames };
      triggeredFreezeFrames.current.clear();
      
      if (videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
          videoRef.current.currentTime = playlist.events[0].startTime;
      }
      
      setAutoplay({ active: true, playlistId, eventIndex: 0 });

      setTimeout(async () => {
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
              try {
                  await toggleScreenRecording();
              } catch(e) {
                  console.error("Export recorder start error", e);
              }
          }
          if (videoRef.current) {
              videoRef.current.play();
              setIsPlaying(true);
          }
      }, 500);
  };

  const startPlaylistAutoplay = (playlistId: string) => {
      const playlist = playlists.find(p => p.id === playlistId);
      if (playlist && playlist.events.length > 0) {
          const startEvent = playlist.events[0];
          setAutoplay({ active: true, playlistId, eventIndex: 0 });
          if (videoRef.current) {
              videoRef.current.currentTime = startEvent.startTime;
              videoRef.current.play();
              setIsPlaying(true);
          }
      }
  };

  const handleTagClick = (tagId: string) => {
      const tag = tags.find(t => t.id === tagId);
      if (!tag) return;

      if (isTaggingMode) {
          // Check if Quick Code (Lead/Lag) is enabled for this tag
          if (tag.leadLagEnabled) {
              // Single click creation
              const pre = tag.preTime ?? 10;
              const post = tag.postTime ?? 10;
              const start = Math.max(0, currentTime - pre);
              const end = Math.min(duration, currentTime + post);
              
              const newEvent: TagEvent = {
                  id: Date.now().toString(),
                  tagId: tagId,
                  startTime: start,
                  endTime: end,
                  notes: '' // Initialize empty notes
              };
              setTagEvents(prev => [...prev, newEvent]);
              return;
          }

          if (activeRecording) {
              if (activeRecording.tagId === tagId) {
                  const newEvent: TagEvent = {
                      id: Date.now().toString(),
                      tagId: tagId,
                      startTime: activeRecording.startTime,
                      endTime: currentTime
                  };
                  setTagEvents(prev => [...prev, newEvent]);
                  setActiveRecording(null);
              } else {
                  const newEvent: TagEvent = {
                      id: Date.now().toString(),
                      tagId: activeRecording.tagId,
                      startTime: activeRecording.startTime,
                      endTime: currentTime
                  };
                  setTagEvents(prev => [...prev, newEvent]);
                  setActiveRecording({ tagId, startTime: currentTime });
              }
          } else {
              setActiveRecording({ tagId, startTime: currentTime });
          }
      } else {
          setFilterTagId(current => current === tagId ? null : tagId);
      }
  };

  const cancelRecording = useCallback(() => {
      if (activeRecording) {
          setActiveRecording(null);
      }
  }, [activeRecording]);

  const addSelectedToPlaylist = () => {
    if (selectedEventIds.size === 0) return;
    setPlaylists(prev => prev.map(p => {
        if (p.id === activePlaylistId) {
            const newEvents = tagEvents.filter(e => selectedEventIds.has(e.id));
            return { ...p, events: [...p.events, ...newEvents] };
        }
        return p;
    }));
    const btn = document.getElementById('save-playlist-btn');
    if (btn) {
        btn.classList.add('bg-green-500');
        setTimeout(() => btn.classList.remove('bg-green-500'), 500);
    }
  };

  const handleEventContextMenu = (e: React.MouseEvent, eventId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const menuHeight = 80;
    const windowHeight = window.innerHeight;
    let y = e.clientY;
    if (y + menuHeight > windowHeight) {
        y = windowHeight - menuHeight - 10;
    }
    setContextMenu({ x: e.clientX, y: y, eventId });
  };

  const handleEditEvent = () => {
      if (!contextMenu) return;
      const evt = tagEvents.find(e => e.id === contextMenu.eventId);
      if (evt) {
          setEditEventModal({ 
              isOpen: true, 
              eventId: evt.id, 
              startTime: evt.startTime, 
              endTime: evt.endTime,
              notes: evt.notes || '' 
          });
      }
      setContextMenu(null);
  };

  const saveEditedEvent = () => {
      if (!editEventModal) return;
      setTagEvents(prev => prev.map(e => {
          if (e.id === editEventModal.eventId) {
              return {
                  ...e,
                  startTime: editEventModal.startTime,
                  endTime: editEventModal.endTime,
                  notes: editEventModal.notes
              };
          }
          return e;
      }));
      setEditEventModal(null);
  };

  const handleDeleteEventRequest = () => {
      if (contextMenu) {
        setDeleteConfirmation(contextMenu.eventId);
        setContextMenu(null);
      } else if (editEventModal) {
        setDeleteConfirmation(editEventModal.eventId);
        setEditEventModal(null);
      }
  };

  const confirmDeleteEvent = () => {
      if (deleteConfirmation) {
          setTagEvents(prev => prev.filter(e => e.id !== deleteConfirmation));
          setPlaylists(prev => prev.map(p => ({
              ...p,
              events: p.events.filter(e => e.id !== deleteConfirmation)
          })));
          setDeleteConfirmation(null);
      }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const tag = tags.find(t => t.shortcut.toLowerCase() === e.key.toLowerCase());
      if (tag) {
          e.preventDefault();
          if (isTaggingMode) {
              handleTagClick(tag.id);
          } else {
              if (!isTaggingMode) {
                  setIsTaggingMode(true);
                  handleTagClick(tag.id);
              }
          }
          return;
      }
      if (isTaggingMode && e.key === 'Escape') {
          cancelRecording();
          setIsTaggingMode(false);
          return;
      }
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (videoRef.current) handleManualSeek(Math.max(0, videoRef.current.currentTime - 5));
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (videoRef.current) handleManualSeek(Math.min(duration, videoRef.current.currentTime + 5));
          break;
        case 'KeyZ':
          if (isCtrlOrMeta) {
              e.preventDefault();
              if (e.shiftKey) {
                  redo();
              } else {
                  undo();
              }
          }
          break;
        case 'KeyY':
            if (isCtrlOrMeta) {
                e.preventDefault();
                redo();
            }
            break;
        case 'Delete':
        case 'Backspace':
            e.preventDefault();
            if (selectedEventIds.size > 0) {
                 if (shapes.length > 0) clearAll();
            } else {
                clearAll();
            }
            break;
        case 'KeyA':
            if (isCtrlOrMeta) {
                e.preventDefault();
                setSelectedEventIds(new Set(tagEvents.map(e => e.id)));
            }
            break;
        case 'KeyS':
            if (isCtrlOrMeta) {
                e.preventDefault();
                addSelectedToPlaylist();
            }
            break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, duration, shapes, redoStack, isTaggingMode, tags, activeRecording, currentTime, tagEvents, selectedEventIds, activePlaylistId, autoplay, contextMenu, editEventModal]); 

  // --- Timeline Markers & Canvas Handlers (Same as before)
  const handleTimelineContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!timelineContainerRef.current || duration === 0) return;
    const container = timelineContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const totalClickX = scrollLeft + clickX;
    const totalWidth = container.scrollWidth;
    const percentage = Math.max(0, Math.min(1, totalClickX / totalWidth));
    const time = percentage * duration;
    setMarkerModal({ isOpen: true, x: e.clientX, y: e.clientY - 160, mode: 'create', time: time, tempLabel: '', tempColor: '#ef4444' });
  };

  const handleMarkerContextMenu = (e: React.MouseEvent, marker: TimelineMarker) => {
    e.preventDefault();
    e.stopPropagation(); 
    setMarkerModal({ isOpen: true, x: e.clientX, y: e.clientY - 160, mode: 'edit', markerId: marker.id, tempLabel: marker.label, tempColor: marker.color });
  };

  const saveMarker = () => {
    if (!markerModal) return;
    if (markerModal.mode === 'create' && markerModal.time !== undefined) {
        setMarkers(prev => [...prev, { id: Date.now().toString(), time: markerModal.time!, label: markerModal.tempLabel || 'Marker', color: markerModal.tempColor }]);
    } else if (markerModal.mode === 'edit' && markerModal.markerId) {
        setMarkers(prev => prev.map(m => m.id === markerModal.markerId ? { ...m, label: markerModal.tempLabel, color: markerModal.tempColor } : m));
    }
    setMarkerModal(null);
  };

  const deleteMarker = () => {
      if (markerModal?.markerId) {
          setMarkers(prev => prev.filter(m => m.id !== markerModal.markerId));
          setMarkerModal(null);
      }
  };

  const jumpToMarker = (time: number) => {
      handleManualSeek(time);
  };

  const handleEventClick = (e: React.MouseEvent, eventId: string, time: number) => {
    e.stopPropagation();
    handleManualSeek(time);
    if (e.ctrlKey || e.metaKey) {
        const newSet = new Set(selectedEventIds);
        if (newSet.has(eventId)) newSet.delete(eventId);
        else newSet.add(eventId);
        setSelectedEventIds(newSet);
    } else {
        if (selectedEventIds.size === 1 && selectedEventIds.has(eventId)) {
            setSelectedEventIds(new Set()); 
        } else {
            setSelectedEventIds(new Set([eventId]));
        }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
      if (tool === null && selectedEventIds.size > 0 && !isDrawing) {
          setSelectedEventIds(new Set());
      }
  };

  const handleEventUpdate = (start: number, end: number) => {
      if (selectedEventIds.size !== 1) return;
      const eventId = Array.from(selectedEventIds)[0];
      setTagEvents(prev => prev.map(e => {
          if (e.id === eventId) return { ...e, startTime: start, endTime: end };
          return e;
      }));
  };

  const handleSidebarResize = useCallback((e: MouseEvent) => {
    if (isResizingSidebar) {
        const newWidth = document.body.clientWidth - e.clientX;
        setSidebarWidth(Math.max(250, Math.min(600, newWidth)));
    }
  }, [isResizingSidebar]);

  const handleSectionResize = useCallback((e: MouseEvent) => {
      if (isResizingSection && sidebarRef.current) {
          const sidebarRect = sidebarRef.current.getBoundingClientRect();
          const relativeY = e.clientY - sidebarRect.top;
          const percentage = (relativeY / sidebarRect.height) * 100;
          setEventSectionHeight(Math.max(10, Math.min(90, percentage)));
      }
  }, [isResizingSection]);

  useEffect(() => {
    if (isResizingSidebar) {
        window.addEventListener('mousemove', handleSidebarResize);
        window.addEventListener('mouseup', () => setIsResizingSidebar(false));
    }
    if (isResizingSection) {
        window.addEventListener('mousemove', handleSectionResize);
        window.addEventListener('mouseup', () => setIsResizingSection(false));
    }
    return () => {
        window.removeEventListener('mousemove', handleSidebarResize);
        window.removeEventListener('mousemove', handleSectionResize);
    };
  }, [isResizingSidebar, isResizingSection, handleSidebarResize, handleSectionResize]);

  // ... (Masking, Capture Sprite, Drawing logic - same as before)
  const computeMaskingLayers = useCallback(async () => {
    try {
        const video = videoRef.current;
        if (!video || !maskSettings.enabled || isPlaying) return;
        if (video.seeking) return;
        setIsProcessingMask(true);
        let width = video.videoWidth;
        let height = video.videoHeight;
        if (width === 0 || height === 0) {
            setIsProcessingMask(false);
            return;
        }

        // AGGRESSIVE OPTIMIZATION: Downscale before processing to massively reduce pixel count loop
        const MAX_WIDTH = 480; 
        if (width > MAX_WIDTH) {
            height = Math.floor(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
        }

        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = new OffscreenCanvas(width, height);
        }
        const offCtx = offscreenCanvasRef.current.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
        offscreenCanvasRef.current.width = width;
        offscreenCanvasRef.current.height = height;
        offCtx.drawImage(video, 0, 0, width, height);
        
        const frameData = offCtx.getImageData(0, 0, width, height);
        const data = frameData.data;
        const foregroundImageData = offCtx.createImageData(width, height);
        const fgData = foregroundImageData.data;
        const overlayImageData = offCtx.createImageData(width, height);
        const ovData = overlayImageData.data;
        
        const targetColor = maskSettings.keyColor || '#4ade80';
        const tR = parseInt(targetColor.slice(1, 3), 16) || 0;
        const tG = parseInt(targetColor.slice(3, 5), 16) || 255;
        const tB = parseInt(targetColor.slice(5, 7), 16) || 0;
        
        // Massive optimization: simple RGB euclidean-like distance
        // The sensitivity translates to an RGB distance threshold.
        const sensitivity = maskSettings.sensitivity || 50; 
        // Range 1-100 mapped to RGB max diff 0-150.
        const threshold = sensitivity * 1.5;

        let greenCount = 0;
        const len = data.length;
        
        for (let i = 0; i < len; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          let isMasked = false;

          // Aggressively simple RGB distance check
          const dist = Math.abs(r - tR) + Math.abs(g - tG) + Math.abs(b - tB);
          
          if (dist < threshold) {
              isMasked = true;
          }

          if (isMasked) {
             greenCount++;
             fgData[i + 3] = 0; // transparent foreground
             ovData[i] = 239; 
             ovData[i + 1] = 68;
             ovData[i + 2] = 68; 
             ovData[i + 3] = 102;
          } else {
             fgData[i] = r;
             fgData[i + 1] = g;
             fgData[i + 2] = b;
             fgData[i + 3] = 255;
             ovData[i + 3] = 0;
          }
        }
        
        const isValidGreenScreen = (greenCount / (width * height)) > 0.001;
        const fgBitmap = isValidGreenScreen ? await createImageBitmap(foregroundImageData) : null;
        const ovBitmap = isValidGreenScreen ? await createImageBitmap(overlayImageData) : null;
        setMaskCache({ foreground: fgBitmap, overlay: ovBitmap, timestamp: video.currentTime, processedAt: Date.now() });
        setIsProcessingMask(false);
    } catch (error) {
        console.error('Masking error:', error);
        setIsProcessingMask(false);
    }
  }, [maskSettings, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      setMaskCache({ foreground: null, overlay: null, timestamp: -1, processedAt: 0 });
    } else if (!isPlaying && maskSettings.enabled) {
      const timeout = setTimeout(() => { computeMaskingLayers(); }, 50);
      return () => clearTimeout(timeout);
    } else if (!maskSettings.enabled && maskCache.foreground) {
      setMaskCache({ foreground: null, overlay: null, timestamp: -1, processedAt: 0 });
    }
  }, [isPlaying, maskSettings.enabled, maskSettings.sensitivity, maskSettings.keyColor, maskSettings.smoothness, maskSettings.shadowTolerance, currentTime]);

  const captureSprite = (rect: Rect): { sprite: HTMLCanvasElement, patch: HTMLCanvasElement, box: Rect } | null => {
    const video = videoRef.current;
    if (!video) return null;
    const w = Math.ceil(rect.w);
    const h = Math.ceil(rect.h);
    if (w <= 0 || h <= 0) return null;
    let bgX = rect.x + w * 1.5;
    if (bgX + w > video.videoWidth) bgX = rect.x - w * 1.5;
    if (bgX < 0) bgX = 0;
    const bgY = rect.y;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = w;
    cropCanvas.height = h;
    const ctx = cropCanvas.getContext('2d');
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = w;
    bgCanvas.height = h;
    const bgCtx = bgCanvas.getContext('2d');
    if (!ctx || !bgCtx) return null;
    if (maskSettings.enabled && maskCache.foreground) {
        ctx.drawImage(maskCache.foreground, rect.x, rect.y, w, h, 0, 0, w, h);
    } else {
        ctx.drawImage(video, rect.x, rect.y, w, h, 0, 0, w, h);
    }
    bgCtx.drawImage(video, bgX, bgY, w, h, 0, 0, w, h);
    return { sprite: cropCanvas, patch: bgCanvas, box: rect };
  };

  const getVideoSpacePoint = (e: React.MouseEvent | MouseEvent): Point => {
    if (!canvasRef.current || !videoRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dprX = canvas.width / rect.width;
    const dprY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * dprX;
    const y = (e.clientY - rect.top) * dprY;
    const layout = getVideoLayout(canvas, videoRef.current);
    return { x: (x - layout.x) / layout.scale, y: (y - layout.y) / layout.scale };
  };

  const startDrawing = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    if (isPickingColor && videoRef.current) {
        const point = getVideoSpacePoint(e);
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 1;
        offCanvas.height = 1;
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
        if (offCtx) {
           offCtx.drawImage(videoRef.current, Math.max(0, Math.floor(point.x)), Math.max(0, Math.floor(point.y)), 1, 1, 0, 0, 1, 1);
           const pixel = offCtx.getImageData(0, 0, 1, 1).data;
           const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(x => x.toString(16).padStart(2, '0')).join('');
           setMaskSettings({...maskSettings, keyColor: hex});
        }
        setIsPickingColor(false);
        return;
    }

    handleCanvasClick(e);
    if (tool === null) return;
    if (tool === 'masking') return;
    if (isPlaying) togglePlay();
    if (videoRef.current && !videoRef.current.paused) {
       videoRef.current.pause();
       setIsPlaying(false);
    }
    const startPoint = getVideoSpacePoint(e);
    const canvas = canvasRef.current;
    if (tool === 'eraser') {
        setIsDrawing(true);
        if (canvas && videoRef.current) {
            const layout = getVideoLayout(canvas, videoRef.current);
            eraseShapesNear(startPoint, layout.scale);
        }
        return;
    }
    if (tool === 'player-move') {
        if (playerMoveState === 'idle') {
            setPlayerSelectionRect({ x: startPoint.x, y: startPoint.y, w: 0, h: 0 });
            setPlayerMoveState('selecting');
        } else if (playerMoveState === 'moving') {
            finishDrawing(e);
        }
        return;
    }
    if (tool === 'spotlight' || tool === 'lens' || tool === 'name-tag') {
         setIsDrawing(true);
         return;
    }
    if (tool === 'connected-circle') {
        setIsDrawing(true);
    } else if (tool === 'circle') {
        setIsDrawing(true);
        setActivePoints([startPoint]);
        activePointsRef.current = [startPoint];
    } else if (tool === 'polygon') {
        setActivePoints(prev => { const res = [...prev, startPoint]; activePointsRef.current = res; return res; });
    } else {
        setIsDrawing(true);
        setActivePoints([startPoint]);
        activePointsRef.current = [startPoint];
    }
  };

  const drawPreview = (e: React.MouseEvent) => {
    if (tool === 'masking') return;
    const currentPoint = getVideoSpacePoint(e);
    mousePosRef.current = currentPoint; 
    if (tool === 'eraser' && isDrawing) {
        const canvas = canvasRef.current;
        if (canvas && videoRef.current) {
            const layout = getVideoLayout(canvas, videoRef.current);
            eraseShapesNear(currentPoint, layout.scale);
        }
        return;
    }
    if (tool === 'player-move') {
        if (playerMoveState === 'selecting' && playerSelectionRect) {
            const w = currentPoint.x - playerSelectionRect.x;
            const h = currentPoint.y - playerSelectionRect.y;
        }
        return;
    }
    if (!isDrawing && tool === 'connected-circle') { return; }
    if (isDrawing && (tool === 'pen' || (tool === 'arrow' && arrowSettings.isFreehand))) {
        activePointsRef.current.push(currentPoint);
        return;
    }
  };

  const finishDrawing = (e: React.MouseEvent) => {
    if (tool === null || tool === 'masking') return;
    if (tool === 'eraser') {
        setIsDrawing(false);
        return;
    }
    const currentPoint = getVideoSpacePoint(e);
    const activeFFId = freezeFrames.find(ff => Math.abs(ff.timestamp - currentTime) < 0.1)?.id;
    if (tool === 'player-move') {
        if (playerMoveState === 'selecting' && playerSelectionRect) {
            const w = currentPoint.x - playerSelectionRect.x;
            const h = currentPoint.y - playerSelectionRect.y;
            if (Math.abs(w) < 10 || Math.abs(h) < 10) {
                setPlayerMoveState('idle');
                setPlayerSelectionRect(null);
                return;
            }
            const finalRect: Rect = { x: w > 0 ? playerSelectionRect.x : currentPoint.x, y: h > 0 ? playerSelectionRect.y : currentPoint.y, w: Math.abs(w), h: Math.abs(h) };
            const result = captureSprite(finalRect);
            if (result) {
                setCapturedSprite(result);
                setPlayerMoveState('moving');
            } else {
                setPlayerMoveState('idle');
            }
            setPlayerSelectionRect(null);
        } else if (playerMoveState === 'moving' && capturedSprite) {
            const { box } = capturedSprite;
            const destCenter = currentPoint;
             const newShape: Shape = {
                id: Date.now().toString(), type: 'player-move', points: [ { x: box.x + box.w/2, y: box.y + box.h/2 }, destCenter ], box: box, color: currentColor, strokeWidth: strokeWidth, img: capturedSprite.sprite, bgImg: capturedSprite.patch, timestamp: Date.now(), freezeFrameId: activeFFId
             };
             addShape(newShape);
             setPlayerMoveState('idle');
             setCapturedSprite(null);
        }
        return;
    }
    if (tool === 'spotlight' && isDrawing) {
        setIsDrawing(false);
        const newShape: Shape = { id: Date.now().toString(), type: 'spotlight', points: [currentPoint], color: '#ffffff', strokeWidth: 1, timestamp: Date.now(), freezeFrameId: activeFFId, spotlightConfig: { size: spotlightSettings.size, intensity: spotlightSettings.intensity, rotation: spotlightSettings.rotation, particles: createParticles(30) } };
        addShape(newShape);
        return;
    }
    if (tool === 'lens' && isDrawing) {
        setIsDrawing(false);
        const newShape: Shape = { id: Date.now().toString(), type: 'lens', points: [currentPoint], color: '#ffffff', strokeWidth: 1, timestamp: Date.now(), freezeFrameId: activeFFId, lensConfig: { radius: lensSettings.size, zoom: lensSettings.zoom } };
        addShape(newShape);
        return;
    }
    if (tool === 'name-tag' && isDrawing) {
        setIsDrawing(false);
        const activeNameText = nameTagSettings.names.find(n => n.id === nameTagSettings.activeId)?.text || '';
        const newShape: Shape = { id: Date.now().toString(), type: 'name-tag', points: [currentPoint], color: currentColor, strokeWidth: nameTagSettings.size, timestamp: Date.now(), freezeFrameId: activeFFId, text: activeNameText };
        addShape(newShape);
        return;
    }
    if (tool === 'connected-circle') {
        if (isDrawing) {
            if (activePoints.length >= 2) {
                const distToStart = getDistance(currentPoint, activePoints[0]);
                if (distToStart < ringSettings.size) { 
                     const newShape: Shape = { id: Date.now().toString(), type: 'connected-circle', points: [...activePoints], color: currentColor, strokeWidth: strokeWidth, timestamp: Date.now(), ringConfig: { tilt: ringSettings.tilt }, isClosed: true, isFilled: ringSettings.isFilled, freezeFrameId: activeFFId };
                    addShape(newShape);
                    setActivePoints([]);
                    setIsDrawing(false);
                    return;
                }
            }
            setActivePoints(prev => [...prev, { x: currentPoint.x, y: currentPoint.y, r: ringSettings.size, timestamp: Date.now() }]);
            setIsDrawing(false);
        }
        return;
    }
    if (tool === 'circle' && isDrawing) {
        setIsDrawing(false);
        const newShape: Shape = { id: Date.now().toString(), type: 'circle', points: [currentPoint, { x: currentPoint.x + ringSettings.size, y: currentPoint.y }], color: currentColor, strokeWidth: strokeWidth, timestamp: Date.now(), ringConfig: { tilt: ringSettings.tilt }, freezeFrameId: activeFFId };
        addShape(newShape);
        setActivePoints([]);
        return;
    }
    if (tool === 'polygon') return; 
    if (isDrawing) {
      setIsDrawing(false);
      let pointsToSave = [activePointsRef.current[0], currentPoint];
      if (tool === 'pen' || (tool === 'arrow' && arrowSettings.isFreehand)) pointsToSave = [...activePointsRef.current];
      const newShape: Shape = { id: Date.now().toString(), type: tool, points: pointsToSave, color: currentColor, strokeWidth: strokeWidth, isDashed: arrowSettings.isDashed, isFreehand: arrowSettings.isFreehand, timestamp: Date.now(), freezeFrameId: activeFFId };
      addShape(newShape);
      setActivePoints([]);
      activePointsRef.current = [];
      setCurrentDragStart(null);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const activeFFId = freezeFrames.find(ff => Math.abs(ff.timestamp - currentTime) < 0.1)?.id;
    if (tool === 'polygon' && activePoints.length > 2) {
        const newShape: Shape = { id: Date.now().toString(), type: tool, points: [...activePoints], color: currentColor, strokeWidth: strokeWidth, isClosed: true, timestamp: Date.now(), freezeFrameId: activeFFId };
        addShape(newShape);
        setActivePoints([]);
    }
    if (tool === 'connected-circle') {
        if (activePoints.length > 0) {
            const newShape: Shape = { id: Date.now().toString(), type: 'connected-circle', points: [...activePoints], color: currentColor, strokeWidth: strokeWidth, timestamp: 0, ringConfig: { tilt: ringSettings.tilt }, isClosed: false, freezeFrameId: activeFFId };
            addShape(newShape);
        }
        setActivePoints([]);
        setIsDrawing(false);
        setCurrentDragStart(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      if (activePoints.length > 0 || isDrawing || playerMoveState !== 'idle') {
          setActivePoints([]);
          setIsDrawing(false);
          setPlayerMoveState('idle');
          setPlayerSelectionRect(null);
          setCapturedSprite(null);
          setCurrentDragStart(null);
          renderCanvas(); 
      }
  };

  const addShape = (shape: Shape) => {
    const newShapes = [...shapes, shape];
    setShapes(newShapes);
    setRedoStack([]); 
  };

  const eraseShapesNear = (pt: Point, scale: number) => {
      const threshold = 20 / scale; // Screen radius of 20px
      const activeFF = freezeFrames.find(ff => Math.abs(ff.timestamp - currentTime) < 0.1);
      
      setShapes(prev => {
          const remaining = prev.filter(shape => {
              // Only consider shapes that are currently visible
              let isVisible = false;
              if (!shape.freezeFrameId) {
                  isVisible = true; // Temporary shapes
              } else if (activeFF && activeFF.id === shape.freezeFrameId && !isPlaying) {
                  isVisible = true; // Attached to current active freeze frame
              } else if (activeFreezeFrameId === shape.freezeFrameId) {
                  isVisible = true;
              }

              if (!isVisible) return true; // Keep shapes that are not currently visible

              if (shape.points.length === 0) return false;
              if (shape.points.length === 1) {
                  return Math.sqrt(Math.pow(pt.x - shape.points[0].x, 2) + Math.pow(pt.y - shape.points[0].y, 2)) > threshold;
              }
              // Check segments
              for (let i = 0; i < shape.points.length - 1; i++) {
                  const v = shape.points[i];
                  const w = shape.points[i+1];
                  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
                  let t = 0;
                  if (l2 !== 0) {
                      t = ((pt.x - v.x) * (w.x - v.x) + (pt.y - v.y) * (w.y - v.y)) / l2;
                      t = Math.max(0, Math.min(1, t));
                  }
                  const dist = Math.sqrt((pt.x - (v.x + t * (w.x - v.x))) ** 2 + (pt.y - (v.y + t * (w.y - v.y))) ** 2);
                  if (dist <= threshold) return false; // erase
              }
              return true;
          });
          if (remaining.length === prev.length) return prev;
          return remaining;
      });
  };

  const undo = () => {
      const activeFF = freezeFrames.find(ff => Math.abs(ff.timestamp - currentTime) < 0.1);
      
      setShapes(prev => {
          // Find the last shape that is currently visible
          let targetIdx = -1;
          for (let i = prev.length - 1; i >= 0; i--) {
              const shape = prev[i];
              let isVisible = false;
              if (!shape.freezeFrameId) isVisible = true;
              else if (activeFF && activeFF.id === shape.freezeFrameId && !isPlaying) isVisible = true;
              else if (activeFreezeFrameId === shape.freezeFrameId) isVisible = true;
              
              if (isVisible) {
                  targetIdx = i;
                  break;
              }
          }
          if (targetIdx === -1) return prev;
          
          const removedShape = prev[targetIdx];
          setRedoStack(r => [...r, [removedShape]]);
          return [...prev.slice(0, targetIdx), ...prev.slice(targetIdx + 1)];
      });
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const nextGroup = redoStack[redoStack.length - 1];
    const next = nextGroup[0]; 
    setShapes([...shapes, next]);
    setRedoStack(redoStack.slice(0, -1));
  };

  const clearAll = () => {
    setShapes([]);
    setRedoStack([]);
    setActivePoints([]);
    setIsDrawing(false);
    setCurrentDragStart(null);
    setPlayerMoveState('idle');
    setPlayerSelectionRect(null);
    setCapturedSprite(null);
  };

  const confirmClose = () => {
      onClose();
  };

  const drawActiveChain = (ctx: CanvasRenderingContext2D, scale: number) => {
    const activePts = activePointsRef.current;
    if (tool !== 'connected-circle' || activePts.length === 0) return;
    const now = Date.now();
    if (activePts.length > 1) {
      for (let i = 0; i < activePts.length - 1; i++) {
        const c1 = activePts[i];
        const c2 = activePts[i + 1];
        const startTime = c2.timestamp || 0;
        const pulseAge = Math.max(0, now - startTime);
        drawTangentLine(ctx, c1, c2, c1.r || ringSettings.size, c2.r || ringSettings.size, currentColor, 2 / scale, 1, pulseAge);
      }
    }
    activePts.forEach(p => {
      draw3DRing(ctx, p.x, p.y, p.r || ringSettings.size, currentColor, ringSettings.tilt, 2 / scale, p.timestamp || now);
    });
  };

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const activePts = activePointsRef.current;
    const video = videoRef.current;
    const layout = getVideoLayout(canvas, video);
    const { x, y, w, h, scale } = layout;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const currentVideoTime = video ? video.currentTime : 0;
    const isMaskSynced = maskCache.timestamp !== -1 && Math.abs(maskCache.timestamp - currentVideoTime) < 0.15;
    
    let ffAlpha = 1;
    let shouldRenderDrawings = true;
    if (!isPlaying && maskSettings.enabled && maskCache.processedAt > 0 && isMaskSynced) {
        const age = Date.now() - maskCache.processedAt;
        const fadeDuration = 800; // 800ms fade in for telestrations
        if (age < fadeDuration) ffAlpha = Math.min(1, age / fadeDuration);
        else ffAlpha = 1;
    } else if (!isPlaying && maskSettings.enabled && (!isMaskSynced || maskCache.processedAt === 0)) {
        ffAlpha = 0; // Don't show shapes until mask is ready
        shouldRenderDrawings = false; 
    }

    if (maskSettings.enabled && !isPlaying && maskSettings.showOverlay && maskCache.overlay && isMaskSynced) {
        ctx.drawImage(maskCache.overlay, x, y, w, h);
    }
    
    if (shouldRenderDrawings) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        const activeFF = freezeFrames.find(ff => Math.abs(ff.timestamp - currentTime) < 0.1);
        shapes.forEach(shape => {
            let shouldRender = false;
            if (!shape.freezeFrameId) shouldRender = true; 
            else if (activeFF && activeFF.id === shape.freezeFrameId && !isPlaying) { shouldRender = true; }
            else if (activeFreezeFrameId === shape.freezeFrameId) { shouldRender = true; }
            if (shouldRender) {
                if (shape.type === 'player-move' || shape.type === 'lens') return; 
                const alphaToUse = ffAlpha;
                if (shape.type === 'curved-arrow') drawShapeOnCanvas(shape, scale, 'shadow', alphaToUse);
                else drawShapeOnCanvas(shape, scale, 'full', alphaToUse);
            }
        });
        
        ctx.save();
        ctx.globalAlpha = ffAlpha;
        if (isDrawing && (tool === 'pen' || (tool === 'arrow' && arrowSettings.isFreehand)) && activePts.length > 0) {
            if (tool === 'arrow') {
                drawFreehandArrow(ctx, activePts, currentColor, strokeWidth / scale, arrowSettings.isDashed, Date.now(), false);
            } else {
                drawShapeOnCanvas({ id: 'active_pen', type: 'pen', points: activePts, color: currentColor, strokeWidth: strokeWidth, timestamp: 0 }, scale, 'full', ffAlpha);
            }
        }
        if (tool === 'connected-circle' && activePts.length > 0) {
            drawActiveChain(ctx, scale);
        }
        ctx.restore();
        
        ctx.restore();
    }
    if (maskSettings.enabled && !isPlaying && maskCache.foreground && isMaskSynced) {
        ctx.drawImage(maskCache.foreground, x, y, w, h);
    }
    if (shouldRenderDrawings) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        const activeFF = freezeFrames.find(ff => Math.abs(ff.timestamp - currentTime) < 0.1);
        shapes.forEach(shape => {
            let shouldRender = false;
            if (!shape.freezeFrameId) shouldRender = true; 
            else if (activeFF && activeFF.id === shape.freezeFrameId && !isPlaying) { shouldRender = true; }
            else if (activeFreezeFrameId === shape.freezeFrameId) { shouldRender = true; }
            if (shouldRender) {
                const alphaToUse = ffAlpha;
                if (shape.type === 'curved-arrow') drawShapeOnCanvas(shape, scale, 'body', alphaToUse);
                if (shape.type === 'player-move') drawShapeOnCanvas(shape, scale, 'full', alphaToUse);
                if (shape.type === 'lens' && video) {
                    if (shape.lensConfig && shape.points[0]) {
                        ctx.save();
                        ctx.globalAlpha = ffAlpha;
                        drawLens(ctx, shape.points[0], shape.lensConfig.radius, shape.lensConfig.zoom, video, scale, shape.timestamp);
                        ctx.restore();
                    }
                }
            }
        });
        
        if (tool === 'name-tag' && mousePosRef.current && !isPlaying && !isDrawing && !isScreenRecording) {
            const activeNameText = nameTagSettings.names.find(n => n.id === nameTagSettings.activeId)?.text || '';
            drawNameTag(ctx, mousePosRef.current, activeNameText, currentColor, scale, Date.now(), nameTagSettings.size, true);
        }
        
        // Ghost Preview has been moved to ghostCanvasRef
        ctx.restore();
    }

    const ghostCanvas = ghostCanvasRef.current;
    const ghostCtx = ghostCanvas ? ghostCanvas.getContext('2d') : null;
    if (ghostCtx && ghostCanvas) {
        ghostCtx.clearRect(0, 0, ghostCanvas.width, ghostCanvas.height);
        
        if (!isPlaying && mousePosRef.current && tool && tool !== 'masking' && tool !== 'player-move' && tool !== 'name-tag') {
            const m = mousePosRef.current;
            ghostCtx.save();
            ghostCtx.translate(x, y);
            ghostCtx.scale(scale, scale);
            ghostCtx.globalAlpha = 0.5 * ffAlpha;
            
            if (tool === 'circle' && !isDrawing) {
                draw3DRing(ghostCtx, m.x, m.y, ringSettings.size, currentColor, ringSettings.tilt, 2 / scale, Date.now(), true);
            } else if (tool === 'connected-circle' && !isDrawing) {
                if (activePts.length > 0) {
                    const lastPt = activePts[activePts.length - 1];
                    drawTangentLine(ghostCtx, lastPt, m, lastPt.r || ringSettings.size, ringSettings.size, currentColor, 2 / scale, 1, 0, true);
                }
                draw3DRing(ghostCtx, m.x, m.y, ringSettings.size, currentColor, ringSettings.tilt, 2 / scale, Date.now(), true);
            } else if (tool === 'spotlight' && !isDrawing) {
                drawSpotlight(ghostCtx, m.x, m.y, spotlightSettings.size, spotlightSettings.intensity, spotlightSettings.rotation, [], Date.now(), true);
            } else if (tool === 'lens' && !isDrawing && video) {
                drawLens(ghostCtx, m, lensSettings.size, lensSettings.zoom, video, scale, Date.now(), true);
            } else if (tool === 'pen' && !isDrawing) {
                ghostCtx.beginPath();
                ghostCtx.arc(m.x, m.y, (strokeWidth / scale) / 2, 0, Math.PI * 2);
                ghostCtx.fillStyle = currentColor;
                ghostCtx.fill();
            } else if ((tool === 'arrow' || tool === 'curved-arrow' || tool === 'line') && !isDrawing) {
                ghostCtx.beginPath();
                ghostCtx.arc(m.x, m.y, (strokeWidth / scale) / 2, 0, Math.PI * 2);
                ghostCtx.fillStyle = currentColor;
                ghostCtx.fill();
            } else if (tool === 'polygon' && activePts.length === 0) {
                ghostCtx.beginPath();
                ghostCtx.arc(m.x, m.y, (strokeWidth / scale) / 2, 0, Math.PI * 2);
                ghostCtx.fillStyle = currentColor;
                ghostCtx.fill();
            } else if ((tool === 'arrow' || tool === 'curved-arrow' || tool === 'line') && isDrawing && activePts.length > 0) {
                const pts = [activePts[0], m];
                drawShapeOnCanvas({ id: 'ghost', type: tool, points: pts, color: currentColor, strokeWidth: strokeWidth, timestamp: 0, isDashed: arrowSettings.isDashed, isFreehand: arrowSettings.isFreehand }, scale, 'full', 0.5 * ffAlpha, ghostCtx);
            } else if (tool === 'polygon' && activePts.length > 0) {
                const pts = [...activePts, m];
                drawShapeOnCanvas({ id: 'ghost', type: tool, points: pts, color: currentColor, strokeWidth: strokeWidth, timestamp: 0 }, scale, 'full', 0.5 * ffAlpha, ghostCtx);
            }
            ghostCtx.restore();
        }
    }

  }, [shapes, isDrawing, activePoints, tool, currentColor, strokeWidth, maskSettings, maskCache, isPlaying, playerMoveState, ringSettings, arrowSettings, spotlightSettings, lensSettings, freezeFrames, activeFreezeFrameId]);

  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
        renderCanvas();
        animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [renderCanvas]);

  const drawShapeOnCanvas = (shape: Shape, scale: number, renderMode: 'full' | 'shadow' | 'body' = 'full', ffAlpha: number = 1, targetCtx?: CanvasRenderingContext2D) => {
    const ctx = targetCtx || canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.save(); 
    if (shape.timestamp > 0 && !shape.freezeFrameId && shape.type !== 'curved-arrow' && shape.type !== 'player-move' && shape.type !== 'spotlight' && shape.type !== 'lens' && shape.type !== 'arrow') {
        const age = Date.now() - shape.timestamp;
        const fadeDuration = 300; 
        if (age < fadeDuration) ctx.globalAlpha = Math.min(1, age / fadeDuration) * ffAlpha;
        else ctx.globalAlpha = ffAlpha;
    } else {
        ctx.globalAlpha = ffAlpha;
    }
    ctx.strokeStyle = shape.color; ctx.lineWidth = shape.strokeWidth / scale; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.fillStyle = shape.color;
    const { points, type } = shape;
    if (points.length < 1) { ctx.restore(); return; }
    const p1 = points[0];
    const p2 = points[points.length - 1];
    ctx.beginPath();
    switch (type) {
        case 'pen': 
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetY = 2;
            if (points.length < 2) { 
                ctx.beginPath(); 
                ctx.arc(points[0].x, points[0].y, (shape.strokeWidth / scale) / 2, 0, Math.PI * 2); 
                ctx.fill(); 
            } else { 
                ctx.beginPath(); 
                ctx.moveTo(points[0].x, points[0].y); 
                for (let i = 1; i < points.length - 2; i++) { 
                    const xc = (points[i].x + points[i + 1].x) / 2; 
                    const yc = (points[i].y + points[i + 1].y) / 2; 
                    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc); 
                } 
                if (points.length > 2) ctx.quadraticCurveTo(points[points.length - 2].x, points[points.length - 2].y, points[points.length - 1].x, points[points.length - 1].y); 
                else ctx.lineTo(points[1].x, points[1].y); 
                ctx.stroke(); 
                
                // Add inner bright stroke
                if (shape.strokeWidth > 3) {
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                    ctx.lineWidth = (shape.strokeWidth / scale) * 0.3;
                    ctx.stroke();
                }
            } 
            ctx.restore();
            break;
        case 'line': 
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetY = 2;
            ctx.moveTo(p1.x, p1.y); 
            ctx.lineTo(p2.x, p2.y); 
            ctx.stroke(); 
            
            if (shape.strokeWidth > 3) {
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.lineWidth = (shape.strokeWidth / scale) * 0.3;
                ctx.stroke();
            }
            ctx.restore();
            break;
        case 'arrow': if (shape.isFreehand) drawFreehandArrow(ctx, points, shape.color, shape.strokeWidth / scale, shape.isDashed || false, shape.timestamp, false); else drawProArrow(ctx, p1, p2, shape.color, shape.strokeWidth / scale, shape.isDashed || false, shape.timestamp); break;
        case 'curved-arrow': drawCurvedArrow(ctx, p1, p2, shape.color, shape.strokeWidth / scale, shape.isDashed || false, shape.timestamp, renderMode); break;
        case 'circle': const radius = getDistance(p1, p2); draw3DRing(ctx, p1.x, p1.y, radius, shape.color, shape.ringConfig?.tilt ?? 65, 2 / scale, shape.timestamp); break;
        case 'polygon': 
            if (points.length < 1) break; 
            const polyNow = Date.now();
            const polyDuration = 600;
            const polyProgress = shape.timestamp ? Math.min(1, (polyNow - shape.timestamp) / polyDuration) : 1;
            ctx.save();
            if (polyProgress < 1) {
                // Approximate bounding center and radius for clip
                let minX = points[0].x, maxX = points[0].x, minY = points[0].y, maxY = points[0].y;
                points.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
                const cx = (minX + maxX) / 2; const cy = (minY + maxY) / 2;
                const r = Math.sqrt(Math.pow(maxX - minX, 2) + Math.pow(maxY - minY, 2));
                ctx.beginPath();
                ctx.arc(cx, cy, r * polyProgress, 0, Math.PI * 2);
                ctx.clip();
            }
            if (shape.isDashed) {
                ctx.setLineDash([10, 10]);
                ctx.lineDashOffset = -((polyNow / 1000) * 40);
            }
            ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); points.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); 
            if (shape.isClosed) { 
                ctx.closePath(); ctx.save(); 
                const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[1]?.x || points[0].x, points[1]?.y || points[0].y); 
                const areaPulse = 0.5 + 0.5 * Math.sin(polyNow / 400);
                gradient.addColorStop(0, fadeColor(shape.color, 0.2 + 0.3 * areaPulse)); gradient.addColorStop(1, fadeColor(shape.color, 0.1)); 
                ctx.fillStyle = gradient; ctx.shadowColor = shape.color; ctx.shadowBlur = 10; ctx.fill(); ctx.restore(); 
            } 
            ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3; ctx.stroke(); ctx.restore(); 
            
            // Light passing in edges
            if (shape.isClosed) {
                ctx.save();
                ctx.lineCap = 'round';
                ctx.lineWidth = (shape.strokeWidth / scale) * 1.5;
                ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 10;
                let perimeter = 0;
                for (let i = 0; i < points.length; i++) {
                    const p1 = points[i];
                    const p2 = points[(i + 1) % points.length];
                    perimeter += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                }
                ctx.setLineDash([30 / scale, Math.max(100, perimeter)]);
                ctx.lineDashOffset = -((polyNow * 0.15) % Math.max(100, perimeter));
                ctx.stroke();
                ctx.restore();
            }
            
            ctx.save(); 
            if (shape.isClosed) { 
                points.forEach(p => { ctx.beginPath(); ctx.fillStyle = shape.color; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2; ctx.arc(p.x, p.y, Math.max(3, 4 / scale), 0, Math.PI * 2); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.lineWidth = 2 / scale; ctx.strokeStyle = '#ffffff'; ctx.stroke(); }); 
            } 
            ctx.restore(); 
            ctx.restore();
            break;
        case 'connected-circle': const now = Date.now(); if (shape.isClosed && shape.isFilled && points.length > 2) { ctx.save(); ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); points.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath(); const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2]?.x || points[0].x, points[2]?.y || points[0].y); gradient.addColorStop(0, fadeColor(shape.color, 0.4)); gradient.addColorStop(1, fadeColor(shape.color, 0.1)); ctx.fillStyle = gradient; ctx.fill(); ctx.restore(); } if (points.length > 1) { for (let i = 0; i < points.length - 1; i++) { const c1 = points[i]; const c2 = points[i + 1]; const startTime = c2.timestamp || shape.timestamp || 0; const pulseAge = Math.max(0, now - startTime); drawTangentLine(ctx, c1, c2, c1.r || ringSettings.size, c2.r || ringSettings.size, shape.color, 2 / scale, 1, pulseAge); } if (shape.isClosed) { const last = points[points.length - 1]; const first = points[0]; const startTime = shape.timestamp || 0; const pulseAge = Math.max(0, now - startTime); drawTangentLine(ctx, last, first, last.r || ringSettings.size, first.r || ringSettings.size, shape.color, 2 / scale, 1, pulseAge); } } points.forEach(p => { draw3DRing(ctx, p.x, p.y, p.r || ringSettings.size, shape.color, shape.ringConfig?.tilt ?? 65, 2 / scale, p.timestamp || shape.timestamp); }); break;
        case 'player-move': 
          if (shape.box && points.length >= 2) { 
            const originCenter = points[0]; 
            const destCenter = points[1]; 
            const { w, h } = shape.box; 
            const isValidImage = (src: any) => src && (src instanceof HTMLImageElement || src instanceof HTMLCanvasElement || src instanceof ImageBitmap || src instanceof HTMLVideoElement || src instanceof OffscreenCanvas);
            if (isValidImage(shape.bgImg)) ctx.drawImage(shape.bgImg as any, shape.box.x, shape.box.y, w, h); 
            const pmDuration = 800;
            const pmProgress = shape.timestamp ? Math.min(1, (Date.now() - shape.timestamp) / pmDuration) : 1;
            const currentX = originCenter.x + (destCenter.x - originCenter.x) * pmProgress;
            const currentY = originCenter.y + (destCenter.y - originCenter.y) * pmProgress;
            const currentEnd = { x: currentX, y: currentY };
            ctx.beginPath(); 
            ctx.strokeStyle = shape.color; 
            ctx.lineWidth = shape.strokeWidth / scale; 
            ctx.shadowColor = 'rgba(0,0,0,0.5)'; 
            ctx.shadowBlur = 6; 
            ctx.shadowOffsetY = 4;
            ctx.setLineDash([10, 10]);
            ctx.lineDashOffset = -((Date.now() / 1000) * 40);
            ctx.moveTo(originCenter.x, originCenter.y); 
            ctx.lineTo(currentEnd.x, currentEnd.y); 
            ctx.stroke(); 
            ctx.shadowBlur = 0; 
            ctx.shadowOffsetY = 0; 
            ctx.setLineDash([]);
            if (pmProgress > 0.1) {
              drawArrowHead(ctx, originCenter, currentEnd, (shape.strokeWidth * 4) / scale); 
            }
            if (isValidImage(shape.img)) {
                ctx.save(); 
                ctx.shadowColor = 'rgba(0,0,0,0.8)'; 
                ctx.shadowBlur = 15; 
                ctx.shadowOffsetY = 10; 
                ctx.beginPath(); 
                ctx.ellipse(currentEnd.x, currentEnd.y + h/2.5, w/3, w/8, 0, 0, Math.PI * 2); 
                ctx.fillStyle = 'rgba(0,0,0,0.6)'; 
                ctx.fill(); 
                const bobbing = Math.sin(Date.now() / 200) * 5;
                ctx.drawImage(shape.img as any, currentEnd.x - w/2, currentEnd.y - h/2 + bobbing, w, h); 
                ctx.restore(); 
            }
          } 
          break;
        case 'spotlight': if (shape.spotlightConfig) drawSpotlight(ctx, points[0].x, points[0].y, shape.spotlightConfig.size, shape.spotlightConfig.intensity, shape.spotlightConfig.rotation, shape.spotlightConfig.particles, shape.timestamp); break;
        case 'name-tag': if (shape.text) drawNameTag(ctx, points[0], shape.text, shape.color, scale, shape.timestamp, shape.strokeWidth); break;
    }
    ctx.restore();
  };

  useEffect(() => {
    const syncSize = () => {
      const dpr = window.devicePixelRatio || 1;
      if (containerRef.current && canvasRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        canvasRef.current.width = clientWidth * dpr;
        canvasRef.current.height = clientHeight * dpr;
      }
      if (containerRef.current && ghostCanvasRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        ghostCanvasRef.current.width = clientWidth * dpr;
        ghostCanvasRef.current.height = clientHeight * dpr;
      }
    };
    const resizeObserver = new ResizeObserver(syncSize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', syncSize);
    syncSize();
    return () => {
        window.removeEventListener('resize', syncSize);
        resizeObserver.disconnect();
    };
  }, [videoUrl, isTimelineExpanded]);

  const handleColorRightClick = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    const input = document.createElement('input');
    input.type = 'color';
    input.value = colors.find(c => c.id === id)?.value || '#ffffff';
    input.onchange = (ev) => {
      const val = (ev.target as HTMLInputElement).value;
      setColors(prev => prev.map(c => c.id === id ? { ...c, value: val } : c));
    };
    input.click();
  };

  const renderPropertiesPanel = () => {
      if (tool === null) {
          return (
              <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-blue-500/20 rounded-lg"><Snowflake className="w-5 h-5 text-blue-500" /></div>
                      <div><h3 className="font-semibold text-white">Freeze Frames</h3><p className="text-xs text-gray-400">Persistent Telestrations</p></div>
                  </div>
                  {activeFreezeFrameId ? (
                      <div className="bg-blue-900/30 border border-blue-500/50 rounded-xl p-4 flex flex-col items-center justify-center space-y-2 animate-pulse">
                          <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">Active Freeze</span>
                          <div className="text-4xl font-black text-white font-mono">{countdownValue.toFixed(1)}s</div>
                          <div className="h-1 w-full bg-blue-900/50 rounded-full overflow-hidden mt-2">
                              <motion.div className="h-full bg-blue-400" initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: countdownValue, ease: "linear" }} />
                          </div>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <button onClick={addFreezeFrame} disabled={isPlaying} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                              <PlusCircle className="w-4 h-4" /> Add Freeze Frame
                          </button>
                          <div className="space-y-2">
                              {freezeFrames.length === 0 && <div className="text-center py-8 text-gray-500 text-sm italic">Pause video to add frames</div>}
                              {freezeFrames.sort((a,b) => a.timestamp - b.timestamp).map(ff => (
                                  <div key={ff.id} className="bg-[#111] border border-[#333] rounded-lg p-2 group">
                                      <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2 text-blue-400 font-mono text-xs cursor-pointer hover:underline" onClick={() => { handleManualSeek(ff.timestamp); if(videoRef.current) { videoRef.current.pause(); setIsPlaying(false); } }}>
                                              <Clock className="w-3 h-3" /> {formatTime(ff.timestamp)}
                                          </div>
                                          <button onClick={() => deleteFreezeFrame(ff.id)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                      <div className="flex items-center gap-2 bg-[#222] rounded px-2 py-1">
                                          <Timer className="w-3 h-3 text-gray-400" />
                                          <span className="text-[10px] text-gray-400 uppercase">Duration</span>
                                          <input type="number" min="1" max="60" value={ff.duration} onChange={(e) => updateFreezeFrameDuration(ff.id, parseFloat(e.target.value))} className="flex-1 bg-transparent text-right text-xs text-white focus:outline-none w-10 font-mono" />
                                          <span className="text-xs text-gray-500">s</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          );
      }

      if (tool === 'masking') {
          return (
              <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-green-500/20 rounded-lg"><Layers className="w-5 h-5 text-green-500" /></div>
                      <div><h3 className="font-semibold text-white">Chroma Key</h3><p className="text-xs text-gray-400">Green Screen Masking</p></div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#111] border border-[#333] rounded-lg">
                      <span className="text-xs font-medium text-gray-300">Enable Effect</span>
                      <button onClick={() => setMaskSettings({...maskSettings, enabled: !maskSettings.enabled})} className={`w-10 h-5 rounded-full relative transition-colors ${maskSettings.enabled ? 'bg-green-500' : 'bg-gray-700'}`}>
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${maskSettings.enabled ? 'left-6' : 'left-1'}`} />
                      </button>
                  </div>
                  {maskSettings.enabled && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                          <div className="space-y-2">
                              <div className="flex justify-between"><label className="text-xs font-bold text-gray-400 uppercase">Hue Sensitivity</label><span className="text-xs font-mono text-gray-500">{maskSettings.sensitivity}</span></div>
                              <input type="range" min="1" max="100" value={maskSettings.sensitivity} onChange={(e) => setMaskSettings({...maskSettings, sensitivity: parseInt(e.target.value)})} className="w-full h-1 bg-[#333] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500" />
                          </div>
                          <div className="space-y-2">
                              <div className="flex justify-between"><label className="text-xs font-bold text-gray-400 uppercase">Shadow Tolerance</label><span className="text-xs font-mono text-gray-500">{maskSettings.shadowTolerance}</span></div>
                              <input type="range" min="0" max="100" value={maskSettings.shadowTolerance} onChange={(e) => setMaskSettings({...maskSettings, shadowTolerance: parseInt(e.target.value)})} className="w-full h-1 bg-[#333] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500" />
                          </div>
                          <div className="space-y-2">
                              <div className="flex justify-between"><label className="text-xs font-bold text-gray-400 uppercase">Pitch Color</label></div>
                              <div className="flex items-center gap-2">
                                <input type="color" value={maskSettings.keyColor} onChange={(e) => setMaskSettings({...maskSettings, keyColor: e.target.value})} className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0" />
                                <button 
                                  onClick={() => setIsPickingColor(!isPickingColor)}
                                  className={`p-1.5 rounded transition-colors ${isPickingColor ? 'bg-blue-500/20 text-blue-400' : 'bg-[#222] text-gray-400 hover:text-white'}`}
                                  title="Pick color from video"
                                >
                                  <Pipette className="w-4 h-4" />
                                </button>
                                <span className="text-xs text-gray-400 line-clamp-1">{isPickingColor ? 'Click on video to pick' : 'Select pitch color'}</span>
                              </div>
                          </div>
                          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMaskSettings({...maskSettings, showOverlay: !maskSettings.showOverlay})}>
                              {maskSettings.showOverlay ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
                              <span className="text-xs text-gray-300">Show Debug Overlay</span>
                          </div>
                          {isProcessingMask && <div className="text-[10px] text-yellow-500 animate-pulse flex items-center gap-1"><Activity className="w-3 h-3" /> Processing frames...</div>}
                      </div>
                  )}
              </div>
          );
      }

      if (tool === 'spotlight') {
          return (
              <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-yellow-500/20 rounded-lg"><Flashlight className="w-5 h-5 text-yellow-500" /></div><div><h3 className="font-semibold text-white">Spotlight</h3><p className="text-xs text-gray-400">Focus Attention</p></div></div>
                  <div className="space-y-4">
                      <div className="space-y-2"><div className="flex justify-between"><label className="text-xs font-bold text-gray-400 uppercase">Size</label><span className="text-xs font-mono text-gray-500">{spotlightSettings.size}px</span></div><input type="range" min="20" max="150" value={spotlightSettings.size} onChange={(e) => setSpotlightSettings({...spotlightSettings, size: parseInt(e.target.value)})} className="w-full h-1 bg-[#333] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-500" /></div>
                      <div className="space-y-2"><div className="flex justify-between"><label className="text-xs font-bold text-gray-400 uppercase">Intensity</label><span className="text-xs font-mono text-gray-500">{Math.round(spotlightSettings.intensity * 100)}%</span></div><input type="range" min="0.1" max="1" step="0.05" value={spotlightSettings.intensity} onChange={(e) => setSpotlightSettings({...spotlightSettings, intensity: parseFloat(e.target.value)})} className="w-full h-1 bg-[#333] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-500" /></div>
                      <div className="space-y-2"><div className="flex justify-between"><label className="text-xs font-bold text-gray-400 uppercase">Rotation</label><span className="text-xs font-mono text-gray-500">{(spotlightSettings.rotation * 90).toFixed(0)}°</span></div><input type="range" min="0.1" max="1" step="0.05" value={spotlightSettings.rotation} onChange={(e) => setSpotlightSettings({...spotlightSettings, rotation: parseFloat(e.target.value)})} className="w-full h-1 bg-[#333] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-500" /></div>
                  </div>
              </div>
          )
      }

      if (tool === 'lens') {
          return (
              <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-cyan-500/20 rounded-lg"><ZoomIn className="w-5 h-5 text-cyan-500" /></div><div><h3 className="font-semibold text-white">Zoom Lens</h3><p className="text-xs text-gray-400">Magnify Details</p></div></div>
                  <div className="space-y-4">
                      <div className="space-y-2"><div className="flex justify-between"><label className="text-xs font-bold text-gray-400 uppercase">Size</label><span className="text-xs font-mono text-gray-500">{lensSettings.size}px</span></div><input type="range" min="40" max="150" value={lensSettings.size} onChange={(e) => setLensSettings({...lensSettings, size: parseInt(e.target.value)})} className="w-full h-1 bg-[#333] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500" /></div>
                      <div className="space-y-2"><div className="flex justify-between"><label className="text-xs font-bold text-gray-400 uppercase">Zoom</label><span className="text-xs font-mono text-gray-500">{lensSettings.zoom.toFixed(1)}x</span></div><input type="range" min="1.5" max="4.0" step="0.1" value={lensSettings.zoom} onChange={(e) => setLensSettings({...lensSettings, zoom: parseFloat(e.target.value)})} className="w-full h-1 bg-[#333] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500" /></div>
                  </div>
              </div>
          )
      }

      if (tool === 'name-tag') {
          return (
              <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-blue-500/20 rounded-lg"><Tag className="w-5 h-5 text-blue-500" /></div><div><h3 className="font-semibold text-white">Player Tag</h3><p className="text-xs text-gray-400">Broadcast-style Name</p></div></div>
                  <div className="space-y-4">
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase">Player Roster</label>
                          <div className="flex gap-2">
                              <input type="text" value={nameTagSettings.tempName} onChange={(e) => setNameTagSettings({...nameTagSettings, tempName: e.target.value})} onKeyDown={(e) => {
                                  if (e.key === 'Enter' && nameTagSettings.tempName.trim()) {
                                      const newId = Date.now().toString();
                                      setNameTagSettings({
                                          ...nameTagSettings,
                                          names: [...nameTagSettings.names, { id: newId, text: nameTagSettings.tempName.trim() }],
                                          activeId: newId,
                                          tempName: ''
                                      });
                                  }
                              }} className="flex-1 min-w-0 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="e.g. bruyne" />
                              <button onClick={() => {
                                  if (nameTagSettings.tempName.trim()) {
                                      const newId = Date.now().toString();
                                      setNameTagSettings({
                                          ...nameTagSettings,
                                          names: [...nameTagSettings.names, { id: newId, text: nameTagSettings.tempName.trim() }],
                                          activeId: newId,
                                          tempName: ''
                                      });
                                  }
                              }} className="p-2 transition-colors bg-[#222] hover:bg-[#333] text-gray-300 rounded-lg shrink-0 border border-[#444]">
                                  <Plus className="w-4 h-4" />
                              </button>
                          </div>
                      </div>
                      
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                         {nameTagSettings.names.map(name => (
                             <div key={name.id} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${nameTagSettings.activeId === name.id ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-[#111] hover:bg-[#222] border border-transparent'}`} onClick={() => setNameTagSettings({...nameTagSettings, activeId: name.id})}>
                                 <div className="flex items-center gap-2.5">
                                     <div className={`w-2.5 h-2.5 rounded-full ${nameTagSettings.activeId === name.id ? 'bg-blue-500' : 'bg-[#444]'}`} />
                                     <span className="text-sm font-medium text-gray-200 truncate">{name.text}</span>
                                 </div>
                                 <button onClick={(e) => {
                                     e.stopPropagation();
                                     const newNames = nameTagSettings.names.filter(n => n.id !== name.id);
                                     setNameTagSettings({
                                         ...nameTagSettings,
                                         names: newNames,
                                         activeId: nameTagSettings.activeId === name.id ? (newNames[0]?.id || null) : nameTagSettings.activeId
                                     });
                                 }} className="p-1 -mr-1 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded flex-shrink-0 transition-colors">
                                     <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                             </div>
                         ))}
                         {nameTagSettings.names.length === 0 && (
                             <p className="text-xs text-center text-gray-500 py-4">No active player names. Add one above.</p>
                         )}
                      </div>

                      <div className="space-y-2 pt-3 border-t border-[#333]">
                         <div className="flex justify-between"><label className="text-xs font-bold text-gray-400 uppercase">Size</label><span className="text-xs font-mono text-gray-500">{nameTagSettings.size}px</span></div><input type="range" min="10" max="40" value={nameTagSettings.size} onChange={(e) => setNameTagSettings({...nameTagSettings, size: parseInt(e.target.value)})} className="w-full h-1 bg-[#333] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-200" />
                      </div>
                  </div>
              </div>
          )
      }

      // Default Drawing Tools
      return (
          <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gray-800 rounded-lg"><Pen className="w-5 h-5 text-gray-300" /></div>
                  <div><h3 className="font-semibold text-white">Drawing Tools</h3><p className="text-xs text-gray-400">Customize Stroke</p></div>
              </div>
              <div className="space-y-4">
                  <div className="space-y-2">
                      <div className="flex justify-between"><label className="text-xs font-bold text-gray-400 uppercase">Stroke Width</label><span className="text-xs font-mono text-gray-500">{strokeWidth}px</span></div>
                      <input type="range" min="1" max="20" value={strokeWidth} onChange={(e) => setStrokeWidth(parseInt(e.target.value))} className="w-full h-1 bg-[#333] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white" />
                  </div>
                  
                  {tool === 'arrow' && (
                      <div className="space-y-2 pt-2 border-t border-[#333]">
                          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[#222] rounded"><input type="checkbox" checked={arrowSettings.isDashed} onChange={(e) => setArrowSettings({...arrowSettings, isDashed: e.target.checked})} className="rounded bg-[#333] border-gray-600 text-blue-600 focus:ring-0" /><span className="text-xs text-gray-300">Dashed Line</span></label>
                          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[#222] rounded"><input type="checkbox" checked={arrowSettings.isFreehand} onChange={(e) => setArrowSettings({...arrowSettings, isFreehand: e.target.checked})} className="rounded bg-[#333] border-gray-600 text-blue-600 focus:ring-0" /><span className="text-xs text-gray-300">Freehand Mode</span></label>
                      </div>
                  )}

                  {tool === 'curved-arrow' && (
                      <div className="space-y-2 pt-2 border-t border-[#333]">
                          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[#222] rounded"><input type="checkbox" checked={arrowSettings.isDashed} onChange={(e) => setArrowSettings({...arrowSettings, isDashed: e.target.checked})} className="rounded bg-[#333] border-gray-600 text-blue-600 focus:ring-0" /><span className="text-xs text-gray-300">Dashed Line</span></label>
                      </div>
                  )}

                  {(tool === 'circle' || tool === 'connected-circle') && (
                      <div className="space-y-4 pt-2 border-t border-[#333]">
                          <div className="space-y-2">
                              <div className="flex justify-between"><label className="text-xs font-bold text-gray-400 uppercase">Ring Size</label><span className="text-xs font-mono text-gray-500">{ringSettings.size}px</span></div>
                              <input type="range" min="10" max="200" value={ringSettings.size} onChange={(e) => setRingSettings({...ringSettings, size: parseInt(e.target.value)})} className="w-full h-1 bg-[#333] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500" />
                          </div>
                          <div className="space-y-2">
                              <div className="flex justify-between"><label className="text-xs font-bold text-gray-400 uppercase">3D Tilt</label><span className="text-xs font-mono text-gray-500">{ringSettings.tilt}°</span></div>
                              <input type="range" min="0" max="85" value={ringSettings.tilt} onChange={(e) => setRingSettings({...ringSettings, tilt: parseInt(e.target.value)})} className="w-full h-1 bg-[#333] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500" />
                          </div>
                          {tool === 'connected-circle' && (
                              <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[#222] rounded"><input type="checkbox" checked={ringSettings.isFilled} onChange={(e) => setRingSettings({...ringSettings, isFilled: e.target.checked})} className="rounded bg-[#333] border-gray-600 text-blue-600 focus:ring-0" /><span className="text-xs text-gray-300">Filled Shape (if closed)</span></label>
                          )}
                      </div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#0e0e0e] relative overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 bg-[#111] border-b border-[#222] flex items-center justify-between px-4 z-20 shrink-0 gap-4">
        {/* Left: Branding & Project Info */}
        <div className="flex items-center gap-4 shrink-0">
          <button onClick={() => setShowCloseConfirm(true)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <div className="flex items-center gap-3">
                  <LumoPitchLogo className="w-6 h-6" />
                  <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Lumo Pitch</span>
              </div>
          </button>
          <div className="h-6 w-[1px] bg-[#333]" />
          <span className="text-sm text-gray-400 font-medium truncate max-w-[200px]">{project.name}</span>
          {!isPlaying && (
              <div className="flex items-center ml-4 gap-2">
                  {freezeFrames.find(ff => Math.abs(ff.timestamp - currentTime) < 0.1) ? (
                      <div className="bg-blue-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold border border-blue-400/50 shadow-sm flex items-center gap-2 animate-in fade-in">
                          <Snowflake className="w-3 h-3 text-blue-200" /> ACTIVE FREEZE FRAME
                      </div>
                  ) : shapes.some(s => !s.freezeFrameId) ? (
                      <div className="bg-blue-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold border border-blue-400/50 shadow-sm flex items-center gap-2 animate-in fade-in">
                          <AlertTriangle className="w-3 h-3 text-blue-200" /> TEMPORARY DRAWING
                      </div>
                  ) : null}
              </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
             <button onClick={undo} className="p-2 hover:bg-[#222] rounded text-gray-300 hover:text-white transition-colors" title="Undo (Ctrl+Z)"><Undo2 className="w-5 h-5" /></button>
            <button onClick={redo} className="p-2 hover:bg-[#222] rounded text-gray-300 hover:text-white transition-colors" title="Redo (Ctrl+Y)"><Redo2 className="w-5 h-5" /></button>
            <div className="h-4 w-[1px] bg-[#333] mx-2" />
            <button onClick={() => setTool('eraser')} className={`p-2 rounded transition-colors ${tool === 'eraser' ? 'bg-blue-600 text-white' : 'hover:bg-[#222] text-gray-300 hover:text-white'}`} title="Eraser Tool"><Eraser className="w-5 h-5" /></button>
            <button onClick={clearAll} className="p-2 hover:bg-red-900/30 rounded text-gray-300 hover:text-red-400 transition-colors" title="Clear All (Del)"><Trash2 className="w-5 h-5" /></button>
        </div>

        <div className="flex-1" />

        {/* Right: Colors */}
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
                {colors.map((color) => (
                <button
                    key={color.id}
                    onClick={() => setActiveColorId(color.id)}
                    onContextMenu={(e) => handleColorRightClick(e, color.id)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${activeColorId === color.id ? 'border-white scale-125' : 'border-transparent ring-1 ring-white/10'}`}
                    style={{ backgroundColor: color.value }}
                    title="Left-click to select, Right-click to edit"
                />
                ))}
            </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Container */}
        <div className="flex h-full shrink-0 z-30 relative">
            <div className="w-16 bg-[#111] border-r border-[#222] flex flex-col justify-between py-4 z-40 overflow-y-auto no-scrollbar">
                {/* Tools */}
                <div className="flex flex-col items-center gap-2">
                    {[
                    { id: 'pen', icon: Pen, label: 'Freehand Pen' },
                    { id: 'line', icon: Minus, label: 'Line' },
                    { id: 'arrow', icon: MoveUpRight, label: 'Arrow' },
                    { id: 'curved-arrow', icon: CornerUpRight, label: 'Curved Arrow' },
                    { id: 'circle', icon: Circle, label: 'Telestration Ring' },
                    { id: 'connected-circle', icon: GitCommitVertical, label: 'Chain' },
                    { id: 'spotlight', icon: Flashlight, label: 'Spotlight' },
                    { id: 'lens', icon: ZoomIn, label: 'Zoom Lens' },
                    { id: 'player-move', icon: User, label: 'Player Dragger' },
                    { id: 'name-tag', icon: Tag, label: 'Name Tag' },
                    { id: 'polygon', icon: Hexagon, label: 'Polygon' },
                    { id: 'masking', icon: Layers, label: 'Masking / Green Screen' }
                    ].map((item) => (
                        <div key={item.id} className="relative group w-full flex justify-center">
                            <button
                                onClick={() => {
                                    if (item.id === 'masking') {
                                        setTool(tool === 'masking' ? null : 'masking');
                                    } else {
                                        setTool(tool === item.id ? null : item.id as ToolType);
                                    }
                                }}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                tool === item.id 
                                    ? 'bg-blue-600/20 text-blue-400 ring-2 ring-blue-500/50' 
                                    : 'text-gray-400 hover:bg-[#222] hover:text-white'
                                }`}
                            >
                                <item.icon className={`w-5 h-5 ${tool === item.id ? 'stroke-[2.5px]' : ''}`} />
                            </button>
                             <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-800 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-95 pointer-events-none transition-all duration-200 transform translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50 shadow-xl border border-gray-700 flex items-center origin-left">
                                {item.label}
                                <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-8 border-transparent border-r-gray-800"></div>
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="flex flex-col items-center gap-2 pt-4 border-t border-[#222]">
                    <div className="relative group w-full flex justify-center">
                        <button onClick={() => setTool(null)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${tool === null ? 'bg-blue-600/20 text-blue-400 ring-2 ring-blue-500/50' : 'text-gray-400 hover:bg-[#222] hover:text-white'}`}>
                            <Snowflake className="w-5 h-5" />
                        </button>
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-800 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 scale-95 pointer-events-none transition-all duration-200 transform translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50 shadow-xl border border-gray-700 flex items-center origin-left">
                            Clear Tool & Pause
                            <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-8 border-transparent border-r-gray-800"></div>
                        </div>
                    </div>
                    {/* Screen Recorder */}
                    <div className="relative group w-full flex justify-center mt-2">
                        <button 
                            onClick={toggleScreenRecording} 
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isScreenRecording ? 'bg-red-500/20 text-red-500 ring-2 ring-red-500/50 animate-pulse' : 'text-gray-400 hover:bg-[#222] hover:text-white'}`}
                        >
                            <Video className="w-5 h-5" />
                        </button>
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-800 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 scale-95 pointer-events-none transition-all duration-200 transform translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50 shadow-xl border border-gray-700 flex items-center origin-left">
                            {isScreenRecording ? 'Stop Recording' : 'Record Video Canvas'}
                            <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-8 border-transparent border-r-gray-800"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Properties Panel */}
            <div className="w-[260px] bg-[#161616] border-r border-[#222] overflow-hidden flex flex-col relative z-30 shrink-0">
                <div className="h-full overflow-y-auto p-3">
                    {renderPropertiesPanel()}
                </div>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a] relative">
            {isScreenRecording && recordingStartTimeRef.current && (
                <RecordingTimer startTime={recordingStartTimeRef.current} />
            )}
            {/* Canvas Container */}
            <div ref={containerRef} className="flex-1 relative flex items-center justify-center overflow-hidden bg-black transition-all">
                <video
                    ref={videoRef}
                    src={videoUrl}
                    className="absolute max-w-none max-h-none"
                    style={{ 
                    width: containerRef.current ? '100%' : 'auto',
                    height: '100%',
                    objectFit: 'contain'
                    }}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onSeeked={() => {
                        if (!isPlaying && maskSettings.enabled) {
                            computeMaskingLayers();
                        }
                    }}
                    onEnded={() => setIsPlaying(false)}
                    disablePictureInPicture
                    controls={false}
                />
                <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 z-10 touch-none ${isPickingColor ? 'cursor-crosshair' : (tool === 'masking' ? 'cursor-default' : (tool === 'eraser' ? 'cursor-cell' : (tool ? 'cursor-crosshair' : 'cursor-default')))}`}
                    onMouseDown={startDrawing}
                    onMouseMove={drawPreview}
                    onMouseUp={finishDrawing}
                    onMouseLeave={() => { setIsDrawing(false); mousePosRef.current = null; }}
                    onDoubleClick={handleDoubleClick}
                    onContextMenu={handleContextMenu}
                    onClick={handleCanvasClick}
                    style={{ width: '100%', height: '100%' }}
                />
                
                <canvas
                    ref={ghostCanvasRef}
                    className="absolute inset-0 z-20 pointer-events-none"
                    style={{ width: '100%', height: '100%' }}
                />

                {/* Recording Error Toast */}
                {recordingError && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-500/50 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-4 max-w-md">
                        <div className="flex items-center gap-3">
                            <Video className="w-5 h-5 text-red-400 shrink-0" />
                            <p className="text-sm">{recordingError}</p>
                        </div>
                        <button onClick={() => setRecordingError(null)} className="p-1 hover:bg-white/10 rounded-lg shrink-0">
                            <span className="sr-only">Close</span>
                            <Plus className="w-4 h-4 rotate-45" />
                        </button>
                    </div>
                )}

                {/* Freeze Frame Active Indicator removed per user request */}
            </div>

            {/* TWO LAYER PLAYBAR */}
            <div className={`flex flex-col bg-[#111] border-t border-[#222] relative z-20 shrink-0 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${isTimelineExpanded ? 'h-[320px]' : 'h-auto'}`}>
                
                {/* Layer 1: Timeline Content */}
                {isTimelineExpanded ? (
                    // EXPANDED MULTI-LAYER TIMELINE
                    <div className="flex-1 flex min-h-0 relative group/timeline">
                         {/* Scrollable Timeline Area */}
                         <div 
                            ref={timelineContainerRef}
                            className="flex-1 relative overflow-auto bg-[#0e0e0e]"
                         >
                            <div style={{ width: `${timelineZoom * 100}%`, minWidth: '100%', minHeight: '100%' }} className="relative flex flex-col">
                                
                                {/* Time Ruler (Top) */}
                                <div className="h-8 border-b border-[#222] bg-[#161616] sticky top-0 w-full shrink-0 z-30 hover:brightness-110">
                                     {/* Ticks logic */}
                                     <div className="absolute inset-0 flex justify-between px-2 opacity-50 pointer-events-none">
                                         {[...Array(Math.floor(20 * timelineZoom))].map((_, i) => (
                                             <div key={i} className="flex flex-col items-center justify-end h-full pb-1 gap-1">
                                                 <div className="w-[1px] h-2 bg-gray-600" />
                                                 <span className="text-[9px] text-gray-500 font-mono">
                                                    {formatTime((duration / (20 * timelineZoom)) * i)}
                                                 </span>
                                             </div>
                                         ))}
                                     </div>
                                     <input type="range" min="0" max={duration || 100} step="0.01" value={currentTime} onChange={handleSeek} onContextMenu={handleTimelineContextMenu} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50 focus:outline-none" />
                                </div>

                                {/* Dynamic Tracks Area */}
                                <div className="flex-1 relative w-full pb-8" onContextMenu={handleTimelineContextMenu}>
                                     {/* Grid Lines */}
                                    <div className="absolute inset-0 flex justify-between px-2 opacity-10 pointer-events-none z-0">
                                         {[...Array(Math.floor(40 * timelineZoom))].map((_, i) => <div key={i} className="w-[1px] h-full bg-white/5" />)}
                                    </div>

                                     {/* Playhead (Spanning all tracks) */}
                                     <div 
                                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none"
                                        style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
                                     >
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500" />
                                        <div className="w-full h-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                                     </div>

                                     {/* Dynamic Lanes */}
                                     <div className="absolute top-0 left-0 right-0 py-2 space-y-1">
                                         {timelineLanes.map((lane, laneIndex) => (
                                             <div key={laneIndex} className="relative h-8 w-full z-10">
                                                 {lane.map(evt => {
                                                      const tag = tags.find(t => t.id === evt.tagId);
                                                      const startPct = (evt.startTime / (duration || 1)) * 100;
                                                      const widthPct = ((evt.endTime - evt.startTime) / (duration || 1)) * 100;
                                                      const isSelected = selectedEventIds.has(evt.id);
                                                      const isRecording = evt.id === 'RECORDING_PSEUDO';
                                                      
                                                      return (
                                                          <div
                                                              key={evt.id}
                                                              style={{ 
                                                                  left: `${startPct}%`,
                                                                  width: `${Math.max(widthPct, 0.1)}%`,
                                                                  backgroundColor: isSelected ? '#fff' : fadeColor(tag?.color || '#888', 0.6),
                                                                  borderColor: tag?.color || '#888',
                                                                  borderWidth: '1px',
                                                                  borderStyle: 'solid'
                                                              }}
                                                              className={`absolute top-0 bottom-0 rounded-sm cursor-pointer transition-all flex items-center justify-center overflow-hidden
                                                                ${isSelected ? 'z-40 opacity-100 ring-2 ring-white/50' : 'opacity-90 hover:brightness-125 hover:z-50'}
                                                                ${isRecording ? 'animate-pulse border-r-4 border-r-white' : ''}
                                                              `}
                                                              onClick={(e) => !isRecording && handleEventClick(e, evt.id, evt.startTime)}
                                                              onContextMenu={(e) => !isRecording && handleEventContextMenu(e, evt.id)}
                                                          >
                                                               {widthPct > 1 && (
                                                                   <span className="text-[9px] font-bold text-white truncate px-1 shadow-sm drop-shadow-md select-none">
                                                                       {tag?.name} {isRecording && '(REC)'}
                                                                   </span>
                                                               )}
                                                          </div>
                                                      );
                                                 })}
                                             </div>
                                         ))}
                                     </div>

                                     {/* Markers Row (Overlay) */}
                                     <div className="absolute top-0 w-full h-full z-40 pointer-events-none">
                                        {markers.map(marker => (
                                            <div key={marker.id} style={{ left: `${(marker.time / (duration || 1)) * 100}%` }} className="absolute top-0 bottom-0 w-[1px] bg-white/30 pointer-events-none">
                                                <div className="absolute top-0 -ml-2 pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); jumpToMarker(marker.time); }}>
                                                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px]" style={{ borderTopColor: marker.color }} />
                                                </div>
                                            </div>
                                        ))}
                                     </div>
                                </div>
                            </div>
                         </div>
                    </div>
                ) : (
                    // COLLAPSED SIMPLE TIMELINE
                    <div className="h-14 relative w-full group/timeline bg-[#0e0e0e] border-b border-[#222] overflow-x-auto overflow-y-hidden" ref={timelineContainerRef}>
                        {/* Event Trimmer Overlay (If event selected) */}
                        <AnimatePresence>
                            {selectedEventIds.size === 1 && (
                                <EventPlaybar 
                                    event={tagEvents.find(e => e.id === Array.from(selectedEventIds)[0])!}
                                    tag={tags.find(t => t.id === tagEvents.find(e => e.id === Array.from(selectedEventIds)[0])?.tagId)}
                                    videoDuration={duration}
                                    videoRef={videoRef}
                                    onUpdate={handleEventUpdate}
                                    onClose={() => setSelectedEventIds(new Set())}
                                />
                            )}
                        </AnimatePresence>

                        {/* Standard Timeline (Hidden if trimming) */}
                        {selectedEventIds.size !== 1 && (
                            <div className="relative h-full" style={{ width: `${timelineZoom * 100}%` }}>
                                {/* Live Recording Overlay */}
                                {isTaggingMode && activeRecording && (
                                    <div 
                                        style={{
                                            left: `${(activeRecording.startTime / (duration || 1)) * 100}%`,
                                            width: `${((currentTime - activeRecording.startTime) / (duration || 1)) * 100}%`,
                                            backgroundColor: tags.find(t => t.id === activeRecording.tagId)?.color || 'red'
                                        }}
                                        className="absolute top-0 bottom-0 opacity-30 z-0 pointer-events-none animate-pulse"
                                    />
                                )}

                                {/* Ticks/Grid */}
                                <div className="absolute inset-0 flex justify-between opacity-10 pointer-events-none">
                                    {[...Array(20)].map((_, i) => <div key={i} className="w-[1px] h-full bg-white" />)}
                                </div>

                                {/* Playhead */}
                                <div 
                                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                                    style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
                                >
                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full shadow-sm" />
                                </div>

                                {/* Events Layer */}
                                <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-6 pointer-events-none z-10">
                                    {tagEvents.filter(e => filterTagId ? e.tagId === filterTagId : true).map(evt => {
                                        const tag = tags.find(t => t.id === evt.tagId);
                                        const startPct = (evt.startTime / (duration || 1)) * 100;
                                        const widthPct = ((evt.endTime - evt.startTime) / (duration || 1)) * 100;
                                        const isSelected = selectedEventIds.has(evt.id);

                                        return (
                                            <div
                                                key={evt.id}
                                                style={{ 
                                                    left: `${startPct}%`,
                                                    width: `${Math.max(widthPct, 0.4)}%`,
                                                    backgroundColor: tag?.color || '#fff'
                                                }}
                                                className={`absolute top-0 bottom-0 cursor-pointer pointer-events-auto transition-all duration-200 ease-out group/tagevent rounded-sm
                                                    ${isSelected ? 'ring-2 ring-white z-40 opacity-100 scale-y-125 brightness-110' : 'opacity-80 hover:opacity-100 hover:scale-y-150 hover:brightness-125 hover:z-50 hover:shadow-lg'}
                                                `}
                                                onClick={(e) => handleEventClick(e, evt.id, evt.startTime)}
                                                onContextMenu={(e) => handleEventContextMenu(e, evt.id)}
                                            >
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-0.5 bg-black/90 text-white text-[9px] rounded whitespace-nowrap opacity-0 group-hover:tagevent:opacity-100 pointer-events-none transition-opacity border border-[#333] z-50">
                                                    {tag?.name} ({ (evt.endTime - evt.startTime).toFixed(1) }s)
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="absolute top-0 bottom-0 left-0 w-full pointer-events-none z-30">
                                    {freezeFrames.map(ff => (
                                        <div key={ff.id} style={{ left: `${(ff.timestamp / (duration || 1)) * 100}%` }} className="absolute top-0 bottom-0 w-0.5 bg-blue-500 group/ffmarker">
                                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2"><Snowflake className="w-3 h-3 text-blue-400 fill-blue-900" /></div>
                                        </div>
                                    ))}
                                </div>
                                <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-8 pointer-events-none z-40">
                                    {markers.map(marker => (
                                        <div key={marker.id} style={{ left: `${(marker.time / (duration || 1)) * 100}%`, backgroundColor: marker.color }} className="absolute top-0 bottom-0 w-0.5 pointer-events-auto hover:w-1 transition-all cursor-pointer group/marker" onClick={(e) => { e.stopPropagation(); jumpToMarker(marker.time); }} onContextMenu={(e) => handleMarkerContextMenu(e, marker)}>
                                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full" style={{backgroundColor: marker.color}} />
                                        </div>
                                    ))}
                                </div>

                                <input type="range" min="0" max={duration || 100} step="0.01" value={currentTime} onChange={handleSeek} onContextMenu={handleTimelineContextMenu} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0" />
                            </div>
                        )}
                    </div>
                )}

                {/* Layer 2: Controls */}
                <div className="h-12 flex items-center gap-6 px-6 bg-[#111] shrink-0 border-t border-[#222]">
                    {/* Playback Controls */}
                    <div className="flex items-center gap-2">
                        <button onClick={jumpPrevEvent} className="p-1.5 hover:bg-[#222] rounded-full text-white"><SkipBack className="w-4 h-4" /></button>
                        <button onClick={() => { if(videoRef.current) handleManualSeek(videoRef.current.currentTime - 5); }} className="p-1.5 hover:bg-[#222] rounded-full text-white"><RotateCcw className="w-4 h-4" /></button>
                        <button onClick={togglePlay} className="p-2 bg-white text-black rounded-full hover:bg-gray-200 transition-colors mx-1">
                            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                        </button>
                        <button onClick={() => { if(videoRef.current) handleManualSeek(videoRef.current.currentTime + 5); }} className="p-1.5 hover:bg-[#222] rounded-full text-white"><RotateCw className="w-4 h-4" /></button>
                        <button onClick={jumpNextEvent} className="p-1.5 hover:bg-[#222] rounded-full text-white"><SkipForward className="w-4 h-4" /></button>
                    </div>

                    <div className="flex flex-col items-center text-[10px] text-gray-400 font-mono w-20">
                        <span className="text-white font-bold">{formatTime(currentTime)}</span>
                        <span>/ {formatTime(duration)}</span>
                    </div>

                    <div className="w-[1px] h-6 bg-[#333]" />

                    {/* Zoom & Speed */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <button onClick={handleZoomOut} disabled={timelineZoom <= 1} className="p-1.5 hover:bg-[#222] rounded-full text-gray-300 disabled:opacity-50"><ZoomOut className="w-4 h-4" /></button>
                            <span className="text-xs font-mono w-8 text-center text-gray-500">{Math.round(timelineZoom * 100)}%</span>
                            <button onClick={handleZoomIn} disabled={timelineZoom >= 20} className="p-1.5 hover:bg-[#222] rounded-full text-gray-300 disabled:opacity-50"><ZoomIn className="w-4 h-4" /></button>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-full px-2 py-1 border border-[#333]">
                            <span className="text-[10px] text-gray-400">Speed</span>
                            <input 
                                type="range" min="0.1" max="4.0" step="0.1" value={playbackRate} 
                                onChange={(e) => setPlaybackRate(parseFloat(e.target.value))} 
                                className="w-16 h-1 bg-[#333] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                            />
                            <span className="text-[10px] font-mono w-6">{playbackRate.toFixed(1)}x</span>
                        </div>
                    </div>

                    <div className="flex-1" />

                    {/* Expand Timeline Button */}
                    <button 
                        onClick={() => setIsTimelineExpanded(!isTimelineExpanded)} 
                        className={`p-1.5 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold mr-4 ${isTimelineExpanded ? 'bg-blue-600 text-white' : 'hover:bg-[#222] text-gray-400'}`}
                        title={isTimelineExpanded ? "Collapse Timeline" : "Expand Timeline"}
                    >
                        {isTimelineExpanded ? <ChevronsDown className="w-4 h-4" /> : <ChevronsUp className="w-4 h-4" />}
                        <span>Timeline</span>
                    </button>

                    <div className="w-[1px] h-6 bg-[#333] mr-4" />

                    {/* Volume */}
                    <div className="flex items-center gap-2 group relative w-24">
                        <button onClick={toggleMute} className="p-1.5 hover:bg-[#222] rounded-full text-gray-300">
                            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <div className="flex-1">
                            <input
                                type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                                onChange={(e) => { setVolume(parseFloat(e.target.value)); if (isMuted && parseFloat(e.target.value) > 0) setIsMuted(false); }}
                                className="w-full h-1 bg-[#333] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-400 group-hover:[&::-webkit-slider-thumb]:bg-blue-500"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- RIGHT SIDEBAR --- */}
        <div ref={sidebarRef} className="flex flex-col bg-[#111] border-l border-[#222] z-30 shrink-0 relative" style={{ width: sidebarWidth }}>
             <div className="absolute top-0 bottom-0 -left-1 w-2 cursor-ew-resize hover:bg-blue-500/50 transition-colors z-50" onMouseDown={() => setIsResizingSidebar(true)} />
             
             {/* Tagging Header */}
             <div className="p-4 border-b border-[#222] flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-2"><Tags className="w-4 h-4 text-blue-400" /><h3 className="text-sm font-semibold text-white">Event Tagging</h3></div>
                 <div className="flex items-center gap-2">
                     <span className={`text-[10px] font-bold uppercase tracking-wider ${isTaggingMode ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>{isTaggingMode ? 'REC' : 'OFF'}</span>
                     <button onClick={() => { setIsTaggingMode(!isTaggingMode); setActiveRecording(null); }} className={`w-10 h-5 rounded-full relative transition-colors ${isTaggingMode ? 'bg-red-500' : 'bg-gray-700'}`}>
                        <motion.div className="w-3 h-3 bg-white rounded-full absolute top-1" animate={{ left: isTaggingMode ? 'calc(100% - 16px)' : '4px' }} />
                     </button>
                     <button className="p-1 text-gray-400 hover:text-white" onClick={() => setTagSettingsOpen(true)} title="Code Window"><Settings2 className="w-4 h-4" /></button>
                 </div>
             </div>

             {/* Tags Grid */}
             <div className="p-4 overflow-y-auto border-b border-[#222]" style={{ height: `${eventSectionHeight}%` }}>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
                     {tags.map(tag => {
                         const isActive = activeRecording?.tagId === tag.id;
                         const count = tagEvents.filter(e => e.tagId === tag.id).length;
                         const isFiltered = filterTagId === tag.id;
                         return (
                             <button key={tag.id} onClick={() => handleTagClick(tag.id)} className={`relative h-12 rounded-lg border flex items-center justify-between px-3 transition-all overflow-hidden group ${isTaggingMode ? (isActive ? 'border-transparent bg-gray-800 scale-95 ring-2' : 'border-[#333] bg-[#161616] hover:bg-[#222]') : (isFiltered ? 'border-transparent bg-[#222] ring-1 ring-white' : 'border-[#333] bg-[#161616] hover:bg-[#222]')}`} style={{ borderColor: (isActive || isFiltered) ? tag.color : undefined, boxShadow: isActive ? `0 0 15px ${fadeColor(tag.color, 0.2)}` : undefined }}>
                                 <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: tag.color }} />
                                 <span className="text-xs font-medium text-gray-200 truncate">{tag.name}</span>
                                 <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center w-5 h-5 bg-[#333] rounded text-[10px] font-bold text-gray-400 group-hover:text-white border border-[#444]">{tag.shortcut}</div>
                                    {!isTaggingMode && <span className="text-[10px] text-gray-600 font-mono">{count}</span>}
                                 </div>
                                 {isActive && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                                 {isTaggingMode && tag.leadLagEnabled && <div className="absolute bottom-1 right-1 opacity-50"><Zap className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" /></div>}
                             </button>
                         );
                     })}
                 </div>
             </div>

             <div className="h-2 bg-[#111] border-b border-[#222] cursor-ns-resize hover:bg-blue-500/50 transition-colors z-40" onMouseDown={() => setIsResizingSection(true)} />

             {/* Playlists Header */}
             <div className="p-4 border-b border-[#222] flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-2"><ListPlus className="w-4 h-4 text-emerald-400" /><h3 className="text-sm font-semibold text-white">Playlists</h3></div>
                 <div className="flex items-center gap-1">
                     <button onClick={() => setPlaylistModal({ isOpen: true, mode: 'create', tempName: '' })} className="p-1 text-gray-400 hover:text-white" title="New Playlist"><FolderPlus className="w-4 h-4" /></button>
                 </div>
             </div>

             <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
                 <div className="px-2 pt-2 pb-2 space-y-1 shrink-0 max-h-[150px] overflow-y-auto">
                     {playlists.map(pl => (
                         <div key={pl.id} className="group relative">
                             <button onClick={() => setActivePlaylistId(pl.id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors pr-8 ${activePlaylistId === pl.id ? 'bg-[#222] text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1a]'}`}>
                                 <Folder className={`w-4 h-4 ${activePlaylistId === pl.id ? 'text-blue-400 fill-blue-400/20' : ''}`} />
                                 <span className="flex-1 text-left truncate">{pl.name}</span>
                                 <span className="text-xs text-gray-600">{pl.events.length}</span>
                             </button>
                             <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#222] rounded p-0.5">
                                 <button onClick={(e) => { e.stopPropagation(); setPlaylistModal({ isOpen: true, mode: 'edit', playlistId: pl.id, tempName: pl.name }); }} className="p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white"><Pencil className="w-3 h-3" /></button>
                                 <button onClick={(e) => { e.stopPropagation(); setPlaylistDeleteId(pl.id); }} className="p-1 hover:bg-red-900/30 rounded text-gray-400 hover:text-red-400"><Trash className="w-3 h-3" /></button>
                             </div>
                         </div>
                     ))}
                 </div>
                 <div className="border-t border-[#222] p-2 bg-[#141414] shrink-0 flex items-center justify-between">
                     <div className="flex items-center gap-2 overflow-hidden"><Folder className="w-3 h-3 text-blue-500" /><h4 className="text-[11px] font-bold text-gray-300 truncate max-w-[120px]">{playlists.find(p => p.id === activePlaylistId)?.name}</h4></div>
                     <div className="flex items-center gap-1">
                         {autoplay.active && autoplay.playlistId === activePlaylistId ? (
                             <button onClick={() => setAutoplay({ active: false, playlistId: null, eventIndex: -1 })} className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-[10px] font-bold"><StopCircle className="w-3 h-3" /> Stop</button>
                         ) : (
                             <>
                                 <div className="relative group/export flex gap-1">
                                     <button disabled={!playlists.find(p => p.id === activePlaylistId)?.events.length} className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded text-[10px] font-bold disabled:opacity-50"><Video className="w-3 h-3" /> Export</button>
                                     <div className="absolute top-full right-0 mt-1 min-w-[170px] bg-[#222] border border-[#444] rounded shadow-2xl opacity-0 invisible group-hover/export:opacity-100 group-hover:visible group-hover/export:visible transition-all z-50 flex flex-col overflow-hidden">
                                         <button onClick={() => exportPlaylistVideo(activePlaylistId, true)} className="px-3 py-2 text-xs text-left text-gray-300 hover:bg-[#333] hover:text-white border-b border-[#333]">With Freeze Frames</button>
                                         <button onClick={() => exportPlaylistVideo(activePlaylistId, false)} className="px-3 py-2 text-xs text-left text-gray-300 hover:bg-[#333] hover:text-white">Without Freeze Frames</button>
                                     </div>
                                 </div>
                                 <button onClick={() => startPlaylistAutoplay(activePlaylistId)} disabled={!playlists.find(p => p.id === activePlaylistId)?.events.length} className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded text-[10px] font-bold disabled:opacity-50"><PlayCircle className="w-3 h-3" /> Play All</button>
                             </>
                         )}
                     </div>
                 </div>
                 <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[#0a0a0a]">
                     {playlists.find(p => p.id === activePlaylistId)?.events.map((evt, i) => {
                         const tag = tags.find(t => t.id === evt.tagId);
                         const isPlayingEvent = autoplay.active && autoplay.playlistId === activePlaylistId && autoplay.eventIndex === i;
                         return (
                             <div key={i} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', i.toString()); e.dataTransfer.effectAllowed = 'move'; setDraggingEventIndex(i); }} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }} onDrop={(e) => { e.preventDefault(); const fromIndex = parseInt(e.dataTransfer.getData('text/plain')); if (fromIndex !== i) { reorderPlaylistEvents(activePlaylistId, fromIndex, i); } setDraggingEventIndex(null); }} onClick={(e) => handleEventClick(e, evt.id, evt.startTime)} className={`flex flex-col gap-1 p-2 rounded border border-transparent group transition-all ${isPlayingEvent ? 'bg-[#1a1a1a] border-blue-500/50' : (selectedEventIds.has(evt.id) ? 'bg-[#1a1a1a] border-blue-500/30' : 'bg-[#161616] hover:bg-[#222] hover:border-[#333]')} ${draggingEventIndex === i ? 'opacity-50 dashed border-gray-500' : ''}`}>
                                 <div className="flex items-center gap-2">
                                    <div className="cursor-grab text-gray-600 hover:text-gray-400"><GripVertical className="w-3 h-3" /></div>
                                    <div className="w-1 h-3 rounded-full shrink-0" style={{ backgroundColor: tag?.color }} />
                                    <div className="flex-1 min-w-0"><div className="text-xs font-medium text-gray-300 truncate">{tag?.name}</div></div>
                                    <div className="text-[10px] text-gray-500 font-mono">{new Date(evt.startTime * 1000).toISOString().substr(14, 5)}</div>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); jumpToMarker(evt.startTime); }} className="p-1.5 text-gray-400 hover:text-white"><Play className="w-3 h-3" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); removeEventFromPlaylist(activePlaylistId, i); }} className="p-1.5 text-gray-400 hover:text-red-400"><X className="w-3 h-3" /></button>
                                    </div>
                                 </div>
                                 {evt.notes && (<div className="flex items-start gap-1 text-[10px] text-gray-400 pl-6 border-l-2 border-[#333] ml-1"><MessageSquare className="w-2.5 h-2.5 mt-0.5 shrink-0" /><span className="italic line-clamp-2">{evt.notes}</span></div>)}
                             </div>
                         );
                     })}
                 </div>
             </div>
             <div className="p-3 border-t border-[#222] flex gap-2 shrink-0 bg-[#111]">
                 <button id="save-playlist-btn" onClick={addSelectedToPlaylist} className="flex-1 bg-[#222] hover:bg-[#333] text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors border border-[#333]"><Save className="w-3 h-3" /> Add Selection (Ctrl+S)</button>
             </div>
        </div>
      </div>
      
       <AnimatePresence>
         {tagSettingsOpen && (
             <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                 <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#1a1a1a] border border-[#333] rounded-xl w-[700px] shadow-2xl flex flex-col max-h-[85vh]">
                     <div className="p-4 border-b border-[#333] flex items-center justify-between">
                         <div className="flex items-center gap-2">
                             <Code className="w-5 h-5 text-blue-500" />
                             <h3 className="font-semibold text-white">Code Window</h3>
                         </div>
                         <button onClick={() => setTagSettingsOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                     </div>
                     <div className="p-4 bg-[#111] border-b border-[#333] grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                         <div className="col-span-1 text-center">Color</div>
                         <div className="col-span-3">Name</div>
                         <div className="col-span-1 text-center">Hotkey</div>
                         <div className="col-span-5 text-center">Lead / Lag (Quick Code)</div>
                         <div className="col-span-2 text-right">Actions</div>
                     </div>
                     <div className="overflow-y-auto flex-1 p-2 space-y-1">
                         {tags.map(tag => {
                             const isEditing = editingTagId === tag.id;
                             return (
                                 <div key={tag.id} className={`grid grid-cols-12 gap-2 items-center p-3 rounded-lg border transition-colors ${isEditing ? 'bg-[#1e1e1e] border-blue-500/50' : 'bg-[#161616] border-[#333] hover:border-gray-600'}`}>
                                     {isEditing ? (
                                         <>
                                             <div className="col-span-1 flex justify-center">
                                                <input type="color" value={tempTag.color || tag.color} onChange={e => setTempTag({...tempTag, color: e.target.value})} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0" />
                                             </div>
                                             <div className="col-span-3">
                                                <input type="text" value={tempTag.name !== undefined ? tempTag.name : tag.name} onChange={e => setTempTag({...tempTag, name: e.target.value})} className="w-full bg-[#111] border border-[#444] rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none" placeholder="Tag Name" />
                                             </div>
                                             <div className="col-span-1 flex justify-center">
                                                <input type="text" maxLength={1} value={tempTag.shortcut !== undefined ? tempTag.shortcut : tag.shortcut} onChange={e => setTempTag({...tempTag, shortcut: e.target.value.toUpperCase()})} className="w-8 text-center bg-[#111] border border-[#444] rounded px-1 py-1 text-sm text-white focus:border-blue-500 outline-none font-mono" />
                                             </div>
                                             <div className="col-span-5 flex items-center justify-center gap-4">
                                                 <label className="flex items-center gap-2 cursor-pointer">
                                                     <input type="checkbox" checked={tempTag.leadLagEnabled ?? tag.leadLagEnabled} onChange={(e) => setTempTag({...tempTag, leadLagEnabled: e.target.checked})} className="rounded bg-[#333] border-gray-600 text-blue-600 focus:ring-0" />
                                                     <span className="text-xs text-gray-300">Quick</span>
                                                 </label>
                                                 {(tempTag.leadLagEnabled ?? tag.leadLagEnabled) && (
                                                     <div className="flex items-center gap-2">
                                                         <div className="flex items-center gap-1 bg-[#111] border border-[#333] rounded px-2 py-0.5">
                                                             <span className="text-[10px] text-gray-500">Pre</span>
                                                             <input type="number" min="0" max="60" value={tempTag.preTime ?? tag.preTime ?? 10} onChange={(e) => setTempTag({...tempTag, preTime: parseInt(e.target.value)})} className="w-8 bg-transparent text-right text-xs text-white outline-none font-mono" />
                                                             <span className="text-[10px] text-gray-500">s</span>
                                                         </div>
                                                         <div className="flex items-center gap-1 bg-[#111] border border-[#333] rounded px-2 py-0.5">
                                                             <span className="text-[10px] text-gray-500">Post</span>
                                                             <input type="number" min="0" max="60" value={tempTag.postTime ?? tag.postTime ?? 10} onChange={(e) => setTempTag({...tempTag, postTime: parseInt(e.target.value)})} className="w-8 bg-transparent text-right text-xs text-white outline-none font-mono" />
                                                             <span className="text-[10px] text-gray-500">s</span>
                                                         </div>
                                                     </div>
                                                 )}
                                             </div>
                                             <div className="col-span-2 flex justify-end gap-1">
                                                <button onClick={() => { 
                                                    const newShortcut = tempTag.shortcut !== undefined ? tempTag.shortcut : tag.shortcut;
                                                    const isDuplicate = tags.some(t => t.id !== tag.id && t.shortcut.toUpperCase() === newShortcut?.toUpperCase());
                                                    if (isDuplicate) {
                                                        alert(`Hotkey "${newShortcut}" is already in use by another tag.`);
                                                        return;
                                                    }
                                                    setTags(prev => prev.map(t => t.id === tag.id ? { ...t, ...tempTag } as TagData : t)); 
                                                    setEditingTagId(null); 
                                                    setTempTag({}); 
                                                }} className="p-1.5 bg-green-600 hover:bg-green-500 text-white rounded transition-colors"><Check className="w-4 h-4" /></button>
                                                <button onClick={() => { setEditingTagId(null); setTempTag({}); }} className="p-1.5 bg-[#333] hover:bg-[#444] text-white rounded transition-colors"><X className="w-4 h-4" /></button>
                                             </div>
                                         </>
                                     ) : (
                                         <>
                                             <div className="col-span-1 flex justify-center">
                                                 <div className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{backgroundColor: tag.color}} />
                                             </div>
                                             <div className="col-span-3 font-medium text-sm text-gray-200 truncate">{tag.name}</div>
                                             <div className="col-span-1 flex justify-center">
                                                 <span className="w-6 h-6 flex items-center justify-center text-xs font-mono font-bold bg-[#222] border border-[#333] rounded text-gray-400">{tag.shortcut}</span>
                                             </div>
                                             <div className="col-span-5 flex justify-center">
                                                 {tag.leadLagEnabled ? (
                                                     <div className="flex items-center gap-2 px-2 py-1 bg-blue-900/20 border border-blue-500/30 rounded text-blue-400">
                                                         <Zap className="w-3 h-3 fill-blue-500/50" />
                                                         <span className="text-xs font-mono">-{tag.preTime || 10}s / +{tag.postTime || 10}s</span>
                                                     </div>
                                                 ) : (
                                                     <span className="text-xs text-gray-600 font-medium px-2 py-1 rounded bg-[#222]">Manual Mode</span>
                                                 )}
                                             </div>
                                             <div className="col-span-2 flex justify-end gap-1">
                                                 <button onClick={() => { setEditingTagId(tag.id); setTempTag({ name: tag.name, color: tag.color, shortcut: tag.shortcut, leadLagEnabled: tag.leadLagEnabled, preTime: tag.preTime, postTime: tag.postTime }); }} className="p-1.5 text-gray-400 hover:text-white hover:bg-[#333] rounded"><Edit2 className="w-4 h-4" /></button>
                                                 <button onClick={() => { if (confirm('Delete this tag?')) setTags(prev => prev.filter(t => t.id !== tag.id)); }} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded"><Trash2 className="w-4 h-4" /></button>
                                             </div>
                                         </>
                                     )}
                                 </div>
                             );
                         })}
                     </div>
                     {!editingTagId && (
                         <div className="p-4 border-t border-[#333] bg-[#111] flex gap-3">
                            <button onClick={() => { const newId = Date.now().toString(); setTags(prev => [...prev, { id: newId, name: 'New Tag', color: '#ffffff', shortcut: '?', leadLagEnabled: false, preTime: 10, postTime: 10 }]); setEditingTagId(newId); setTempTag({ name: 'New Tag', color: '#ffffff', shortcut: '?', leadLagEnabled: false, preTime: 10, postTime: 10 }); }} className="flex-1 py-3 border border-dashed border-[#444] rounded-lg text-gray-500 hover:text-white hover:border-blue-500 hover:bg-blue-500/5 flex items-center justify-center gap-2 text-sm font-medium transition-all">
                                <Plus className="w-4 h-4" /> Add New Code
                            </button>
                            <div className="flex items-center gap-1 pl-3 border-l border-[#333]">
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    accept=".json"
                                    className="hidden"
                                    onChange={(e) => {
                                        const fileReader = new FileReader();
                                        if (e.target.files && e.target.files.length > 0) {
                                            fileReader.readAsText(e.target.files[0], "UTF-8");
                                            fileReader.onload = (event) => {
                                                try {
                                                    if (event.target?.result) {
                                                        const parsedTags = JSON.parse(event.target.result as string);
                                                        if (Array.isArray(parsedTags)) {
                                                            if (window.confirm("Importing will replace all current tags. Continue?")) {
                                                                setTags(parsedTags);
                                                            }
                                                        } else {
                                                            alert("Invalid JSON: Expected an array of tags.");
                                                        }
                                                    }
                                                } catch (error) {
                                                    alert("Error parsing JSON file.");
                                                }
                                                // Reset input so same file can be selected again if needed
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            };
                                        }
                                    }}
                                />
                                <button 
                                    onClick={() => fileInputRef.current?.click()} 
                                    className="p-3 bg-[#222] hover:bg-[#333] rounded-lg text-gray-400 hover:text-white transition-colors" 
                                    title="Import Tags"
                                >
                                    <FileUp className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => {
                                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tags, null, 2));
                                        const downloadAnchorNode = document.createElement('a');
                                        downloadAnchorNode.setAttribute("href", dataStr);
                                        downloadAnchorNode.setAttribute("download", "zone14_tags.json");
                                        document.body.appendChild(downloadAnchorNode);
                                        downloadAnchorNode.click();
                                        downloadAnchorNode.remove();
                                    }} 
                                    className="p-3 bg-[#222] hover:bg-[#333] rounded-lg text-gray-400 hover:text-white transition-colors" 
                                    title="Export Tags"
                                >
                                    <FileDown className="w-4 h-4" />
                                </button>
                            </div>
                         </div>
                     )}
                 </motion.div>
             </div>
         )}
       </AnimatePresence>

       <AnimatePresence>
        {playlistModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                 <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1a1a1a] border border-[#333] p-6 rounded-xl w-80 shadow-2xl flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#333]"><h4 className="text-sm font-semibold text-white">{playlistModal.mode === 'create' ? 'Create Playlist' : 'Rename Playlist'}</h4><button onClick={() => setPlaylistModal(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button></div>
                    <div className="space-y-1"><label className="text-[10px] text-gray-400 uppercase font-semibold">Name</label><input type="text" autoFocus placeholder="Playlist Name..." value={playlistModal.tempName} onChange={(e) => setPlaylistModal({...playlistModal, tempName: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && savePlaylist()} className="w-full bg-[#111] border border-[#333] rounded px-2 py-2 text-sm text-white focus:outline-none focus:border-blue-500" /></div>
                    <div className="flex gap-2 pt-2"><button onClick={savePlaylist} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors">Save</button></div>
                 </motion.div>
            </div>
        )}
       </AnimatePresence>

        <AnimatePresence>
            {playlistDeleteId && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#1a1a1a] border border-[#333] p-6 rounded-xl w-80 shadow-2xl text-center">
                        <div className="flex justify-center mb-4 text-red-500"><AlertTriangle className="w-8 h-8" /></div>
                        <h3 className="font-semibold text-white mb-2">Delete Playlist?</h3>
                        <div className="flex gap-3 justify-center"><button onClick={() => setPlaylistDeleteId(null)} className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-[#222] rounded-lg">Cancel</button><button onClick={confirmDeletePlaylist} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Delete</button></div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

       {contextMenu && (
           <>
            <div className="fixed inset-0 z-[65] bg-transparent" onClick={() => setContextMenu(null)} />
            <div className="fixed z-[70] bg-[#1a1a1a] border border-[#333] rounded shadow-xl py-1 w-32" style={{ left: contextMenu.x, top: contextMenu.y }}>
               <button onClick={handleEditEvent} className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-[#333] hover:text-white flex items-center gap-2"><Edit2 className="w-3 h-3" /> Edit Event</button>
               <button onClick={handleDeleteEventRequest} className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/30 hover:text-red-300 flex items-center gap-2"><Trash className="w-3 h-3" /> Delete Event</button>
           </div>
           </>
       )}

       <AnimatePresence>
            {editEventModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1a1a1a] border border-[#333] p-5 rounded-xl w-80 shadow-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between pb-2 border-b border-[#333]"><h4 className="text-sm font-semibold text-white">Edit Event</h4><button onClick={() => setEditEventModal(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button></div>
                        <div className="space-y-3">
                            <div className="space-y-1"><div className="flex justify-between"><label className="text-[10px] text-gray-400 uppercase font-semibold">Start Time</label><button onClick={() => setEditEventModal(prev => prev ? {...prev, startTime: currentTime} : null)} className="text-[10px] text-blue-400 hover:text-blue-300">Set to Current</button></div><input type="number" step="0.1" value={editEventModal.startTime} onChange={(e) => setEditEventModal({...editEventModal, startTime: parseFloat(e.target.value)})} className="w-full bg-[#111] border border-[#333] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" /></div>
                            <div className="space-y-1"><div className="flex justify-between"><label className="text-[10px] text-gray-400 uppercase font-semibold">End Time</label><button onClick={() => setEditEventModal(prev => prev ? {...prev, endTime: currentTime} : null)} className="text-[10px] text-blue-400 hover:text-blue-300">Set to Current</button></div><input type="number" step="0.1" value={editEventModal.endTime} onChange={(e) => setEditEventModal({...editEventModal, endTime: parseFloat(e.target.value)})} className="w-full bg-[#111] border border-[#333] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" /></div>
                            <div className="space-y-1"><label className="text-[10px] text-gray-400 uppercase font-semibold">Notes</label><textarea value={editEventModal.notes} onChange={(e) => setEditEventModal({...editEventModal, notes: e.target.value})} placeholder="Add tactical notes..." className="w-full bg-[#111] border border-[#333] rounded px-2 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[60px]" /></div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-[#333]"><button onClick={handleDeleteEventRequest} className="px-3 py-2 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded text-xs font-medium transition-colors">Delete</button><button onClick={saveEditedEvent} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors">Save Changes</button></div>
                    </motion.div>
                </div>
            )}
       </AnimatePresence>

       <AnimatePresence>
        {markerModal && (
            <div className="fixed inset-0 z-[60] pointer-events-none">
                 <div className="absolute inset-0 pointer-events-auto" onMouseDown={() => setMarkerModal(null)} />
                 <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ left: markerModal.x, top: markerModal.y }} className="absolute bg-[#1a1a1a] border border-[#333] p-4 rounded-xl w-64 shadow-2xl origin-bottom-left pointer-events-auto flex flex-col gap-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#333]"><h4 className="text-sm font-semibold text-white">{markerModal.mode === 'create' ? 'Add Marker' : 'Edit Marker'}</h4><button onClick={() => setMarkerModal(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button></div>
                    <div className="space-y-1"><label className="text-[10px] text-gray-400 uppercase font-semibold">Label</label><input type="text" autoFocus placeholder="Tactical Note..." value={markerModal.tempLabel} onChange={(e) => setMarkerModal({...markerModal, tempLabel: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && saveMarker()} className="w-full bg-[#111] border border-[#333] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" /></div>
                    <div className="space-y-1"><label className="text-[10px] text-gray-400 uppercase font-semibold">Color</label><div className="flex gap-2">{['#ef4444', '#eab308', '#3b82f6', '#22c55e', '#a855f7', '#ffffff'].map(c => (<button key={c} onClick={() => setMarkerModal({...markerModal, tempColor: c})} className={`w-6 h-6 rounded-full border-2 transition-transform ${markerModal.tempColor === c ? 'border-white scale-110' : 'border-transparent ring-1 ring-white/10'}`} style={{ backgroundColor: c }} />))}</div></div>
                    <div className="flex gap-2 pt-2">{markerModal.mode === 'edit' && (<button onClick={deleteMarker} className="flex-1 py-1.5 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded text-xs font-medium transition-colors">Delete</button>)}<button onClick={saveMarker} className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors">Save</button></div>
                 </motion.div>
            </div>
        )}
       </AnimatePresence>



       <AnimatePresence>
        {showCloseConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#1a1a1a] border border-[#333] p-6 rounded-xl w-80 shadow-2xl">
                <div className="flex items-center gap-3 text-amber-500 mb-4"><AlertTriangle className="w-6 h-6" /><h3 className="font-semibold text-white">End Session?</h3></div>
                <p className="text-gray-400 text-sm mb-6">Return to project selection? Unsaved changes are automatically saved to local session.</p>
                <div className="flex gap-3 justify-end"><button onClick={() => setShowCloseConfirm(false)} className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-[#222] rounded-lg">Cancel</button><button onClick={confirmClose} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Exit Project</button></div>
             </motion.div>
          </div>
        )}
       </AnimatePresence>
    </div>
  );
};

const container = document.getElementById('root')!;
const root = (window as any).__REACT_ROOT__ || createRoot(container);
if (!(window as any).__REACT_ROOT__) {
  (window as any).__REACT_ROOT__ = root;
}
root.render(<App />);