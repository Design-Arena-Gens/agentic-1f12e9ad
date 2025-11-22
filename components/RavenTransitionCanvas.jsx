/* eslint-disable no-param-reassign */
'use client';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { RAVEN_SVG_PATH } from '../lib/ravenPath';

function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function createRavens(count, width, height) {
  const ravens = [];
  for (let i = 0; i < count; i++) {
    const yBand = Math.random();
    const size = 0.35 + Math.random() * 0.9; // relative scale
    const speed = 0.6 + Math.random() * 0.9;
    const rot = (Math.random() - 0.5) * 0.6;
    const wobble = Math.random() * 2 * Math.PI;
    const delay = Math.random() * 0.25; // spread of start times
    ravens.push({
      // start slightly left
      startX: -0.2 * width - Math.random() * 0.25 * width,
      endX: width * (0.9 + Math.random() * 0.5),
      y: clamp(height * (0.1 + 0.8 * yBand), 0.1 * height, 0.9 * height),
      size,
      speed,
      rot,
      wobble,
      delay,
    });
  }
  return ravens.sort((a, b) => a.size - b.size); // small ones behind
}

function drawRavenPath(ctx, path2d, x, y, scale, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.translate(-256, -256); // center around 512 viewbox half
  ctx.fill(path2d);
  ctx.restore();
}

function drawCoverContained(ctx, img, width, height) {
  const imgRatio = img.width / img.height;
  const canvasRatio = width / height;
  let dw = width;
  let dh = height;
  if (imgRatio > canvasRatio) {
    // image is wider, height matches
    dh = height;
    dw = dh * imgRatio;
  } else {
    // image is taller, width matches
    dw = width;
    dh = dw / imgRatio;
  }
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

const RavenTransitionCanvas = forwardRef(function RavenTransitionCanvas(
  { imageA, imageB, durationMs = 2500, width = 1280, height = 720 },
  ref
){
  const canvasRef = useRef(null);
  const maskRef = useRef(null);
  const maskedBRef = useRef(null);
  const animRef = useRef(null);
  const startRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const chunksRef = useRef([]);
  const recorderRef = useRef(null);

  const ravenPath = useMemo(() => new Path2D(RAVEN_SVG_PATH), []);
  const [ravens, setRavens] = useState(() => createRavens(180, width, height));

  useEffect(() => {
    setRavens(createRavens(180, width, height));
  }, [width, height, durationMs, imageA, imageB]);

  useImperativeHandle(ref, () => ({
    play: () => startAnimation(),
    stop: () => stopAnimation(),
    startRecording: () => startRecording(),
    stopRecording: () => stopRecording(),
  }));

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return undefined;
    cvs.width = width;
    cvs.height = height;
    if (!maskRef.current) {
      maskRef.current = document.createElement('canvas');
      maskedBRef.current = document.createElement('canvas');
      maskRef.current.width = width;
      maskRef.current.height = height;
      maskedBRef.current.width = width;
      maskedBRef.current.height = height;
    } else {
      maskRef.current.width = width;
      maskRef.current.height = height;
      maskedBRef.current.width = width;
      maskedBRef.current.height = height;
    }
    // draw initial frame
    renderFrame(0);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startAnimation() {
    if (!imageA || !imageB) return;
    if (isPlaying) return;
    setIsPlaying(true);
    startRef.current = performance.now();
    animRef.current = requestAnimationFrame(tick);
  }
  function stopAnimation() {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setIsPlaying(false);
    animRef.current = null;
    renderFrame(0);
  }

  function tick(now) {
    const elapsed = now - startRef.current;
    const t = clamp(elapsed / durationMs, 0, 1);
    renderFrame(t);
    if (t < 1) {
      animRef.current = requestAnimationFrame(tick);
    } else {
      setIsPlaying(false);
      if (recording) stopRecording();
    }
  }

  function renderFrame(tNorm) {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const w = cvs.width;
    const h = cvs.height;
    ctx.clearRect(0, 0, w, h);
    // base: image A
    if (imageA) drawCoverContained(ctx, imageA, w, h);
    // build mask of ravens
    const mask = maskRef.current.getContext('2d');
    mask.clearRect(0, 0, w, h);
    mask.fillStyle = 'white';
    mask.globalAlpha = 1;
    // optional soft edges
    mask.filter = 'blur(0.8px)';

    const eased = easeInOutCubic(tNorm);
    for (let i = 0; i < ravens.length; i++) {
      const b = ravens[i];
      const localT = clamp((eased - b.delay) / (1 - b.delay), 0, 1);
      const x = b.startX + (b.endX - b.startX) * localT * b.speed;
      const y = b.y + Math.sin(localT * Math.PI * 2 + b.wobble) * (8 + 18 * (1 - b.size));
      const s = (0.25 + 0.25 * b.size) * (0.5 + 0.5 * (0.7 + 0.3 * localT));
      const r = b.rot + Math.sin(localT * Math.PI * 3 + b.wobble) * 0.12;
      drawRavenPath(mask, ravenPath, x, y, s, r);
    }
    mask.filter = 'none';

    // compose: masked image B
    if (imageB) {
      const maskedB = maskedBRef.current.getContext('2d');
      maskedB.clearRect(0, 0, w, h);
      drawCoverContained(maskedB, imageB, w, h);
      maskedB.globalCompositeOperation = 'destination-in';
      maskedB.drawImage(maskRef.current, 0, 0);
      maskedB.globalCompositeOperation = 'source-over';
      ctx.drawImage(maskedBRef.current, 0, 0);
    }
    // optional overall fade of image A towards end to avoid halos
    if (imageA && tNorm > 0.85) {
      const fade = clamp((tNorm - 0.85) / 0.15, 0, 1);
      ctx.globalAlpha = fade * 0.9;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  function startRecording() {
    if (!canvasRef.current || recording) return;
    const stream = canvasRef.current.captureStream(60);
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'raven-transition.webm';
      a.click();
      URL.revokeObjectURL(url);
    };
    rec.start();
    recorderRef.current = rec;
    setRecording(true);
    // auto-play when recording
    if (!isPlaying) startAnimation();
  }

  function stopRecording() {
    if (!recording) return;
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <section className="canvas-card">
      <div className="canvas-wrap">
        <canvas ref={canvasRef} />
      </div>
      <div className="btn-row">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn primary"
            onClick={() => startAnimation()}
            disabled={!imageA || !imageB || isPlaying}
            title="Play transition"
          >
            Play Raven Transition
          </button>
          <button className="btn" onClick={() => stopAnimation()} disabled={!isPlaying}>
            Stop
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn"
            onClick={() => (recording ? stopRecording() : startRecording())}
            disabled={!imageA || !imageB}
            title="Record to WebM"
          >
            {recording ? 'Stop Recording' : 'Record WebM'}
          </button>
        </div>
      </div>
      <div className="hint" style={{ marginTop: 6 }}>
        Tip: Use large images for best results. Recording saves a WebM file from the canvas.
      </div>
    </section>
  );
});

export default RavenTransitionCanvas;

