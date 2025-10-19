import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Send, Download, ScanLine, PlusCircle, Eye, EyeOff, Copy, ExternalLink, ArrowDownUp, ShoppingCart, Repeat, TrendingUp, TrendingDown } from 'lucide-react';
import algosdk from 'algosdk';
import ScannerPage from './pages/ScannerPage';
import CreateQRPage from './pages/CreateQRPage';
import CreateNFTPage from './pages/CreateNFTPage';
import SendPage from './pages/SendPage';
import ReceivePage from './pages/ReceivePage';
import PayQRPage from './pages/PayQRPage';
import ProfilePage from './pages/ProfilePage';
import AssetDetailPage from './pages/AssetDetailPage';
import MarketplacePage from './pages/MarketplacePage';
import CommunityPage from './pages/CommunityPage';
import Onboarding from './components/Onboarding';
import BottomNav from './components/BottomNav';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/scan" element={<ScannerPage />} />
        <Route path="/create" element={<CreateQRPage />} />
        <Route path="/create-nft" element={<CreateNFTPage />} />
        <Route path="/send" element={<SendPage />} />
        <Route path="/receive" element={<ReceivePage />} />
        <Route path="/qr-scan" element={<PayQRPage />} />
        <Route path="/pay" element={<PayQRPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/asset/:assetId" element={<AssetDetailPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/community" element={<CommunityPage />} />
      </Routes>
    </Router>
  );
}

