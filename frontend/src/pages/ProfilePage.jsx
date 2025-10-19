import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, ExternalLink, LogOut, Settings, User, Wallet, Eye, EyeOff, Key } from 'lucide-react';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addressCopied, setAddressCopied] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [mnemonicCopied, setMnemonicCopied] = useState(false);
  const userId = 'testuser1';
  
  // Get wallet address from localStorage or use default pooled address
  const WALLET_ADDRESS = localStorage.getItem('algoPayAddress') || '54Z4UQNPKFOL2LB3YTQ23SDNOMPUIUPM3WKDN3AHH2KXUCVN6WXZKYC4EI';

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const balanceRes = await fetch(`http://localhost:3000/api/balance/${userId}`);
      const balanceData = await balanceRes.json();
      
      if (balanceData.balance !== undefined) {
        setBalance(balanceData.balance / 1000000);
      } else {
        setBalance(0);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setBalance(0);
      setLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(WALLET_ADDRESS);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 2000);
  };

  const openExplorer = () => {
    window.open(`https://testnet.explorer.perawallet.app/address/${WALLET_ADDRESS}`, '_blank');
  };

  const copyMnemonic = () => {
    const mnemonic = localStorage.getItem('algoPayMnemonic');
    if (mnemonic) {
      navigator.clipboard.writeText(mnemonic);
      setMnemonicCopied(true);
      setTimeout(() => setMnemonicCopied(false), 2000);
    }
  };

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Profile</h1>
        <div className="spacer"></div>
      </div>

      <div className="profile-container">
        {/* Profile Avatar */}
        <div className="profile-avatar-section">
          <div className="profile-avatar">
            <div className="avatar-gradient">
              <div className="text-4xl font-bold text-white">
                {(() => {
                  const name = localStorage.getItem('algoPayUsername') || 'Test User';
                  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                })()}
              </div>
            </div>
          </div>
          <h2 className="profile-name">{localStorage.getItem('algoPayUsername') || 'Test User'}</h2>
          <p className="profile-id">
            {localStorage.getItem('algoPayMnemonic') ? '@' + (localStorage.getItem('algoPayUsername')?.toLowerCase().replace(/\s+/g, '') || userId) : '@' + userId}
          </p>
        </div>

        {/* Balance Card */}
        <div className="profile-balance-card glass">
          <div className="balance-label">Total Balance</div>
          {loading ? (
            <div className="balance-loading">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              <div className="balance-amount">
                <span className="balance-value">{balance !== null ? balance.toFixed(6) : '0.000000'}</span>
                <span className="balance-currency">ALGO</span>
              </div>
              <div className="balance-usd">
                ≈ ${balance ? (balance * 0.15).toFixed(2) : '0.00'} USD
              </div>
            </>
          )}
        </div>

        {/* Wallet Address Card */}
        <div className="profile-section glass">
          <div className="section-header">
            <Wallet size={20} />
            <h3>Wallet Address</h3>
          </div>
          <div className="address-display">
            <code className="address-code">{WALLET_ADDRESS}</code>
            <div className="address-actions">
              <button 
                className="icon-btn"
                onClick={copyAddress}
                title="Copy address"
              >
                {addressCopied ? (
                  <span className="text-success">✓</span>
                ) : (
                  <Copy size={18} />
                )}
              </button>
              <button 
                className="icon-btn"
                onClick={openExplorer}
                title="View on explorer"
              >
                <ExternalLink size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Recovery Phrase Section - Only show if user has a generated wallet */}
        {localStorage.getItem('algoPayMnemonic') && (
          <div className="profile-section glass">
            <div className="section-header">
              <Key size={20} />
              <h3>Secret Recovery Phrase</h3>
            </div>
            
            {!showMnemonic ? (
              <div className="text-center py-6">
                <p className="text-sm text-blue-200/70 mb-4">
                  Your recovery phrase is hidden for security
                </p>
                <button 
                  onClick={() => setShowMnemonic(true)}
                  className="icon-btn inline-flex items-center justify-center px-4 py-3"
                >
                  <Eye size={20} />
                </button>
              </div>
            ) : (
              <div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-xs text-red-200">
                  <strong>Warning:</strong> Never share this phrase with anyone!
                </div>
                
                <div className="grid grid-cols-3 gap-2 bg-black/30 rounded-lg p-4 mb-4">
                  {localStorage.getItem('algoPayMnemonic').split(' ').map((word, index) => (
                    <div key={index} className="flex items-center gap-1.5 bg-blue-500/5 rounded px-2 py-1 border border-blue-500/10">
                      <span className="text-[9px] text-blue-400/60 font-mono">{index + 1}</span>
                      <span className="text-xs text-white font-medium">{word}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={copyMnemonic}
                    className="icon-btn flex-1 inline-flex items-center justify-center"
                  >
                    <Copy size={20} className={mnemonicCopied ? "text-green-400" : ""} />
                  </button>
                  <button 
                    onClick={() => setShowMnemonic(false)}
                    className="icon-btn inline-flex items-center justify-center px-4"
                  >
                    <EyeOff size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Account Settings */}
        <div className="profile-section glass">
          <div className="section-header">
            <Settings size={20} />
            <h3>Settings</h3>
          </div>
          <div className="settings-list">
            <button className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Network</div>
                <div className="setting-value">Algorand TestNet</div>
              </div>
            </button>
            <button className="setting-item">
              <div className="setting-info">
                <div className="setting-title">User ID</div>
                <div className="setting-value">{userId}</div>
              </div>
            </button>
            <button className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Wallet Type</div>
                <div className="setting-value">
                  {localStorage.getItem('algoPayMnemonic') ? 'Self-Custodial' : 'Pooled'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="profile-actions">
          <button className="btn-secondary" onClick={() => navigate('/')}>
            <ArrowLeft size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

