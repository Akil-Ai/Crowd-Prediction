import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user, data.token);
        toast.success('Successfully logged in');
        navigate('/');
      } else {
        toast.error(data.error || 'Failed to login');
      }
    } catch (error) {
      toast.error('Network error. Is the server running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-panel border border-panel-border rounded-lg p-8 shadow-[0_0_30px_hsla(var(--cyan)/0.05)]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 border-2 border-cyan rounded-lg mb-4 icon-pulse">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--cyan))" strokeWidth="1.5">
              <path d="M12 1v22m-7-18l14 14m0-14L5 19" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-[3px] text-foreground uppercase mb-1">Face Finder Pro</h1>
          <p className="text-cyan font-mono text-[10px] tracking-[2px] uppercase">Secure Login Gateway</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase block">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/40 border border-panel-border rounded px-4 py-3 text-sm focus:outline-none focus:border-cyan text-foreground transition-all duration-300"
              placeholder="Admin ID"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase block">Security Key</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-panel-border rounded px-4 py-3 text-sm focus:outline-none focus:border-cyan text-foreground transition-all duration-300"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-transparent hover:bg-cyan/10 border border-cyan text-cyan py-3.5 rounded text-[11px] font-ui font-bold tracking-[3px] uppercase transition-all shadow-[0_0_10px_hsla(var(--cyan)/0.1)] hover:shadow-[0_0_20px_hsla(var(--cyan)/0.3)] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? 'Verifying Identity...' : 'Initialize Session'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-panel-border text-center text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
          New Operator?{' '}
          <Link to="/register" className="text-cyan hover:text-cyan/80 transition-colors ml-1">
            Register Access
          </Link>
        </div>
      </div>
    </div>
  );
}
