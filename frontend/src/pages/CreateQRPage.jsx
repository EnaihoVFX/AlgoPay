import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './CreateQRPage.css';

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
    <div className="create-qr-page">
      <div className="create-qr-container">
        <header className="page-header">
          <h1>Create Payment QR Code</h1>
          <p>Generate custom QR codes with conditions for AlgoPay payments</p>
        </header>

        <div className="content-grid">
          {/* Form Section */}
          <div className="form-section">
            <form onSubmit={generateQRCode}>
              {/* Basic Info */}
              <div className="form-group">
                <h3>Basic Information</h3>
                
                <div className="input-group">
                  <label htmlFor="qrName">QR Code Name *</label>
                  <input
                    type="text"
                    id="qrName"
                    name="qrName"
                    value={formData.qrName}
                    onChange={handleChange}
                    placeholder="e.g., Coffee Shop Payment"
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="listingID">Listing ID *</label>
                  <input
                    type="text"
                    id="listingID"
                    name="listingID"
                    value={formData.listingID}
                    onChange={handleChange}
                    placeholder="e.g., demo1"
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="transactionType">Transaction Type *</label>
                  <select
                    id="transactionType"
                    name="transactionType"
                    value={formData.transactionType}
                    onChange={handleChange}
                    required
                  >
                    <option value="payment">Payment</option>
                    <option value="donation">Donation</option>
                    <option value="tip">Tip</option>
                    <option value="purchase">Purchase</option>
                    <option value="subscription">Subscription</option>
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="amount">Amount (microAlgos)</label>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="e.g., 1000000 (1 ALGO)"
                    min="0"
                  />
                  {formData.amount && (
                    <small className="helper-text">
                      ≈ {(parseInt(formData.amount) / 1000000).toFixed(6)} ALGO
                    </small>
                  )}
                </div>

                <div className="input-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Optional description for this payment"
                    rows="3"
                  />
                </div>
              </div>

              {/* Geolocation Conditions */}
              <div className="form-group">
                <h3>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="enableGeo"
                      checked={formData.enableGeo}
                      onChange={handleChange}
                    />
                    Geolocation Conditions
                  </label>
                </h3>

                {formData.enableGeo && (
                  <>
                    <div className="input-group">
                      <label htmlFor="geoLatitude">Latitude</label>
                      <input
                        type="number"
                        id="geoLatitude"
                        name="geoLatitude"
                        value={formData.geoLatitude}
                        onChange={handleChange}
                        placeholder="e.g., 37.7749"
                        step="0.000001"
                      />
                    </div>

                    <div className="input-group">
                      <label htmlFor="geoLongitude">Longitude</label>
                      <input
                        type="number"
                        id="geoLongitude"
                        name="geoLongitude"
                        value={formData.geoLongitude}
                        onChange={handleChange}
                        placeholder="e.g., -122.4194"
                        step="0.000001"
                      />
                    </div>

                    <div className="input-group">
                      <label htmlFor="geoRadius">Radius (meters)</label>
                      <input
                        type="number"
                        id="geoRadius"
                        name="geoRadius"
                        value={formData.geoRadius}
                        onChange={handleChange}
                        min="1"
                      />
                      <small className="helper-text">
                        Payment only valid within {formData.geoRadius}m of location
                      </small>
                    </div>
                  </>
                )}
              </div>

              {/* Time Conditions */}
              <div className="form-group">
                <h3>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="enableTime"
                      checked={formData.enableTime}
                      onChange={handleChange}
                    />
                    Time Window Conditions
                  </label>
                </h3>

                {formData.enableTime && (
                  <>
                    <div className="input-group">
                      <label htmlFor="startTime">Start Time</label>
                      <input
                        type="datetime-local"
                        id="startTime"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="input-group">
                      <label htmlFor="endTime">End Time</label>
                      <input
                        type="datetime-local"
                        id="endTime"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleChange}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* NFT Holder Conditions */}
              <div className="form-group">
                <h3>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="enableNFT"
                      checked={formData.enableNFT}
                      onChange={handleChange}
                    />
                    NFT Holder Requirements
                  </label>
                </h3>

                {formData.enableNFT && (
                  <>
                    <div className="input-group">
                      <label htmlFor="nftContract">NFT Asset ID</label>
                      <input
                        type="text"
                        id="nftContract"
                        name="nftContract"
                        value={formData.nftContract}
                        onChange={handleChange}
                        placeholder="e.g., 123456789"
                      />
                      <small className="helper-text">
                        Algorand ASA ID of the required NFT
                      </small>
                    </div>

                    <div className="input-group">
                      <label htmlFor="nftRequired">Minimum Balance</label>
                      <input
                        type="number"
                        id="nftRequired"
                        name="nftRequired"
                        value={formData.nftRequired}
                        onChange={handleChange}
                        min="1"
                      />
                      <small className="helper-text">
                        User must hold at least this many NFTs
                      </small>
                    </div>
                  </>
                )}
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div className={`status-message ${statusMessage.includes('✅') ? 'success' : statusMessage.includes('❌') ? 'error' : 'info'}`}>
                  {statusMessage}
                </div>
              )}

              {/* Actions */}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Generate QR Code'}
                </button>
                {qrGenerated && (
                  <button type="button" onClick={resetForm} className="btn btn-secondary">
                    Create New
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* QR Code Preview Section */}
          <div className="preview-section">
            {qrGenerated ? (
              <div className="qr-preview">
                <h3>Your QR Code</h3>
                <div className="qr-code-wrapper" ref={qrRef}>
                  <QRCodeSVG
                    value={qrData}
                    size={300}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div className="qr-info">
                  <h4>{formData.qrName}</h4>
                  <p className="qr-type">{formData.transactionType}</p>
                  {formData.amount && (
                    <p className="qr-amount">
                      {(parseInt(formData.amount) / 1000000).toFixed(6)} ALGO
                    </p>
                  )}
                  {formData.description && (
                    <p className="qr-description">{formData.description}</p>
                  )}
                </div>

                <div className="qr-conditions">
                  {formData.enableGeo && (
                    <div className="condition">
                      📍 Location: {formData.geoLatitude}, {formData.geoLongitude} (±{formData.geoRadius}m)
                    </div>
                  )}
                  {formData.enableTime && (
                    <div className="condition">
                      ⏰ Valid: {new Date(formData.startTime).toLocaleString()} - {new Date(formData.endTime).toLocaleString()}
                    </div>
                  )}
                  {formData.enableNFT && (
                    <div className="condition">
                      🎨 Requires NFT: {formData.nftContract} (min: {formData.nftRequired})
                    </div>
                  )}
                </div>

                <div className="qr-actions">
                  <button onClick={downloadQR} className="btn btn-download">
                    📥 Download PNG
                  </button>
                  <button onClick={printQR} className="btn btn-print">
                    🖨️ Print
                  </button>
                </div>
              </div>
            ) : (
              <div className="qr-placeholder">
                <div className="placeholder-icon">📱</div>
                <p>Fill in the form and generate your QR code</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateQRPage;

