import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import './PayQRPage.css';

const PayQRPage = () => {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(true);
  const [scannedData, setScannedData] = useState(null);
  const [paymentType, setPaymentType] = useState(null); // 'algo', 'nft', 'listing'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const scannerInitializedRef = useRef(false);
  const lastScanRef = useRef(null);
  const userId = 'testuser1';

  const parseQRData = (data) => {
    try {
      // Try to parse as URL first
      const url = new URL(data);
      const params = new URLSearchParams(url.search);
      
      // Check for NFT claim code
      if (params.has('claim') && params.get('type') === 'nft') {
        return {
          type: 'nft',
          claimCode: params.get('claim'),
          data: data
        };
      }
      
      // Check for listing payment
      if (url.pathname.includes('/scan') || params.has('listing')) {
        return {
          type: 'listing',
          listingID: params.get('listing'),
          data: data
        };
      }
      
      // Check for Algorand payment
      if (data.startsWith('algorand://')) {
        const address = data.replace('algorand://', '').split('?')[0];
        const amount = params.get('amount');
        return {
          type: 'algo',
          address: address,
          amount: amount,
          data: data
        };
      }
      
      // Check for NFT (if contains asset ID)
      if (params.has('asset') || params.has('nft')) {
        return {
          type: 'nft',
          assetId: params.get('asset') || params.get('nft'),
          claimCode: params.get('claim'),
          data: data
        };
      }
      
      // Try JSON format
      const parsed = JSON.parse(data);
      return {
        type: parsed.type || 'listing',
        ...parsed,
        data: data
      };
    } catch (e) {
      // Plain address or listing ID
      if (data.length === 58 && /^[A-Z2-7]+$/.test(data)) {
        return {
          type: 'algo',
          address: data,
          data: data
        };
      }
      
      return {
        type: 'listing',
        listingID: data,
        data: data
      };
    }
  };

  // Initialize scanner
  useEffect(() => {
    if (scanning && !scannerInitializedRef.current) {
      // Check if element exists before initializing
      const element = document.getElementById("qr-reader");
      if (!element) {
        console.log('QR reader element not found yet');
        return;
      }

      scannerInitializedRef.current = true;
      
      try {
        const qrScanner = new Html5Qrcode("qr-reader");
        html5QrCodeRef.current = qrScanner;

        const config = {
          fps: 5, // Reduced FPS for better performance
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false, // Allow camera flip
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

        qrScanner.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            // Success callback - debounce to prevent multiple scans
            const now = Date.now();
            if (lastScanRef.current && (now - lastScanRef.current) < 2000) {
              return; // Ignore scans within 2 seconds
            }
            
            lastScanRef.current = now;
            const parsed = parseQRData(decodedText);
            setScannedData(parsed);
            setPaymentType(parsed.type);
            setScanning(false);
            
            // Stop scanner after successful scan
            if (html5QrCodeRef.current) {
              try {
                const state = html5QrCodeRef.current.getState();
                if (state === 2) {
                  html5QrCodeRef.current.stop().then(() => {
                    scannerInitializedRef.current = false;
                  }).catch(() => {
                    scannerInitializedRef.current = false;
                  });
                }
              } catch (error) {
                scannerInitializedRef.current = false;
              }
            }
          },
          (errorMessage) => {
            // Error callback (can be ignored, happens frequently during scanning)
          }
        ).then(() => {
          setCameraReady(true);
        }).catch((err) => {
          console.error('Unable to start scanner:', err);
          setError('Camera access denied or not available');
          scannerInitializedRef.current = false;
        });
      } catch (err) {
        console.error('Error creating scanner:', err);
        scannerInitializedRef.current = false;
      }
    }

    return () => {
      // Cleanup function
      const cleanup = async () => {
        if (html5QrCodeRef.current) {
          const scanner = html5QrCodeRef.current;
          
          try {
            // Check if scanner is actually running before stopping
            const state = scanner.getState();
            if (state === 2) { // 2 = SCANNING state
              await scanner.stop();
            }
          } catch (error) {
            // Silently ignore - scanner might not have started or already stopped
          } finally {
            scannerInitializedRef.current = false;
            html5QrCodeRef.current = null;
          }
        }
      };
      
      cleanup();
    };
  }, [scanning]);

  const processPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      if (paymentType === 'listing') {
        // First verify the listing exists
        const listingRes = await fetch(`http://localhost:3000/api/listing/${scannedData.listingID}`);
        const listingData = await listingRes.json();
        
        if (!listingData || listingData.error) {
          setError(`Listing "${scannedData.listingID}" not found. Please create it first.`);
          setLoading(false);
          return;
        }
        
        // Process as direct payment to seller (simplified, no escrow)
        const response = await fetch('http://localhost:3000/api/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            toAddress: listingData.sellerAddress,
            amount: listingData.price
          })
        });

        const data = await response.json();
        if (data.success) {
          setSuccess({
            type: `Payment for ${listingData.title}`,
            txid: data.txid,
            explorer: data.explorer
          });
          
          // Trigger wallet balance refresh
          setTimeout(() => {
            window.dispatchEvent(new Event('refreshWallet'));
          }, 2000);
        } else {
          setError(data.error || 'Payment failed');
        }
        return;
      }

      if (paymentType === 'algo') {
        // Process ALGO payment
        let amount = scannedData.amount;
        
        if (!amount) {
          // Prompt for amount if not in QR
          const amountAlgo = prompt('Enter amount in ALGO (e.g., 0.1):');
          if (!amountAlgo) {
            setError('Amount is required');
            setLoading(false);
            return;
          }
          amount = Math.floor(parseFloat(amountAlgo) * 1000000);
        }

        const response = await fetch('http://localhost:3000/api/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            toAddress: scannedData.address,
            amount: parseInt(amount)
          })
        });

        const data = await response.json();
        if (data.success) {
          setSuccess({
            type: 'ALGO Payment',
            txid: data.txid,
            explorer: data.explorer
          });
          
          // Trigger wallet balance refresh
          setTimeout(() => {
            window.dispatchEvent(new Event('refreshWallet'));
          }, 2000);
        } else {
          setError(data.error || 'Payment failed');
        }
      }

      if (paymentType === 'nft') {
        // Check if it's a claim code
        if (scannedData.claimCode) {
          // First, get NFT info
          const nftInfoRes = await fetch(`http://localhost:3000/api/nft/claim/${scannedData.claimCode}`);
          const nftInfo = await nftInfoRes.json();
          
          if (nftInfo.error) {
            setError(nftInfo.message || 'NFT not found');
            setLoading(false);
            return;
          }
          
          if (nftInfo.status === 'claimed') {
            setError('This NFT has already been claimed');
            setLoading(false);
            return;
          }
          
          // For NFT claiming, use pooled wallet since we need to sign opt-in transaction
          // In production, user would sign with their own wallet via WalletConnect etc.
          const recipientAddress = 'W4DVLNHVUEQK2GZKYLAVCTZFWHQE26WCPAIUJ55CXTTPEVHEWWTOTTREBE';
          
          // Claim NFT
          const claimRes = await fetch('http://localhost:3000/api/nft/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              claimCode: scannedData.claimCode,
              recipientAddress: recipientAddress,
              userId: userId
            })
          });
          
          const claimData = await claimRes.json();
          
          if (claimData.success) {
            setSuccess({
              type: `✅ NFT Claimed: ${claimData.name}`,
              txid: claimData.txId,
              explorer: claimData.explorerUrl,
              message: 'Check your wallet to see your new NFT!'
            });
            
            // Trigger a wallet refresh after 2 seconds
            setTimeout(() => {
              window.dispatchEvent(new Event('refreshWallet'));
            }, 2000);
          } else {
            setError(claimData.message || 'Failed to claim NFT');
          }
        } else {
          setError('NFT claiming requires a claim code');
        }
      }
    } catch (err) {
      setError('Payment failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = async () => {
    // Clean up any existing scanner
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState();
        if (state === 2) { // Only stop if actually scanning
          await html5QrCodeRef.current.stop();
        }
      } catch (error) {
        // Ignore errors
      } finally {
        scannerInitializedRef.current = false;
        html5QrCodeRef.current = null;
      }
    }
    
    scannerInitializedRef.current = false;
    html5QrCodeRef.current = null;
    lastScanRef.current = null; // Reset scan debounce
    
    setScanning(true);
    setScannedData(null);
    setPaymentType(null);
    setError(null);
    setSuccess(null);
    setCameraReady(false);
  };

  return (
    <div className="pay-qr-page">
      {/* Header */}
      <div className="pay-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1>Scan QR Code</h1>
        <div className="spacer"></div>
      </div>

      <div className="pay-container">
        {success ? (
          /* Success Screen */
          <div className="success-screen">
            <div className="success-icon">✅</div>
            <h2>Payment Successful!</h2>
            <div className="success-details">
              <p className="payment-type">{success.type}</p>
              {success.message && (
                <p className="success-message" style={{ color: '#60a5fa', fontSize: '14px', marginBottom: '12px' }}>
                  {success.message}
                </p>
              )}
              <p className="txid-label">Transaction ID:</p>
              <code className="txid">{success.txid}</code>
              <a 
                href={success.explorer} 
                target="_blank" 
                rel="noopener noreferrer"
                className="explorer-btn"
              >
                View on Explorer →
              </a>
            </div>
            <div className="success-actions">
              <button onClick={resetScanner} className="btn btn-primary">
                Scan Another
              </button>
              <button onClick={() => navigate('/')} className="btn btn-secondary">
                Back to Wallet
              </button>
            </div>
          </div>
        ) : scanning ? (
          /* Scanner Screen */
          <div className="scanner-screen">
            <div className="scanner-instructions">
              <h2>Point at QR Code</h2>
              <p>Scan any payment QR code for ALGO, NFT, or listings</p>
            </div>
            
            <div className="scanner-frame">
              {!cameraReady && !error && (
                <div className="camera-loading">
                  <div className="loading-spinner"></div>
                  <p>Starting camera...</p>
                  <p className="camera-hint">Please allow camera access</p>
                </div>
              )}
              {error && (
                <div className="camera-error">
                  <div className="error-icon">⚠️</div>
                  <p>{error}</p>
                  <button onClick={() => window.location.reload()} className="btn btn-secondary" style={{ marginTop: '16px', width: 'auto', padding: '12px 24px' }}>
                    Reload Page
                  </button>
                </div>
              )}
              <div id="qr-reader" ref={scannerRef}></div>
            </div>

            <div className="scanner-help">
              <p>💡 Supports: ALGO payments • NFTs • Listings</p>
            </div>
          </div>
        ) : (
          /* Confirmation Screen */
          <div className="confirm-screen">
            <div className="confirm-icon">
              {paymentType === 'algo' && '💰'}
              {paymentType === 'nft' && '🎨'}
              {paymentType === 'listing' && '🛒'}
            </div>
            
            <h2>Confirm Payment</h2>
            
            {/* Debug: Show raw scanned data */}
            <details className="debug-details">
              <summary>Scanned Data</summary>
              <pre className="debug-data">{JSON.stringify(scannedData, null, 2)}</pre>
            </details>
            
            <div className="payment-details">
              <div className="detail-row">
                <span className="label">Type:</span>
                <span className="value type-badge">
                  {paymentType === 'algo' && 'ALGO Payment'}
                  {paymentType === 'nft' && '🎁 Claim NFT'}
                  {paymentType === 'listing' && 'Listing Payment'}
                </span>
              </div>

              {scannedData.address && (
                <div className="detail-row">
                  <span className="label">To:</span>
                  <code className="value address">{scannedData.address}</code>
                </div>
              )}

              {scannedData.amount && (
                <div className="detail-row">
                  <span className="label">Amount:</span>
                  <span className="value amount">
                    {(parseInt(scannedData.amount) / 1000000).toFixed(6)} ALGO
                  </span>
                </div>
              )}

              {scannedData.listingID && (
                <div className="detail-row">
                  <span className="label">Listing:</span>
                  <span className="value">{scannedData.listingID}</span>
                </div>
              )}

              {scannedData.assetId && (
                <div className="detail-row">
                  <span className="label">Asset ID:</span>
                  <span className="value">{scannedData.assetId}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="error-alert">
                ⚠️ {error}
              </div>
            )}

            <div className="confirm-actions">
              <button 
                onClick={processPayment} 
                className="btn btn-primary btn-lg"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm Payment'}
              </button>
              <button 
                onClick={resetScanner} 
                className="btn btn-secondary"
                disabled={loading}
              >
                Scan Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayQRPage;

