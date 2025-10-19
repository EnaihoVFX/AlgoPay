import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, MapPin, Clock, Image as ImageIcon, Download, Printer, Sparkles } from 'lucide-react';

const CreateQRPage = () => {
  const [formData, setFormData] = useState({
    qrName: '',
    listingID: '',
    transactionType: 'payment',
    amount: '',
    description: '',
    
    // Conditions
    enableGeo: false,
    geoLatitude: '',
    geoLongitude: '',
    geoRadius: '100', // meters
    
    enableTime: false,
    startTime: '',
    endTime: '',
    
    enableNFT: false,
    nftContract: '',
    nftRequired: '1'
  });

  const [qrGenerated, setQrGenerated] = useState(false);
  const [qrData, setQrData] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const qrRef = useRef(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const generateQRCode = async (e) => {
    e.preventDefault();

    // Build the QR data object
    const qrPayload = {
      type: 'algopay',
      version: '1.0',
      listing: formData.listingID,
      name: formData.qrName,
      transactionType: formData.transactionType,
      amount: formData.amount ? parseInt(formData.amount) : null,
      description: formData.description,
      
      conditions: {}
    };

    // Add geolocation conditions
    if (formData.enableGeo && formData.geoLatitude && formData.geoLongitude) {
      qrPayload.conditions.geolocation = {
        latitude: parseFloat(formData.geoLatitude),
        longitude: parseFloat(formData.geoLongitude),
        radius: parseInt(formData.geoRadius)
      };
    }

    // Add time conditions
    if (formData.enableTime && formData.startTime && formData.endTime) {
      qrPayload.conditions.timeWindow = {
        start: formData.startTime,
        end: formData.endTime
      };
    }

    // Add NFT holder conditions
    if (formData.enableNFT && formData.nftContract) {
      qrPayload.conditions.nftRequired = {
        contract: formData.nftContract,
        minBalance: parseInt(formData.nftRequired)
      };
    }

    setIsCreating(true);
    setStatusMessage('Creating listing in database...');

    try {
      // Create the listing in the database
      const listingResponse = await fetch('http://localhost:3000/api/createListing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: formData.listingID,
          title: formData.qrName,
          description: formData.description || 'Payment via QR code',
          price: formData.amount ? parseInt(formData.amount) : 100000,
          sellerAddress: '54Z4UQNPKFOL2LB3YTQ23SDNOMPUIUPM3WKDN3AHH2KXUCVN6WXZKYC4EI',
          escrowAddress: 'EU2ZHLZOE2DBFPZ2RWWTHPW4NLTAEGG4WQN3EUC2XCN2QGV244D5UE7ECQ',
          image: 'https://via.placeholder.com/400/2196f3/ffffff?text=' + encodeURIComponent(formData.qrName),
          rules: JSON.stringify(qrPayload.conditions)
        })
      });

      const listingData = await listingResponse.json();
      
      if (listingData.success) {
        setStatusMessage(`✅ Listing "${formData.listingID}" created successfully!`);
      } else {
        setStatusMessage(`ℹ️ Listing "${formData.listingID}" already exists - using existing.`);
      }

      // Generate the payment URL
      const baseUrl = window.location.origin;
      const paymentUrl = `${baseUrl}/scan?listing=${formData.listingID}`;
      
      setQrData(paymentUrl);
      setQrGenerated(true);

      // Log the full conditions for backend processing
      console.log('QR Code Conditions:', qrPayload);
      console.log('Listing created:', listingData);
    } catch (error) {
      console.error('Error creating listing:', error);
      setStatusMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsCreating(false);
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
        link.download = `${formData.qrName || 'algopay-qr'}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const printQR = () => {
    const printWindow = window.open('', '', 'width=600,height=600');
    const svg = qrRef.current.querySelector('svg');
    const svgData = new XMLSerializer().serializeToString(svg);

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${formData.qrName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            h1 { margin: 20px 0; }
            .info { text-align: center; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>${formData.qrName || 'AlgoPay QR Code'}</h1>
          <div style="width: 400px; height: 400px;">
            ${svgData}
          </div>
          <div class="info">
            <p><strong>Type:</strong> ${formData.transactionType}</p>
            ${formData.amount ? `<p><strong>Amount:</strong> ${(parseInt(formData.amount) / 1000000).toFixed(6)} ALGO</p>` : ''}
            ${formData.description ? `<p>${formData.description}</p>` : ''}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const resetForm = () => {
    setFormData({
      qrName: '',
      listingID: '',
      transactionType: 'payment',
      amount: '',
      description: '',
      enableGeo: false,
      geoLatitude: '',
      geoLongitude: '',
      geoRadius: '100',
      enableTime: false,
      startTime: '',
      endTime: '',
      enableNFT: false,
      nftContract: '',
      nftRequired: '1'
    });
    setQrGenerated(false);
    setQrData('');
    setStatusMessage('');
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

        .glass-input {
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.1), rgba(15, 23, 42, 0.2));
          backdrop-filter: blur(20px);
          border: 1px solid rgba(59, 130, 246, 0.2);
          color: white;
          width: 100%;
          padding: 0.75rem;
          border-radius: 0.75rem;
          outline: none;
          transition: all 0.3s ease;
        }

        .glass-input:focus {
          border-color: rgba(59, 130, 246, 0.4);
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.15), rgba(15, 23, 42, 0.25));
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .glass-input::placeholder {
          color: rgba(147, 197, 253, 0.4);
        }

        .glass-select {
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.1), rgba(15, 23, 42, 0.2));
          backdrop-filter: blur(20px);
          border: 1px solid rgba(59, 130, 246, 0.2);
          color: white;
          width: 100%;
          padding: 0.75rem;
          border-radius: 0.75rem;
          outline: none;
          transition: all 0.3s ease;
        }

        .glass-select:focus {
          border-color: rgba(59, 130, 246, 0.4);
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.15), rgba(15, 23, 42, 0.25));
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .glass-select option {
          background: #0f172a;
          color: white;
        }

        .glass-textarea {
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.1), rgba(15, 23, 42, 0.2));
          backdrop-filter: blur(20px);
          border: 1px solid rgba(59, 130, 246, 0.2);
          color: white;
          width: 100%;
          padding: 0.75rem;
          border-radius: 0.75rem;
          outline: none;
          transition: all 0.3s ease;
          resize: vertical;
        }

        .glass-textarea:focus {
          border-color: rgba(59, 130, 246, 0.4);
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.15), rgba(15, 23, 42, 0.25));
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .glass-textarea::placeholder {
          color: rgba(147, 197, 253, 0.4);
        }

        .checkbox-custom {
          appearance: none;
          width: 1.25rem;
          height: 1.25rem;
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: 0.375rem;
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.1), rgba(15, 23, 42, 0.2));
          cursor: pointer;
          position: relative;
          transition: all 0.3s ease;
        }

        .checkbox-custom:checked {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border-color: #3b82f6;
        }

        .checkbox-custom:checked::after {
          content: '';
          position: absolute;
          left: 0.25rem;
          top: 0.125rem;
          width: 0.375rem;
          height: 0.625rem;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
      `}</style>

      <div className="px-5 pb-24 max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="pt-6 pb-6 flex items-center justify-between fade-in">
          <button 
            onClick={() => window.history.back()}
            className="w-10 h-10 glass glass-hover rounded-xl flex items-center justify-center transition-all active:scale-95"
          >
            <ArrowLeft size={20} className="text-blue-200" />
          </button>
          <h1 className="text-xl font-semibold text-white">Create QR Code</h1>
          <div className="w-10"></div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-8 slide-up">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles size={24} className="text-blue-400" />
            <h2 className="text-2xl font-bold text-white">
              Generate Payment QR
            </h2>
          </div>
          <p className="text-sm text-blue-200/60">
            Create custom QR codes with advanced conditions
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="space-y-4 slide-up" style={{ animationDelay: '0.1s' }}>
            <form onSubmit={generateQRCode} className="space-y-4">
              {/* Basic Info */}
              <div className="glass-strong rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-blue-200/70 mb-2">QR Code Name *</label>
                  <input
                    type="text"
                    name="qrName"
                    value={formData.qrName}
                    onChange={handleChange}
                    placeholder="e.g., Coffee Shop Payment"
                      className="glass-input"
                    required
                  />
                </div>

                  <div>
                    <label className="block text-sm text-blue-200/70 mb-2">Listing ID *</label>
                  <input
                    type="text"
                    name="listingID"
                    value={formData.listingID}
                    onChange={handleChange}
                    placeholder="e.g., demo1"
                      className="glass-input"
                    required
                  />
                </div>

                  <div>
                    <label className="block text-sm text-blue-200/70 mb-2">Transaction Type *</label>
                  <select
                    name="transactionType"
                    value={formData.transactionType}
                    onChange={handleChange}
                      className="glass-select"
                    required
                  >
                    <option value="payment">Payment</option>
                    <option value="donation">Donation</option>
                    <option value="tip">Tip</option>
                    <option value="purchase">Purchase</option>
                    <option value="subscription">Subscription</option>
                  </select>
                </div>

                  <div>
                    <label className="block text-sm text-blue-200/70 mb-2">Amount (microAlgos)</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="e.g., 1000000 (1 ALGO)"
                    min="0"
                      className="glass-input"
                  />
                  {formData.amount && (
                      <p className="text-xs text-blue-300/60 mt-2">
                      ≈ {(parseInt(formData.amount) / 1000000).toFixed(6)} ALGO
                      </p>
                  )}
                </div>

                  <div>
                    <label className="block text-sm text-blue-200/70 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Optional description for this payment"
                    rows="3"
                      className="glass-textarea"
                  />
                  </div>
                </div>
              </div>

              {/* Geolocation Conditions */}
              <div className="glass-strong rounded-2xl p-6">
                <label className="flex items-center gap-3 mb-4 cursor-pointer">
                    <input
                      type="checkbox"
                      name="enableGeo"
                      checked={formData.enableGeo}
                      onChange={handleChange}
                    className="checkbox-custom"
                    />
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Geolocation Conditions</h3>
                  </div>
                  </label>

                {formData.enableGeo && (
                  <div className="space-y-4 pl-8">
                    <div>
                      <label className="block text-sm text-blue-200/70 mb-2">Latitude</label>
                      <input
                        type="number"
                        name="geoLatitude"
                        value={formData.geoLatitude}
                        onChange={handleChange}
                        placeholder="e.g., 37.7749"
                        step="0.000001"
                        className="glass-input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-blue-200/70 mb-2">Longitude</label>
                      <input
                        type="number"
                        name="geoLongitude"
                        value={formData.geoLongitude}
                        onChange={handleChange}
                        placeholder="e.g., -122.4194"
                        step="0.000001"
                        className="glass-input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-blue-200/70 mb-2">Radius (meters)</label>
                      <input
                        type="number"
                        name="geoRadius"
                        value={formData.geoRadius}
                        onChange={handleChange}
                        min="1"
                        className="glass-input"
                      />
                      <p className="text-xs text-blue-300/60 mt-2">
                        Payment only valid within {formData.geoRadius}m of location
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Time Conditions */}
              <div className="glass-strong rounded-2xl p-6">
                <label className="flex items-center gap-3 mb-4 cursor-pointer">
                    <input
                      type="checkbox"
                      name="enableTime"
                      checked={formData.enableTime}
                      onChange={handleChange}
                    className="checkbox-custom"
                    />
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Time Window Conditions</h3>
                  </div>
                  </label>

                {formData.enableTime && (
                  <div className="space-y-4 pl-8">
                    <div>
                      <label className="block text-sm text-blue-200/70 mb-2">Start Time</label>
                      <input
                        type="datetime-local"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleChange}
                        className="glass-input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-blue-200/70 mb-2">End Time</label>
                      <input
                        type="datetime-local"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleChange}
                        className="glass-input"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* NFT Holder Conditions */}
              <div className="glass-strong rounded-2xl p-6">
                <label className="flex items-center gap-3 mb-4 cursor-pointer">
                    <input
                      type="checkbox"
                      name="enableNFT"
                      checked={formData.enableNFT}
                      onChange={handleChange}
                    className="checkbox-custom"
                    />
                  <div className="flex items-center gap-2">
                    <ImageIcon size={18} className="text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">NFT Holder Requirements</h3>
                  </div>
                  </label>

                {formData.enableNFT && (
                  <div className="space-y-4 pl-8">
                    <div>
                      <label className="block text-sm text-blue-200/70 mb-2">NFT Asset ID</label>
                      <input
                        type="text"
                        name="nftContract"
                        value={formData.nftContract}
                        onChange={handleChange}
                        placeholder="e.g., 123456789"
                        className="glass-input"
                      />
                      <p className="text-xs text-blue-300/60 mt-2">
                        Algorand ASA ID of the required NFT
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm text-blue-200/70 mb-2">Minimum Balance</label>
                      <input
                        type="number"
                        name="nftRequired"
                        value={formData.nftRequired}
                        onChange={handleChange}
                        min="1"
                        className="glass-input"
                      />
                      <p className="text-xs text-blue-300/60 mt-2">
                        User must hold at least this many NFTs
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div className={`glass-strong rounded-xl p-4 border ${
                  statusMessage.includes('✅') ? 'border-green-500/30' : 
                  statusMessage.includes('❌') ? 'border-red-500/30' : 
                  'border-blue-500/30'
                }`}>
                  <p className={`text-sm ${
                    statusMessage.includes('✅') ? 'text-green-300' : 
                    statusMessage.includes('❌') ? 'text-red-300' : 
                    'text-blue-300'
                  }`}>
                  {statusMessage}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <button 
                  type="submit" 
                  disabled={isCreating}
                  className="w-full glass-strong glass-hover rounded-xl py-4 font-medium text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Generate QR Code
                    </>
                  )}
                </button>
                {qrGenerated && (
                  <button 
                    type="button" 
                    onClick={resetForm} 
                    className="w-full glass glass-hover rounded-xl py-4 font-medium text-white transition-all active:scale-[0.98]"
                  >
                    Create New
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* QR Code Preview Section */}
          <div className="slide-up" style={{ animationDelay: '0.2s' }}>
            {qrGenerated ? (
              <div className="glass-strong rounded-2xl p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-white mb-6 text-center">Your QR Code</h3>
                
                <div className="glass rounded-2xl p-6 mb-6" ref={qrRef}>
                  <div className="bg-white rounded-xl p-4 inline-block w-full flex justify-center">
                  <QRCodeSVG
                    value={qrData}
                      size={Math.min(300, window.innerWidth - 120)}
                    level="H"
                    includeMargin={true}
                  />
                  </div>
                </div>

                <div className="glass rounded-xl p-4 mb-4">
                  <h4 className="text-lg font-bold text-white mb-1">{formData.qrName}</h4>
                  <p className="text-sm text-blue-300/70 capitalize mb-2">{formData.transactionType}</p>
                  {formData.amount && (
                    <p className="text-xl font-bold text-blue-200">
                      {(parseInt(formData.amount) / 1000000).toFixed(6)} ALGO
                    </p>
                  )}
                  {formData.description && (
                    <p className="text-sm text-blue-200/60 mt-2">{formData.description}</p>
                  )}
                </div>

                {(formData.enableGeo || formData.enableTime || formData.enableNFT) && (
                  <div className="glass rounded-xl p-4 mb-6 space-y-2">
                    <p className="text-xs text-blue-300/70 font-semibold mb-3">Active Conditions:</p>
                  {formData.enableGeo && (
                      <div className="flex items-start gap-2 text-xs text-blue-200/80">
                        <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                        <span>Location: {formData.geoLatitude}, {formData.geoLongitude} (±{formData.geoRadius}m)</span>
                    </div>
                  )}
                  {formData.enableTime && (
                      <div className="flex items-start gap-2 text-xs text-blue-200/80">
                        <Clock size={14} className="mt-0.5 flex-shrink-0" />
                        <span>Valid: {new Date(formData.startTime).toLocaleString()} - {new Date(formData.endTime).toLocaleString()}</span>
                    </div>
                  )}
                  {formData.enableNFT && (
                      <div className="flex items-start gap-2 text-xs text-blue-200/80">
                        <ImageIcon size={14} className="mt-0.5 flex-shrink-0" />
                        <span>Requires NFT: {formData.nftContract} (min: {formData.nftRequired})</span>
                    </div>
                  )}
                </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={downloadQR} 
                    className="glass glass-hover rounded-xl py-3 px-4 font-medium text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                  >
                    <Download size={16} />
                    Download
                  </button>
                  <button 
                    onClick={printQR} 
                    className="glass glass-hover rounded-xl py-3 px-4 font-medium text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                  >
                    <Printer size={16} />
                    Print
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass-strong rounded-2xl p-12 h-full flex flex-col items-center justify-center text-center min-h-[400px]">
                <div className="w-20 h-20 glass rounded-2xl flex items-center justify-center mb-6">
                  <Sparkles size={40} className="text-blue-400/50" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Ready to Generate</h3>
                <p className="text-sm text-blue-200/60">
                  Fill in the form and generate your custom QR code
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateQRPage;

