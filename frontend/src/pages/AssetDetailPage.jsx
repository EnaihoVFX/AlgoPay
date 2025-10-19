import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Send, Download, TrendingUp, TrendingDown, BarChart3, Info, Image as ImageIcon, CheckCircle } from 'lucide-react';
import algosdk from 'algosdk';
import './AssetDetailPage.css';

const AssetDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { assetId } = useParams();
  const [assetData, setAssetData] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState(null);

  useEffect(() => {
    fetchAssetData();
  }, [assetId]);

  const fetchAssetData = async () => {
    try {
      const WALLET_ADDRESS = localStorage.getItem('algoPayAddress') || '54Z4UQNPKFOL2LB3YTQ23SDNOMPUIUPM3WKDN3AHH2KXUCVN6WXZKYC4EI';
      
      // Check if this is an NFT from marketplace (passed via location state)
      if (location.state?.asset) {
        const nftData = location.state.asset;
        setAssetData({
          name: nftData.name,
          symbol: nftData.unitName || 'NFT',
          icon: '🖼️',
          description: nftData.description || 'This is a non-fungible token on the Algorand blockchain.',
          imageUrl: nftData.imageUrl,
          explorer: `https://testnet.explorer.perawallet.app/asset/${nftData.id}`,
          claimCode: nftData.claimCode,
          creator: nftData.creator,
          createdAt: nftData.createdAt,
          isNFT: true
        });
        setBalance(0);
        setLoading(false);
        return;
      }
      
      if (assetId === 'algo') {
        // Fetch ALGO price data
        const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=algorand&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true');
        const data = await priceRes.json();
        
        setPriceData({
          price: data.algorand?.usd || 0.15,
          change24h: data.algorand?.usd_24h_change || 0,
          volume24h: data.algorand?.usd_24h_vol || 0,
          marketCap: data.algorand?.usd_market_cap || 0
        });

        // Fetch balance from blockchain
        const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');
        try {
          const accountInfo = await algodClient.accountInformation(WALLET_ADDRESS).do();
          setBalance(accountInfo.amount / 1000000);
          
          // Get recent ALGO transactions
          const txns = await algodClient.accountTransactions(WALLET_ADDRESS).limit(10).do();
          setTransactions(txns.transactions.filter(tx => tx['tx-type'] === 'pay').slice(0, 5));
        } catch (err) {
          console.log('Account not funded yet');
          setBalance(0);
        }

        setAssetData({
          name: 'Algorand',
          symbol: 'ALGO',
          icon: 'Ⱥ',
          description: 'Algorand is a pure proof-of-stake blockchain designed for speed, security, and decentralization.',
          website: 'https://algorand.com',
          explorer: `https://testnet.explorer.perawallet.app/address/${WALLET_ADDRESS}`
        });
      } else if (assetId === 'usdc') {
        const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true');
        const data = await priceRes.json();
        
        setPriceData({
          price: data['usd-coin']?.usd || 1.00,
          change24h: data['usd-coin']?.usd_24h_change || 0,
          volume24h: data['usd-coin']?.usd_24h_vol || 0,
          marketCap: data['usd-coin']?.usd_market_cap || 0
        });

        setBalance(0); // Mock USDC balance
        setAssetData({
          name: 'USD Coin',
          symbol: 'USDC',
          icon: '$',
          description: 'USDC is a fully collateralized US dollar stablecoin on Algorand.',
          website: 'https://www.circle.com/usdc',
          explorer: `https://testnet.explorer.perawallet.app/address/${WALLET_ADDRESS}`
        });
      } else {
        // NFT
        setAssetData({
          name: `NFT #${assetId.replace('nft-', '')}`,
          symbol: 'NFT',
          icon: '🖼️',
          description: 'This is a non-fungible token on the Algorand blockchain.',
          explorer: `https://testnet.explorer.perawallet.app/asset/${assetId.replace('nft-', '')}`
        });
        setBalance(1);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching asset data:', error);
      setLoading(false);
    }
  };

  const handleClaimNFT = async () => {
    if (!assetData?.claimCode) return;
    
    try {
      setClaiming(true);
      setClaimError(null);
      
      const WALLET_ADDRESS = localStorage.getItem('algoPayAddress') || '54Z4UQNPKFOL2LB3YTQ23SDNOMPUIUPM3WKDN3AHH2KXUCVN6WXZKYC4EI';
      const userId = localStorage.getItem('algoPayUserId') || 'user1';
      
      const response = await fetch('http://localhost:3000/api/nft/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          claimCode: assetData.claimCode,
          recipientAddress: WALLET_ADDRESS,
          userId: userId
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setClaimSuccess(true);
        setBalance(1);
        setTimeout(() => {
          navigate('/profile');
        }, 2000);
      } else {
        setClaimError(data.message || 'Failed to claim NFT');
      }
    } catch (err) {
      console.error('Error claiming NFT:', err);
      setClaimError('Failed to claim NFT. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="asset-detail-page">
        <div className="asset-header">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
          </button>
          <h1>Loading...</h1>
          <div className="spacer"></div>
        </div>
        <div className="flex items-center justify-center min-h-96">
          <div className="w-12 h-12 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="asset-detail-page">
      {/* Header */}
      <div className="asset-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </button>
        <h1>{assetData?.symbol}</h1>
        <a 
          href={assetData?.explorer}
          target="_blank"
          rel="noopener noreferrer"
          className="explorer-link"
        >
          <ExternalLink size={18} />
        </a>
      </div>

      <div className="asset-container">
        {/* Asset Header Card */}
        <div className="asset-info-card glass">
          {assetData?.isNFT && assetData?.imageUrl ? (
            <div className="mb-6">
              <div className="aspect-square bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-2xl overflow-hidden flex items-center justify-center">
                <img
                  src={assetData.imageUrl}
                  alt={assetData.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          ) : null}
          
          <div className="flex items-center gap-4 mb-6">
            <div className="asset-icon">
              {assetData?.symbol === 'USDC' ? (
                <svg className="w-12 h-12" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="16" fill="#2775CA"/>
                  <path d="M20.5 18.75C20.5 15.85 18.55 14.95 15.45 14.55C13.25 14.25 12.75 13.65 12.75 12.55C12.75 11.45 13.45 10.85 15.05 10.85C16.45 10.85 17.15 11.25 17.55 12.15C17.65 12.35 17.85 12.45 18.05 12.45H18.95C19.25 12.45 19.45 12.25 19.45 11.95V11.85C19.05 10.35 17.85 9.25 16.25 9.05V7.45C16.25 7.15 16.05 6.95 15.75 6.95H14.75C14.45 6.95 14.25 7.15 14.25 7.45V9.05C12.05 9.35 10.75 10.65 10.75 12.65C10.75 15.45 12.65 16.35 15.75 16.75C17.75 17.05 18.45 17.45 18.45 18.75C18.45 20.05 17.45 20.85 15.95 20.85C13.95 20.85 13.35 20.15 13.15 19.15C13.05 18.85 12.85 18.75 12.55 18.75H11.65C11.35 18.75 11.15 18.95 11.15 19.25V19.35C11.45 21.15 12.65 22.35 14.25 22.65V24.25C14.25 24.55 14.45 24.75 14.75 24.75H15.75C16.05 24.75 16.25 24.55 16.25 24.25V22.65C18.55 22.35 20.5 21.05 20.5 18.75Z" fill="white"/>
                </svg>
              ) : (
                <span className="text-5xl">{assetData?.icon}</span>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">{assetData?.name}</h2>
              <p className="text-blue-200/60 text-sm">{assetData?.symbol}</p>
            </div>
          </div>

          {priceData && (
            <div className="price-section">
              <div className="current-price">
                <span className="price-value">${priceData.price.toFixed(4)}</span>
                <div className={`price-change ${priceData.change24h >= 0 ? 'positive' : 'negative'}`}>
                  {priceData.change24h >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span>{priceData.change24h >= 0 ? '+' : ''}{priceData.change24h.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* NFT Claim or Balance */}
        {assetData?.isNFT ? (
          <div className="balance-card glass">
            {claimSuccess ? (
              <div className="text-center py-6">
                <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">NFT Claimed!</h3>
                <p className="text-blue-200/70 text-sm mb-4">
                  The NFT has been transferred to your wallet
                </p>
                <p className="text-xs text-blue-300/60">Redirecting to profile...</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="text-sm text-blue-200/70 mb-2">Status</div>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm font-semibold">
                      Available to Claim
                    </div>
                  </div>
                </div>
                
                {claimError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                    <p className="text-sm text-red-300">{claimError}</p>
                  </div>
                )}
                
                <button
                  onClick={handleClaimNFT}
                  disabled={claiming}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-white text-lg"
                >
                  {claiming ? 'Claiming...' : 'Claim NFT'}
                </button>
                <p className="text-xs text-blue-300/60 text-center mt-3">
                  This will transfer the NFT to your connected wallet
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="balance-card glass">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-blue-200/70">Your Balance</span>
              <span className="text-2xl font-bold text-white">
                {balance.toFixed(assetId === 'usdc' ? 2 : 4)} {assetData?.symbol}
              </span>
            </div>
            
            {priceData && (
              <div className="text-sm text-blue-200/60 mb-6">
                ≈ ${(balance * priceData.price).toFixed(2)} USD
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={() => navigate('/send')}
                className="flex-1 btn-action"
              >
                <Send size={22} />
              </button>
              <button 
                onClick={() => navigate('/receive')}
                className="flex-1 btn-action"
              >
                <Download size={22} />
              </button>
            </div>
          </div>
        )}

        {/* Market Stats */}
        {priceData && (
          <div className="stats-grid">
            <div className="stat-card glass">
              <div className="stat-label">Market Cap</div>
              <div className="stat-value">${(priceData.marketCap / 1000000000).toFixed(2)}B</div>
            </div>
            <div className="stat-card glass">
              <div className="stat-label">24h Volume</div>
              <div className="stat-value">${(priceData.volume24h / 1000000).toFixed(2)}M</div>
            </div>
            <div className="stat-card glass">
              <div className="stat-label">24h Change</div>
              <div className={`stat-value ${priceData.change24h >= 0 ? 'positive' : 'negative'}`}>
                {priceData.change24h >= 0 ? '+' : ''}{priceData.change24h.toFixed(2)}%
              </div>
            </div>
            <div className="stat-card glass">
              <div className="stat-label">Price</div>
              <div className="stat-value">${priceData.price.toFixed(4)}</div>
            </div>
          </div>
        )}

        {/* Price Chart Placeholder */}
        <div className="chart-card glass">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Price Chart</h3>
            <BarChart3 size={20} className="text-blue-300/60" />
          </div>
          <div className="chart-placeholder">
            <div className="flex items-center justify-center h-48">
              <svg className="w-full h-full opacity-30" viewBox="0 0 400 200" fill="none">
                <path 
                  d="M 0 150 Q 50 120, 100 130 T 200 100 T 300 80 T 400 60" 
                  stroke="url(#gradient)" 
                  strokeWidth="3" 
                  fill="none"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="text-center text-xs text-blue-300/50 mt-2">
              7-day price trend visualization
            </div>
          </div>
        </div>

        {/* About Section */}
        {assetData?.description && (
          <div className="about-card glass">
            <div className="flex items-center gap-2 mb-3">
              <Info size={18} className="text-blue-300" />
              <h3 className="text-lg font-semibold text-white">About {assetData.symbol}</h3>
            </div>
            <p className="text-sm text-blue-200/70 leading-relaxed mb-4">
              {assetData.description}
            </p>
            {assetData.website && (
              <a 
                href={assetData.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                Visit Website <ExternalLink size={14} />
              </a>
            )}
          </div>
        )}

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <div className="transactions-card glass">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
            <div className="space-y-2">
              {transactions.map((tx, idx) => (
                <div key={idx} className="transaction-item">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg glass-strong flex items-center justify-center">
                      <Send size={14} className="text-blue-300/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium">Payment</div>
                      <div className="text-xs text-blue-300/50">
                        {new Date(tx['round-time'] * 1000).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm text-white font-medium">
                      {tx['payment-transaction'] ? `-${(tx['payment-transaction'].amount / 1000000).toFixed(4)}` : '0'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetDetailPage;

