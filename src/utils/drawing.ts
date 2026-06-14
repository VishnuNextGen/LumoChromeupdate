import type { Point, Particle, Rect, Shape, FreezeFrame } from '../types';
import { fadeColor, adjustBrightness, shiftColor } from './colors';

export const createParticles = (count: number = 30): Particle[] => {
  const arr: Particle[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      initialAngle: Math.random() * Math.PI * 2,
      speed: 0.002 + Math.random() * 0.003
    });
  }
  return arr;
};

export const drawArrowHead = (ctx: CanvasRenderingContext2D, from: Point, to: Point, size: number, isShadow: boolean = false) => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle - Math.PI / 6), to.y - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 6), to.y - size * Math.sin(angle + Math.PI / 6));
  ctx.lineTo(to.x, to.y);
  ctx.fill();
};

export const drawDashedLine = (ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string, width: number = 2) => {
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash([width * 2, width * 2]);
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.restore();
};

export const drawLabel = (ctx: CanvasRenderingContext2D, p: Point, text: string, scale: number) => {
  ctx.save();
  const fontSize = 11 / scale;
  ctx.font = `500 ${fontSize}px Inter, sans-serif`;
  const metrics = ctx.measureText(text);
  const paddingX = 8 / scale;
  const h = 22 / scale;
  const w = metrics.width + paddingX * 2;
  const x = p.x + (15 / scale);
  const y = p.y + (15 / scale);
  const radius = 4 / scale;
  
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 4 / scale;
  ctx.fillStyle = 'rgba(20, 20, 20, 0.85)';
  ctx.beginPath();
  if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, radius);
  } else {
      ctx.rect(x, y, w, h);
  }
  ctx.fill();
  
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1 / scale;
  ctx.stroke();
  
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = 0;
  ctx.fillText(text, x + paddingX, y + h/2 + (1/scale));
  ctx.restore();
};

export const getShimmerGradient = (ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string, isPreview: boolean) => {
    const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
    const shimmerSpeed = 0.001; 
    const shimmerOffset = (Date.now() * shimmerSpeed) % 2; 

    if (isPreview) {
        grad.addColorStop(0, fadeColor(color, 0.2));
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, fadeColor(color, 0.2));
    } else {
        const stop1 = Math.max(0, Math.min(1, shimmerOffset - 0.2));
        const stop2 = Math.max(0, Math.min(1, shimmerOffset));
        const stop3 = Math.max(0, Math.min(1, shimmerOffset + 0.2));
        grad.addColorStop(0, fadeColor(color, 0.6));
        if (stop2 > 0 && stop2 < 1) {
             grad.addColorStop(stop1, color);
             grad.addColorStop(stop2, '#ffffff'); 
             grad.addColorStop(stop3, color);
        } else {
             grad.addColorStop(0.5, color);
        }
        grad.addColorStop(1, fadeColor(color, 0.6));
    }
    return grad;
};