function HomePage() {
  const [balance, setBalance] = useState(null);
  const [usdcBalance, setUsdcBalance] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [addressCopied, setAddressCopied] = useState(false);
  const [cardRotate, setCardRotate] = useState({ x: 0, y: 0 });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [priceChanges, setPriceChanges] = useState({
    algo: { change24h: 0, trending: 'up' },
    usdc: { change24h: 0, trending: 'neutral' }
  });
  const [nfts, setNfts] = useState([]);
  const [nftScrollPosition, setNftScrollPosition] = useState(0);
  const userId = 'testuser1';
  
  // Get wallet address from localStorage or use default pooled address
  const WALLET_ADDRESS = localStorage.getItem('algoPayAddress') || 'W4DVLNHVUEQK2GZKYLAVCTZFWHQE26WCPAIUJ55CXTTPEVHEWWTOTTREBE';

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('algoPayOnboarded');
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
      setLoading(false);
    } else {
    fetchWalletData();
      fetchPriceData();
    }
    
    // Listen for wallet refresh events (e.g., after claiming NFT)
    const handleRefresh = () => {
      console.log('Refreshing wallet data...');
      fetchWalletData();
    };
    window.addEventListener('refreshWallet', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshWallet', handleRefresh);
    };
  }, []);

  const fetchPriceData = async () => {
    try {
      // Fetch live ALGO price from CoinGecko API
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=algorand,usd-coin&vs_currencies=usd&include_24hr_change=true');
      const data = await response.json();
      
      setPriceChanges({
        algo: {
          change24h: data.algorand?.usd_24h_change || 0,
          trending: data.algorand?.usd_24h_change > 0 ? 'up' : data.algorand?.usd_24h_change < 0 ? 'down' : 'neutral'
        },
        usdc: {
          change24h: data['usd-coin']?.usd_24h_change || 0,
          trending: data['usd-coin']?.usd_24h_change > 0 ? 'up' : data['usd-coin']?.usd_24h_change < 0 ? 'down' : 'neutral'
        }
      });
    } catch (error) {
      console.error('Error fetching price data:', error);
      // Use mock data on error
      setPriceChanges({
        algo: { change24h: 2.47, trending: 'up' },
        usdc: { change24h: 0.01, trending: 'neutral' }
      });
    }
  };

  const fetchWalletData = async () => {
    try {
      // Always use pooled wallet for now (has the funds and NFTs)
      // In production, this would check if user's own wallet is funded
      const hasOwnWallet = false; // Temporarily disabled to use pooled wallet
      
      if (hasOwnWallet) {
        // Fetch balance directly from Algorand blockchain
        const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');
        
        try {
          const accountInfo = await algodClient.accountInformation(WALLET_ADDRESS).do();
          // Convert BigInt to Number for balance
          const amountValue = typeof accountInfo.amount === 'bigint' ? Number(accountInfo.amount) : accountInfo.amount;
          setBalance(amountValue / 1000000); // Convert microAlgos to Algos
          
          // For transactions, we'll use the Algorand Indexer API
          try {
            const indexerUrl = 'https://testnet-idx.algonode.cloud';
            const txnResponse = await fetch(`${indexerUrl}/v2/accounts/${WALLET_ADDRESS}/transactions?limit=10`);
            const txnData = await txnResponse.json();
            
            if (txnData.transactions && txnData.transactions.length > 0) {
              const formattedReceipts = txnData.transactions.map((tx) => {
                const txAmount = tx['payment-transaction']?.amount || 0;
                const roundTime = tx['round-time'] || 0;
                
                return {
                  receiptId: tx.id,
                  type: tx['tx-type'] === 'pay' ? 'payment' : tx['tx-type'],
                  amountAlgo: (txAmount / 1000000).toFixed(6),
                  created_at: new Date(roundTime * 1000).toLocaleString(),
                  listingID: tx['tx-type']
                };
              });
              setReceipts(formattedReceipts);
            } else {
              setReceipts([]);
            }
          } catch (txError) {
            console.log('Could not fetch transactions:', txError.message);
            setReceipts([]);
          }
          
          // Fetch NFTs (assets owned by the account)
          if (accountInfo.assets && accountInfo.assets.length > 0) {
            const nftPromises = accountInfo.assets.map(async (asset) => {
              try {
                const assetInfo = await algodClient.getAssetByID(asset['asset-id']).do();
                // Handle BigInt for asset amounts
                const assetAmount = typeof asset.amount === 'bigint' ? Number(asset.amount) : asset.amount;
                return {
                  id: asset['asset-id'],
                  amount: assetAmount,
                  name: assetInfo.params.name || `Asset #${asset['asset-id']}`,
                  unitName: assetInfo.params['unit-name'] || 'NFT',
                  url: assetInfo.params.url || null,
                  decimals: assetInfo.params.decimals || 0
                };
              } catch (err) {
                console.error('Error fetching asset info:', err);
                return null;
              }
            });
            const nftData = await Promise.all(nftPromises);
            setNfts(nftData.filter(nft => nft !== null));
          } else {
            setNfts([]);
          }
        } catch (algoError) {
          // Account might not be funded yet
          console.log('Account not found on chain (not funded yet):', algoError.message);
          setBalance(0);
          setReceipts([]);
          setNfts([]);
        }
      } else {
        // Use pooled wallet - fetch directly from blockchain
        const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');
        
        try {
          const accountInfo = await algodClient.accountInformation(WALLET_ADDRESS).do();
          // Convert BigInt to Number for balance
          const amountValue = typeof accountInfo.amount === 'bigint' ? Number(accountInfo.amount) : accountInfo.amount;
          setBalance(amountValue / 1000000);
          console.log('Pooled wallet balance:', amountValue / 1000000, 'ALGO');
          
          // Fetch recent transactions from indexer
          try {
            const indexerUrl = 'https://testnet-idx.algonode.cloud';
            const txnResponse = await fetch(`${indexerUrl}/v2/accounts/${WALLET_ADDRESS}/transactions?limit=10`);
            const txnData = await txnResponse.json();
            
            if (txnData.transactions && txnData.transactions.length > 0) {
              const formattedReceipts = txnData.transactions.map((tx) => ({
                receiptId: tx.id,
                type: tx['tx-type'] === 'pay' ? 'payment' : tx['tx-type'],
                amountAlgo: tx['payment-transaction'] ? (tx['payment-transaction'].amount / 1000000).toFixed(6) : '0',
                created_at: new Date(tx['round-time'] * 1000).toLocaleString(),
                listingID: tx['tx-type']
              }));
              setReceipts(formattedReceipts);
            } else {
              setReceipts([]);
            }
          } catch (txError) {
            console.log('Could not fetch transactions:', txError.message);
            setReceipts([]);
          }
        } catch (accountError) {
          console.error('Error fetching pooled account:', accountError);
          setBalance(0);
          setReceipts([]);
        }
        
        // Fetch NFTs from pooled wallet on blockchain
        try {
          const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');
          console.log('Fetching NFTs for address:', WALLET_ADDRESS);
          const accountInfo = await algodClient.accountInformation(WALLET_ADDRESS).do();
          
          console.log('Account info received:', {
            address: accountInfo.address,
            amount: accountInfo.amount,
            assetsCount: accountInfo.assets?.length || 0,
            hasAssets: !!accountInfo.assets,
            assets: accountInfo.assets
          });
          console.log('Pooled wallet NFT fetch - assets found:', accountInfo.assets?.length || 0);
          
          if (accountInfo.assets && accountInfo.assets.length > 0) {
            const nftPromises = accountInfo.assets.map(async (asset) => {
              try {
                console.log('Fetching asset info for:', asset['asset-id']);
                const assetInfo = await algodClient.getAssetByID(asset['asset-id']).do();
                // Handle BigInt for asset amounts
                const assetAmount = typeof asset.amount === 'bigint' ? Number(asset.amount) : asset.amount;
                const nftData = {
                  id: asset['asset-id'],
                  amount: assetAmount,
                  name: assetInfo.params.name || `Asset #${asset['asset-id']}`,
                  unitName: assetInfo.params['unit-name'] || 'NFT',
                  url: assetInfo.params.url || null,
                  decimals: assetInfo.params.decimals || 0
                };
                console.log('NFT data:', nftData);
                return nftData;
              } catch (err) {
                console.error('Error fetching asset info:', err);
                return null;
              }
            });
            const nftData = await Promise.all(nftPromises);
            const validNfts = nftData.filter(nft => nft !== null);
            console.log('Setting NFTs:', validNfts);
            setNfts(validNfts);
          } else {
            console.log('No assets found on pooled wallet');
            setNfts([]);
          }
        } catch (nftError) {
          console.error('Error fetching NFTs for pooled wallet:', nftError);
          setNfts([]);
        }
      }

      // Mock USDC for now
      setUsdcBalance(0);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setBalance(0);
      setUsdcBalance(0);
      setReceipts([]);
      setLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(WALLET_ADDRESS);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 2000);
  };

  const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / centerY * -8;
    const rotateY = (x - centerX) / centerX * 8;
    
    setCardRotate({ x: rotateX, y: rotateY });
  };

  const handleCardMouseLeave = () => {
    setCardRotate({ x: 0, y: 0 });
  };

  const completeOnboarding = () => {
    localStorage.setItem('algoPayOnboarded', 'true');
    setShowOnboarding(false);
    fetchWalletData();
  };

  // Show onboarding if user hasn't completed it
  if (showOnboarding) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{
      background: 'radial-gradient(ellipse at top, #0f1729 0%, #000000 50%, #000000 100%)'
    }}>
      {/* Ambient Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-indigo-900/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-slate-900/20 rounded-full blur-3xl"></div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }

        .glass {
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.15), rgba(15, 23, 42, 0.3));
          backdrop-filter: blur(30px);
          border: 1px solid rgba(59, 130, 246, 0.15);
          box-shadow: 
            0 8px 32px 0 rgba(0, 0, 0, 0.37),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
        }

        .glass-strong {
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.2), rgba(15, 23, 42, 0.4));
          backdrop-filter: blur(40px);
          border: 1px solid rgba(59, 130, 246, 0.2);
          box-shadow: 
            0 12px 40px 0 rgba(0, 0, 0, 0.45),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.08);
        }

        .glass-hover:hover {
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.25), rgba(15, 23, 42, 0.45));
          border-color: rgba(59, 130, 246, 0.3);
          box-shadow: 
            0 16px 48px 0 rgba(0, 0, 0, 0.5),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
        }

        .action-btn {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .action-btn:hover {
          transform: translateY(-2px);
        }

        .action-btn:active {
          transform: scale(0.95);
        }

        .fade-in {
          animation: fadeIn 0.5s ease-out;
        }

        .slide-up {
          animation: slideUp 0.6s ease-out;
        }

        .card-3d {
          perspective: 1000px;
          transform-style: preserve-3d;
          transition: transform 0.3s ease-out;
        }

        .card-shine {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          pointer-events: none;
          border-radius: 24px;
          opacity: 0.5;
        }

        .card-border {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.05));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          pointer-events: none;
        }


        .btn-primary {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
          transition: all 0.3s ease;
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08));
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .floating {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      <div className="px-5 pb-28 max-w-lg mx-auto relative z-10">
      {/* Header */}
        <div className="pt-6 pb-3 flex items-center justify-between fade-in">
          <div className="flex items-center gap-2">
            <Link to="/profile">
              <button className="w-8 h-8 rounded-full glass glass-hover flex items-center justify-center transition-all active:scale-95 overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                  {(() => {
                    const name = localStorage.getItem('algoPayUsername') || 'User';
                    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  })()}
        </div>
              </button>
            </Link>
      </div>

          <div className="flex items-center gap-1.5">
            <button className="p-1.5 glass glass-hover rounded-lg transition-all active:scale-95 relative">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-200/70">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            </button>
            
            <button 
              className="p-1.5 glass glass-hover rounded-lg transition-all active:scale-95"
              onClick={() => setBalanceVisible(!balanceVisible)}
            >
              {balanceVisible ? <Eye size={14} className="text-blue-200/70" /> : <EyeOff size={14} className="text-blue-200/70" />}
            </button>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="mb-6 fade-in">
          <h2 className="text-2xl font-bold text-white mb-1">
            Hello, {localStorage.getItem('algoPayUsername') || 'User'} 👋
          </h2>
          <p className="text-sm text-blue-200/60">
            Here's your wallet overview
          </p>
        </div>

        {/* Credit Card Style Balance */}
        <div className="mb-5 slide-up">
          <div 
            className="card-3d relative cursor-pointer"
            style={{
              transform: `rotateX(${cardRotate.x}deg) rotateY(${cardRotate.y}deg) scale3d(1, 1, 1)`
            }}
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
          >
            <div className="relative glass-strong rounded-3xl p-6 overflow-hidden" style={{
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.6) 50%, rgba(20, 30, 48, 0.5) 100%)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 1px rgba(59, 130, 246, 0.3) inset, 0 1px 0 rgba(255, 255, 255, 0.1) inset',
              minHeight: '280px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div className="card-border"></div>
              <div className="card-shine"></div>
              
              <div className="relative z-10 flex flex-col flex-1">
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="text-lg font-semibold text-white tracking-tight">
                    AlgoPay
                  </div>
                  {/* Contactless Icon */}
                  <svg className="w-6 h-6 text-white opacity-90" viewBox="0 0 20 24" fill="none">
                    <path d="M15.1429 1.28571C17.0236 4.54326 18.0138 8.23849 18.0138 12C18.0138 15.7615 17.0236 19.4567 15.1429 22.7143M10.4286 3.64285C11.8956 6.18374 12.6679 9.06602 12.6679 12C12.6679 14.934 11.8956 17.8162 10.4286 20.3571M5.92859 5.80713C6.98933 7.66394 7.54777 9.77022 7.54777 11.9143C7.54777 14.0583 6.98933 16.1646 5.92859 18.0214M1.42859 8.14285C2.19306 9.29983 2.59834 10.6362 2.59834 12C2.59834 13.3638 2.19306 14.7002 1.42859 15.8571" stroke="currentColor" strokeWidth="2.57143" strokeLinecap="round"/>
                  </svg>
                </div>

                {/* Chip */}
                <div className="mb-6">
                  <svg className="w-12 h-auto opacity-90" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 308 240" fill="white">
                      <path d="M0 0 C1.48746068 -0.00599243 2.97491827 -0.01279961 4.46237183 -0.02035522 C8.48538673 -0.03795247 12.50831643 -0.04270802 16.53136611 -0.0439868 C19.05086564 -0.04541283 21.57034382 -0.04969102 24.08983803 -0.05498123 C32.89698271 -0.07346268 41.70406704 -0.08165445 50.51123047 -0.08007812 C58.69212136 -0.07887812 66.87274784 -0.09995758 75.05357188 -0.13156545 C82.10017505 -0.15781082 89.14669233 -0.16844193 96.19334394 -0.16716731 C100.39173368 -0.16665998 104.58988838 -0.17221493 108.78822899 -0.19352341 C112.74219897 -0.21304506 116.69571307 -0.21293648 120.64970016 -0.19849014 C122.09071719 -0.19641788 123.5317638 -0.20100714 124.97273064 -0.21321106 C135.8068415 -0.29893387 147.86953682 0.59047115 156.69067383 7.66943359 C160.78249596 11.91469906 165.42306547 17.27893616 166.25317383 23.29052734 C164.44971629 25.09398488 161.69835733 24.4249188 159.26806641 24.43237305 C157.98615921 24.4394075 156.70425201 24.44644196 155.38349915 24.45368958 C154.69366755 24.45550547 154.00383595 24.45732136 153.29310036 24.45919228 C151.13635605 24.46634624 148.97984081 24.48200652 146.82316589 24.50053406 C140.6894352 24.55303908 134.55582532 24.60094 128.421875 24.61645508 C124.67276161 24.62656089 120.92421734 24.65595629 117.17532921 24.69777489 C115.74850466 24.71005959 114.32159958 24.71521075 112.89472389 24.71297646 C110.89150599 24.71061274 108.88831146 24.73504293 106.88525391 24.76049805 C105.17768669 24.76929741 105.17768669 24.76929741 103.43562317 24.77827454 C99.35908229 25.43444194 97.37188249 26.57725903 94.25317383 29.29052734 C92.93317383 31.93052734 91.61317383 34.57052734 90.25317383 37.29052734 C71.77317383 37.62052734 53.29317383 37.95052734 34.25317383 38.29052734 C32.60317383 35.32052734 30.95317383 32.35052734 29.25317383 29.29052734 C25.1340461 25.17139961 22.55217477 25.16111343 16.94580078 25.08520508 C15.6446785 25.06525986 14.34355621 25.04531464 13.00300598 25.02476501 C11.58249023 25.00778189 10.16197322 24.99090304 8.74145508 24.97412109 C7.28842077 24.95354597 5.83539237 24.93254935 4.38237 24.91114807 C0.56017853 24.85598501 -3.26206643 24.80655036 -7.08435059 24.75830078 C-10.98556269 24.70804362 -14.88669722 24.65237957 -18.7878418 24.59716797 C-26.44077087 24.48965693 -34.0937645 24.38819636 -41.74682617 24.29052734 C-42.07682617 23.63052734 -42.40682617 22.97052734 -42.74682617 22.29052734 C-38.97603798 14.25710901 -33.16858669 6.82022473 -24.99682617 3.04443359 C-16.57361134 0.22207168 -8.84190103 -0.00712688 0 0 Z " transform="translate(89.746826171875,37.70947265625)"></path>
                      <path d="M0 0 C18.48 0 36.96 0 56 0 C57.65 3.3 59.3 6.6 61 10 C64.69151672 13.22916998 67.80960413 13.38632509 72.6262207 13.43237305 C73.27068649 13.4425647 73.91515228 13.45275635 74.57914734 13.46325684 C76.69478156 13.49328582 78.80996229 13.50263669 80.92578125 13.51171875 C82.39838656 13.52857304 83.87097755 13.5467243 85.34355164 13.56611633 C89.20846074 13.6135415 93.07331177 13.64339895 96.93841553 13.66955566 C100.88679471 13.69939919 104.83497394 13.74591642 108.78320312 13.79101562 C116.52203604 13.87696346 124.26088363 13.94434627 132 14 C130.5490793 22.02584331 125.25181247 27.03529128 119.41796875 32.45703125 C111.01549497 37.81886831 101.94093793 37.4356043 92.35766602 37.40405273 C90.78637204 37.40976338 89.2150822 37.41673032 87.64379883 37.42485046 C83.39786762 37.44271995 79.15214378 37.4416253 74.90618634 37.43590808 C71.35264296 37.43280732 67.79913889 37.43891849 64.24560112 37.44494683 C55.85828057 37.45896994 47.47106193 37.45744913 39.08374023 37.44604492 C30.45003633 37.43456465 21.8166431 37.44864284 13.18298012 37.4754414 C5.75168383 37.49763857 -1.67951522 37.50422677 -9.11084229 37.49836498 C-13.54105166 37.49500395 -17.97106192 37.49735352 -22.40124321 37.51461601 C-26.56863122 37.53014744 -30.73556091 37.52606148 -34.90293121 37.50731087 C-36.42582935 37.50364212 -37.94876192 37.5066831 -39.47162819 37.51719666 C-50.47369498 37.58731133 -60.03611274 36.56500638 -68.3984375 28.77734375 C-72.3596636 24.38134893 -75.67125555 19.80243717 -77 14 C-75.77970596 13.99453156 -75.77970596 13.99453156 -74.53475952 13.98895264 C-66.85453463 13.95102957 -59.17479252 13.89412854 -51.49487877 13.81609726 C-47.54686231 13.77664803 -43.59906803 13.74444729 -39.65087891 13.72900391 C-35.83805013 13.71382007 -32.02583225 13.67934507 -28.21327591 13.63169098 C-26.76134181 13.61689476 -25.30932049 13.60895999 -23.85731125 13.60811615 C-21.81746638 13.60573918 -19.77929995 13.57860688 -17.73974609 13.54589844 C-16.00100723 13.53257477 -16.00100723 13.53257477 -14.22714233 13.51898193 C-10.08942913 12.853564 -8.16433363 11.76717621 -5 9 C-3.35 6.03 -1.7 3.06 0 0 Z " transform="translate(124,168)"></path>
                      <path d="M0 0 C0.96787949 -0.0127597 1.93575897 -0.02551941 2.93296814 -0.03866577 C3.97675125 -0.04089142 5.02053436 -0.04311707 6.09594727 -0.04541016 C7.16982193 -0.05206696 8.24369659 -0.05872375 9.35011292 -0.06558228 C11.6222258 -0.07571168 13.89436846 -0.08039921 16.16650391 -0.08007812 C19.64543574 -0.08445139 23.12309934 -0.12076963 26.60180664 -0.15869141 C28.8081825 -0.1645594 31.0145644 -0.16852891 33.22094727 -0.17041016 C34.26270615 -0.18478119 35.30446503 -0.19915222 36.37779236 -0.21395874 C37.34882401 -0.20780548 38.31985565 -0.20165222 39.3203125 -0.1953125 C40.17286118 -0.19816254 41.02540985 -0.20101257 41.90379333 -0.20394897 C45.15262662 0.48817919 46.28607446 1.61213484 48.22485352 4.29052734 C48.73278809 7.32617188 48.73278809 7.32617188 48.74243164 10.92333984 C48.74944092 11.58074158 48.7564502 12.23814331 48.76367188 12.91546631 C48.78123783 15.08258651 48.76963587 17.24839451 48.75610352 19.41552734 C48.75879888 20.92480723 48.76268167 22.43408542 48.7677002 23.94335938 C48.77359328 27.10417234 48.76503902 30.26453268 48.74633789 33.42529297 C48.72354771 37.47421292 48.73667191 41.52207232 48.76062775 45.57095337 C48.77509129 48.68684867 48.77047735 51.80249308 48.76011658 54.918396 C48.75745079 56.41111375 48.76071389 57.90385438 48.77003479 59.39654541 C48.78021047 61.48421438 48.7646892 63.57017309 48.74243164 65.65771484 C48.73765808 67.43831299 48.73765808 67.43831299 48.73278809 69.25488281 C48.22485352 72.29052734 48.22485352 72.29052734 46.4990387 74.67372131 C43.84515364 76.56047064 42.54690766 76.79160744 39.3203125 76.79223633 C38.34928085 76.80161728 37.37824921 76.81099823 36.37779236 76.82066345 C34.81515404 76.80381248 34.81515404 76.80381248 33.22094727 76.78662109 C31.60870018 76.78880394 31.60870018 76.78880394 29.96388245 76.79103088 C27.69350471 76.78937192 25.42311572 76.77781106 23.15283203 76.75708008 C19.67179797 76.72810595 16.19228458 76.73647572 12.71118164 76.74951172 C10.50609609 76.743275 8.30101536 76.73488458 6.09594727 76.72412109 C5.05216415 76.72705673 4.00838104 76.72999237 2.93296814 76.73301697 C1.96508865 76.72033279 0.99720917 76.70764862 0 76.69458008 C-0.85175308 76.68917709 -1.70350616 76.68377411 -2.58106995 76.6782074 C-4.77514648 76.29052734 -4.77514648 76.29052734 -6.54933167 75.19192505 C-8.40966285 72.3063102 -8.15681292 69.87348037 -8.16333008 66.46411133 C-8.16858704 65.77438232 -8.17384399 65.08465332 -8.17926025 64.37402344 C-8.19246222 62.09465885 -8.18372301 59.81599275 -8.17358398 57.53662109 C-8.17560445 55.95386114 -8.17851565 54.3711021 -8.18228149 52.78834534 C-8.1867049 49.47200656 -8.18027258 46.15591021 -8.16625977 42.83959961 C-8.14915368 38.58323887 -8.15901761 34.32744502 -8.17697716 30.071105 C-8.18780278 26.80348923 -8.18437458 23.53600853 -8.17659378 20.26838875 C-8.1745891 18.69865922 -8.17706042 17.12891752 -8.18403244 15.55920219 C-8.1916287 13.36831909 -8.18007049 11.17836267 -8.16333008 8.98754883 C-8.15974991 7.11582253 -8.15974991 7.11582253 -8.15609741 5.20628357 C-8.03038361 4.24408401 -7.9046698 3.28188446 -7.77514648 2.29052734 C-4.5672279 0.15191495 -3.69400397 0.0330631 0 0 Z " transform="translate(131.775146484375,83.70947265625)"></path>
                      <path d="M0 0 C22.11 0 44.22 0 67 0 C69.71462072 5.42924145 70.446876 8.33190621 70.3984375 14.06640625 C70.40130768 14.82291977 70.40417786 15.57943329 70.40713501 16.35887146 C70.40916674 17.94978591 70.4036995 19.54072584 70.39111328 21.1315918 C70.37502319 23.55900092 70.39100259 25.98475099 70.41015625 28.41210938 C70.4081741 29.96354532 70.40433099 31.51498023 70.3984375 33.06640625 C70.40451019 33.78735977 70.41058289 34.50831329 70.4168396 35.25111389 C70.35575752 39.64977188 69.78157175 42.54243688 67 46 C63.75954656 47.08015115 61.40837146 47.12690367 57.99975586 47.12939453 C56.14784889 47.13412277 56.14784889 47.13412277 54.25852966 47.13894653 C52.910634 47.13715683 51.56273865 47.1351059 50.21484375 47.1328125 C48.83386722 47.13348609 47.4528908 47.13445657 46.07191467 47.13571167 C43.17936065 47.13718557 40.28683753 47.13504361 37.39428711 47.13037109 C33.68290472 47.12466864 29.97159456 47.127958 26.26021481 47.13394356 C23.40954542 47.1375529 20.55889324 47.13640896 17.70822334 47.13381577 C16.33945266 47.13314781 14.97068042 47.13397036 13.60191154 47.13629532 C11.69155786 47.13882847 9.78119871 47.13428447 7.87084961 47.12939453 C6.78291611 47.12859894 5.6949826 47.12780334 4.57408142 47.12698364 C2 47 2 47 0 46 C0 30.82 0 15.64 0 0 Z " transform="translate(45,71)"></path>
                      <path d="M0 0 C1.26834183 -0.00960754 2.53668365 -0.01921509 3.84346008 -0.02911377 C5.23963238 -0.03396189 6.63580675 -0.03824068 8.03198242 -0.04199219 C9.45586653 -0.04774198 10.8797506 -0.05349973 12.30363464 -0.05926514 C15.29389813 -0.06978563 18.28413466 -0.07562104 21.27441406 -0.07910156 C25.10461425 -0.08458067 28.93445791 -0.10859134 32.76454639 -0.13707352 C35.70795222 -0.15570869 38.65127245 -0.16090601 41.59473228 -0.16243744 C43.00652701 -0.16546385 44.41832024 -0.17349207 45.83005714 -0.18662262 C47.80720609 -0.20369525 49.78450155 -0.19995629 51.76171875 -0.1953125 C52.88677322 -0.19895813 54.0118277 -0.20260376 55.17097473 -0.20635986 C58.42015983 0.20481831 59.77427544 0.86418247 62.07495117 3.16113281 C63.28552255 6.79284696 63.25618506 10.15160916 63.27807617 13.93457031 C63.28377625 14.69532867 63.28947632 15.45608704 63.29534912 16.23989868 C63.30478865 17.84872043 63.31132895 19.45756143 63.31518555 21.06640625 C63.32488818 23.52020197 63.35591897 25.97315871 63.38745117 28.42675781 C63.39398202 29.99185702 63.39923217 31.5569622 63.40307617 33.12207031 C63.41542297 33.852435 63.42776978 34.58279968 63.44049072 35.33529663 C63.41928548 40.21542094 62.58703559 43.6490484 59.07495117 47.16113281 C57.05544908 47.26048429 55.03244202 47.28912789 53.01049805 47.29052734 C51.06342957 47.29525558 51.06342957 47.29525558 49.07702637 47.30007935 C47.64925096 47.29828957 46.22147586 47.29623861 44.79370117 47.29394531 C43.3402098 47.29461839 41.88671853 47.29558845 40.43322754 47.29684448 C37.38328991 47.29832127 34.33338151 47.29616751 31.28344727 47.29150391 C27.36564558 47.28580662 23.44791239 47.28908572 19.53011322 47.29507637 C16.52764363 47.2986825 13.5251904 47.29754316 10.52272034 47.29494858 C9.07776379 47.29427945 7.63280579 47.29510723 6.18785095 47.29742813 C4.17170234 47.29995546 2.15554855 47.29542333 0.1394043 47.29052734 C-1.5848175 47.28933395 -1.5848175 47.28933395 -3.34387207 47.28811646 C-5.92504883 47.16113281 -5.92504883 47.16113281 -6.92504883 46.16113281 C-7.02309734 44.75438061 -7.05303069 43.34278146 -7.05444336 41.93261719 C-7.05759552 41.03498657 -7.06074768 40.13735596 -7.06399536 39.21252441 C-7.06197113 38.23650269 -7.0599469 37.26048096 -7.05786133 36.25488281 C-7.05881805 35.25984741 -7.05977478 34.26481201 -7.0607605 33.23962402 C-7.06144243 31.13126563 -7.05958726 29.02290516 -7.05541992 26.91455078 C-7.05007186 23.67508254 -7.0553645 20.43575296 -7.06176758 17.19628906 C-7.0611068 15.15332 -7.05982564 13.11035103 -7.05786133 11.06738281 C-7.05988556 10.09136108 -7.06190979 9.11533936 -7.06399536 8.10974121 C-7.0608432 7.2121106 -7.05769104 6.31447998 -7.05444336 5.38964844 C-7.05364777 4.59546509 -7.05285217 3.80128174 -7.05203247 2.98303223 C-6.76700365 -1.10642242 -3.36370567 0.02045787 0 0 Z " transform="translate(51.925048828125,125.8388671875)"></path>
                      <path d="M0 0 C1.27779831 -0.00292557 2.55559662 -0.00585114 3.87211609 -0.00886536 C5.26216337 0.00824448 6.6522035 0.02594333 8.04223633 0.04418945 C9.46901494 0.0491141 10.89580001 0.0524125 12.32258606 0.05415344 C15.30771626 0.06178488 18.29236549 0.08232325 21.27734375 0.11328125 C25.11100366 0.15296337 28.94435154 0.17090776 32.77819347 0.18059063 C36.42875032 0.1905418 40.07923035 0.21044084 43.72973633 0.23168945 C44.7796428 0.23678308 44.7796428 0.23678308 45.85075951 0.2419796 C47.82111885 0.25350585 49.79142658 0.27302999 51.76171875 0.29296875 C52.88438644 0.30281296 54.00705414 0.31265717 55.16374207 0.32279968 C57.68676758 0.4699707 57.68676758 0.4699707 58.68676758 1.4699707 C58.77972573 2.91286857 58.80423271 4.36026855 58.80029297 5.80615234 C58.80017967 7.18747093 58.80017967 7.18747093 58.80006409 8.59669495 C58.7949028 9.59772751 58.78974152 10.59876007 58.78442383 11.63012695 C58.78300888 12.64973007 58.78159393 13.66933319 58.78013611 14.71983337 C58.77451855 17.99074178 58.76196308 21.26158283 58.74926758 24.5324707 C58.74425484 26.74405826 58.73969154 28.95564688 58.7355957 31.16723633 C58.72454341 36.60150427 58.70778821 42.03573268 58.68676758 47.4699707 C50.28095991 47.56267023 41.87536597 47.63373484 33.46917343 47.67721939 C29.5657724 47.6980904 25.66272118 47.72639827 21.75952148 47.77172852 C17.99234837 47.81520498 14.22551163 47.83911148 10.45810699 47.84947968 C9.02115839 47.85686794 7.58422811 47.87129577 6.14742279 47.89289093 C4.13435332 47.92194273 2.12094505 47.92360475 0.10766602 47.92407227 C-1.03816956 47.93295471 -2.18400513 47.94183716 -3.36456299 47.95098877 C-6.98900483 47.35973158 -8.15782212 46.40340322 -10.31323242 43.4699707 C-10.82116699 41.53527832 -10.82116699 41.53527832 -10.83081055 39.49926758 C-10.84341919 38.73167114 -10.85602783 37.96407471 -10.86901855 37.17321777 C-10.86092163 36.35333374 -10.85282471 35.53344971 -10.84448242 34.6887207 C-10.84830933 33.83822144 -10.85213623 32.98772217 -10.8560791 32.1114502 C-10.85879701 30.31606867 -10.85144425 28.52064746 -10.8347168 26.7253418 C-10.81330409 23.97916277 -10.83452113 21.23559973 -10.86010742 18.48950195 C-10.85746412 16.74340244 -10.8523391 14.99730455 -10.84448242 13.2512207 C-10.85257935 12.43133667 -10.86067627 11.61145264 -10.86901855 10.76672363 C-10.85640991 9.9991272 -10.84380127 9.23153076 -10.83081055 8.44067383 C-10.82762817 7.76879028 -10.8244458 7.09690674 -10.82116699 6.40466309 C-9.32836151 0.71865632 -5.26379908 -0.02744642 0 0 Z " transform="translate(199.313232421875,125.530029296875)"></path>
                      <path d="M0 0 C0.9662606 -0.00065712 0.9662606 -0.00065712 1.95204163 -0.00132751 C4.07877029 0.00076058 6.2047081 0.02409104 8.33129883 0.04760742 C9.80674305 0.05320334 11.28219286 0.05747346 12.75764465 0.06047058 C16.63922542 0.0719198 20.52046891 0.10138731 24.4019165 0.13458252 C29.0599648 0.17068034 33.71812594 0.18444423 38.37627411 0.20194244 C45.4513606 0.23102501 52.5257072 0.28851067 59.60083008 0.34057617 C59.60083008 15.52057617 59.60083008 30.70057617 59.60083008 46.34057617 C55.02781688 46.99386377 51.15907096 47.46834075 46.63720703 47.48583984 C45.50946365 47.4922197 44.38172028 47.49859955 43.21980286 47.50517273 C42.02167465 47.50628555 40.82354645 47.50739838 39.58911133 47.50854492 C38.34332809 47.51187332 37.09754486 47.51520172 35.81401062 47.51863098 C33.18916187 47.52368013 30.56430673 47.52603993 27.93945312 47.52587891 C25.24993226 47.5257972 22.56058009 47.53281167 19.87109375 47.54638672 C15.98537992 47.56465401 12.09986372 47.56961237 8.21411133 47.57104492 C6.40780998 47.5818232 6.40780998 47.5818232 4.5650177 47.59281921 C3.4467308 47.58974258 2.32844391 47.58666595 1.17626953 47.58349609 C-0.29763496 47.58563362 -0.29763496 47.58563362 -1.80131531 47.58781433 C-4.50755278 47.33026136 -6.12758103 46.81140323 -8.39916992 45.34057617 C-10.07795933 41.98299735 -9.58394055 38.19424519 -9.60229492 34.50073242 C-9.607995 33.62283554 -9.61369507 32.74493866 -9.61956787 31.84043884 C-9.62902143 29.98185432 -9.63555326 28.12325301 -9.6394043 26.26464844 C-9.64911928 23.41791679 -9.68014271 20.57190419 -9.71166992 17.7253418 C-9.71819898 15.92130963 -9.72344983 14.1172723 -9.72729492 12.31323242 C-9.73964172 11.46003922 -9.75198853 10.60684601 -9.76470947 9.72779846 C-9.74256952 3.86914253 -9.74256952 3.86914253 -8.27684021 1.61306763 C-5.50869943 -0.26289298 -3.32264063 -0.01898652 0 0 Z " transform="translate(198.399169921875,70.659423828125)"></path>
                      <path d="M0 0 C2 2 2 2 2.20254517 3.83499146 C2.18033905 4.57667572 2.15813293 5.31835999 2.13525391 6.08251953 C2.11508209 6.92324005 2.09491028 7.76396057 2.0741272 8.63015747 C2.04193085 9.53853363 2.0097345 10.44690979 1.9765625 11.3828125 C1.95153656 12.31221649 1.92651062 13.24162048 1.90072632 14.19918823 C1.81839355 17.17482261 1.72185562 20.14980631 1.625 23.125 C1.566774 25.13929613 1.50947044 27.15361914 1.453125 29.16796875 C1.31279498 34.11235505 1.15972168 39.05620366 1 44 C0.01 44.495 0.01 44.495 -1 45 C-1.02527124 38.75204325 -1.04283344 32.50409959 -1.05493164 26.25610352 C-1.05997298 24.12881986 -1.06680591 22.00153969 -1.07543945 19.87426758 C-1.08751379 16.82372174 -1.09323014 13.77322155 -1.09765625 10.72265625 C-1.10281754 9.76537125 -1.10797882 8.80808624 -1.11329651 7.8217926 C-1.11337204 6.94095505 -1.11344757 6.06011749 -1.11352539 5.15258789 C-1.115746 4.37315323 -1.11796661 3.59371857 -1.12025452 2.79066467 C-1 1 -1 1 0 0 Z " transform="translate(46,126)"></path>
                      <path d="M0 0 C-1.38081223 4.1424367 -3.59825558 5.32203099 -7 8 C-7 5 -7 5 -4.625 2.3125 C-2 0 -2 0 0 0 Z " transform="translate(61,44)"></path>
                  </svg>
                </div>

                {/* Spacer to push footer to bottom */}
                <div className="flex-1"></div>

                {/* Card Footer */}
          {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-10 h-10 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
                    {/* Main Balance - USD */}
                    <div className="mb-8">
                {balanceVisible ? (
                  <>
                          <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-bold tracking-tight text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                              ${balance ? (balance * 0.15 + (usdcBalance || 0)).toFixed(2) : '0.00'}
                            </span>
                            <span className="text-lg font-medium text-blue-200/80">USD</span>
                          </div>
                          <div className="text-sm text-blue-200/60 mt-2">
                            {balance !== null ? balance.toFixed(4) : '0.0000'} ALGO
                          </div>
                        </>
                      ) : (
                        <span className="text-5xl font-bold text-gray-600">••••••</span>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="flex items-end justify-between gap-4">
                      <div className="flex gap-5 flex-1 min-w-0">
                        <div className="flex flex-col gap-1">
                          <div className="text-[9px] uppercase tracking-[0.6px] text-white/70 font-semibold">Network</div>
                          <div className="text-[13px] uppercase font-semibold tracking-[0.6px] text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                            TestNet
                          </div>
                        </div>
                      </div>
                      
                      {/* Algorand Logo */}
                      <div className="flex items-center justify-center rounded-lg px-3 py-2 h-8" style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)'
                      }}>
                        <svg className="w-[46px] h-auto" viewBox="0 0 113 20" fill="white" style={{ filter: 'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2))' }}>
                          <path d="M10.8096 0L0 20H4.8192L6.3936 16.64H14.9856L13.8528 14.24H7.632L12.384 4.8L18.5904 20H23.4096L15.624 0H10.8096Z"/>
                          <path d="M26.4 0V20H30.88V0H26.4Z"/>
                          <path d="M47.9104 10.1136C47.9104 4.544 44.2912 0 37.9488 0C31.632 0 27.8496 4.544 27.8496 10.016C27.8496 15.488 31.632 20 37.9488 20C43.2672 20 47.3696 16.864 47.8272 11.776H43.3184C42.9632 14.464 40.8672 16.064 37.9488 16.064C34.1312 16.064 32.288 13.216 32.288 10.016C32.288 6.816 34.1312 3.936 37.9488 3.936C40.8672 3.936 42.9632 5.536 43.3184 8.224H47.8272C47.3696 3.136 43.2672 0 37.9488 0"/>
                          <path d="M63.264 10C63.264 4.48 59.392 0 52.96 0C46.528 0 42.656 4.48 42.656 10C42.656 15.52 46.528 20 52.96 20C59.392 20 63.264 15.52 63.264 10ZM58.816 10C58.816 13.2 56.992 16.064 52.96 16.064C48.928 16.064 47.104 13.2 47.104 10C47.104 6.8 48.928 3.936 52.96 3.936C56.992 3.936 58.816 6.8 58.816 10Z"/>
                          <path d="M64.896 20H69.376V12.672C69.376 9.344 70.912 6.912 74.304 6.912C75.616 6.912 76.576 7.168 77.52 7.52V3.36C76.864 3.104 76.016 2.944 75.008 2.944C72.144 2.944 70.24 4.4 69.376 6.784V0H64.896V20Z"/>
                          <path d="M81.312 3.36V20H85.792V3.36H81.312ZM81.312 0H85.792V3.36H81.312V0Z"/>
                          <path d="M98.784 0V6.112H95.968V9.6H98.784V20H103.264V9.6H107.424V6.112H103.264V0H98.784Z"/>
                        </svg>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Compact Grid */}
        <div className="grid grid-cols-5 gap-1.5 mb-8 slide-up" style={{ animationDelay: '0.1s' }}>
          <Link to="/send" className="action-btn flex items-center justify-center glass glass-hover rounded-lg p-3">
            <Send size={20} className="text-blue-100" />
          </Link>
          
          <Link to="/receive" className="action-btn flex items-center justify-center glass glass-hover rounded-lg p-3">
            <Download size={20} className="text-blue-100" />
          </Link>
          
          <Link to="/create-nft" className="action-btn flex items-center justify-center glass glass-hover rounded-lg p-3">
            <PlusCircle size={20} className="text-blue-100" />
          </Link>
          
          <Link to="/qr-scan" className="action-btn flex items-center justify-center glass glass-hover rounded-lg p-3">
            <ScanLine size={20} className="text-blue-100" />
          </Link>
          
          <button className="action-btn flex items-center justify-center glass glass-hover rounded-lg p-3">
            <ArrowDownUp size={20} className="text-blue-100" />
          </button>
        </div>

        {/* Assets Section */}
        <div className="mb-8 slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-medium text-blue-300/80">Assets</h3>
            <span className="text-xs text-blue-400/50">2 tokens</span>
          </div>
          
          <div className="space-y-2">
            {/* ALGO Token */}
            <Link to="/asset/algo" className="block w-full">
              <button className="w-full glass glass-hover rounded-xl p-3.5 transition-all active:scale-[0.98] group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl glass-strong flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    Ⱥ
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white text-sm">Algorand</div>
                    <div className="text-xs text-blue-300/60 flex items-center gap-1.5">
                      <span>ALGO</span>
                      {priceChanges.algo.trending === 'up' && (
                        <span className="flex items-center gap-0.5 text-green-400">
                          <TrendingUp size={10} />
                          <span className="font-semibold">+{priceChanges.algo.change24h.toFixed(2)}%</span>
                        </span>
                      )}
                      {priceChanges.algo.trending === 'down' && (
                        <span className="flex items-center gap-0.5 text-red-400">
                          <TrendingDown size={10} />
                          <span className="font-semibold">{priceChanges.algo.change24h.toFixed(2)}%</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-white text-sm">
                    {balanceVisible ? (balance !== null ? balance.toFixed(4) : '0.0000') : '••••••'}
                  </div>
                  <div className="text-xs text-blue-300/50">
                    ${balance ? (balance * 0.15).toFixed(2) : '0.00'}
            </div>
            </div>
              </div>
              </button>
            </Link>

            {/* USDC Token */}
            <Link to="/asset/usdc" className="block w-full">
              <button className="w-full glass glass-hover rounded-xl p-3.5 transition-all active:scale-[0.98] group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl glass-strong flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none">
                      <circle cx="16" cy="16" r="16" fill="#2775CA"/>
                      <path d="M20.5 18.75C20.5 15.85 18.55 14.95 15.45 14.55C13.25 14.25 12.75 13.65 12.75 12.55C12.75 11.45 13.45 10.85 15.05 10.85C16.45 10.85 17.15 11.25 17.55 12.15C17.65 12.35 17.85 12.45 18.05 12.45H18.95C19.25 12.45 19.45 12.25 19.45 11.95V11.85C19.05 10.35 17.85 9.25 16.25 9.05V7.45C16.25 7.15 16.05 6.95 15.75 6.95H14.75C14.45 6.95 14.25 7.15 14.25 7.45V9.05C12.05 9.35 10.75 10.65 10.75 12.65C10.75 15.45 12.65 16.35 15.75 16.75C17.75 17.05 18.45 17.45 18.45 18.75C18.45 20.05 17.45 20.85 15.95 20.85C13.95 20.85 13.35 20.15 13.15 19.15C13.05 18.85 12.85 18.75 12.55 18.75H11.65C11.35 18.75 11.15 18.95 11.15 19.25V19.35C11.45 21.15 12.65 22.35 14.25 22.65V24.25C14.25 24.55 14.45 24.75 14.75 24.75H15.75C16.05 24.75 16.25 24.55 16.25 24.25V22.65C18.55 22.35 20.5 21.05 20.5 18.75Z" fill="white"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white text-sm">USD Coin</div>
                    <div className="text-xs text-blue-300/60 flex items-center gap-1.5">
                      <span>USDC</span>
                      {priceChanges.usdc.trending === 'up' && (
                        <span className="flex items-center gap-0.5 text-green-400">
                          <TrendingUp size={10} />
                          <span className="font-semibold">+{priceChanges.usdc.change24h.toFixed(2)}%</span>
                        </span>
                      )}
                      {priceChanges.usdc.trending === 'down' && (
                        <span className="flex items-center gap-0.5 text-red-400">
                          <TrendingDown size={10} />
                          <span className="font-semibold">{priceChanges.usdc.change24h.toFixed(2)}%</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-white text-sm">
                    {balanceVisible ? (usdcBalance !== null ? usdcBalance.toFixed(2) : '0.00') : '••••••'}
                  </div>
                  <div className="text-xs text-blue-300/50">
                    ${usdcBalance ? usdcBalance.toFixed(2) : '0.00'}
                  </div>
                </div>
            </div>
              </button>
            </Link>
          </div>

          {/* NFT Carousel */}
          {nfts.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-medium text-blue-300/80">NFTs</h3>
                <span className="text-xs text-blue-400/50">{nfts.length} collectibles</span>
              </div>
              
              <div className="relative">
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollBehavior: 'smooth' }}>
                  {nfts.map((nft) => (
                    <Link 
                      key={nft.id} 
                      to={`/asset/nft-${nft.id}`}
                      className="flex-shrink-0"
                    >
                      <div className="w-32 glass glass-hover rounded-xl p-3 transition-all hover:scale-105 active:scale-95">
                        <div className="w-full aspect-square rounded-lg mb-2 overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          {nft.url ? (
                            <img 
                              src={nft.url} 
                              alt={nft.name}
                              className="w-full h-full object-cover"
                              onError={(e) => e.target.style.display = 'none'}
                            />
                          ) : (
                            <span className="text-3xl">🖼️</span>
                          )}
                        </div>
                        <div className="text-xs font-medium text-white truncate">{nft.name}</div>
                        <div className="text-[10px] text-blue-300/60">{nft.unitName}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              
              <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                  display: none;
                }
                .scrollbar-hide {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
              `}</style>
            </div>
          )}
        </div>

        {/* Activity Section */}
        <div className="slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-medium text-blue-300/80">Recent Activity</h3>
            {receipts.length > 0 && (
              <a 
                href="https://explorer.perawallet.app/?network=testnet" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-400/60 hover:text-blue-300/80 transition-colors"
              >
                Explorer <ExternalLink size={11} />
              </a>
            )}
          </div>

          <div className="glass rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-gray-800 border-t-white rounded-full animate-spin"></div>
              </div>
            ) : receipts.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full glass-strong flex items-center justify-center">
                  <ScanLine size={20} className="text-blue-300/60" />
                </div>
                <p className="text-blue-200/60 text-sm mb-3">No transactions yet</p>
                <button className="text-xs text-blue-300/70 hover:text-white transition-colors">
                  Start transacting
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {receipts.slice(0, 5).map((receipt, index) => (
                  <button 
                    key={receipt.receiptId} 
                    className="w-full p-3.5 hover:bg-white/[0.03] transition-all active:scale-[0.99] group"
                    style={{ animationDelay: `${0.4 + index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl glass-strong flex items-center justify-center group-hover:scale-110 transition-transform">
                        {receipt.listingID === 'withdrawal' ? (
                          <Send size={16} className="text-blue-300/70" />
                        ) : (
                          <Download size={16} className="text-blue-300/70" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 text-left">
                        <div className="font-medium text-white text-sm">
                      {receipt.type === 'pool' 
                        ? 'Pool Payment'
                        : receipt.listingID === 'withdrawal'
                        ? 'Sent'
                        : 'Payment'}
                    </div>
                        <div className="text-xs text-blue-300/50">{receipt.created_at}</div>
                  </div>
                      
                      <div className="text-right">
                        <div className="font-medium text-white text-sm">
                          {receipt.amountAlgo ? `-${receipt.amountAlgo} ALGO` : 'N/A'}
                        </div>
                        <div className="text-[10px] text-blue-300/50">Confirmed</div>
                  </div>
                </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default App;
