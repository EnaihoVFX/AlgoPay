import { useNavigate, useLocation } from 'react-router-dom';
import { Wallet, ShoppingBag, Users } from 'lucide-react';
import './BottomNav.css';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="bottom-nav-container">
      <div className="bottom-nav-capsule">
        <button
          onClick={() => navigate('/')}
          className={`nav-item ${isActive('/') ? 'active' : ''}`}
        >
          <Wallet size={24} />
        </button>

        <button
          onClick={() => navigate('/marketplace')}
          className={`nav-item ${isActive('/marketplace') ? 'active' : ''}`}
        >
          <ShoppingBag size={24} />
        </button>

        <button
          onClick={() => navigate('/community')}
          className={`nav-item ${isActive('/community') ? 'active' : ''}`}
        >
          <Users size={24} />
        </button>
      </div>
    </div>
  );
};

export default BottomNav;

