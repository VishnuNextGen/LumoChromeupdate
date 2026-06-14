import React from 'react';

export const LumoPitchLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    {/* Base L */}
    <path d="M 30 15 L 48 15 L 48 65 L 82 65 L 82 85 L 30 85 Z" fill="url(#purpleGrad)" />
    
    {/* Soccer ball */}
    <circle cx="75" cy="50" r="10" fill="white" filter="url(#glow)" />
    <path d="M 75 42 L 72 47 L 78 48 Z M 69 52 L 75 55 L 78 50 Z M 71 44 L 67 48 L 68 53 Z M 83 48 L 79 44 L 79 53 Z" fill="#1e1b4b" />
    
    {/* Tactical arrows */}
    <path d="M 45 45 C 50 30, 60 30, 68 45" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeDasharray="4 4" fill="none" />
    <path d="M 65 45 L 71 45 L 68 49 Z" fill="rgba(255,255,255,0.8)" />
    
    <path d="M 40 60 C 50 72, 65 72, 68 62" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeDasharray="4 4" fill="none" />
    <path d="M 65 62 L 71 62 L 68 58 Z" fill="rgba(255,255,255,0.8)" />
  </svg>
);

export const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  return (
    <div className="w-screen h-screen flex relative overflow-hidden bg-black font-sans text-white">
      {/* Left side: Login Panel */}
      <div className="w-full lg:w-[45%] flex flex-col justify-between p-8 md:p-16 z-10 bg-[#0a0a0a] relative shadow-[10px_0_50px_rgba(0,0,0,0.5)]">
        {/* Top Logo */}
        <div className="flex items-center gap-3">
          <LumoPitchLogo className="w-10 h-10" />
          <span className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent tracking-tight">Lumo Pitch</span>
        </div>

        {/* Center content */}
        <div className="max-w-sm w-full mx-auto space-y-8 pb-12 mt-12 md:mt-0 pt-16 md:pt-0">
           <div className="space-y-4">
             <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Welcome Back</h1>
             <p className="text-gray-400 text-lg leading-relaxed">Log in to sync your tactical video analysis projects and access your unified workspace.</p>
           </div>
           
           <div className="pt-6">
               <button 
                  onClick={onLogin}
                  className="w-full bg-white text-black px-6 py-[18px] rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                  <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Login with Google
               </button>
           </div>
        </div>

        {/* Footer */}
        <p className="text-sm text-gray-600 font-medium hidden md:block">© {new Date().getFullYear()} Lumo Pitch Analytics</p>
      </div>

      {/* Right side: Graphics Showcase */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-[#3b206b] via-[#1c1143] to-[#0a0618] overflow-hidden items-center justify-center p-12">
         {/* Background decorative blobs */}
         <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none"></div>
         <div className="absolute bottom-[-20%] left-[10%] w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none"></div>

         {/* Features Text Overlay */}
         <div className="absolute top-16 left-16 z-20">
            <h2 className="text-4xl font-extrabold leading-[1.1] text-white/95">
               Elevate your game with<br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-300">Intelligent Video Analysis.</span>
            </h2>
            <p className="mt-5 text-purple-100/70 text-lg max-w-md font-medium">Draw dynamic paths, highlight crucial zones, and sequence clips instantly in your workspace.</p>
         </div>

         {/* Showcase Container - Isometric Presentation */}
         <div className="relative w-full max-w-4xl h-[70%] mt-24 perspective-[2000px]">
             <div className="absolute inset-0 bg-[#0f0f0f]/90 backdrop-blur-sm rounded-2xl border border-white/10 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col transform rotate-y-[-12deg] rotate-x-[8deg] -rotate-z-[2deg] transition-all hover:rotate-y-[-5deg] hover:rotate-x-[2deg] hover:-rotate-z-[0deg] duration-1000 ease-out">
                 
                 {/* Mock UI Header */}
                 <div className="h-10 border-b border-white/5 bg-[#1a1a1a]/80 flex items-center px-4 gap-2">
                     <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                     <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                     <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                     <div className="flex-1"></div>
                     <div className="h-4 w-32 bg-white/5 rounded-md"></div>
                     <div className="flex-1"></div>
                 </div>
                 
                 {/* Mock UI Body */}
                 <div className="flex-1 flex p-4 gap-4 bg-[#0a0a0a]">
                     {/* Sidebar placeholder */}
                     <div className="w-48 flex flex-col gap-3">
                         <div className="h-20 bg-white/[0.03] border border-white/5 rounded-xl p-3 flex flex-col gap-2">
                            <div className="h-3 w-3/4 bg-white/20 rounded"></div>
                            <div className="h-2 w-full bg-white/10 rounded"></div>
                            <div className="h-2 w-5/6 bg-white/10 rounded"></div>
                         </div>
                         <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col gap-2.5">
                            <div className="flex justify-between items-center bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                               <div className="w-16 h-2 bg-purple-400 rounded"></div>
                               <div className="w-4 h-4 rounded-full bg-purple-400/20"></div>
                            </div>
                            <div className="flex justify-between items-center bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                               <div className="w-12 h-2 bg-emerald-400 rounded"></div>
                               <div className="w-4 h-4 rounded-full bg-emerald-400/20"></div>
                            </div>
                            <div className="flex justify-between items-center bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                               <div className="w-20 h-2 bg-blue-400 rounded"></div>
                               <div className="w-4 h-4 rounded-full bg-blue-400/20"></div>
                            </div>
                             <div className="flex justify-between items-center bg-white/[0.05] p-2 rounded-lg border border-white/5">
                               <div className="w-14 h-2 bg-gray-400 rounded"></div>
                               <div className="w-4 h-4 rounded-full bg-white/10"></div>
                            </div>
                         </div>
                     </div>

                     {/* Video Area Placeholder */}
                     <div className="flex-[3] flex flex-col gap-4">
                         <div className="flex-1 bg-[#111] rounded-xl relative overflow-hidden border border-white/5 flex items-center justify-center">
                             {/* Abstract Football Pitch lines */}
                             <div className="w-[80%] h-[60%] border-2 border-green-500/20 rounded-md relative opacity-50">
                                 <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-green-500/20 -translate-x-1/2"></div>
                                 <div className="absolute top-1/2 left-1/2 w-16 h-16 border-2 border-green-500/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                                 <div className="absolute top-1/4 bottom-1/4 left-0 w-24 border-y-2 border-r-2 border-green-500/20"></div>
                                 <div className="absolute top-1/4 bottom-1/4 right-0 w-24 border-y-2 border-l-2 border-green-500/20"></div>
                             </div>

                             {/* Tactical Drawing Highlights */}
                             <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
                                {/* Zone highight */}
                                <polygon points="150,100 250,90 280,180 180,200" fill="rgba(168, 85, 247, 0.15)" stroke="rgba(168, 85, 247, 0.5)" strokeWidth="1" />
                                
                                {/* Movement Arrow */}
                                <path d="M 120 220 C 180 180, 200 150, 240 120" stroke="#60a5fa" strokeWidth="2" strokeDasharray="6 4" fill="none" className="animate-pulse" />
                                <polygon points="238,118 245,115 235,125" fill="#60a5fa" transform="rotate(30 240 120)" />
                                
                                {/* Player node */}
                                <circle cx="120" cy="220" r="6" fill="#ef4444" />
                                <circle cx="120" cy="220" r="10" fill="transparent" stroke="rgba(239, 68, 68, 0.5)" strokeWidth="1" />
                                
                                {/* Ball node */}
                                <circle cx="210" cy="140" r="4" fill="white" />
                             </svg>

                             {/* Mock player controls */}
                             <div className="absolute bottom-4 left-4 right-4 h-12 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 flex items-center px-4 gap-4">
                               <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                  <div className="w-0 h-0 border-t-4 border-t-transparent border-l-6 border-l-white border-b-4 border-b-transparent ml-1"></div>
                               </div>
                               <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden relative">
                                 <div className="w-[45%] h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full relative"></div>
                                 <div className="absolute left-[20%] top-0 bottom-0 w-1 bg-white/40"></div>
                                 <div className="absolute left-[35%] top-0 bottom-0 w-1 bg-white/40"></div>
                               </div>
                               <div className="w-16 h-3 bg-white/10 rounded overflow-hidden flex divide-x divide-white/20">
                                   <div className="flex-1 bg-white/20"></div>
                                   <div className="flex-1 bg-white/5"></div>
                               </div>
                             </div>
                         </div>
                     </div>
                 </div>
             </div>

             {/* Floating 3D Graphic Cards mapping to real features */}
             {/* Stats Card */}
             <div className="absolute -right-8 top-1/3 w-64 bg-[#111] rounded-xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.6)] p-5 flex flex-col gap-4 transform rotate-[4deg] translate-z-20 hover:-translate-y-2 hover:rotate-0 transition-transform duration-500">
               <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tag Distribution</span>
               </div>
               <div className="flex items-end gap-2 h-20">
                 <div className="flex-1 bg-purple-500/80 rounded-t-sm h-[80%] relative group"><div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-xs bg-white text-black px-1 rounded transition-opacity">12</div></div>
                 <div className="flex-1 bg-blue-500/80 rounded-t-sm h-[100%] relative group"><div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-xs bg-white text-black px-1 rounded transition-opacity">18</div></div>
                 <div className="flex-1 bg-emerald-500/80 rounded-t-sm h-[40%] relative group"><div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-xs bg-white text-black px-1 rounded transition-opacity">6</div></div>
                 <div className="flex-1 bg-rose-500/80 rounded-t-sm h-[60%] relative group"><div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-xs bg-white text-black px-1 rounded transition-opacity">9</div></div>
               </div>
               <div className="h-1.5 w-1/2 bg-white/10 rounded-full mt-2"></div>
             </div>
             
             {/* Action Card */}
             <div className="absolute -left-12 bottom-1/4 w-56 bg-[#111]/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.6)] p-4 flex items-center gap-4 transform -rotate-[5deg] translate-z-10 hover:-translate-y-2 hover:rotate-0 transition-transform duration-500">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center shadow-lg shrink-0">
                   <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                   </svg>
                </div>
                <div>
                   <div className="text-sm font-bold text-white mb-1">New Sequence</div>
                   <div className="h-2 w-20 bg-white/20 rounded"></div>
                </div>
             </div>
         </div>
      </div>
    </div>
  );
};
