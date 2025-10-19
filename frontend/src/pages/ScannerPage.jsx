import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { QrReader } from 'react-qr-reader';
import './ScannerPage.css';

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
        // Try to extract listing ID from QR code
        const text = result?.text;
        if (text) {
          // Check if it's a URL with listing parameter
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
          // Otherwise use the text directly as listing ID
          setListingID(text);
          setSearchParams({ listing: text });
          setScanError(null);
        }
      } catch (err) {
        // Not a URL, use as listing ID directly
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

  return (
    <div className="scanner-page">
      <div className="container">
        <h1>AlgoPay Scanner</h1>
        
        {/* Input Methods */}
        <div className="input-section">
          <div className="tabs">
            <button 
              className={!showScanner ? 'tab active' : 'tab'}
              onClick={() => setShowScanner(false)}
            >
              Enter ID
            </button>
            <button 
              className={showScanner ? 'tab active' : 'tab'}
              onClick={() => setShowScanner(true)}
            >
              Scan QR Code
            </button>
          </div>

          {/* Manual Input */}
          {!showScanner && (
            <form onSubmit={handleManualSubmit} className="manual-form">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Enter listing ID"
                className="input"
              />
              <button type="submit" className="btn btn-primary">Load</button>
            </form>
          )}

          {/* QR Scanner */}
          {showScanner && (
            <div className="scanner-container">
              <QrReader
                onResult={handleScan}
                constraints={{ facingMode: 'environment' }}
                containerStyle={{ width: '100%' }}
                videoContainerStyle={{ paddingTop: '100%' }}
              />
              {scanError && <p className="scan-error">Camera error: {scanError}</p>}
              <p className="scan-hint">Point camera at QR code</p>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && <div className="loading">Loading...</div>}

        {/* Error */}
        {error && !paymentResult && (
          <div className="error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Listing Details */}
        {listing && !paymentResult && (
          <div className="listing">
            <h2>{listing.title}</h2>
            <p className="description">{listing.description}</p>
            
            <div className="details">
              <div className="detail-row">
                <span className="label">Price:</span>
                <span className="value">{(listing.price / 1000000).toFixed(6)} ALGO</span>
              </div>
              
              <div className="detail-row">
                <span className="label">Seller:</span>
                <span className="value addr">{listing.sellerAddress.slice(0, 10)}...{listing.sellerAddress.slice(-8)}</span>
              </div>
              
              <div className="detail-row">
                <span className="label">Escrow:</span>
                <span className="value addr">{listing.escrowAddress.slice(0, 10)}...{listing.escrowAddress.slice(-8)}</span>
              </div>
              
              <div className="detail-row">
                <span className="label">Status:</span>
                <span className="value">{listing.status}</span>
              </div>
            </div>

            {listing.rules && (
              <div className="rules">
                <strong>Terms:</strong> {listing.rules}
              </div>
            )}

            <button 
              onClick={handlePay}
              disabled={paying}
              className="btn btn-pay"
            >
              {paying ? 'Processing...' : 'Pay Now'}
            </button>
          </div>
        )}

        {/* Payment Result */}
        {paymentResult && (
          <div className="result success">
            <h2>✓ Payment Successful</h2>
            <div className="details">
              <div className="detail-row">
                <span className="label">Transaction ID:</span>
                <span className="value txid">{paymentResult.txid}</span>
              </div>
              <div className="detail-row">
                <span className="label">Amount:</span>
                <span className="value">{(paymentResult.amount / 1000000).toFixed(6)} ALGO</span>
              </div>
              <div className="detail-row">
                <span className="label">Round:</span>
                <span className="value">{paymentResult.round}</span>
              </div>
            </div>
            <a href={paymentResult.explorer} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              View on Explorer
            </a>
            <button onClick={() => {
              setPaymentResult(null);
              setListing(null);
              setListingID('');
              setManualInput('');
              setSearchParams({});
            }} className="btn btn-secondary">
              New Scan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScannerPage;
