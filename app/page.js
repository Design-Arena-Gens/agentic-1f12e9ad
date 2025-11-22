/* eslint-disable @next/next/no-img-element */
'use client';
import { useRef, useState } from 'react';
import RavenTransitionCanvas from '../components/RavenTransitionCanvas';
import FileDrop from '../components/FileDrop';

export default function Page() {
  const [imageA, setImageA] = useState(null);
  const [imageB, setImageB] = useState(null);
  const [durationMs, setDurationMs] = useState(2500);
  const canvasRef = useRef(null);

  return (
    <main className="container">
      <h1>Raven Transition</h1>
      <p className="sub">
        Upload two images and render a raven-style masked transition between them. Optionally record to WebM.
      </p>

      <div className="uploader">
        <div className="drop-col">
          <h3>Image A (from)</h3>
          <FileDrop onImage={(img) => setImageA(img)} />
          {imageA && <img className="preview" src={imageA.src} alt="Image A" />}
        </div>
        <div className="drop-col">
          <h3>Image B (to)</h3>
          <FileDrop onImage={(img) => setImageB(img)} />
          {imageB && <img className="preview" src={imageB.src} alt="Image B" />}
        </div>
      </div>

      <div className="controls">
        <label>
          Duration: <strong>{(durationMs / 1000).toFixed(2)}s</strong>
          <input
            type="range"
            min={800}
            max={6000}
            step={50}
            value={durationMs}
            onChange={(e) => setDurationMs(parseInt(e.target.value, 10))}
          />
        </label>
      </div>

      <RavenTransitionCanvas
        ref={canvasRef}
        imageA={imageA}
        imageB={imageB}
        durationMs={durationMs}
      />
    </main>
  );
}

