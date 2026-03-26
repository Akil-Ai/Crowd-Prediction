import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import CameraSlot from './CameraSlot';

export default function CrowdMonitor() {
  const { user, logout } = useAuth();
  const [clock, setClock] = useState('--:--:--');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [levels, setLevels] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toTimeString().slice(0, 8)), 1000);
    return () => clearInterval(t);
  }, []);

  const handleUpdate = useCallback((id: string, count: number, level: string) => {
    setCounts(prev => ({ ...prev, [id]: count }));
    setLevels(prev => ({ ...prev, [id]: level }));
  }, []);

  const totalPeople = Object.values(counts).reduce((a, b) => a + b, 0);
  
  // Determine overall threat level based on individual cameras
  const activeLevels = Object.values(levels);
  const overallLevel = activeLevels.includes('danger') ? 'danger' : activeLevels.includes('medium') ? 'medium' : 'safe';
  const levelLabel: Record<string, string> = { safe: 'SAFE', medium: 'MEDIUM', danger: 'DANGER' };

  const dangerCams = Object.entries(levels)
    .filter(([id, level]) => level === 'danger')
    .map(([id]) => id.replace('cam', ''));

  return (
    <div className="relative z-[1] max-w-[1400px] mx-auto px-4 pt-4 pb-10">
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
            <div className="text-[19px] font-bold tracking-[3px] text-foreground uppercase">AI Security Matrix</div>
            <div className="font-mono text-[10px] text-cyan tracking-[2px] mt-0.5">4-GRID SURVEILLANCE</div>
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

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start">
        
        {/* Left - 4 Grid Cameras */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-panel border border-panel-border rounded-lg p-3">
          <CameraSlot id="cam1" name="CAM 1: LOCAL SYSTEM" type="local" onUpdate={handleUpdate} />
          <CameraSlot id="cam2" name="CAM 2: LOBBY (IP-101)" type="ip" url="http://192.168.1.101/video" onUpdate={handleUpdate} />
          <CameraSlot id="cam3" name="CAM 3: REAR HALL (IP-102)" type="ip" url="http://192.168.1.102/video" onUpdate={handleUpdate} />
          <CameraSlot id="cam4" name="CAM 4: PARKING (IP-103)" type="ip" url="http://192.168.1.103/video" onUpdate={handleUpdate} />
        </div>

        {/* Right column Dashboard */}
        <div className="flex flex-col gap-3.5">
          {/* Status card */}
          <div className={`p-5 rounded-lg border text-center transition-all duration-400 bg-panel ${
            overallLevel === 'safe' ? 'border-safe shadow-[0_0_28px_hsla(var(--safe)/0.12)]' :
            overallLevel === 'medium' ? 'border-medium shadow-[0_0_28px_hsla(var(--medium)/0.12)]' :
            'border-danger shadow-[0_0_28px_hsla(var(--danger)/0.22)] danger-pulse'
          }`}>
            <div className="flex items-center justify-between pb-2">
              <span className="font-mono text-[10px] tracking-[2.5px] text-cyan uppercase">FACILITY STATUS</span>
            </div>
            <div className="font-mono text-[10px] tracking-[3px] text-muted-foreground mb-2.5">TOTAL PEOPLE</div>
            <div className={`font-mono text-[80px] leading-none mb-1 transition-colors ${
              overallLevel === 'safe' ? 'text-safe' : overallLevel === 'medium' ? 'text-medium' : 'text-danger'
            }`}>{totalPeople}</div>
            <div className="font-ui text-xs tracking-[3px] text-muted-foreground uppercase mb-3.5">INDIVIDUALS</div>
            <div className={`inline-block px-4 py-1 rounded-sm font-ui text-[17px] font-bold tracking-[4px] uppercase transition-all ${
              overallLevel === 'safe' ? 'bg-safe/10 text-safe border border-safe/25' :
              overallLevel === 'medium' ? 'bg-medium/10 text-medium border border-medium/25' :
              'bg-danger/10 text-danger border border-danger/30'
            }`}>
              {levelLabel[overallLevel]}
            </div>

            {dangerCams.length > 0 && (
              <div className="mt-4 pt-3 border-t border-danger/20 font-mono text-[10px] text-danger uppercase tracking-[2px]">
                High Density At:<br/>
                <span className="font-bold text-xs">CAMERA {dangerCams.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Alert */}
          {overallLevel === 'danger' && (
            <div className="p-3.5 border border-danger rounded-md bg-danger/[0.07] font-mono text-[11px] text-danger leading-relaxed alert-flash">
              <div className="text-xs font-bold tracking-[3px] mb-1">⚠ DANGER ALERT</div>
              HIGH CROWD DENSITY DETECTED ON CAMERA(S): {dangerCams.join(', ')}<br />
              SECURITY RESPONSE REQUESTED.
            </div>
          )}

          {/* Info Panel */}
          <div className="bg-panel border border-panel-border rounded-lg overflow-hidden p-4">
            <h3 className="font-mono text-[10px] tracking-[2.5px] text-cyan uppercase mb-3 border-b border-panel-border pb-2">Camera Configuration</h3>
            <p className="text-xs text-muted-foreground mb-2">
              <strong>Local System:</strong> Uses connected USB webcam. Automatically prompts for permission.
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>IP Cameras:</strong> Configured for MJPEG stream formats over standard HTTP connections across local area network.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
