import React, { useState, useEffect } from 'react';

export const RecordingTimer = ({ startTime }: { startTime: number }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTime) / 1000));
        }, 500);
        return () => clearInterval(interval);
    }, [startTime]);

    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');

    return (
        <div className="absolute top-4 right-4 z-[100] bg-red-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-xl shadow-red-900/20 border border-red-500/30 flex items-center gap-3">
            <div className={`w-3 h-3 bg-red-300 rounded-full ${elapsed % 2 === 0 ? 'opacity-100 scale-110' : 'opacity-50 scale-100'} transition-all`} />
            <span className="font-mono font-bold tracking-wider text-lg">REC {m}:{s}</span>
        </div>
    );
};
