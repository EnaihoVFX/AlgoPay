import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrReader } from 'react-qr-reader';
import './SendPage.css';

const SendPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' or 'scan'
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const userId = 'testuser1'; // In production, from auth

  const handleScan = (result) => {
    if (result) {
      const scannedText = result?.text;
      // Try to extract address from URL or use directly
      try {
        const url = new URL(scannedText);
        const addressParam = url.searchParams.get('address') || url.searchParams.get('to');
        if (addressParam) {
          setRecipientAddress(addressParam);
        } else {
          setRecipientAddress(scannedText);
        }
      } catch (e) {
        // Not a URL, treat as address
        setRecipientAddress(scannedText);
      }
      setActiveTab('manual');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Convert ALGO to microAlgos
      const amountInMicroAlgos = Math.floor(parseFloat(amount) * 1000000);

      const response = await fetch('http://localhost:3000/api/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          toAddress: recipientAddress,
          amount: amountInMicroAlgos
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess({
          txid: data.txid,
          explorer: data.explorer
        });
        setRecipientAddress('');
        setAmount('');
        setNote('');
        
        // Trigger wallet balance refresh
        setTimeout(() => {
          window.dispatchEvent(new Event('refreshWallet'));
        }, 2000);
      } else {
        setError(data.error || 'Transaction failed');
      }
    } catch (err) {
      setError('Failed to send transaction: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="send-page">
      <div className="send-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1>Send ALGO</h1>
        <div></div>
      </div>

      <div className="send-container">
        {success ? (
          <div className="success-card">
            <div className="success-icon">✅</div>
            <h2>Transaction Sent!</h2>
            <p className="txid">Transaction ID:</p>
            <code className="txid-code">{success.txid}</code>
            <a 
              href={success.explorer} 
              target="_blank" 
              rel="noopener noreferrer"
              className="explorer-link"
            >
              View on Explorer →
            </a>
            <button 
              onClick={() => setSuccess(null)} 
              className="btn btn-primary"
            >
              Send Another
            </button>
            <button 
              onClick={() => navigate('/')} 
              className="btn btn-secondary"
            >
              Back to Wallet
            </button>
          </div>
        ) : (
          <div className="send-form-card">
            {/* Tab Navigation */}
            <div className="tab-nav">
              <button 
                className={activeTab === 'manual' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('manual')}
              >
                📝 Enter Address
              </button>
              <button 
                className={activeTab === 'scan' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('scan')}
              >
                📷 Scan QR
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'manual' ? (
              <form onSubmit={handleSubmit} className="send-form">
                <div className="form-group">
                  <label htmlFor="recipient">Recipient Address</label>
                  <input
                    type="text"
                    id="recipient"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="ALGORAND ADDRESS..."
                    required
                    className="input-address"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="amount">Amount (ALGO)</label>
                  <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.000000"
                    step="0.000001"
                    min="0.000001"
                    required
                  />
                  {amount && (
                    <small className="helper-text">
                      = {Math.floor(parseFloat(amount) * 1000000).toLocaleString()} microAlgos
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="note">Note (Optional)</label>
                  <textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a message..."
                    rows="3"
                  />
                </div>

                {error && (
                  <div className="error-message">
                    ⚠️ {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn btn-primary btn-large"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send ALGO'}
                </button>
              </form>
            ) : (
              <div className="scanner-container">
                <p className="scanner-info">Scan a wallet QR code to send payment</p>
                <div className="qr-scanner">
                  <QrReader
                    onResult={handleScan}
                    constraints={{ facingMode: 'environment' }}
                    className="qr-video"
                  />
                </div>
                {recipientAddress && (
                  <div className="scanned-address">
                    <p>Scanned Address:</p>
                    <code>{recipientAddress}</code>
                    <button 
                      onClick={() => setActiveTab('manual')}
                      className="btn btn-secondary"
                    >
                      Continue
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SendPage;

