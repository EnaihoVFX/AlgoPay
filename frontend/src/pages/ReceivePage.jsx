import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import './ReceivePage.css';

const ReceivePage = () => {
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState('');
  const [qrValue, setQrValue] = useState('');

  // Get wallet address from localStorage or use pooled address
  const WALLET_ADDRESS = localStorage.getItem('algoPayAddress') || 'W4DVLNHVUEQK2GZKYLAVCTZFWHQE26WCPAIUJ55CXTTPEVHEWWTOTTREBE';

  useEffect(() => {
    setWalletAddress(WALLET_ADDRESS);
    updateQRCode(WALLET_ADDRESS, '');
  }, []);

  useEffect(() => {
    if (walletAddress) {
      updateQRCode(walletAddress, amount);
    }
  }, [amount, walletAddress]);

  const updateQRCode = (address, amt) => {
    if (amt && parseFloat(amt) > 0) {
      // Algorand URI format with amount
      const microAlgos = Math.floor(parseFloat(amt) * 1000000);
      setQrValue(`algorand://${address}?amount=${microAlgos}`);
    } else {
      // Just the address
      setQrValue(address);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareAddress = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My AlgoPay Address',
          text: `Send ALGO to: ${walletAddress}`,
          url: `algorand://${walletAddress}`
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      copyAddress();
    }
  };

  const downloadQR = () => {
    const svg = document.querySelector('.qr-display svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 512;
    canvas.height = 512;

    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, 512, 512);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'algopay-receive-qr.png';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="receive-page">
      <div className="receive-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1>Receive ALGO</h1>
        <div></div>
      </div>

      <div className="receive-container">
        <div className="receive-card">
          {/* QR Code Display */}
          <div className="qr-section">
            <p className="qr-label">Scan to Send Payment</p>
            <div className="qr-display">
              <QRCodeSVG
                value={qrValue}
                size={280}
                level="H"
                includeMargin={true}
              />
            </div>
            {amount && (
              <div className="qr-amount-display">
                Request: {amount} ALGO
              </div>
            )}
          </div>

          {/* Optional Amount */}
          <div className="amount-section">
            <label htmlFor="requestAmount">Request Specific Amount (Optional)</label>
            <div className="amount-input-group">
              <input
                type="number"
                id="requestAmount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.000000"
                step="0.000001"
                min="0"
              />
              <span className="currency-label">ALGO</span>
            </div>
            {amount && (
              <small className="helper-text">
                QR code will request {amount} ALGO from sender
              </small>
            )}
          </div>

          {/* Wallet Address */}
          <div className="address-section">
            <label>Your Wallet Address</label>
            <div className="address-display">
              <code className="address-text">{walletAddress}</code>
              <button 
                onClick={copyAddress} 
                className="copy-button"
                title="Copy address"
              >
                {copied ? '✓' : '📋'}
              </button>
            </div>
            {copied && <small className="copy-feedback">Copied!</small>}
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button onClick={shareAddress} className="btn btn-secondary">
              📤 Share Address
            </button>
            <button onClick={downloadQR} className="btn btn-secondary">
              💾 Download QR
            </button>
            <button 
              onClick={() => {
                window.dispatchEvent(new Event('refreshWallet'));
                alert('Checking for new payments...');
              }} 
              className="btn btn-primary"
            >
              🔄 Check Balance
            </button>
          </div>

          {/* Info */}
          <div className="info-section">
            <p className="info-text">
              Share this QR code or address to receive ALGO payments on Algorand TestNet
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceivePage;

