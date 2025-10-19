import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, ImagePlus, Sparkles } from 'lucide-react';
import './CreateNFTPage.css';

const CreateNFTPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    unitName: '',
    description: '',
    imageUrl: ''
  });
  const [creating, setCreating] = useState(false);
  const [nftCreated, setNftCreated] = useState(null);
  const [error, setError] = useState(null);
  const qrRef = useRef(null);
  
  const userId = 'testuser1';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const createNFT = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      console.log('Creating NFT:', formData);

      const response = await fetch('http://localhost:3000/api/nft/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          creatorUserId: userId
        })
      });

      const data = await response.json();

      if (data.success) {
        setNftCreated(data);
        console.log('NFT created successfully:', data);
      } else {
        setError(data.message || 'Failed to create NFT');
      }
    } catch (err) {
      console.error('Error creating NFT:', err);
      setError(err.message || 'Failed to create NFT');
    } finally {
      setCreating(false);
    }
  };

  const downloadQR = () => {
    const svg = qrRef.current.querySelector('svg');
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
        link.download = `nft-${formData.name.replace(/\s+/g, '-')}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      unitName: '',
      description: '',
      imageUrl: ''
    });
    setNftCreated(null);
    setError(null);
  };

  return (
    <div className="create-nft-page">
      <div className="nft-container">
        {/* Header */}
        <div className="nft-header">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
          </button>
          <h1>Create NFT</h1>
          <div className="spacer"></div>
        </div>

        {!nftCreated ? (
          /* Creation Form */
          <div className="nft-form-container">
            <div className="form-intro">
              <div className="intro-icon">
                <Sparkles size={32} className="sparkle" />
              </div>
              <h2>Mint Your NFT</h2>
              <p>Create a unique NFT on Algorand blockchain</p>
            </div>

            <form onSubmit={createNFT} className="nft-form">
              <div className="form-group">
                <label htmlFor="name">NFT Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Cool Digital Art #1"
                  required
                  maxLength={32}
                />
                <span className="helper-text">Max 32 characters</span>
              </div>

              <div className="form-group">
                <label htmlFor="unitName">Unit Name</label>
                <input
                  type="text"
                  id="unitName"
                  name="unitName"
                  value={formData.unitName}
                  onChange={handleChange}
                  placeholder="e.g., COOL (optional)"
                  maxLength={8}
                />
                <span className="helper-text">Short symbol, max 8 characters</span>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe your NFT..."
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label htmlFor="imageUrl">Image URL</label>
                <input
                  type="url"
                  id="imageUrl"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  placeholder="https://... or ipfs://..."
                />
                <span className="helper-text">
                  <ImagePlus size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Direct link to image or IPFS hash
                </span>
              </div>

              {formData.imageUrl && (
                <div className="image-preview">
                  <img 
                    src={formData.imageUrl} 
                    alt="NFT Preview"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {error && (
                <div className="error-message">
                  ⚠️ {error}
                </div>
              )}

              <button 
                type="submit" 
                className="btn-create"
                disabled={creating || !formData.name}
              >
                {creating ? (
                  <>
                    <div className="spinner"></div>
                    Creating on Blockchain...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Create NFT
                  </>
                )}
              </button>

              <div className="form-note">
                <p>
                  💡 Your NFT will be minted on Algorand TestNet.
                  After creation, you'll get a QR code that anyone can scan to claim it!
                </p>
              </div>
            </form>
          </div>
        ) : (
          /* Success Screen */
          <div className="success-container">
            <div className="success-icon">✨</div>
            <h2>NFT Created Successfully!</h2>
            
            <div className="nft-info">
              <div className="nft-card">
                {nftCreated.imageUrl && (
                  <div className="nft-image">
                    <img src={formData.imageUrl} alt={formData.name} />
                  </div>
                )}
                <div className="nft-details">
                  <h3>{formData.name}</h3>
                  {formData.unitName && (
                    <span className="unit-badge">{formData.unitName}</span>
                  )}
                  {formData.description && (
                    <p className="nft-description">{formData.description}</p>
                  )}
                  <div className="nft-meta">
                    <div className="meta-item">
                      <span className="meta-label">Asset ID</span>
                      <span className="meta-value">{nftCreated.assetId}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Status</span>
                      <span className="meta-value status-unclaimed">Unclaimed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="qr-section">
              <h3>Claim QR Code</h3>
              <p>Share this QR code for anyone to claim your NFT</p>
              
              <div className="qr-wrapper" ref={qrRef}>
                <QRCodeSVG
                  value={nftCreated.claimUrl}
                  size={280}
                  level="H"
                  includeMargin={true}
                  className="qr-code"
                />
              </div>

              <div className="claim-code-box">
                <span className="code-label">Claim Code:</span>
                <code className="claim-code">{nftCreated.claimCode}</code>
              </div>

              <div className="action-buttons">
                <button onClick={downloadQR} className="btn-secondary">
                  📥 Download QR Code
                </button>
                <a 
                  href={nftCreated.explorerUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  🔗 View on Explorer
                </a>
              </div>

              <button onClick={resetForm} className="btn-create-another">
                Create Another NFT
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateNFTPage;

