const AnalyticsManager = require('../dist/analytics-bridge.js');

// Mock window and ReactNativeWebView
global.window = {
  ReactNativeWebView: {
    postMessage: jest.fn()
  }
};

describe('AnalyticsManager', () => {
  let analytics;
  
  beforeEach(() => {
    // Use the singleton instance or create new one
    // Since we exported the class, we can instantiate it
    analytics = new AnalyticsManager();
    
    // Clear mock
    global.window.ReactNativeWebView.postMessage.mockClear();
  });
  
  test('should initialize correctly', () => {
    analytics.initialize('game_123', 'session_456');
    const data = analytics.getReportData();
    
    expect(data.gameId).toBe('game_123');
    expect(data.sessionId).toBe('session_456');
    expect(data.name).toBe('session_456');
    expect(data.xpEarnedTotal).toBe(0);
    expect(data.xpEarned).toBe(0);
    expect(data.xpTotal).toBe(0);
    expect(data.bestXp).toBe(0);
    expect(data.lastPlayedLevel).toBe('');
    expect(data.highestLevelPlayed).toBe('');
    expect(data.perLevelAnalytics).toEqual({});
  });
  
  test('should add raw metrics', () => {
    analytics.initialize('game_123', 'session_456');
    analytics.addRawMetric('fps', '60');
    
    const data = analytics.getReportData();
    expect(data.rawData).toHaveLength(1);
    expect(data.rawData[0].key).toBe('fps');
    expect(data.rawData[0].value).toBe('60');
  });
  
  test('should track levels correctly', () => {
    analytics.initialize('game_123', 'session_456');
    analytics.startLevel('level_1');
    analytics.endLevel('level_1', true, 5000, 100);
    
    const data = analytics.getReportData();
    expect(data.diagnostics.levels).toHaveLength(1);
    expect(data.diagnostics.levels[0].successful).toBe(true);
    expect(data.xpEarnedTotal).toBe(100);
  });
  
  test('should record tasks', () => {
    analytics.initialize('game_123', 'session_456');
    analytics.startLevel('level_1');
    analytics.recordTask('level_1', 'q1', 'What is 2+2?', '4', '4', 1000, 10);
    
    const data = analytics.getReportData();
    const level = data.diagnostics.levels[0];
    expect(level.tasks).toHaveLength(1);
    expect(level.tasks[0].successful).toBe(true);
  });

  test('should submit report to React Native', () => {
    analytics.initialize('game_123', 'session_456');
    analytics.submitReport();
    
    expect(global.window.ReactNativeWebView.postMessage).toHaveBeenCalled();
    const payload = JSON.parse(global.window.ReactNativeWebView.postMessage.mock.calls[0][0]);
    expect(payload.gameId).toBe('game_123');
  });

  test('should track lastPlayedLevel', () => {
    analytics.initialize('game_123', 'session_456');
    analytics.startLevel('campaign_level_1');
    analytics.startLevel('campaign_level_2');
    
    const data = analytics.getReportData();
    expect(data.lastPlayedLevel).toBe('campaign_level_2');
  });

  test('should track highestLevelPlayed', () => {
    analytics.initialize('game_123', 'session_456');
    analytics.startLevel('campaign_level_1');
    analytics.startLevel('campaign_level_3');
    analytics.startLevel('campaign_level_2');
    
    const data = analytics.getReportData();
    expect(data.highestLevelPlayed).toBe('campaign_level_3');
  });

  test('should maintain perLevelAnalytics correctly', () => {
    analytics.initialize('game_123', 'session_456');
    
    // Play level 1 twice - one failure, one success
    analytics.startLevel('campaign_level_1');
    analytics.endLevel('campaign_level_1', false, 5000, 0);
    
    analytics.startLevel('campaign_level_1');
    analytics.endLevel('campaign_level_1', true, 3000, 100);
    
    const data = analytics.getReportData();
    const levelStats = data.perLevelAnalytics['campaign_level_1'];
    
    expect(levelStats.attempts).toBe(2);
    expect(levelStats.wins).toBe(1);
    expect(levelStats.losses).toBe(1);
    expect(levelStats.totalTimeMs).toBe(8000);
    expect(levelStats.bestTimeMs).toBe(3000);
    expect(levelStats.totalXp).toBe(100);
    expect(levelStats.averageTimeMs).toBe(4000);
  });

  test('should synchronize XP fields on submit', () => {
    analytics.initialize('game_123', 'session_456');
    analytics.startLevel('level_1');
    analytics.endLevel('level_1', true, 5000, 150);
    analytics.submitReport();
    
    expect(global.window.ReactNativeWebView.postMessage).toHaveBeenCalled();
    const payload = JSON.parse(global.window.ReactNativeWebView.postMessage.mock.calls[0][0]);
    
    expect(payload.xpEarnedTotal).toBe(150);
    expect(payload.xpEarned).toBe(150);
    expect(payload.xpTotal).toBe(150);
    expect(payload.bestXp).toBe(150);
  });

  test('should include timestamp on submit', () => {
    analytics.initialize('game_123', 'session_456');
    analytics.submitReport();
    
    expect(global.window.ReactNativeWebView.postMessage).toHaveBeenCalled();
    const payload = JSON.parse(global.window.ReactNativeWebView.postMessage.mock.calls[0][0]);
    
    expect(payload.timestamp).toBeTruthy();
    expect(new Date(payload.timestamp).toISOString()).toBe(payload.timestamp);
  });
});
