import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, History, BarChart3, Camera } from 'lucide-react';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-brand">
          <h1>🍅 AgroRakshak</h1>
        </div>
        
        <div className="navbar-links">
          <button 
            onClick={() => navigate('/')}
            className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}
          >
            <BarChart3 size={20} />
            Dashboard
          </button>
          <button 
            onClick={() => navigate('/detect')}
            className={location.pathname === '/detect' ? 'nav-link active' : 'nav-link'}
          >
            <Camera size={20} />
            Detect
          </button>
          <button 
            onClick={() => navigate('/history')}
            className={location.pathname === '/history' ? 'nav-link active' : 'nav-link'}
          >
            <History size={20} />
            History
          </button>
        </div>
        
        <div className="navbar-user">
          <div className="user-info">
            <User size={20} />
            <span>{currentUser?.email}</span>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
