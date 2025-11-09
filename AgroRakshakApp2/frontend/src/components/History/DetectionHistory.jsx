import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getDetectionHistory } from '../../services/detectionService';
import { Loader, Clock, AlertCircle, Trash2 } from 'lucide-react';

const DetectionHistory = () => {
  const { currentUser } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const data = await getDetectionHistory(currentUser.uid, 20);
      setHistory(data);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#fee2e2';
      case 'medium': return '#fef3c7';
      case 'low': return '#d1fae5';
      default: return '#f3f4f6';
    }
  };

  if (loading) {
    return (
      <div className="history-container">
        <div className="loading">
          <Loader className="animate-spin" size={48} />
          <p>Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <h2>📊 Detection History</h2>
        <p>Your past {history.length} detection{history.length !== 1 ? 's' : ''}</p>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {history.length === 0 ? (
        <div className="no-history">
          <p>No detections yet</p>
          <p className="hint">Start detecting diseases to see history here</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <div 
              key={item.id} 
              className="history-item"
              style={{ backgroundColor: getSeverityColor(item.severity) }}
            >
              <div className="history-item-header">
                <h3>{item.class.replace(/_/g, ' ')}</h3>
                <span className="severity-badge" data-severity={item.severity}>
                  {item.severity.toUpperCase()}
                </span>
              </div>

              <div className="history-item-details">
                <div className="detail">
                  <span className="label">Confidence:</span>
                  <span className="value">{(item.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="detail">
                  <Clock size={16} />
                  <span className="value">{formatDate(item.timestamp)}</span>
                </div>
              </div>

              <div className="history-item-recommendation">
                <p>{item.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DetectionHistory;
