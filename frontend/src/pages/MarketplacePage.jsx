import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Image as ImageIcon, Loader, AlertCircle } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const MarketplacePage = () => {
  const navigate = useNavigate();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMarketplaceNFTs();
  }, []);

  const fetchMarketplaceNFTs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:3000/api/marketplace/nfts');
      
      if (!response.ok) {
        throw new Error('Failed to fetch marketplace NFTs');
      }
      
      const data = await response.json();
      setNfts(data.nfts || []);
    } catch (err) {
      console.error('Error fetching marketplace NFTs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNFTClick = (nft) => {
    // Navigate to asset detail page with NFT info
    navigate(`/asset/${nft.assetId}`, {
      state: {
        asset: {
          id: nft.assetId,
          name: nft.name,
          unitName: nft.unitName,
          description: nft.description,
          imageUrl: nft.imageUrl,
          claimCode: nft.claimCode,
          creator: nft.creator,
          createdAt: nft.createdAt
        }
      }
    });
  };

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
        <h1 className="text-xl font-bold">NFT Marketplace</h1>
        <div className="w-10"></div>
      </div>

      <div className="max-w-6xl mx-auto p-6 pb-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <ShoppingBag size={28} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Available NFTs</h2>
              <p className="text-blue-200/70 text-sm">
                {loading ? 'Loading...' : `${nfts.length} ${nfts.length === 1 ? 'item' : 'items'} available`}
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <Loader size={48} className="text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-blue-200/70">Loading marketplace...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="glass rounded-2xl p-8 text-center" style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(15, 23, 42, 0.3))',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Error Loading Marketplace</h3>
            <p className="text-red-200/70 mb-4">{error}</p>
            <button
              onClick={fetchMarketplaceNFTs}
              className="px-6 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && nfts.length === 0 && (
          <div className="text-center py-20 glass rounded-2xl" style={{
            background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.15), rgba(15, 23, 42, 0.3))',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(59, 130, 246, 0.15)'
          }}>
            <div className="w-24 h-24 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center mb-6">
              <ShoppingBag size={48} className="text-blue-300" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">No NFTs Available</h2>
            <p className="text-blue-200/70 mb-6">
              Check back later or create your own NFT
            </p>
            <button
              onClick={() => navigate('/create-nft')}
              className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 transition-all font-semibold"
            >
              Create NFT
            </button>
          </div>
        )}

        {/* NFT Grid */}
        {!loading && !error && nfts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {nfts.map((nft) => (
              <div
                key={nft.assetId}
                onClick={() => handleNFTClick(nft)}
                className="glass rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.15), rgba(15, 23, 42, 0.3))',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(59, 130, 246, 0.15)'
                }}
              >
                {/* NFT Image */}
                <div className="aspect-square bg-gradient-to-br from-blue-900/30 to-purple-900/30 flex items-center justify-center overflow-hidden">
                  {nft.imageUrl ? (
                    <img
                      src={nft.imageUrl}
                      alt={nft.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                          <div class="w-full h-full flex items-center justify-center">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-400/50">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                              <circle cx="8.5" cy="8.5" r="1.5"></circle>
                              <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                          </div>
                        `;
                      }}
                    />
                  ) : (
                    <ImageIcon size={64} className="text-blue-400/50" />
                  )}
                </div>

                {/* NFT Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1 truncate">{nft.name}</h3>
                  <p className="text-blue-200/70 text-sm mb-3 line-clamp-2">
                    {nft.description || 'No description'}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-blue-300/60">
                      ID: {nft.assetId}
                    </div>
                    <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold">
                      Available
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default MarketplacePage;

