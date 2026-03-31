// FieldSignaturePad — touch-to-sign canvas with theme-aware stroke color
// Extracted from ForemanView.jsx. Zero hex literals.
// Stroke color read from CSS var(--text) at draw time (not mount) for mid-session theme switching.
// Canvas background via .field-signature-canvas class (var(--bg2) from styles.js).

import { useState, useEffect, useRef } from 'react';
import { FieldButton } from './FieldButton';

export function FieldSignaturePad({ onSave, onClear, label, t }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    // Read stroke color at draw time — captures current theme even after mid-session theme switch
    const strokeColor = getComputedStyle(canvasRef.current).getPropertyValue('--text').trim();
    ctx.strokeStyle = strokeColor || '#000'; // '#000' is a safety fallback, NOT a design color
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasStrokes(true);
  };

  const endDraw = (e) => {
    if (e) e.preventDefault();
    setDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
    if (onClear) onClear();
  };

  const handleSave = () => {
    if (!hasStrokes) return null;
    return canvasRef.current.toDataURL('image/png');
  };

  // Expose save via ref-like callback
  useEffect(() => {
    if (onSave) onSave({ getSig: handleSave, clear: handleClear });
  }, [hasStrokes]);

  return (
    <div>
      {label && <div className="form-label">{label}</div>}
      <canvas
        ref={canvasRef}
        className="field-signature-canvas"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <div className="field-signature-actions">
        <FieldButton variant="ghost" onClick={handleClear} t={t}>
          {t ? t('Clear') : 'Clear'}
        </FieldButton>
      </div>
    </div>
  );
}