export const drawFreehandArrow = (ctx: CanvasRenderingContext2D, points: Point[], color: string, thickness: number, isDashed: boolean, timestamp: number, isPreview: boolean) => {
    if (points.length < 2) return;
    
    const pStart = points[0];
    const pEnd = points[points.length - 1];

    // 1. Calculate a stable angle by looking back along the path
    let pPrev = points.length > 1 ? points[points.length - 2] : pStart;
    for (let i = points.length - 2; i >= 0; i--) {
        if (Math.hypot(pEnd.x - points[i].x, pEnd.y - points[i].y) > 15) {
            pPrev = points[i];
            break;
        }
    }
    const angle = Math.atan2(pEnd.y - pPrev.y, pEnd.x - pPrev.x);

    // 2. Head dimensions
    const headSize = Math.max(thickness * 3.5, 16); 
    const headLength = headSize * 0.9;
    const shortenDist = headLength * Math.cos(Math.PI / 6) * 0.85;

    // 3. Collect points for the line body, stopping before the arrowhead
    const pathPoints: Point[] = [];
    for (let i = 0; i < points.length; i++) {
        const dEnd = Math.hypot(pEnd.x - points[i].x, pEnd.y - points[i].y);
        if (dEnd > shortenDist) {
            pathPoints.push(points[i]);
        }
    }
    
    // Fallback if path is very short
    if (pathPoints.length === 0) pathPoints.push(pStart);
    
    // Add the exact explicit cutoff point
    const lineEndX = pEnd.x - Math.cos(angle) * shortenDist;
    const lineEndY = pEnd.y - Math.sin(angle) * shortenDist;
    pathPoints.push({ x: lineEndX, y: lineEndY });

    const makePath = () => {
        if (pathPoints.length === 0) return;
        ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        for (let i = 1; i < pathPoints.length - 2; i++) {
            const xc = (pathPoints[i].x + pathPoints[i + 1].x) / 2;
            const yc = (pathPoints[i].y + pathPoints[i + 1].y) / 2;
            ctx.quadraticCurveTo(pathPoints[i].x, pathPoints[i].y, xc, yc);
        }
        if (pathPoints.length > 2) {
            ctx.quadraticCurveTo(
                pathPoints[pathPoints.length - 2].x, 
                pathPoints[pathPoints.length - 2].y, 
                pathPoints[pathPoints.length - 1].x, 
                pathPoints[pathPoints.length - 1].y
            );
        } else if (pathPoints.length === 2) {
            ctx.lineTo(pathPoints[1].x, pathPoints[1].y);
        }
    };

    const drawHead = (isShadow: boolean) => {
        const tipX = pEnd.x;
        const tipY = pEnd.y;
        const barb1x = tipX - headLength * Math.cos(angle - Math.PI / 6);
        const barb1y = tipY - headLength * Math.sin(angle - Math.PI / 6);
        const barb2x = tipX - headLength * Math.cos(angle + Math.PI / 6);
        const barb2y = tipY - headLength * Math.sin(angle + Math.PI / 6);
        
        ctx.beginPath();
        ctx.moveTo(barb1x, barb1y);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(barb2x, barb2y);
        ctx.closePath();
        
        if (isShadow) {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fill();
        } else {
            const grad = ctx.createLinearGradient(barb1x, barb1y, barb2x, barb2y);
            grad.addColorStop(0, adjustBrightness(color, 20));
            grad.addColorStop(0.5, color);
            grad.addColorStop(1, shiftColor(color, -20));
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = adjustBrightness(color, 40);
            ctx.lineWidth = Math.max(1, thickness * 0.2);
            ctx.stroke();
        }
    };

    // Draw Ground Shadow
    if (!isPreview) {
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = thickness;
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = Math.max(4, thickness); 
        ctx.beginPath();
        makePath();
        ctx.stroke();
        
        drawHead(true);
        ctx.restore();
    }

    // Draw Main Body
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = thickness;
    
    ctx.strokeStyle = getShimmerGradient(ctx, pStart, pEnd, color, isPreview);
    if (isDashed) ctx.setLineDash([thickness * 2, thickness * 1.5]);
    if (!isPreview) { ctx.shadowColor = color; ctx.shadowBlur = 12; }
    
    ctx.beginPath();
    makePath();
    ctx.stroke();
    
    // Inner Highlight
    if (!isDashed && thickness > 3) {
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = thickness * 0.3;
      ctx.translate(-thickness * 0.15, -thickness * 0.15); 
      ctx.beginPath();
      makePath();
      ctx.stroke();
      ctx.restore();
    }

    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    drawHead(false);
    ctx.restore();
};

