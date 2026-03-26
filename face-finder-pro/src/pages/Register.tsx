import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Clearance Granted. Proceed to Login.');
        navigate('/login');
      } else {
        toast.error(data.error || 'Failed to register');
      }
    } catch (error) {
      toast.error('Network error. Is the server running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-panel border border-panel-border rounded-lg p-8 shadow-[0_0_40px_hsla(var(--cyan)/0.03)] relative overflow-hidden">
        {/* Decorative corner lines */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan/30 m-4" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan/30 m-4" />
        
        <div className="text-center mb-8 mt-2">
          <h1 className="text-2xl font-bold tracking-[3px] text-foreground uppercase mb-1">Face Finder Pro</h1>
          <p className="text-cyan font-mono text-[10px] tracking-[2px] uppercase">New Operator Registration</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase block">Operator Handle</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/40 border border-panel-border rounded px-4 py-3 text-sm focus:outline-none focus:border-cyan text-foreground transition-all duration-300"
              placeholder="Username"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase block">Access Code</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-panel-border rounded px-4 py-3 text-sm focus:outline-none focus:border-cyan text-foreground transition-all duration-300"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase block">Confirm Access Code</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-black/40 border border-panel-border rounded px-4 py-3 text-sm focus:outline-none focus:border-cyan text-foreground transition-all duration-300"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-cyan/10 hover:bg-cyan/20 border border-cyan text-cyan py-3.5 rounded text-[11px] font-ui font-bold tracking-[3px] uppercase transition-all shadow-[0_0_15px_hsla(var(--cyan)/0.15)] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {isLoading ? 'Processing Request...' : 'Grant Clearance'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-panel-border text-center text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
          Return to{' '}
          <Link to="/login" className="text-cyan hover:text-cyan/80 transition-colors ml-1">
            Secure Login Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
