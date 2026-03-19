import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { socket } from '../socket';

const DrawingBoard = forwardRef(({ roomId, role, color, size, gameState }, ref) => {
  useImperativeHandle(ref, () => ({
    getImage: () => canvasRef.current?.toDataURL('image/png', 1.0)
  }));
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use ResizeObserver or just effect for initial size
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth * 2; // high DPI support
      canvas.height = parent.clientHeight * 2;
      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = `${parent.clientHeight}px`;

      const context = canvas.getContext('2d');
      context.scale(2, 2);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      contextRef.current = context;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Syncing Lines via Socket
  useEffect(() => {
    socket.on('receive_line', (line) => {
      if (!contextRef.current) return;
      const { x0, y0, x1, y1, color: strokeColor, size: strokeSize } = line;
      
      const ctx = contextRef.current;
      
      // Get logical coordinate scale
      // The incoming coordinates are 0-1 relative to the canvas width/height
      const canvas = canvasRef.current;
      const logicalW = canvas.width / 2;
      const logicalH = canvas.height / 2;

      ctx.beginPath();
      ctx.moveTo(x0 * logicalW, y0 * logicalH);
      ctx.lineTo(x1 * logicalW, y1 * logicalH);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeSize;
      ctx.stroke();
      ctx.closePath();
    });

    return () => {
      socket.off('receive_line');
    };
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Support for both touch and mouse
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const isPointInAllowedArea = (y, totalHeight) => {
    // Top role can only draw in 0 to 55%
    // Bottom role can only draw in 45% to 100%
    const ratio = y / totalHeight;
    if (role === 'top') return ratio <= 0.55;
    if (role === 'bottom') return ratio >= 0.45;
    return true; // Just in case
  };

  const startDrawing = (e) => {
    if (gameState !== 'drawing') return;
    
    // Prevent scrolling when drawing on touch devices
    if(e.type === 'touchstart') e.preventDefault();

    const coords = getCoordinates(e.nativeEvent);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    if (!isPointInAllowedArea(coords.y, rect.height)) return;

    setIsDrawing(true);
    setLastPos(coords);
  };

  const draw = (e) => {
    if (!isDrawing || gameState !== 'drawing') return;
    
    if(e.type === 'touchmove') e.preventDefault();

    const coords = getCoordinates(e.nativeEvent);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    if (!isPointInAllowedArea(coords.y, rect.height)) {
      // If they crossed into the forbidden zone, stop drawing.
      setIsDrawing(false);
      return;
    }

    const ctx = contextRef.current;
    
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.stroke();
    ctx.closePath();

    // Emit line to server using normalized coordinates (0 to 1)
    const normalizedLine = {
      x0: lastPos.x / rect.width,
      y0: lastPos.y / rect.height,
      x1: coords.x / rect.width,
      y1: coords.y / rect.height,
      color,
      size
    };
    
    socket.emit('draw_line', { code: roomId, line: normalizedLine });

    setLastPos(coords);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Construct Background Overlay for the "Bridge" feature
  const getOverlayStyle = () => {
    if (gameState === 'reveal') {
      return { opacity: 0, visibility: 'hidden', transition: 'opacity 1.5s ease, visibility 1.5s ease' };
    }

    if (role === 'top') {
      return {
        background: 'linear-gradient(to bottom, transparent 0%, transparent 45%, var(--bridge-color) 45%, var(--bridge-color) 55%, var(--bg-primary) 55%, var(--bg-primary) 100%)',
        borderBottom: '2px dashed var(--accent-primary)'
      };
    } else if (role === 'bottom') {
      return {
        background: 'linear-gradient(to bottom, var(--bg-primary) 0%, var(--bg-primary) 45%, var(--bridge-color) 45%, var(--bridge-color) 55%, transparent 55%, transparent 100%)',
        borderTop: '2px dashed var(--accent-primary)'
      };
    }

    return {};
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerOut={stopDrawing}
        onPointerCancel={stopDrawing}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          touchAction: 'none' // critical for mobile browsers to prevent pull-to-refresh
        }}
      />
      {/* Obscuring Overlay */}
      <div 
        style={{
          ...getOverlayStyle(),
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 5
        }}
      />
    </div>
  );
});

export default DrawingBoard;
