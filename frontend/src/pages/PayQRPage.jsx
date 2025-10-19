import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Camera, ImagePlus, AlertCircle, CheckCircle2, QrCode, Sparkles } from 'lucide-react';

const PayQRPage = () => {
  const [scanning, setScanning] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (scanning) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [scanning]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.');
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const handleScanClick = () => {
    setScanning(true);
    setError(null);
    setSuccess(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Simulate QR code processing
      setProcessing(true);
      setTimeout(() => {
        setProcessing(false);
        setSuccess(true);
        setQrData({
          amount: '5.50',
          recipient: 'ALGO...XYZ123',
          note: 'Payment for coffee'
        });
      }, 1500);
    }
  };

  const handleConfirmPayment = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }, 2000);
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

        video {
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

        {!scanning && !qrData && !success && (
          <div className="flex-1 flex flex-col">
            {/* Hero Section */}
            <div className="text-center mb-8 slide-up">
              <h2 className="text-2xl font-bold text-white mb-2">
                Scan QR Code
              </h2>
              <p className="text-sm text-blue-200/60">
                Use your camera or upload an image
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 slide-up" style={{ animationDelay: '0.1s' }}>
              <button
                onClick={handleScanClick}
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

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full glass glass-hover rounded-xl p-4 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl glass-strong flex items-center justify-center">
                    <ImagePlus size={20} className="text-blue-200/70" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-white text-sm">
                      Upload from Gallery
                    </div>
                    <div className="text-xs text-blue-300/60">
                      Select QR code image
                    </div>
                  </div>
                </div>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
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

        {scanning && !qrData && (
          <div className="flex-1 flex flex-col slide-up">
            {/* Camera View */}
            <div className="flex-1 glass-strong rounded-2xl overflow-hidden relative mb-6">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scanning Frame */}
              <div className="absolute inset-0 flex items-center justify-center">
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
              </div>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => {
                setScanning(false);
                stopCamera();
              }}
              className="w-full glass glass-hover rounded-xl py-4 text-center font-medium text-white transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
          </div>
        )}

        {qrData && !success && (
          <div className="flex-1 flex flex-col slide-up">
            {/* Payment Details */}
            <div className="glass-strong rounded-2xl p-6 mb-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">
                  Payment Details
                </h2>
                <p className="text-sm text-blue-200/60">
                  Review details before confirming
                </p>
              </div>

              <div className="space-y-3">
                <div className="glass rounded-xl p-4">
                  <div className="text-xs text-blue-300/60 mb-1">Amount</div>
                  <div className="text-2xl font-bold text-white">
                    {qrData.amount} ALGO
                  </div>
                  <div className="text-sm text-blue-300/60 mt-1">
                    ${(parseFloat(qrData.amount) * 0.15).toFixed(2)} USD
                  </div>
                </div>

                <div className="glass rounded-xl p-4">
                  <div className="text-xs text-blue-300/60 mb-2">Recipient</div>
                  <div className="font-mono text-sm text-white break-all">
                    {qrData.recipient}
                  </div>
                </div>

                {qrData.note && (
                  <div className="glass rounded-xl p-4">
                    <div className="text-xs text-blue-300/60 mb-2">Note</div>
                    <div className="text-sm text-white">
                      {qrData.note}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleConfirmPayment}
                disabled={processing}
                className="w-full glass-strong glass-hover rounded-xl py-4 font-medium text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  'Confirm Payment'
                )}
              </button>

              <button
                onClick={() => setQrData(null)}
                disabled={processing}
                className="w-full glass glass-hover rounded-xl py-4 font-medium text-white transition-all active:scale-[0.98] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="flex-1 flex items-center justify-center slide-up">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 glass-strong rounded-full flex items-center justify-center">
                <CheckCircle2 size={44} className="text-blue-200" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Payment Sent
              </h2>
              <p className="text-sm text-blue-200/60 mb-6">
                Transaction processed successfully
              </p>
              <div className="glass rounded-xl p-4 inline-block">
                <div className="text-xs text-blue-300/60 mb-1">Amount Sent</div>
                <div className="text-xl font-bold text-white">
                  {qrData?.amount} ALGO
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayQRPage;
