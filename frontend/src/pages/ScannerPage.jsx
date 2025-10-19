import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { QrReader } from 'react-qr-reader';
import { ArrowLeft, Camera, Edit3, AlertCircle, CheckCircle2, QrCode, Loader2, ExternalLink } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ScannerPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listingID, setListingID] = useState(searchParams.get('listing') || '');
  const [manualInput, setManualInput] = useState('');
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState(null);

  useEffect(() => {
    if (listingID) {
      fetchListing(listingID);
      setShowScanner(false);
    }
  }, [listingID]);

  const fetchListing = async (id) => {
    setLoading(true);
    setError(null);
    setPaymentResult(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/listing/${id}`);
      setListing(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load listing');
      setListing(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      setListingID(manualInput.trim());
      setSearchParams({ listing: manualInput.trim() });
    }
  };

  const handleScan = (result, error) => {
    if (result) {
      try {
        const text = result?.text;
        if (text) {
          if (text.includes('listing=')) {
            const url = new URL(text);
            const listing = url.searchParams.get('listing');
            if (listing) {
              setListingID(listing);
              setSearchParams({ listing });
              setScanError(null);
              return;
            }
          }
          setListingID(text);
          setSearchParams({ listing: text });
          setScanError(null);
        }
      } catch (err) {
        setListingID(result.text);
        setSearchParams({ listing: result.text });
        setScanError(null);
      }
    }
    
    if (error) {
      setScanError(error.message);
    }
  };

  const handlePay = async () => {
    if (!listing) return;

    setPaying(true);
    setError(null);

    try {
      const userId = 'testuser1';

      const response = await axios.post(`${API_BASE_URL}/api/pay`, {
        userId,
        listingID: listing.id,
        amount: listing.price,
        sellerAddress: listing.sellerAddress,
        escrowAddress: listing.escrowAddress
      });

      setPaymentResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const handleNewScan = () => {
    setPaymentResult(null);
    setListing(null);
    setListingID('');
    setManualInput('');
    setSearchParams({});
    setError(null);
  };

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

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes scanLine {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
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

        .fade-in {
          animation: fadeIn 0.5s ease-out;
        }

        .slide-up {
          animation: slideUp 0.6s ease-out;
        }

        .pulse-animation {
          animation: pulse 2s ease-in-out infinite;
        }

        .scan-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #3b82f6, transparent);
          animation: scanLine 2s linear infinite;
        }

        .corner-frame {
          position: absolute;
          width: 40px;
          height: 40px;
          border: 3px solid #3b82f6;
        }

        .corner-tl { top: 0; left: 0; border-right: none; border-bottom: none; }
        .corner-tr { top: 0; right: 0; border-left: none; border-bottom: none; }
        .corner-bl { bottom: 0; left: 0; border-right: none; border-top: none; }
        .corner-br { bottom: 0; right: 0; border-left: none; border-top: none; }

        .qr-reader-container video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>

      <div className="px-5 pb-10 max-w-lg mx-auto relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="pt-6 pb-6 flex items-center justify-between fade-in">
          <button 
            onClick={() => window.history.back()}
            className="w-10 h-10 glass glass-hover rounded-xl flex items-center justify-center transition-all active:scale-95"
          >
            <ArrowLeft size={20} className="text-blue-200" />
          </button>
          <h1 className="text-xl font-semibold text-white">Scan QR Code</h1>
          <div className="w-10"></div>
        </div>

        {/* Initial State - Choose Input Method */}
        {!showScanner && !listing && !paymentResult && !loading && (
          <div className="flex-1 flex flex-col">
            <div className="text-center mb-8 slide-up">
              <h2 className="text-2xl font-bold text-white mb-2">
                Find Listing
              </h2>
              <p className="text-sm text-blue-200/60">
                Scan QR code or enter listing ID
              </p>
            </div>

            <div className="space-y-3 slide-up" style={{ animationDelay: '0.1s' }}>
              <button
                onClick={() => setShowScanner(true)}
                className="w-full glass glass-hover rounded-xl p-4 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl glass-strong flex items-center justify-center">
                    <Camera size={20} className="text-blue-200/70" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-white text-sm">
                      Scan with Camera
                    </div>
                    <div className="text-xs text-blue-300/60">
                      Use camera to scan QR codes
                    </div>
                  </div>
                </div>
              </button>

              <div className="glass rounded-xl p-4">
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl glass-strong flex items-center justify-center flex-shrink-0">
                      <Edit3 size={20} className="text-blue-200/70" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-white text-sm mb-1">
                        Enter Listing ID
                      </div>
                      <input
                        type="text"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="listing123"
                        className="w-full bg-black/30 border border-blue-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-blue-300/40 focus:outline-none focus:border-blue-500/40"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full glass-strong glass-hover rounded-xl py-3 font-medium text-white transition-all active:scale-[0.98]"
                  >
                    Load Listing
                  </button>
                </form>
              </div>
            </div>

            {error && (
              <div className="mt-4 glass-strong rounded-xl p-4 border border-red-500/30">
                <div className="flex items-center gap-3">
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* QR Scanner View */}
        {showScanner && !listing && (
          <div className="flex-1 flex flex-col slide-up">
            <div className="flex-1 glass-strong rounded-2xl overflow-hidden relative mb-6">
              <div className="qr-reader-container">
                <QrReader
                  onResult={handleScan}
                  constraints={{ facingMode: 'environment' }}
                  containerStyle={{ width: '100%', height: '100%' }}
                />
              </div>
              
              {/* Scanning Frame */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-64">
                  <div className="corner-frame corner-tl"></div>
                  <div className="corner-frame corner-tr"></div>
                  <div className="corner-frame corner-bl"></div>
                  <div className="corner-frame corner-br"></div>
                  <div className="scan-line"></div>
                </div>
              </div>

              {/* Instructions */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-center text-white text-sm">
                  Position QR code within the frame
                </p>
                {scanError && (
                  <p className="text-center text-red-400 text-xs mt-2">
                    {scanError}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowScanner(false)}
              className="w-full glass glass-hover rounded-xl py-4 text-center font-medium text-white transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex items-center justify-center slide-up">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 glass-strong rounded-full flex items-center justify-center">
                <Loader2 size={44} className="text-blue-200 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Loading Listing
              </h2>
              <p className="text-sm text-blue-200/60">
                Please wait...
              </p>
            </div>
          </div>
        )}

        {/* Listing Details */}
        {listing && !paymentResult && !loading && (
          <div className="flex-1 flex flex-col slide-up">
            <div className="glass-strong rounded-2xl p-6 mb-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">
                  {listing.title}
                </h2>
                <p className="text-sm text-blue-200/60">
                  {listing.description}
                </p>
              </div>

              <div className="space-y-3">
                <div className="glass rounded-xl p-4">
                  <div className="text-xs text-blue-300/60 mb-1">Price</div>
                  <div className="text-2xl font-bold text-white">
                    {(listing.price / 1000000).toFixed(6)} ALGO
                  </div>
                </div>

                <div className="glass rounded-xl p-4">
                  <div className="text-xs text-blue-300/60 mb-2">Seller</div>
                  <div className="font-mono text-sm text-white break-all">
                    {listing.sellerAddress}
                  </div>
                </div>

                <div className="glass rounded-xl p-4">
                  <div className="text-xs text-blue-300/60 mb-2">Escrow</div>
                  <div className="font-mono text-sm text-white break-all">
                    {listing.escrowAddress}
                  </div>
                </div>

                <div className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-300/60">Status</span>
                    <span className="text-sm text-white font-medium">{listing.status}</span>
                  </div>
                </div>

                {listing.rules && (
                  <div className="glass rounded-xl p-4">
                    <div className="text-xs text-blue-300/60 mb-2">Terms</div>
                    <div className="text-sm text-white">
                      {listing.rules}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-4 glass-strong rounded-xl p-4 border border-red-500/30">
                <div className="flex items-center gap-3">
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handlePay}
                disabled={paying}
                className="w-full glass-strong glass-hover rounded-xl py-4 font-medium text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {paying ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Pay Now'
                )}
              </button>

              <button
                onClick={handleNewScan}
                disabled={paying}
                className="w-full glass glass-hover rounded-xl py-4 font-medium text-white transition-all active:scale-[0.98] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Payment Success */}
        {paymentResult && (
          <div className="flex-1 flex flex-col justify-center slide-up">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 glass-strong rounded-full flex items-center justify-center">
                <CheckCircle2 size={44} className="text-blue-200" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Payment Successful
              </h2>
              <p className="text-sm text-blue-200/60 mb-6">
                Transaction processed successfully
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="glass-strong rounded-xl p-4">
                <div className="text-xs text-blue-300/60 mb-1">Amount Sent</div>
                <div className="text-xl font-bold text-white">
                  {(paymentResult.amount / 1000000).toFixed(6)} ALGO
                </div>
              </div>

              <div className="glass rounded-xl p-4">
                <div className="text-xs text-blue-300/60 mb-2">Transaction ID</div>
                <div className="font-mono text-xs text-white break-all">
                  {paymentResult.txid}
                </div>
              </div>

              <div className="glass rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-300/60">Round</span>
                  <span className="text-sm text-white font-medium">{paymentResult.round}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {paymentResult.explorer && (
                <a
                  href={paymentResult.explorer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full glass-strong glass-hover rounded-xl py-4 font-medium text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <ExternalLink size={18} />
                  View on Explorer
                </a>
              )}
              
              <button
                onClick={handleNewScan}
                className="w-full glass glass-hover rounded-xl py-4 font-medium text-white transition-all active:scale-[0.98]"
              >
                New Scan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScannerPage;
