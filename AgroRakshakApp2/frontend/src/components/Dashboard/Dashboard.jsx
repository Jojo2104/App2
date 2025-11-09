import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getDetectionHistory } from '../../services/detectionService';
import { BarChart3, TrendingUp, AlertTriangle, Activity, Calendar } from 'lucide-react';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const history = await getDetectionHistory(currentUser.uid, 100);
      
      // Calculate statistics
      const totalDetections = history.length;
      
      // Count diseases
      const diseaseCounts = {};
      const severityCounts = { high: 0, medium: 0, low: 0 };
      
      history.forEach(item => {
        // Count by disease
        diseaseCounts[item.class] = (diseaseCounts[item.class] || 0) + 1;
        
        // Count by severity
        severityCounts[item.severity] = (severityCounts[item.severity] || 0) + 1;
      });

      // Find most common disease
      const mostCommon = Object.entries(diseaseCounts)
        .sort((a, b) => b[1] - a[1])[0];

      // Calculate average confidence
      const avgConfidence = history.length > 0
        ? history.reduce((sum, item) => sum + item.confidence, 0) / history.length
        : 0;

      // Get recent detections (last 7 days)
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const recentDetections = history.filter(item => item.timestamp > sevenDaysAgo);

      setStats({
        totalDetections,
        diseaseCounts,
        severityCounts,
        mostCommon: mostCommon ? { name: mostCommon[0], count: mostCommon[1] } : null,
        avgConfidence: avgConfidence * 100,
        recentDetections: recentDetections.length,
        recentHistory: history.slice(0, 5)
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          <Activity className="animate-spin" size={48} />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats || stats.totalDetections === 0) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2>📊 Dashboard</h2>
          <p>Analytics and insights</p>
        </div>
        <div className="no-data">
          <BarChart3 size={64} />
          <p>No data yet</p>
          <p className="hint">Start detecting diseases to see your statistics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>📊 Dashboard</h2>
        <p>Your detection analytics</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe' }}>
            <BarChart3 size={24} color="#2563eb" />
          </div>
          <div className="stat-content">
            <h3>{stats.totalDetections}</h3>
            <p>Total Detections</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7' }}>
            <TrendingUp size={24} color="#d97706" />
          </div>
          <div className="stat-content">
            <h3>{stats.avgConfidence.toFixed(1)}%</h3>
            <p>Avg. Confidence</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fee2e2' }}>
            <AlertTriangle size={24} color="#dc2626" />
          </div>
          <div className="stat-content">
            <h3>{stats.severityCounts.high}</h3>
            <p>High Severity</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5' }}>
            <Calendar size={24} color="#059669" />
          </div>
          <div className="stat-content">
            <h3>{stats.recentDetections}</h3>
            <p>Last 7 Days</p>
          </div>
        </div>
      </div>

      {/* Most Common Disease */}
      {stats.mostCommon && (
        <div className="dashboard-section">
          <h3>🔍 Most Detected Issue</h3>
          <div className="most-common-card">
            <div className="most-common-header">
              <h4>{stats.mostCommon.name.replace(/_/g, ' ')}</h4>
              <span className="badge">{stats.mostCommon.count} detections</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${(stats.mostCommon.count / stats.totalDetections) * 100}%` 
                }}
              />
            </div>
            <p className="percentage">
              {((stats.mostCommon.count / stats.totalDetections) * 100).toFixed(1)}% of total
            </p>
          </div>
        </div>
      )}

      {/* Disease Breakdown */}
      <div className="dashboard-section">
        <h3>📈 Disease Breakdown</h3>
        <div className="disease-breakdown">
          {Object.entries(stats.diseaseCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([disease, count]) => (
              <div key={disease} className="breakdown-item">
                <div className="breakdown-info">
                  <span className="disease-name">{disease.replace(/_/g, ' ')}</span>
                  <span className="disease-count">{count}</span>
                </div>
                <div className="breakdown-bar">
                  <div 
                    className="breakdown-fill"
                    style={{ 
                      width: `${(count / stats.totalDetections) * 100}%`,
                      background: count === stats.mostCommon.count ? '#3b82f6' : '#e5e7eb'
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Severity Distribution */}
      <div className="dashboard-section">
        <h3>⚠️ Severity Distribution</h3>
        <div className="severity-grid">
          <div className="severity-card high">
            <div className="severity-number">{stats.severityCounts.high}</div>
            <div className="severity-label">High</div>
            <div className="severity-percentage">
              {stats.totalDetections > 0 
                ? ((stats.severityCounts.high / stats.totalDetections) * 100).toFixed(0)
                : 0}%
            </div>
          </div>
          <div className="severity-card medium">
            <div className="severity-number">{stats.severityCounts.medium}</div>
            <div className="severity-label">Medium</div>
            <div className="severity-percentage">
              {stats.totalDetections > 0 
                ? ((stats.severityCounts.medium / stats.totalDetections) * 100).toFixed(0)
                : 0}%
            </div>
          </div>
          <div className="severity-card low">
            <div className="severity-number">{stats.severityCounts.low}</div>
            <div className="severity-label">Low</div>
            <div className="severity-percentage">
              {stats.totalDetections > 0 
                ? ((stats.severityCounts.low / stats.totalDetections) * 100).toFixed(0)
                : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-section">
        <h3>🕐 Recent Activity</h3>
        <div className="recent-activity">
          {stats.recentHistory.map((item, index) => (
            <div key={item.id} className="activity-item">
              <div className="activity-dot" />
              <div className="activity-content">
                <div className="activity-header">
                  <strong>{item.class.replace(/_/g, ' ')}</strong>
                  <span className="activity-time">
                    {new Date(item.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="activity-details">
                  <span className={`severity-tag ${item.severity}`}>
                    {item.severity}
                  </span>
                  <span className="confidence-tag">
                    {(item.confidence * 100).toFixed(1)}% confident
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
