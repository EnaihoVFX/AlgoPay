import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const CommunityPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{
      background: 'radial-gradient(ellipse at top, #0f1729 0%, #000000 50%, #000000 100%)'
    }}>
      <div className="sticky top-0 z-50 flex items-center justify-between p-5 glass" style={{
        background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.15), rgba(15, 23, 42, 0.3))',
        backdropFilter: 'blur(30px)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.15)'
      }}>
        <button onClick={() => navigate('/')} className="p-2 glass rounded-lg transition-all hover:bg-blue-500/10">
          <ArrowLeft size={20} className="text-blue-400" />
        </button>
        <h1 className="text-xl font-bold">Community</h1>
        <div className="w-10"></div>
      </div>

      <div className="max-w-2xl mx-auto p-6 pb-24">
        <div className="text-center py-20 glass rounded-2xl" style={{
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.15), rgba(15, 23, 42, 0.3))',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(59, 130, 246, 0.15)'
        }}>
          <div className="w-24 h-24 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center mb-6">
            <Users size={48} className="text-blue-300" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Community</h2>
          <p className="text-blue-200/70 mb-6">
            Connect with other AlgoPay users
          </p>
          <div className="text-sm text-blue-300/50">
            Coming soon...
          </div>
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default CommunityPage;

