export const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return "00:00.0";
    const m = Math.floor(Math.abs(seconds) / 60);
    const s = Math.floor(Math.abs(seconds) % 60);
    const ms = Math.floor((Math.abs(seconds) % 1) * 10);
    return `${seconds < 0 ? '-' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
};

export const getDistance = (p1: {x: number; y: number}, p2: {x: number; y: number}) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const getVideoLayout = (canvas: HTMLCanvasElement, video: HTMLVideoElement) => {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cw = canvas.width;
    const ch = canvas.height;
    if (!vw || !vh) return { x: 0, y: 0, w: cw, h: ch, scale: 1 };

    const videoRatio = vw / vh;
    const canvasRatio = cw / ch;
    
    let drawW, drawH, drawX, drawY, scale;

    if (canvasRatio > videoRatio) {
        drawH = ch;
        drawW = ch * videoRatio;
        drawX = (cw - drawW) / 2;
        drawY = 0;
        scale = drawH / vh;
    } else {
        drawW = cw;
        drawH = cw / videoRatio;
        drawY = (ch - drawH) / 2;
        drawX = 0;
        scale = drawW / vw;
    }

    return { x: drawX, y: drawY, w: drawW, h: drawH, scale };
};
