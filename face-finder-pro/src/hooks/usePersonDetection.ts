import { useRef, useState, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as faceapi from '@vladmandic/face-api';

const FACE_MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

export type DetectionLevel = 'safe' | 'medium' | 'danger';

export interface MergedDetection {
  id: number;
  type: 'person' | 'face' | 'both';
  personBox?: { x: number; y: number; w: number; h: number; score: number };
  faceBox?: { x: number; y: number; w: number; h: number; score: number };
}

export interface DetectionResult {
  count: number;
  level: DetectionLevel;
  detections: MergedDetection[];
}

export interface LogEntry {
  time: string;
  message: string;
  level: DetectionLevel | 'info';
}

export interface SessionStats {
  safe: number;
  medium: number;
  danger: number;
  peak: number;
}

export function getLevel(n: number): DetectionLevel {
  if (n <= 4) return 'safe';
  if (n <= 7) return 'medium';
  return 'danger';
}

// Helper to check if face box is inside person box or has high IoU
function calculateOverlap(
  faceBox: { x: number; y: number; w: number; h: number },
  bodyBox: { x: number; y: number; w: number; h: number }
) {
  const xLeft = Math.max(faceBox.x, bodyBox.x);
  const yTop = Math.max(faceBox.y, bodyBox.y);
  const xRight = Math.min(faceBox.x + faceBox.w, bodyBox.x + bodyBox.w);
  const yBottom = Math.min(faceBox.y + faceBox.h, bodyBox.y + bodyBox.h);

  if (xRight < xLeft || yBottom < yTop) return 0;

  const intersectionArea = (xRight - xLeft) * (yBottom - yTop);
  const faceArea = faceBox.w * faceBox.h;
  return intersectionArea / faceArea;
}

// Global Singletons to share the exact same AI model across all 4 cameras simultaneously without Out-of-Memory crashes
let globalCocoModel: cocoSsd.ObjectDetection | null = null;
let globalModelPromise: Promise<void> | null = null;
let globalModelError: string | null = null;

interface UsePersonDetectionProps {
  type: 'local' | 'ip';
  url?: string;
}

export function usePersonDetection({ type, url }: UsePersonDetectionProps) {
  const [modelLoaded, setModelLoaded] = useState(globalCocoModel !== null);
  const [modelError, setModelError] = useState<string | null>(globalModelError);
  const [running, setRunning] = useState(false);
  const [personCount, setPersonCount] = useState(0);
  const [level, setLevel] = useState<DetectionLevel>('safe');
  const [fps, setFps] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<SessionStats>({ safe: 0, medium: 0, danger: 0, peak: 0 });

  const mediaRef = useRef<HTMLVideoElement | HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(false);
  const detectingRef = useRef(false);
  const fpsFramesRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const lastDetectTimeRef = useRef(0);

  const addLog = useCallback((message: string, logLevel: DetectionLevel | 'info' = 'info') => {
    const time = new Date().toTimeString().slice(0, 8);
    setLogs((prev) => [{ time, message, level: logLevel }, ...prev].slice(0, 60));
  }, []);

  const loadModels = useCallback(async () => {
    try {
      if (!globalModelPromise) {
        globalModelPromise = (async () => {
          await tf.ready();
          const cocoPromise = cocoSsd.load({ base: 'mobilenet_v2' });
          const facePromise = faceapi.nets.ssdMobilenetv1.loadFromUri(FACE_MODEL_URL);
          const [cocoModel] = await Promise.all([cocoPromise, facePromise]);
          globalCocoModel = cocoModel;
        })();
      }
      
      await globalModelPromise;
      setModelLoaded(true);
      if (!globalCocoModel) throw new Error("Models did not load correctly");
      // Don't duplicate logs for every grid, just log setup silently
    } catch (e: any) {
      globalModelError = e.message;
      setModelError(globalModelError);
      addLog('Model load failed: ' + e.message, 'danger');
    }
  }, [addLog]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const detectLoop = useCallback(async () => {
    if (!runningRef.current) return;

    const media = mediaRef.current;
    const canvas = canvasRef.current;
    
    if (!media || !canvas || !globalCocoModel) {
      animFrameRef.current = requestAnimationFrame(detectLoop);
      return;
    }
    
    // Check readiness for video or image
    let mediaWidth = 0;
    let mediaHeight = 0;
    
    if (media instanceof HTMLVideoElement) {
       if (media.readyState < 2) {
         animFrameRef.current = requestAnimationFrame(detectLoop);
         return;
       }
       mediaWidth = media.videoWidth;
       mediaHeight = media.videoHeight;
    } else if (media instanceof HTMLImageElement) {
       if (!media.complete || media.naturalWidth === 0) {
         animFrameRef.current = requestAnimationFrame(detectLoop);
         return;
       }
       mediaWidth = media.naturalWidth;
       mediaHeight = media.naturalHeight;
    }

    fpsFramesRef.current++;
    const now = performance.now();
    if (now - lastFpsTimeRef.current >= 1000) {
      setFps(fpsFramesRef.current);
      fpsFramesRef.current = 0;
      lastFpsTimeRef.current = now;
    }

    // Dynamic throttle: IP streams can have higher latency naturally, reducing this threshold from 300ms to 120ms improves frame smoothness
    const throttleTime = type === 'local' ? 100 : 150; 
    
    if (!detectingRef.current && now - lastDetectTimeRef.current > throttleTime) {
      detectingRef.current = true;
      lastDetectTimeRef.current = now;
      frameCountRef.current++;
      setFrameCount(frameCountRef.current);

      try {
        // Important: Update canvas resolution if video/img resolution changes
        if (canvas.width !== mediaWidth || canvas.height !== mediaHeight) {
           canvas.width = mediaWidth;
           canvas.height = mediaHeight;
        }

        const scaleX = canvas.width / (mediaWidth || canvas.width);
        const scaleY = canvas.height / (mediaHeight || canvas.height);

        // Run both models concurrently
        const [cocoResults, faceResults] = await Promise.all([
          globalCocoModel.detect(media),
          faceapi.detectAllFaces(media, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 })),
        ]);

        const bodyDetections = cocoResults
          .filter((d) => d.class === 'person' && d.score > 0.45)
          .map((d) => ({
            x: d.bbox[0] * scaleX,
            y: d.bbox[1] * scaleY,
            w: d.bbox[2] * scaleX,
            h: d.bbox[3] * scaleY,
            score: d.score,
          }));

        const faceDetections = faceResults.map((f) => {
          const b = f.box;
          return {
            x: b.x * scaleX,
            y: b.y * scaleY,
            w: b.width * scaleX,
            h: b.height * scaleY,
            score: f.score,
          };
        });

        const merged: MergedDetection[] = [];
        let idCounter = 1;
        const usedFaces = new Set<number>();

        bodyDetections.forEach((body) => {
          let matchedFaceIdx = -1;
          let highestOverlap = 0;

          faceDetections.forEach((face, fIdx) => {
            if (usedFaces.has(fIdx)) return;
            const overlap = calculateOverlap(face, body);
            if (overlap > 0.25 && overlap > highestOverlap) {
              highestOverlap = overlap;
              matchedFaceIdx = fIdx;
            }
          });

          if (matchedFaceIdx !== -1) {
            merged.push({ id: idCounter++, type: 'both', personBox: body, faceBox: faceDetections[matchedFaceIdx] });
            usedFaces.add(matchedFaceIdx);
          } else {
            merged.push({ id: idCounter++, type: 'person', personBox: body });
          }
        });

        faceDetections.forEach((face, fIdx) => {
          if (!usedFaces.has(fIdx)) {
            merged.push({ id: idCounter++, type: 'face', faceBox: face });
          }
        });

        const count = merged.length;
        const currentLevel = getLevel(count);

        setPersonCount(count);
        setLevel(currentLevel);

        setStats((prev) => {
          const updated = { ...prev };
          updated[currentLevel]++;
          if (count > updated.peak) updated.peak = count;
          return updated;
        });

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (merged.length > 0) {
            const color = currentLevel === 'safe' ? '#00e5a0' : currentLevel === 'medium' ? '#f5a623' : '#ff2d55';

            merged.forEach((item) => {
              if (item.personBox) {
                const { x, y, w, h, score } = item.personBox;
                ctx.fillStyle = color + '10';
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(x, y, w, h);

                const label = 'BODY ' + Math.round(score * 100) + '%';
                ctx.font = '10px "Share Tech Mono", monospace';
                ctx.fillStyle = color;
                ctx.fillText(label, x + 4, y + 12);
              }

              if (item.faceBox) {
                const { x, y, w, h, score } = item.faceBox;
                ctx.strokeStyle = '#00f0ff';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, w, h);

                const label = 'FACE ' + Math.round(score * 100) + '%';
                ctx.font = '10px "Share Tech Mono", monospace';
                ctx.fillStyle = '#00f0ff';
                ctx.fillText(label, x + 4, y + 12);
              }

              const primaryNode = item.personBox || item.faceBox;
              if (primaryNode) {
                const { x, y, w, h } = primaryNode;
                const cs = Math.min(16, w * 0.2);
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x, y + cs); ctx.lineTo(x, y); ctx.lineTo(x + cs, y);
                ctx.moveTo(x + w - cs, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cs);
                ctx.moveTo(x, y + h - cs); ctx.lineTo(x, y + h); ctx.lineTo(x + cs, y + h);
                ctx.moveTo(x + w - cs, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cs);
                ctx.stroke();

                const label = 'PERSON ' + item.id;
                ctx.font = 'bold 11px "Share Tech Mono", monospace';
                const tw = ctx.measureText(label).width + 12;
                ctx.fillStyle = color;
                ctx.fillRect(x, y - 20, tw, 20);
                ctx.fillStyle = '#000';
                ctx.fillText(label, x + 6, y - 5);
              }
            });
          }
        }

        if (frameCountRef.current % 5 === 0) {
          addLog(count + ' individual(s) → ' + currentLevel.toUpperCase(), currentLevel);
        }
      } catch (e: any) {
        // Just silent retry natively on error instead of spamming UI if MJPEG stutters
        console.error("Detect Error:", e);
      }
      detectingRef.current = false;
    }

    animFrameRef.current = requestAnimationFrame(detectLoop);
  }, [addLog]);

  const start = useCallback(async () => {
    try {
      if (type === 'local') {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        });
        streamRef.current = stream;
        const video = mediaRef.current;
        if (video instanceof HTMLVideoElement) {
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            const canvas = canvasRef.current;
            if (canvas) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }
            video.play();
            addLog('Webcam started — Dual Engine active.', 'info');
          };
        }
      } else {
        // MJPEG IP string handling
        const img = mediaRef.current;
        if (img instanceof HTMLImageElement && url) {
           img.crossOrigin = "anonymous";
           img.src = url;
           addLog(`IP Camera started: ${url}`, 'info');
        }
      }

      runningRef.current = true;
      setRunning(true);
      frameCountRef.current = 0;
      animFrameRef.current = requestAnimationFrame(detectLoop);
    } catch (err: any) {
      addLog('Camera denied/failed: ' + err.message, 'danger');
    }
  }, [addLog, detectLoop, type, url]);

  const stop = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    
    const media = mediaRef.current;
    if (media instanceof HTMLVideoElement) {
       media.srcObject = null;
    } else if (media instanceof HTMLImageElement) {
       media.src = ''; 
    }
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setPersonCount(0);
    setLevel('safe');
    addLog('Monitoring stopped.', 'info');
  }, [addLog]);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return {
    mediaRef,
    canvasRef,
    modelLoaded,
    modelError,
    running,
    personCount,
    level,
    fps,
    frameCount,
    logs,
    stats,
    start,
    stop,
  };
}
