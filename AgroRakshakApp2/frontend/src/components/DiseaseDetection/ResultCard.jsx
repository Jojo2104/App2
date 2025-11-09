import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

const ResultCard = ({ detection }) => {
  if (!detection) return null;

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return <AlertCircle size={24} color="#ef4444" />;
      case 'medium':
        return <AlertTriangle size={24} color="#f59e0b" />;
      case 'low':
        return <CheckCircle size={24} color="#10b981" />;
      default:
        return <AlertCircle size={24} />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#fee2e2';
      case 'medium': return '#fef3c7';
      case 'low': return '#d1fae5';
      default: return '#f3f4f6';
    }
  };

  return (
    <div className="result-card" style={{ backgroundColor: getSeverityColor(detection.severity) }}>
      <div className="result-header">
        {getSeverityIcon(detection.severity)}
        <h3>{detection.class.replace(/_/g, ' ')}</h3>
      </div>
      
      <div className="result-details">
        <div className="detail-row">
          <span className="label">Confidence:</span>
          <span className="value">{(detection.confidence * 100).toFixed(2)}%</span>
        </div>
        <div className="detail-row">
          <span className="label">Severity:</span>
          <span className="value severity-badge" data-severity={detection.severity}>
            {detection.severity.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="recommendation">
        <h4>💡 Recommendation:</h4>
        <p>{detection.recommendation}</p>
      </div>

      {detection.bbox && (
        <div className="bbox-info">
          <small>Detection Box: {Math.round(detection.bbox.width)} × {Math.round(detection.bbox.height)}px</small>
        </div>
      )}
    </div>
  );
};

export default ResultCard;