export const drawProArrow = (ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string, thickness: number, isDashed: boolean, timestamp: number, isPreview: boolean = false) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angle = Math.atan2(dy, dx);
    const length = Math.sqrt(dx*dx + dy*dy);
    const duration = 500; 
    const age = isPreview ? duration : (Date.now() - timestamp);
    const progress = Math.min(1, age / duration);
    if (length < 1) return;
    const currentLength = length * progress;
    const currentEndX = p1.x + Math.cos(angle) * currentLength;
    const currentEndY = p1.y + Math.sin(angle) * currentLength;
    const headSize = Math.max(thickness * 3, 15); 
    const headLength = headSize * 0.9;
    const shortenDist = headLength * Math.cos(Math.PI / 6) * 0.85;
    let lineEndX = currentEndX;
    let lineEndY = currentEndY;
    const hasHead = currentLength > shortenDist || isPreview;
    if (hasHead) {
        lineEndX = currentEndX - Math.cos(angle) * shortenDist;
        lineEndY = currentEndY - Math.sin(angle) * shortenDist;
    }
    
    // Draw Ground Shadow
    if (!isPreview) {
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = thickness;
        if (isDashed) {
            ctx.setLineDash([thickness * 2, thickness * 1.5]);
            ctx.lineDashOffset = -((Date.now() / 1000) * 40);
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = Math.max(4, thickness); // Drop shadow down giving height
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        if (currentLength > 0) { ctx.lineTo(lineEndX, lineEndY); ctx.stroke(); }
        if (hasHead) {
            const tipX = currentEndX;
            const tipY = currentEndY;
            const barb1x = tipX - headLength * Math.cos(angle - Math.PI / 6);
            const barb1y = tipY - headLength * Math.sin(angle - Math.PI / 6);
            const barb2x = tipX - headLength * Math.cos(angle + Math.PI / 6);
            const barb2y = tipY - headLength * Math.sin(angle + Math.PI / 6);
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(barb1x, barb1y);
            ctx.lineTo(tipX, tipY);
            ctx.lineTo(barb2x, barb2y);
            ctx.closePath();
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fill();
        }
        ctx.restore();
    }

    // Draw Main Body
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = getShimmerGradient(ctx, p1, {x: currentEndX, y: currentEndY}, color, isPreview);
    ctx.lineWidth = thickness;
    if (isDashed) {
        ctx.setLineDash([thickness * 2, thickness * 1.5]);
        ctx.lineDashOffset = -((Date.now() / 1000) * 40);
    }
    if (!isPreview) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    if (currentLength > 0) { ctx.lineTo(lineEndX, lineEndY); ctx.stroke(); }
    
    // Draw Inner Highlight to give cylindrical depth
    if (!isDashed && currentLength > 0 && thickness > 3) {
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = thickness * 0.3;
      ctx.beginPath();
      // small offset towards top-left to simulate light
      ctx.moveTo(p1.x - Math.sin(angle)*thickness*0.2, p1.y + Math.cos(angle)*thickness*0.2);
      ctx.lineTo(lineEndX - Math.sin(angle)*thickness*0.2, lineEndY + Math.cos(angle)*thickness*0.2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
    
    if (hasHead) {
        const tipX = currentEndX;
        const tipY = currentEndY;
        const barb1x = tipX - headLength * Math.cos(angle - Math.PI / 6);
        const barb1y = tipY - headLength * Math.sin(angle - Math.PI / 6);
        const barb2x = tipX - headLength * Math.cos(angle + Math.PI / 6);
        const barb2y = tipY - headLength * Math.sin(angle + Math.PI / 6);
        
        ctx.beginPath();
        ctx.moveTo(barb1x, barb1y);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(barb2x, barb2y);
        ctx.closePath();
        
        // Gradient for arrow head to give it a 3D bevel
        const grad = ctx.createLinearGradient(barb1x, barb1y, barb2x, barb2y);
        grad.addColorStop(0, adjustBrightness(color, 20));
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, shiftColor(color, -20));
        
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = adjustBrightness(color, 40); 
        ctx.lineWidth = Math.max(1, thickness * 0.2);
        ctx.stroke();
    }
    ctx.restore();
};

export const draw3DRing = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, tiltDegrees: number, strokeWidth: number, timestamp: number, isGhost: boolean = false) => {
  if (radius < 1) return;
  const now = Date.now();
  const timeElapsed = isGhost ? now : (now - timestamp);
  
  let scaleEnt = 1;
  let alphaEnt = 1;
  const entSpeed = 420;
  if (!isGhost && timeElapsed < entSpeed) {
      const p = timeElapsed / entSpeed;
      // bounce scale
      if (p < 0.58) {
          scaleEnt = 0.52 + (1.08 - 0.52) * (p / 0.58);
      } else {
          scaleEnt = 1.08 - (0.08) * ((p - 0.58) / 0.42);
      }
      alphaEnt = Math.min(1, p * 2);
  }

  const tiltRad = (tiltDegrees * Math.PI) / 180;
  const scaleY = Math.max(0.1, Math.cos(tiltRad)); 
  
  const innerRadius = radius * 0.56; 
  const depth = radius * 0.18;
  const baseStrokeWidth = strokeWidth * 1.5;

  const cColor = color;
  const cDeep = shiftColor(color, -24);
  const cDark = shiftColor(color, -48);
  const cLight = shiftColor(color, 30);
  const cHot = shiftColor(color, 58);

  const fadeHex = (hex: string, alpha: number) => {
     let r=parseInt(hex.slice(1,3), 16), g=parseInt(hex.slice(3,5), 16), b=parseInt(hex.slice(5,7), 16);
     return `rgba(${r},${g},${b},${alpha})`;
  };

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scaleEnt, scaleEnt * scaleY); 
  ctx.globalAlpha = alphaEnt * (isGhost ? 0.7 : 1.0);
  
  // 1. Ground Shadow (contact shadow)
  if (!isGhost) {
      ctx.save();
      ctx.beginPath();
      ctx.scale(1, 0.4); 
      const shadowDepth = depth * 2.5; 
      ctx.translate(0, shadowDepth / scaleY);
      const sGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.1);
      sGrad.addColorStop(0, 'rgba(0,0,0,0.6)');
      sGrad.addColorStop(0.44, 'rgba(0,0,0,0.25)');
      sGrad.addColorStop(0.72, 'transparent');
      ctx.fillStyle = sGrad;
      ctx.arc(0, 0, radius * 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
  }

  // 2. Inner Hole Wall (visible on top half: PI to 2PI)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, innerRadius, Math.PI, 0); 
  ctx.lineTo(innerRadius, depth);
  ctx.arc(0, depth, innerRadius, 0, Math.PI, true); 
  ctx.closePath();
  const innerGrad = ctx.createLinearGradient(-innerRadius, 0, innerRadius, 0);
  innerGrad.addColorStop(0, cColor);
  innerGrad.addColorStop(0.5, cDeep);
  innerGrad.addColorStop(1, cDark);
  ctx.fillStyle = innerGrad;
  ctx.fill();
  ctx.restore();

  // 3. Outer Body Wall (visible on bottom half: 0 to PI)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI); 
  ctx.lineTo(-radius, depth);
  ctx.arc(0, depth, radius, Math.PI, 0, true); 
  ctx.closePath();
  const outerGrad = ctx.createLinearGradient(-radius, 0, radius, 0);
  outerGrad.addColorStop(0, fadeHex(cLight, 0.7));
  outerGrad.addColorStop(0.2, cColor);
  outerGrad.addColorStop(0.5, cDeep);
  outerGrad.addColorStop(0.8, cDark);
  outerGrad.addColorStop(1, fadeHex(cDark, 0.78));
  ctx.fillStyle = outerGrad;
  ctx.fill();
  ctx.restore();

  // 4. Top Face - Annulus
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.arc(0, 0, innerRadius, Math.PI * 2, 0, true); 
  ctx.closePath();
  ctx.clip('evenodd');
  
  try {
      const spinOffset = (now % 2350) / 2350;
      const startAngle = (spinOffset * Math.PI * 2) - (22 * Math.PI / 180);
      
      const grad = ctx.createConicGradient(startAngle, 0, 0);
      grad.addColorStop(0, cHot);
      grad.addColorStop(22/360, cLight);
      grad.addColorStop(72/360, cColor);
      grad.addColorStop(128/360, cDeep);
      grad.addColorStop(184/360, cDark);
      grad.addColorStop(248/360, cColor);
      grad.addColorStop(304/360, cLight);
      grad.addColorStop(1, cHot);
      ctx.fillStyle = grad;
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  } catch(e) {
      ctx.fillStyle = color;
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  }

  // fill::before highlight rim (screen)
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = 'rgba(255,255,255,0.24)';
  ctx.lineWidth = Math.max(1, radius * 0.1);
  ctx.beginPath();
  ctx.arc(0, 0, radius - (radius * 0.05), 0, Math.PI*2);
  ctx.stroke();

  // Highlight dot (radial-gradient)
  const hw = radius * 0.34;
  const hy = -radius * 0.28;
  const hGrad = ctx.createRadialGradient(hw, hy, 0, hw, hy, radius * 0.6);
  hGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
  hGrad.addColorStop(0.17, 'rgba(255,255,255,0.2)');
  hGrad.addColorStop(0.31, 'transparent');
  ctx.fillStyle = hGrad;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);

  ctx.globalCompositeOperation = 'source-over';
  
  // Inner shadow (hole) 
  const holeGrad = ctx.createRadialGradient(0, 0, innerRadius - 8, 0, 0, innerRadius);
  holeGrad.addColorStop(0, 'transparent');
  holeGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = holeGrad;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  
  // Outer shadow (border inset)
  const outerSGrad = ctx.createRadialGradient(0, 0, radius - 15, 0, 0, radius);
  outerSGrad.addColorStop(0, 'transparent');
  outerSGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = outerSGrad;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore(); // remove clip

  // 5. Specular streaks
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const orbitTime = 1180;
  const orbitOffset = (now % orbitTime) / orbitTime;
  
  let specOpacity = 0;
  if (orbitOffset < 0.07) specOpacity = orbitOffset / 0.07;
  else if (orbitOffset < 0.58) specOpacity = 1 - 0.1 * ((orbitOffset - 0.07) / 0.51);
  else if (orbitOffset < 0.72) specOpacity = 0.9 - 0.9 * ((orbitOffset - 0.58) / 0.14);
  
  if (specOpacity > 0) {
      ctx.globalAlpha = specOpacity * alphaEnt;
      ctx.rotate(orbitOffset * Math.PI * 2);
      
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.arc(0, 0, innerRadius, Math.PI * 2, 0, true);
      ctx.clip('evenodd');
      
      try {
          const sGrad = ctx.createConicGradient(-14 * Math.PI / 180, 0, 0);
          sGrad.addColorStop(18/360, 'transparent');
          sGrad.addColorStop(24/360, 'rgba(255,255,255,0.05)');
          sGrad.addColorStop(32/360, 'rgba(255,255,255,0.92)');
          sGrad.addColorStop(40/360, 'rgba(255,255,255,0.72)');
          sGrad.addColorStop(55/360, 'transparent');
          ctx.fillStyle = sGrad;
          ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      } catch (e) {}

      // Bright dot at top
      ctx.beginPath();
      const dotG = ctx.createRadialGradient(0, -radius + 12, 0, 0, -radius + 12, 12);
      dotG.addColorStop(0, 'rgba(255,255,255,0.98)');
      dotG.addColorStop(0.52, 'rgba(255,255,255,0.4)');
      dotG.addColorStop(0.72, 'transparent');
      ctx.fillStyle = dotG;
      ctx.save();
      ctx.translate(0, -radius + 12);
      ctx.rotate(-10 * Math.PI / 180);
      ctx.scale(2, 0.7);
      ctx.arc(0, 0, 12, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
  }
  ctx.restore();

  // 6. Stroked borders (Clean Vector Outlines)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.moveTo(innerRadius, 0);
  ctx.arc(0, 0, innerRadius, Math.PI * 2, 0, true);
  
  if (!isGhost) {
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 6;
  }
  
  ctx.strokeStyle = fadeHex(cLight, 0.6);
  ctx.lineWidth = Math.max(1.5, baseStrokeWidth * 0.7);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, depth, radius, 0, Math.PI);
  ctx.strokeStyle = fadeHex(cDark, 0.8);
  ctx.lineWidth = Math.max(1, baseStrokeWidth * 0.5);
  ctx.stroke();

  ctx.restore();
  ctx.restore();
};

