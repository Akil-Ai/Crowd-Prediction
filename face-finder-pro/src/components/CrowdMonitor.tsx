import { useEffect, useState } from 'react';
import { usePersonDetection, type DetectionLevel } from '@/hooks/usePersonDetection';
import { useAuth } from '@/context/AuthContext';

function CrowdMonitor() {
  const { user, logout } = useAuth();
  const {
    videoRef, canvasRef, modelLoaded, modelError, running,
    personCount, level, fps, frameCount, logs, stats, start, stop,
  } = usePersonDetection();

  const [clock, setClock] = useState('--:--:--');

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toTimeString().slice(0, 8)), 1000);
    return () => clearInterval(t);
  }, []);

  const levelLabel: Record<DetectionLevel, string> = { safe: 'SAFE', medium: 'MEDIUM', danger: 'DANGER' };

  return (
    <div className="relative z-[1] max-w-[1080px] mx-auto px-3.5 pt-4 pb-10">
      {/* Header */}
      <header className="flex items-center justify-between py-3 border-b border-border mb-5">
        <div className="flex items-center gap-3">
          <div className="w-[38px] h-[38px] border-[1.5px] border-cyan rounded-lg flex items-center justify-center icon-pulse">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--cyan))" strokeWidth="1.5">
              <circle cx="12" cy="8" r="3" />
              <path d="M6 20v-1a6 6 0 0112 0v1" />
              <circle cx="4" cy="10" r="2" /><path d="M2 20v-.5A3.5 3.5 0 016 16" />
              <circle cx="20" cy="10" r="2" /><path d="M22 20v-.5A3.5 3.5 0 0018 16" />
            </svg>
          </div>
          <div>
            <div className="text-[19px] font-bold tracking-[3px] text-foreground uppercase">AI Crowd Monitor</div>
            <div className="font-mono text-[10px] text-cyan tracking-[2px] mt-0.5">DUAL ENGINE (FACE+BODY)</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-panel border border-panel-border px-3 py-1.5 rounded-md">
             <span className="font-mono text-[10px] text-cyan uppercase tracking-widest">{user?.username || 'Operator'}</span>
             <button onClick={logout} className="text-[10px] text-danger hover:text-danger/80 uppercase font-bold tracking-widest ml-2 border-l border-panel-border pl-2 transition-colors">Log Out</button>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-safe border border-safe/40 rounded-sm px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-safe live-blink" />LIVE
          </div>
          <div className="font-mono text-xs text-muted-foreground">{clock}</div>
        </div>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4 items-start">
        {/* Left - Camera */}
        <div className="bg-panel border border-panel-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-panel-border bg-cyan/[0.025]">
            <span className="font-mono text-[10px] tracking-[2.5px] text-cyan uppercase">CAMERA FEED · DUAL ENGINE</span>
            <span className="font-mono text-[10px] text-muted-foreground border border-panel-border rounded-sm px-1.5 py-0.5">
              {modelError ? 'ERROR' : !modelLoaded ? 'LOADING MODEL...' : running ? 'SCANNING' : 'READY'}
            </span>
          </div>

          <div className="relative bg-black aspect-video overflow-hidden">
            {/* Corner accents */}
            <div className="absolute top-2.5 left-2.5 w-[18px] h-[18px] border-t-2 border-l-2 border-cyan z-[3]" />
            <div className="absolute top-2.5 right-2.5 w-[18px] h-[18px] border-t-2 border-r-2 border-cyan z-[3]" />
            <div className="absolute bottom-2.5 left-2.5 w-[18px] h-[18px] border-b-2 border-l-2 border-cyan z-[3]" />
            <div className="absolute bottom-2.5 right-2.5 w-[18px] h-[18px] border-b-2 border-r-2 border-cyan z-[3]" />

            {running && (
              <div className="absolute left-0 right-0 h-0.5 z-[3] bg-gradient-to-r from-transparent via-cyan/50 to-transparent scanbar-anim" />
            )}

            {/* Loading overlay */}
            {!modelLoaded && !modelError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3.5 bg-background/95">
                <div className="w-[46px] h-[46px] border-2 border-panel-border border-t-cyan rounded-full load-spin" />
                <div className="font-mono text-[11px] tracking-[2px] text-cyan">LOADING AI MODEL...</div>
              </div>
            )}

            {modelError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/95">
                <div className="font-mono text-[11px] tracking-[2px] text-danger">MODEL LOAD FAILED</div>
              </div>
            )}

            {modelLoaded && !running && (
              <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-3 text-muted-foreground font-mono text-[11px] tracking-[2px]">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
                CLICK START — ALLOW CAMERA ACCESS
              </div>
            )}

            <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover -scale-x-100" style={{ display: running ? 'block' : 'none' }} />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none -scale-x-100" />
          </div>

          <div className="flex items-center justify-between px-3.5 py-1.5 bg-black/50 border-t border-panel-border font-mono text-[10px] text-muted-foreground">
            <span>PEOPLE: <span className="text-cyan">{running ? personCount : '--'}</span></span>
            <span>ENGINE: <span className="text-cyan">Dual Engine (Face+Body)</span></span>
            <span>FPS: <span className="text-cyan">{running ? fps : '--'}</span></span>
            <span>SCANS: <span className="text-cyan">{frameCount}</span></span>
          </div>

          <div className="flex gap-2 px-3.5 py-2.5">
            <button
              onClick={start}
              disabled={!modelLoaded || running}
              className="flex-1 py-2.5 px-1.5 border border-cyan text-cyan rounded font-ui text-xs font-bold tracking-[2px] uppercase bg-transparent transition-all hover:bg-cyan/10 hover:shadow-[0_0_14px_hsla(var(--cyan)/0.2)] disabled:opacity-25 disabled:cursor-not-allowed"
            >
              START CAMERA
            </button>
            <button
              onClick={stop}
              disabled={!running}
              className="flex-1 py-2.5 px-1.5 border border-danger text-danger rounded font-ui text-xs font-bold tracking-[2px] uppercase bg-transparent transition-all hover:bg-danger/10 disabled:opacity-25 disabled:cursor-not-allowed"
            >
              STOP
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3.5">
          {/* Status card */}
          <div className={`p-5 rounded-lg border text-center transition-all duration-400 bg-panel ${
            level === 'safe' ? 'border-safe shadow-[0_0_28px_hsla(var(--safe)/0.12)]' :
            level === 'medium' ? 'border-medium shadow-[0_0_28px_hsla(var(--medium)/0.12)]' :
            'border-danger shadow-[0_0_28px_hsla(var(--danger)/0.22)] danger-pulse'
          }`}>
            <div className="flex items-center justify-between pb-2">
              <span className="font-mono text-[10px] tracking-[2.5px] text-cyan uppercase">CROWD STATUS</span>
              <span className={`font-mono text-[10px] border border-panel-border rounded-sm px-1.5 py-0.5 ${modelLoaded ? 'text-safe' : 'text-muted-foreground'}`}>
                {modelLoaded ? 'MODEL READY' : 'LOADING'}
              </span>
            </div>
            <div className="font-mono text-[10px] tracking-[3px] text-muted-foreground mb-2.5">PEOPLE DETECTED</div>
            <div className={`font-mono text-[80px] leading-none mb-1 transition-colors ${
              level === 'safe' ? 'text-safe' : level === 'medium' ? 'text-medium' : 'text-danger'
            }`}>{personCount}</div>
            <div className="font-ui text-xs tracking-[3px] text-muted-foreground uppercase mb-3.5">INDIVIDUALS</div>
            <div className={`inline-block px-4 py-1 rounded-sm font-ui text-[17px] font-bold tracking-[4px] uppercase transition-all ${
              level === 'safe' ? 'bg-safe/10 text-safe border border-safe/25' :
              level === 'medium' ? 'bg-medium/10 text-medium border border-medium/25' :
              'bg-danger/10 text-danger border border-danger/30'
            }`}>
              {running ? levelLabel[level] : 'STANDBY'}
            </div>
          </div>

          {/* Alert */}
          {level === 'danger' && running && (
            <div className="p-3.5 border border-danger rounded-md bg-danger/[0.07] font-mono text-[11px] text-danger leading-relaxed alert-flash">
              <div className="text-xs font-bold tracking-[3px] mb-1">⚠ DANGER ALERT</div>
              HIGH CROWD DENSITY DETECTED!<br />
              8 OR MORE PEOPLE IN FRAME.<br />
              SECURITY RESPONSE REQUIRED.
            </div>
          )}

          {/* Stats */}
          <div className="bg-panel border border-panel-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-panel-border bg-cyan/[0.025]">
              <span className="font-mono text-[10px] tracking-[2.5px] text-cyan uppercase">SESSION STATS</span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-panel-border">
              <div className="bg-panel p-3 text-center">
                <div className="font-mono text-[22px] text-safe leading-none mb-0.5">{stats.safe}</div>
                <div className="font-ui text-[10px] tracking-[2px] text-safe uppercase">Safe</div>
              </div>
              <div className="bg-panel p-3 text-center">
                <div className="font-mono text-[22px] text-medium leading-none mb-0.5">{stats.medium}</div>
                <div className="font-ui text-[10px] tracking-[2px] text-medium uppercase">Medium</div>
              </div>
              <div className="bg-panel p-3 text-center">
                <div className="font-mono text-[22px] text-danger leading-none mb-0.5">{stats.danger}</div>
                <div className="font-ui text-[10px] tracking-[2px] text-danger uppercase">Danger</div>
              </div>
              <div className="bg-panel p-3 text-center">
                <div className="font-mono text-[22px] text-cyan leading-none mb-0.5">{stats.peak}</div>
                <div className="font-ui text-[10px] tracking-[2px] text-muted-foreground uppercase">Peak</div>
              </div>
            </div>
          </div>

          {/* Log */}
          <div className="bg-panel border border-panel-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-panel-border bg-cyan/[0.025]">
              <span className="font-mono text-[10px] tracking-[2.5px] text-cyan uppercase">DETECTION LOG</span>
              <span className="font-mono text-[10px] text-muted-foreground border border-panel-border rounded-sm px-1.5 py-0.5">{logs.length} entries</span>
            </div>
            <div className="py-1.5 max-h-40 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="flex items-center gap-2 px-3.5 py-1 border-b border-panel-border/50 font-mono text-[10px]">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    log.level === 'safe' ? 'bg-safe' : log.level === 'medium' ? 'bg-medium' : log.level === 'danger' ? 'bg-danger' : 'bg-cyan'
                  }`} />
                  <span className="text-muted-foreground min-w-[56px]">{log.time}</span>
                  <span className="text-foreground flex-1">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrowdMonitor;
