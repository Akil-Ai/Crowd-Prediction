import { usePersonDetection } from '@/hooks/usePersonDetection';
import { useEffect, useState, useRef } from 'react';

interface CameraSlotProps {
  id: string;
  name: string;
  type: 'local' | 'ip';
  url?: string;
  onUpdate?: (id: string, count: number, level: string) => void;
}

export default function CameraSlot({ id, name, type, url, onUpdate }: CameraSlotProps) {
  const [inputUrl, setInputUrl] = useState(url || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const {
    mediaRef, canvasRef, modelLoaded, modelError, running,
    personCount, level, fps, frameCount, start, stop,
  } = usePersonDetection({ type, url: inputUrl });

  // Bubble up stats to main dashboard
  useEffect(() => {
    if (onUpdate) {
       onUpdate(id, personCount, level);
    }
  }, [id, personCount, level, onUpdate]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className={`flex flex-col h-full bg-panel border rounded-lg overflow-hidden transition-all duration-400 ${
        level === 'safe' ? (running ? 'border-safe/50 shadow-[0_0_15px_hsla(var(--safe)/0.1)]' : 'border-panel-border') :
        level === 'medium' ? 'border-medium/80 shadow-[0_0_15px_hsla(var(--medium)/0.15)]' :
        'border-danger shadow-[0_0_20px_hsla(var(--danger)/0.25)] danger-pulse'
      }`}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-panel-border bg-cyan/[0.02] shrink-0">
        <span className="font-mono text-[9px] tracking-[2px] text-cyan uppercase font-bold">{name}</span>
        <div className="flex items-center gap-2">
          {running && (
             <div className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-black/50 border border-panel-border text-cyan">
               COUNT: <span className={level === 'safe' ? 'text-safe' : level === 'medium' ? 'text-medium' : 'text-danger'}>{personCount}</span>
             </div>
          )}
          <span className={`font-mono text-[8px] border rounded-sm px-1.5 py-0.5 uppercase tracking-widest ${
             modelError ? 'text-danger border-danger/50' : !modelLoaded ? 'text-muted-foreground border-panel-border' : running ? 'text-cyan border-cyan/50' : 'text-safe border-safe/50'
          }`}>
            {modelError ? 'ERROR' : !modelLoaded ? 'LOADING' : running ? 'LIVE' : 'READY'}
          </span>
        </div>
      </div>

      {/* Media Viewport */}
      <div ref={containerRef} className="relative bg-black flex-1 min-h-[150px] overflow-hidden group">
        
        {/* Fullscreen Status Overlay */}
        {isFullscreen && running && (
          <div className={`absolute bottom-6 right-6 z-30 px-6 py-4 rounded-xl border bg-black/80 backdrop-blur-md transition-colors ${
             level === 'safe' ? 'border-safe/50 text-safe shadow-[0_0_30px_hsla(var(--safe)/0.15)]' :
             level === 'medium' ? 'border-medium/80 text-medium shadow-[0_0_30px_hsla(var(--medium)/0.25)]' :
             'border-danger text-danger shadow-[0_0_40px_hsla(var(--danger)/0.4)] danger-pulse'
          }`}>
             <div className="font-mono text-[12px] tracking-[3px] uppercase mb-2 text-white/50">{name}</div>
             <div className="flex items-end gap-5">
               <div className="font-mono text-6xl leading-none">{personCount}</div>
               <div className="flex flex-col pb-1">
                 <div className="font-ui text-[10px] tracking-[3px] text-white/40 uppercase mb-0.5">Individuals</div>
                 <div className="font-ui text-2xl font-bold tracking-[4px] uppercase">{level === 'safe' ? 'SAFE' : level === 'medium' ? 'MEDIUM' : 'DANGER'}</div>
               </div>
             </div>
          </div>
        )}
        
        {/* Fullscreen Button */}
        {modelLoaded && (
          <button 
            onClick={toggleFullScreen}
            className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-black/90 text-cyan border border-cyan/40 rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Toggle Fullscreen"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </svg>
          </button>
        )}

        {/* Loading overlay */}
        {!modelLoaded && !modelError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/90">
            <div className="w-[30px] h-[30px] border-2 border-panel-border border-t-cyan rounded-full load-spin" />
          </div>
        )}

        {modelError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/90">
            <div className="font-mono text-[9px] tracking-[1px] text-danger">MODEL/CAMERA FAILED</div>
          </div>
        )}

        {modelLoaded && !running && (
          <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-3 text-muted-foreground font-mono text-[9px] tracking-[1px] bg-black/80 px-4">
             {type === 'ip' && (
               <div className="w-full max-w-[250px] space-y-1.5 mb-2">
                 <label className="text-[10px] tracking-widest text-cyan uppercase text-center block">Enter MJPEG Stream URL:</label>
                 <input 
                   type="text" 
                   value={inputUrl} 
                   onChange={(e) => setInputUrl(e.target.value)}
                   placeholder="http://192.168.1.xxx:PORT/video"
                   className="w-full bg-black/50 border border-cyan/40 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan text-foreground text-center"
                 />
               </div>
             )}
             <button 
               onClick={start}
               disabled={type === 'ip' && !inputUrl.trim()}
               className="border border-cyan text-cyan px-4 py-2 rounded uppercase tracking-widest hover:bg-cyan/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
             >
               Start Feed
             </button>
          </div>
        )}

        {type === 'local' ? (
           <video ref={mediaRef as React.RefObject<HTMLVideoElement>} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover -scale-x-100" style={{ display: running ? 'block' : 'none' }} />
        ) : (
           <img ref={mediaRef as React.RefObject<HTMLImageElement>} className="absolute inset-0 w-full h-full object-cover" style={{ display: running ? 'block' : 'none' }} alt="IP Camera Feed" />
        )}
        
        <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full pointer-events-none ${type === 'local' ? '-scale-x-100' : ''}`} />
      </div>

      {/* Footer Controls */}
      <div className="flex gap-1.5 px-2 py-2 bg-black/50 border-t border-panel-border shrink-0">
        <button
          onClick={start}
          disabled={!modelLoaded || running}
          className="flex-1 py-1.5 px-1 border border-cyan text-cyan rounded font-ui text-[9px] font-bold tracking-[1px] uppercase bg-transparent transition-all hover:bg-cyan/10 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          START
        </button>
        <button
          onClick={stop}
          disabled={!running}
          className="flex-1 py-1.5 px-1 border border-danger text-danger rounded font-ui text-[9px] font-bold tracking-[1px] uppercase bg-transparent transition-all hover:bg-danger/10 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          STOP
        </button>
      </div>
    </div>
  );
}
