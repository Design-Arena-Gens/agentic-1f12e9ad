/* eslint-disable @next/next/no-img-element */
'use client';
import { useCallback, useRef, useState } from 'react';

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export default function FileDrop({ onImage }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    async (files) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.type.startsWith('image/')) return;
      const img = await loadImageFromFile(file);
      onImage?.(img);
    },
    [onImage]
  );

  return (
    <div
      className="drop"
      style={{
        borderRadius: 12,
        border: dragOver
          ? '2px dashed rgba(124,140,255,0.8)'
          : '2px dashed rgba(255,255,255,0.14)',
        padding: 16,
        minHeight: 120,
        display: 'grid',
        placeItems: 'center',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Drop image here</div>
        <div className="hint">or click to choose a file</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