export const drawSpotlight = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, intensity: number, rotation: number, particles: Particle[], timestamp: number, isGhost: boolean = false) => {
    const now = Date.now();
    const alpha = isGhost ? 0.4 : 1.0;
    const beamWidth = size;
    const topY = 0;
    const bottomY = y;

    ctx.save();
    const wipeDuration = 600;
    const wipeProgress = isGhost ? 1 : (timestamp ? Math.min(1, Math.max(0, now - timestamp) / wipeDuration) : 1);
    if (wipeProgress < 1) {
        ctx.beginPath();
        const yMax = bottomY + size * 1.5;
        ctx.rect(-99999, -99999, 199998, 99999 + yMax * wipeProgress);
        ctx.clip();
    }

    ctx.save();
    const grad = ctx.createLinearGradient(x, topY, x, bottomY);
    grad.addColorStop(0, `rgba(255,255,255,0)`);
    grad.addColorStop(0.5, `rgba(255,255,255,${intensity * 0.25 * alpha})`);
    grad.addColorStop(1, `rgba(255,255,255,${0.05 * alpha})`);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(x - beamWidth / 4, topY); ctx.lineTo(x + beamWidth / 4, topY); ctx.lineTo(x + beamWidth / 2, bottomY); ctx.lineTo(x - beamWidth / 2, bottomY); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(x, bottomY);
    ctx.scale(1, rotation); 
    const ringRadius = beamWidth / 2;
    const ringGrad = ctx.createRadialGradient(0, 0, ringRadius * 0.3, 0, 0, ringRadius * 1.3);
    ringGrad.addColorStop(0, `rgba(255,255,255,${0.9 * alpha})`);
    ringGrad.addColorStop(0.6, `rgba(255,255,255,${0.3 * alpha})`);
    ringGrad.addColorStop(1, `rgba(255,255,255,0)`);
    ctx.fillStyle = ringGrad;
    ctx.beginPath(); ctx.arc(0, 0, ringRadius * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.2 * intensity * alpha})`; 
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, ringRadius, 0, Math.PI * 2); ctx.stroke();
    if (!isGhost) {
        const timeDelta = now - timestamp;
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const currentAngle = p.initialAngle + (timeDelta * p.speed);
            const px = Math.cos(currentAngle) * ringRadius;
            const py = Math.sin(currentAngle) * ringRadius; 
            const flicker = 0.5 + 0.5 * Math.sin(timeDelta * 0.005 + i);
            ctx.fillStyle = `rgba(255,255,255,${0.6 * flicker})`;
            ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
        }
    }
    ctx.restore();
    ctx.restore(); // Restore global wipe clip
};

export const drawTangentLine = (ctx: CanvasRenderingContext2D, p1: Point, p2: Point, r1: number, r2: number, color: string, strokeWidth: number, progress: number, pulseAge: number = 0, isGhost: boolean = false) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Prevent backwards extra line when points overlap
    if (dist <= (r1 + r2) * 0.8) return;
    const ux = dx / dist; const uy = dy / dist;
    const startX = p1.x + ux * (r1 * 0.8); const startY = p1.y + uy * (r1 * 0.8);
    const endX = p2.x - ux * (r2 * 0.8); const endY = p2.y - uy * (r2 * 0.8);
    
    ctx.save();
    const connThickness = Math.max(3, Math.min(r1 * 0.15, 8)); // Consistent thickness
    const depthApprox = r1 * 0.15;
    
    if (!isGhost) {
        // Ground Shadow
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY + depthApprox + (5 / Math.max(0.1, Math.cos(65 * Math.PI / 180)))); // Approximate scaled shadow drop
        ctx.lineTo(endX, endY + depthApprox + (5 / Math.max(0.1, Math.cos(65 * Math.PI / 180))));
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = connThickness;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;
        ctx.stroke();
        ctx.restore();
        
        // 3D Bevel Body (Bottom extrusion offset)
        ctx.beginPath();
        ctx.moveTo(startX, startY + depthApprox);
        ctx.lineTo(endX, endY + depthApprox);
        ctx.strokeStyle = adjustBrightness(color, -40);
        ctx.lineWidth = connThickness;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    // Outer glow highlight
    ctx.beginPath();
    ctx.shadowBlur = Math.max(5, connThickness * 1.5);
    ctx.shadowColor = color;
    ctx.strokeStyle = fadeColor(color, 0.4);
    ctx.lineWidth = connThickness * 1.5;
    ctx.lineCap = 'round';
    ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
    
    // Solid tube core
    ctx.beginPath();
    const grad = ctx.createLinearGradient(startX, startY, endX, endY);
    grad.addColorStop(0, color); 
    grad.addColorStop(0.5, shiftColor(color, -10)); 
    grad.addColorStop(1, color);
    ctx.strokeStyle = grad;
    ctx.lineWidth = connThickness; 
    ctx.lineCap = 'round';
    ctx.shadowBlur = 0;
    
    if (pulseAge > 0) {
        const pulse = Math.sin((pulseAge / 500)); 
        ctx.shadowBlur = 10 + 5 * pulse; 
        ctx.shadowColor = color; 
        ctx.globalAlpha = 0.8 + 0.2 * pulse; 
    }
    ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
    
    // Specular Reflection (Crisp center line)
    ctx.beginPath(); 
    ctx.strokeStyle = '#ffffff'; 
    ctx.lineWidth = Math.max(1.5, connThickness * 0.3); 
    ctx.globalAlpha = 0.9;
    ctx.lineCap = 'round';
    ctx.moveTo(startX, startY); 
    ctx.lineTo(endX, endY); 
    ctx.stroke();
    ctx.restore();
};

export const drawCurvedArrow = (ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string, width: number, isDashed: boolean, timestamp: number, renderMode: 'full' | 'shadow' | 'body' = 'full') => {
    const now = Date.now();
    const duration = 600;
    const progress = timestamp > 0 ? Math.min(1, (now - timestamp) / duration) : 1;
    const dx = p2.x - p1.x; const dy = p2.y - p1.y; const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 2) return;
    const mx = (p1.x + p2.x) / 2; const my = (p1.y + p2.y) / 2;
    const arcHeight = dist * 0.3; const cpx = mx; const cpy = my - arcHeight; 
    
    // Calculate shortened line end
    const angle = Math.atan2(p2.y - cpy, p2.x - cpx);
    const headSize = width * 4.5;
    const headLength = headSize * 0.9;
    const shortenDist = headLength * Math.cos(Math.PI / 6) * 0.85;
    const lineX = p2.x - Math.cos(angle) * shortenDist;
    const lineY = p2.y - Math.sin(angle) * shortenDist;
    
    // Draw Ground Shadow
    if (renderMode === 'full' || renderMode === 'shadow') {
        ctx.save();
        if (isDashed && progress < 1) {
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, dist * progress * 1.5, 0, Math.PI * 2);
            ctx.clip();
        }
        ctx.beginPath(); 
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; 
        ctx.lineWidth = width; 
        ctx.shadowBlur = Math.max(10, width * 1.5); 
        ctx.shadowOffsetY = width * 1.5; 
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; 
        ctx.lineCap = 'round';
        const arcLen = dist * 1.2;
        if (isDashed) {
            ctx.setLineDash([width * 2, width * 1.5]);
            ctx.lineDashOffset = -((Date.now() / 1000) * 40);
        }
        else { ctx.setLineDash([arcLen]); ctx.lineDashOffset = arcLen * (1 - progress); }
        ctx.moveTo(p1.x, p1.y); ctx.quadraticCurveTo(cpx, cpy, lineX, lineY); ctx.stroke();
        if (progress > 0.9) { 
            ctx.setLineDash([]); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = width * 1.5;
            drawArrowHead(ctx, p1, p2, width * 3); 
        }
        ctx.restore();
    }
    
    // Draw 3D Body
    if (renderMode === 'full' || renderMode === 'body') {
        ctx.save();
        if (isDashed && progress < 1) {
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, dist * progress * 1.5, 0, Math.PI * 2);
            ctx.clip();
        }
        ctx.strokeStyle = getShimmerGradient(ctx, p1, p2, color, timestamp === 0);
        ctx.lineWidth = width; ctx.lineCap = 'round';
        // Add glow
        if (timestamp === 0) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
        
        const arcLen = dist * 1.2;
        if (isDashed) {
            ctx.setLineDash([width * 2, width * 1.5]);
            ctx.lineDashOffset = -((Date.now() / 1000) * 40);
        }
        else { ctx.setLineDash([arcLen]); ctx.lineDashOffset = arcLen * (1 - progress); }
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.quadraticCurveTo(cpx, cpy, lineX, lineY); ctx.stroke();
        
        ctx.shadowBlur = 0;
        
        // Inner highlight
        if (!isDashed && progress > 0.1 && width > 3) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = width * 0.3;
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y - width * 0.2); ctx.quadraticCurveTo(cpx, cpy - width * 0.2, lineX, lineY - width * 0.2); ctx.stroke();
            ctx.restore();
        }

        if (progress > 0.8) {
            ctx.setLineDash([]);
            const tipX = p2.x; const tipY = p2.y;
            const barb1x = tipX - headSize * Math.cos(angle - Math.PI / 6);
            const barb1y = tipY - headSize * Math.sin(angle - Math.PI / 6);
            const barb2x = tipX - headSize * Math.cos(angle + Math.PI / 6);
            const barb2y = tipY - headSize * Math.sin(angle + Math.PI / 6);
            
            ctx.beginPath(); ctx.moveTo(barb1x, barb1y); ctx.lineTo(tipX, tipY); ctx.lineTo(barb2x, barb2y); ctx.closePath();
            
            // 3D Bevel Gradient for arrow head
            const grad = ctx.createLinearGradient(barb1x, barb1y, barb2x, barb2y);
            grad.addColorStop(0, adjustBrightness(color, 20));
            grad.addColorStop(0.5, color);
            grad.addColorStop(1, shiftColor(color, -20));
            ctx.fillStyle = grad; 
            ctx.fill();
            
            ctx.strokeStyle = adjustBrightness(color, 40); ctx.lineWidth = Math.max(1, width * 0.2); ctx.stroke();
        }
        ctx.restore();
    }
};

export const drawLens = (ctx: CanvasRenderingContext2D, center: Point, radius: number, zoom: number, video: HTMLVideoElement, scale: number, timestamp: number, isGhost: boolean = false) => {
    const radiusVideo = radius / scale;
    const sourceW = (radiusVideo * 2) / zoom;
    const sourceH = sourceW;
    const sourceX = center.x - sourceW / 2;
    const sourceY = center.y - sourceH / 2;
    
    const popDuration = 400; // 400ms for pop
    const age = timestamp ? Date.now() - timestamp : 99999;
    let animScale = 1;
    if (!isGhost && age < popDuration) {
        const t = Math.max(0, Math.min(1, age / popDuration));
        animScale = (1 - Math.pow(1 - t, 3)) + Math.sin(t * Math.PI) * 0.15;
    }
    if (animScale <= 0) return;

    ctx.save();
    if (isGhost) ctx.globalAlpha = 0.8;
    
    // Apply animation scale about the center
    ctx.translate(center.x, center.y);
    ctx.scale(animScale, animScale);
    ctx.translate(-center.x, -center.y);

    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20 / scale; ctx.shadowOffsetY = 10 / scale;
    ctx.beginPath(); ctx.arc(center.x, center.y, radiusVideo, 0, Math.PI * 2); ctx.clip();
    try { ctx.drawImage(video, sourceX, sourceY, sourceW, sourceH, center.x - radiusVideo, center.y - radiusVideo, radiusVideo * 2, radiusVideo * 2); } catch(e) { ctx.fillStyle = '#000'; ctx.fill(); }
    const grad = ctx.createRadialGradient(center.x - radiusVideo*0.3, center.y - radiusVideo*0.3, radiusVideo*0.2, center.x, center.y, radiusVideo);
    grad.addColorStop(0, 'rgba(255,255,255,0.15)'); grad.addColorStop(1, 'rgba(255,255,255,0.02)');
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); ctx.arc(center.x, center.y, radiusVideo, 0, Math.PI * 2);
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4 / scale; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1 / scale; ctx.stroke();
    ctx.restore();
    
    if (isGhost) {
        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.scale(animScale, animScale);
        ctx.translate(-center.x, -center.y);
        drawLabel(ctx, { x: center.x, y: center.y + radiusVideo }, `${zoom}x`, scale);
        ctx.restore();
    }
};

export const drawNameTag = (ctx: CanvasRenderingContext2D, point: Point, text: string, color: string, scale: number, timestamp: number, fontSize: number = 14, isGhost: boolean = false) => {
    ctx.save();
    const now = Date.now();
    const age = timestamp ? now - timestamp : 99999;
    
    // Animation
    const animDuration = 400;
    let animProgress = isGhost ? 1 : Math.min(1, Math.max(0, age) / animDuration);
    
    // Smooth ease out back
    const easeOutBack = (x: number): number => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    };
    const scaleAnim = easeOutBack(animProgress);
    
    if (scaleAnim <= 0 && !isGhost) {
        ctx.restore();
        return;
    }
    
    ctx.translate(point.x, point.y);
    ctx.scale(scaleAnim, scaleAnim);
    
    ctx.font = `bold ${fontSize / scale}px sans-serif`;
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const paddingX = fontSize / scale;
    const paddingY = (fontSize * 0.4) / scale;
    const boxHeight = (fontSize / scale) + paddingY * 2;
    const boxWidth = textWidth + paddingX * 2;
    
    const triangleHeight = boxHeight * 0.4;
    const triangleWidth = boxHeight * 0.6;
    
    const boxX = -boxWidth / 2;
    const boxY = -triangleHeight - boxHeight;
    
    // Draw 3D Triangle pointing down
    ctx.beginPath();
    ctx.moveTo(0, 0); // Bottom point
    ctx.lineTo(-triangleWidth/2, -triangleHeight); // Top left
    ctx.lineTo(triangleWidth/2, -triangleHeight); // Top right
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    
    // Shadow side of the triangle for 3D effect
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(triangleWidth/2, -triangleHeight);
    ctx.lineTo(0, -triangleHeight);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6 / scale);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 10 / scale;
    ctx.shadowOffsetY = 4 / scale;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fill();
    
    // Highlight strip
    ctx.shadowColor = 'transparent';
    ctx.clip();
    ctx.fillStyle = color;
    const stripWidth = (fontSize * 0.35) / scale;
    ctx.fillRect(boxX, boxY, stripWidth, boxHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, 0, boxY + boxHeight / 2 + 1/scale);
    ctx.restore();
    
    ctx.restore();
};

