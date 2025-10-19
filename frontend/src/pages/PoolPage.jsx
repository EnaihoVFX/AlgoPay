import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './PoolPage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PoolPage = () => {
  const [searchParams] = useSearchParams();
  const poolID = searchParams.get('id');
  
  const [pool, setPool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState(null);
  const [joinAmount, setJoinAmount] = useState('');
  const [currentUserId, setCurrentUserId] = useState('testuser1'); // Demo user
  const [finalized, setFinalized] = useState(false);
  const [txResult, setTxResult] = useState(null);

  useEffect(() => {
    if (poolID) {
      fetchPool();
      // Auto-refresh every 5 seconds
      const interval = setInterval(fetchPool, 5000);
      return () => clearInterval(interval);
    }
  }, [poolID]);

  const fetchPool = async () => {
    if (!poolID) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/pool/${poolID}`);
      setPool(response.data);
      
      // Set default join amount to suggested amount
      if (!joinAmount && response.data.targetAmount && response.data.currentAmount < response.data.targetAmount) {
        const remaining = response.data.targetAmount - response.data.currentAmount;
        const suggested = Math.min(remaining, Math.floor(remaining / (response.data.maxParticipants - response.data.currentParticipants) || remaining));
        setJoinAmount(suggested.toString());
      }
    } catch (err) {
      console.error('Error fetching pool:', err);
      setError(err.response?.data?.error || 'Failed to load pool');
      setPool(null);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinPool = async (e) => {
    e.preventDefault();
    
    const amount = parseInt(joinAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/joinPool`, {
        poolID,
        userId: currentUserId,
        amount
      });

      // Update pool data
      setPool(prev => ({
        ...prev,
        ...response.data,
        participants: response.data.participants
      }));
      
      setJoinAmount('');
      alert(`✅ Successfully joined pool! Reserved ${amount} microAlgos.`);
    } catch (err) {
      console.error('Error joining pool:', err);
      setError(err.response?.data?.message || 'Failed to join pool');
    } finally {
      setJoining(false);
    }
  };

  const handleFinalizePool = async () => {
    if (!confirm('Are you sure you want to finalize this pool? This will execute the blockchain transaction.')) {
      return;
    }

    setFinalizing(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/finalizePool`, {
        poolID,
        // In production, these would come from the listing data
        sellerAddress: pool?.sellerAddress,
        escrowAddress: pool?.escrowAddress
      });

      setTxResult(response.data);
      setFinalized(true);
      
      // Refresh pool data
      await fetchPool();
    } catch (err) {
      console.error('Error finalizing pool:', err);
      setError(err.response?.data?.message || 'Failed to finalize pool');
    } finally {
      setFinalizing(false);
    }
  };

  const isCreator = pool && pool.creatorId === currentUserId;
  const userParticipant = pool?.participants?.find(p => p.userId === currentUserId);
  const hasJoined = !!userParticipant;

  if (!poolID) {
    return (
      <div className="pool-page">
        <div className="empty-state">
          <div className="empty-icon">🤝</div>
          <h2>No Pool ID</h2>
          <p>Please provide a pool ID in the URL</p>
          <p className="example">Example: /pool?id=pool_12345</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pool-page">
      <header className="pool-header">
        <h1>🤝 Pool Payment</h1>
        <p>Join others to purchase together</p>
      </header>

      {loading && !pool && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading pool...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {pool && (
        <div className="pool-container">
          {/* Pool Info Card */}
          <div className="pool-card">
            <div className="pool-header-section">
              <h2>{pool.listingID}</h2>
              <span className={`pool-status pool-status-${pool.status}`}>
                {pool.status}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="pool-progress-section">
              <div className="progress-header">
                <span className="progress-label">Pool Progress</span>
                <span className="progress-percentage">{pool.progress}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${Math.min(pool.progress, 100)}%` }}
                ></div>
              </div>
              <div className="progress-stats">
                <span>{(pool.currentAmount / 1000000).toFixed(6)} ALGO</span>
                <span>/</span>
                <span>{(pool.targetAmount / 1000000).toFixed(6)} ALGO</span>
              </div>
            </div>

            {/* Pool Stats */}
            <div className="pool-stats">
              <div className="stat">
                <div className="stat-label">Participants</div>
                <div className="stat-value">
                  {pool.currentParticipants} / {pool.maxParticipants}
                </div>
              </div>

              <div className="stat">
                <div className="stat-label">Remaining</div>
                <div className="stat-value">
                  {((pool.targetAmount - pool.currentAmount) / 1000000).toFixed(6)} ALGO
                </div>
              </div>

              <div className="stat">
                <div className="stat-label">Creator</div>
                <div className="stat-value creator">
                  {pool.creatorId}
                  {isCreator && <span className="badge-creator">You</span>}
                </div>
              </div>
            </div>

            {/* Participants List */}
            <div className="participants-section">
              <h3>👥 Participants ({pool.participants?.length || 0})</h3>
              <div className="participants-list">
                {pool.participants && pool.participants.length > 0 ? (
                  pool.participants.map((participant, idx) => (
                    <div key={idx} className="participant-item">
                      <div className="participant-info">
                        <span className="participant-name">
                          {participant.userId}
                          {participant.userId === currentUserId && (
                            <span className="badge-you">You</span>
                          )}
                        </span>
                        <span className="participant-time">
                          {new Date(participant.joined_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="participant-amount">
                        {(participant.amount / 1000000).toFixed(6)} ALGO
                        <span className="participant-status status-{participant.status}">
                          {participant.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-participants">No participants yet. Be the first to join!</p>
                )}
              </div>
            </div>

            {/* Join Pool Form */}
            {pool.status === 'active' && !hasJoined && !pool.isFull && (
              <div className="join-section">
                <h3>Join This Pool</h3>
                <form onSubmit={handleJoinPool} className="join-form">
                  <div className="form-group">
                    <label htmlFor="amount">Contribution Amount (microAlgos)</label>
                    <input
                      id="amount"
                      type="number"
                      value={joinAmount}
                      onChange={(e) => setJoinAmount(e.target.value)}
                      placeholder="Enter amount in microAlgos"
                      className="amount-input"
                      min="1"
                      max={pool.targetAmount - pool.currentAmount}
                    />
                    <div className="input-hint">
                      = {(parseInt(joinAmount || 0) / 1000000).toFixed(6)} ALGO
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="userId">User ID</label>
                    <input
                      id="userId"
                      type="text"
                      value={currentUserId}
                      onChange={(e) => setCurrentUserId(e.target.value)}
                      placeholder="Your user ID"
                      className="userid-input"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={joining}
                    className="btn btn-join"
                  >
                    {joining ? (
                      <>
                        <span className="spinner-small"></span>
                        Joining...
                      </>
                    ) : (
                      <>🤝 Join Pool</>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Already Joined Message */}
            {hasJoined && pool.status === 'active' && (
              <div className="joined-message">
                <span className="joined-icon">✅</span>
                <div>
                  <strong>You've joined this pool!</strong>
                  <p>Contribution: {(userParticipant.amount / 1000000).toFixed(6)} ALGO</p>
                </div>
              </div>
            )}

            {/* Pool Full Message */}
            {pool.isFull && pool.status === 'active' && (
              <div className="pool-full-message">
                <span className="full-icon">🎯</span>
                <strong>Pool is Full!</strong>
                <p>{pool.canFinalize ? 'Ready to finalize' : 'Target reached'}</p>
              </div>
            )}

            {/* Finalize Button (Creator Only) */}
            {isCreator && pool.status === 'active' && pool.canFinalize && (
              <div className="finalize-section">
                <button 
                  onClick={handleFinalizePool}
                  disabled={finalizing}
                  className="btn btn-finalize"
                >
                  {finalizing ? (
                    <>
                      <span className="spinner-small"></span>
                      Finalizing...
                    </>
                  ) : (
                    <>🚀 Finalize Pool & Execute Payment</>
                  )}
                </button>
                <p className="finalize-hint">
                  This will execute a blockchain transaction for the total amount
                </p>
              </div>
            )}

            {/* Creator Waiting Message */}
            {isCreator && pool.status === 'active' && !pool.canFinalize && (
              <div className="waiting-message">
                <span className="waiting-icon">⏳</span>
                <strong>Waiting for participants...</strong>
                <p>Pool needs {((pool.targetAmount - pool.currentAmount) / 1000000).toFixed(6)} more ALGO</p>
              </div>
            )}
          </div>

          {/* Transaction Result */}
          {txResult && (
            <div className="tx-result-card">
              <div className="result-icon">✅</div>
              <h2>Pool Finalized!</h2>
              
              <div className="result-details">
                <div className="result-row">
                  <span>Transaction ID:</span>
                  <span className="txid">{txResult.txid?.slice(0, 12)}...{txResult.txid?.slice(-8)}</span>
                </div>
                <div className="result-row">
                  <span>Total Amount:</span>
                  <span>{(txResult.totalAmount / 1000000).toFixed(6)} ALGO</span>
                </div>
                <div className="result-row">
                  <span>Participants:</span>
                  <span>{txResult.participants} members</span>
                </div>
                <div className="result-row">
                  <span>Round:</span>
                  <span>{txResult.round}</span>
                </div>
              </div>

              <a 
                href={txResult.explorer}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-explorer"
              >
                🔍 View on AlgoExplorer
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PoolPage;

