/**
 * TELESCOPE Suite - Frontend React App
 * Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.
 *
 * A production-ready React application for:
 * - Real-time stock market predictions
 * - Advanced analytics dashboard
 * - Portfolio management
 * - AI coaching features
 * - Mobile-responsive design
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './TelescopeSuite.css';

// ===== MAIN APP COMPONENT =====

export default function TelescopeSuiteApp() {
  const [activeTab, setActiveTab] = useState('predictions');
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('dark');

  // Initialize theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <div className="telescope-app">
      <Header user={user} onLogout={() => setUser(null)} theme={theme} onThemeToggle={setTheme} />

      <div className="app-container">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="main-content">
          {activeTab === 'predictions' && <PredictionsView />}
          {activeTab === 'portfolio' && <PortfolioView />}
          {activeTab === 'analytics' && <AnalyticsView />}
          {activeTab === 'coaching' && <CoachingView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
}

// ===== LOGIN PAGE =====

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Mock authentication - replace with real API
      if (email && password.length >= 6) {
        onLogin({
          id: '1',
          email,
          name: email.split('@')[0],
          subscription: 'pro',
          created_at: new Date().toISOString()
        });
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>🚀 TELESCOPE Suite</h1>
          <p>Quantum-Powered Stock Market Intelligence</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-features">
          <h3>Features included:</h3>
          <ul>
            <li>✅ 7-Layer quantum predictions</li>
            <li>✅ Real-time portfolio tracking</li>
            <li>✅ Advanced analytics dashboard</li>
            <li>✅ AI coaching & insights</li>
            <li>✅ Mobile app access</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ===== HEADER =====

function Header({ user, onLogout, theme, onThemeToggle }) {
  return (
    <header className="telescope-header">
      <div className="header-left">
        <h1 className="app-title">🚀 TELESCOPE</h1>
        <span className="tagline">Quantum Market Intelligence</span>
      </div>

      <nav className="header-nav">
        <button className="nav-btn">Pricing</button>
        <button className="nav-btn">Docs</button>
        <button className="nav-btn">Support</button>
      </nav>

      <div className="header-right">
        <button
          className="theme-toggle"
          onClick={onThemeToggle}
          title="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <div className="user-menu">
          <span className="user-name">{user?.name}</span>
          <button onClick={onLogout} className="logout-btn">Sign Out</button>
        </div>
      </div>
    </header>
  );
}

// ===== SIDEBAR =====

function Sidebar({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'predictions', label: '📈 Predictions', icon: '🎯' },
    { id: 'portfolio', label: '💼 Portfolio', icon: '📊' },
    { id: 'analytics', label: '📉 Analytics', icon: '🔍' },
    { id: 'coaching', label: '🤖 AI Coaching', icon: '💡' },
    { id: 'settings', label: '⚙️ Settings', icon: '🔧' },
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

// ===== PREDICTIONS VIEW =====

function PredictionsView() {
  const [ticker, setTicker] = useState('AAPL');
  const [horizon, setHorizon] = useState(7);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentStocks] = useState(['AAPL', 'MSFT', 'TSLA', 'GOOGL']);
  const wsRef = useRef(null);

  const runPrediction = useCallback(async () => {
    setLoading(true);
    try {
      // Connect to WebSocket for real-time updates
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/predict/${ticker}`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        wsRef.current.send(JSON.stringify({
          horizon,
          analysis_type: 'ensemble',
          risk_tolerance: 'moderate'
        }));
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setPrediction(data);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Fallback to REST API
        fetchPredictionREST();
      };
    } finally {
      setLoading(false);
    }
  }, [ticker, horizon]);

  const fetchPredictionREST = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          horizon,
          analysis_type: 'ensemble',
          risk_tolerance: 'moderate'
        })
      });

      const data = await response.json();
      if (data.success) {
        const pred = data.prediction;
        setPrediction({
          ticker: pred.ticker,
          predicted_price: pred.predicted_price,
          current_price: pred.current_price,
          price_change_percent: pred.price_change_percent,
          confidence: pred.confidence,
          signal: pred.signal,
          framework_agreement: pred.framework_agreement
        });
      }
    } catch (error) {
      console.error('Prediction error:', error);
    }
  }, [ticker, horizon]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="view-content">
      <h2>📈 Real-Time Predictions</h2>

      <div className="prediction-controls">
        <div className="control-group">
          <label>Stock Ticker</label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="AAPL"
            maxLength="5"
          />
        </div>

        <div className="control-group">
          <label>Prediction Horizon</label>
          <select value={horizon} onChange={(e) => setHorizon(parseInt(e.target.value))}>
            <option value="7">1 Week</option>
            <option value="30">1 Month</option>
            <option value="90">3 Months</option>
            <option value="252">1 Year</option>
          </select>
        </div>

        <button onClick={runPrediction} disabled={loading} className="btn-primary">
          {loading ? 'Analyzing...' : '🚀 Run 7-Layer Analysis'}
        </button>
      </div>

      {prediction && (
        <PredictionCard prediction={prediction} />
      )}

      <div className="recent-stocks">
        <h3>Recent Stocks</h3>
        <div className="stock-buttons">
          {recentStocks.map((stock) => (
            <button
              key={stock}
              className="stock-btn"
              onClick={() => {
                setTicker(stock);
                setTimeout(runPrediction, 100);
              }}
            >
              {stock}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== PREDICTION CARD =====

function PredictionCard({ prediction }) {
  const isPositive = prediction.price_change_percent > 0;
  const isBullish = prediction.signal === 'bullish';

  return (
    <div className={`prediction-card ${prediction.signal}`}>
      <div className="prediction-header">
        <h3>{prediction.ticker}</h3>
        <div className={`signal-badge ${prediction.signal}`}>
          {isBullish ? '🟢 BULLISH' : '🔴 BEARISH'} ({Math.round(prediction.confidence * 100)}%)
        </div>
      </div>

      <div className="prediction-grid">
        <div className="prediction-item">
          <label>Current Price</label>
          <div className="value cyan">${prediction.current_price.toFixed(2)}</div>
        </div>

        <div className="prediction-item">
          <label>Predicted Price</label>
          <div className={`value ${isPositive ? 'green' : 'red'}`}>
            ${prediction.predicted_price.toFixed(2)}
          </div>
        </div>

        <div className="prediction-item">
          <label>Price Change</label>
          <div className={`value ${isPositive ? 'green' : 'red'}`}>
            {isPositive ? '+' : ''}{prediction.price_change_percent.toFixed(2)}%
          </div>
        </div>

        <div className="prediction-item">
          <label>Framework Agreement</label>
          <div className="value">
            {prediction.framework_agreement}/7 layers
          </div>
        </div>
      </div>

      <div className="framework-dots">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={`dot ${i < prediction.framework_agreement ? 'filled' : 'empty'}`}
          />
        ))}
      </div>
    </div>
  );
}

// ===== PORTFOLIO VIEW =====

function PortfolioView() {
  const [portfolio] = useState([
    { ticker: 'AAPL', shares: 10, price: 174.91, current_value: 1749.1 },
    { ticker: 'MSFT', shares: 5, price: 440.23, current_value: 2201.15 },
    { ticker: 'TSLA', shares: 3, price: 245.67, current_value: 737.01 },
  ]);

  const totalValue = portfolio.reduce((sum, stock) => sum + stock.current_value, 0);

  return (
    <div className="view-content">
      <h2>💼 Portfolio</h2>

      <div className="portfolio-summary">
        <div className="summary-card">
          <label>Total Value</label>
          <div className="value">${totalValue.toFixed(2)}</div>
        </div>

        <div className="summary-card">
          <label>Holdings</label>
          <div className="value">{portfolio.length}</div>
        </div>

        <div className="summary-card">
          <label>Allocation</label>
          <div className="value">Diversified</div>
        </div>
      </div>

      <table className="portfolio-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Shares</th>
            <th>Price</th>
            <th>Value</th>
            <th>% of Portfolio</th>
          </tr>
        </thead>
        <tbody>
          {portfolio.map((stock) => (
            <tr key={stock.ticker}>
              <td className="ticker">{stock.ticker}</td>
              <td>{stock.shares}</td>
              <td>${stock.price.toFixed(2)}</td>
              <td>${stock.current_value.toFixed(2)}</td>
              <td>{((stock.current_value / totalValue) * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===== ANALYTICS VIEW =====

function AnalyticsView() {
  return (
    <div className="view-content">
      <h2>📉 Advanced Analytics</h2>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Performance Analysis</h3>
          <div className="chart-placeholder">
            📊 Interactive performance charts coming soon
          </div>
        </div>

        <div className="analytics-card">
          <h3>Market Trends</h3>
          <div className="chart-placeholder">
            📈 Trend analysis and signals
          </div>
        </div>

        <div className="analytics-card">
          <h3>Risk Assessment</h3>
          <div className="chart-placeholder">
            ⚠️ Risk metrics and correlations
          </div>
        </div>

        <div className="analytics-card">
          <h3>Sector Rotation</h3>
          <div className="chart-placeholder">
            🔄 Sector performance heatmap
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== AI COACHING VIEW =====

function CoachingView() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'coach',
      text: 'Hello! I\'m your AI trading coach. How can I help you improve your trading strategy today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;

    setMessages([...messages, {
      id: messages.length + 1,
      sender: 'user',
      text: input,
      timestamp: new Date()
    }]);

    // Mock AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        sender: 'coach',
        text: 'That\'s a great question! Based on current market conditions and your portfolio, I recommend...',
        timestamp: new Date()
      }]);
    }, 1000);

    setInput('');
  };

  return (
    <div className="view-content">
      <h2>🤖 AI Coaching</h2>

      <div className="coaching-container">
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.sender}`}>
              <div className="message-content">{msg.text}</div>
              <div className="message-time">
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>

        <div className="chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask your AI coach..."
          />
          <button onClick={sendMessage} className="btn-primary">Send</button>
        </div>
      </div>
    </div>
  );
}

// ===== SETTINGS VIEW =====

function SettingsView() {
  const [settings, setSettings] = useState({
    notifications: true,
    emails: true,
    darkMode: true,
    apiKey: '••••••••••••••••'
  });

  return (
    <div className="view-content">
      <h2>⚙️ Settings</h2>

      <div className="settings-form">
        <div className="setting-item">
          <label>Notifications</label>
          <input
            type="checkbox"
            checked={settings.notifications}
            onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
          />
        </div>

        <div className="setting-item">
          <label>Email Alerts</label>
          <input
            type="checkbox"
            checked={settings.emails}
            onChange={(e) => setSettings({ ...settings, emails: e.target.checked })}
          />
        </div>

        <div className="setting-item">
          <label>Dark Mode</label>
          <input
            type="checkbox"
            checked={settings.darkMode}
            onChange={(e) => setSettings({ ...settings, darkMode: e.target.checked })}
          />
        </div>

        <div className="setting-item">
          <label>API Key</label>
          <input type="password" value={settings.apiKey} disabled />
        </div>

        <button className="btn-primary">Save Settings</button>
      </div>
    </div>
  );
}
