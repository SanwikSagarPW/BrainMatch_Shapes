/**
 * BrainMatch Shapes - Analytics Integration
 * 
 * This script integrates the JS Analytics Bridge with BrainMatch game
 * WITHOUT modifying the original game code.
 * 
 * It uses monkey-patching to intercept game functions and track analytics.
 */

// ========================================
// 1. INITIALIZATION
// ========================================

// Generate unique session ID
const sessionID = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Initialize Analytics Manager
const analytics = new AnalyticsManager();
analytics.initialize('BrainMatch_Shapes', sessionID);

console.log('[Analytics] Integration loaded for BrainMatch Shapes');

// ========================================
// 2. HELPER FUNCTIONS & STATE
// ========================================

let levelStartTime = null;
let currentLevelId = null;
let currentGameMode = null;
let taskCounter = 0;

/**
 * Helper function to generate level ID
 */
function getLevelId(mode, level) {
  if (mode === 'campaign') {
    return `campaign_level_${level}`;
  } else if (mode === 'reflex') {
    return 'reflex_mode';
  }
  return 'unknown';
}

// ========================================
// 3. HOOK: START CAMPAIGN LEVEL
// ========================================

const originalStartGame = window.startGame;
window.startGame = function(level) {
  try {
    // Track level start
    currentLevelId = getLevelId('campaign', level);
    currentGameMode = 'campaign';
    levelStartTime = Date.now();
    taskCounter = 0;
    
    analytics.startLevel(currentLevelId);
    console.log(`[Analytics] Started Level: ${currentLevelId}`);
  } catch (error) {
    console.error('[Analytics] Error in startGame hook:', error);
  }
  
  // Always call original function
  return originalStartGame.call(this, level);
};

// ========================================
// 4. HOOK: START REFLEX MODE
// ========================================

const originalStartReflexMode = window.startReflexMode;
window.startReflexMode = function() {
  try {
    // Track reflex mode start
    currentLevelId = getLevelId('reflex');
    currentGameMode = 'reflex';
    levelStartTime = Date.now();
    taskCounter = 0;
    
    analytics.startLevel(currentLevelId);
    console.log(`[Analytics] Started Level: ${currentLevelId}`);
  } catch (error) {
    console.error('[Analytics] Error in startReflexMode hook:', error);
  }
  
  // Always call original function
  return originalStartReflexMode.call(this);
};

// ========================================
// 5. HOOK: CORRECT MATCH
// ========================================

const originalHandleCorrectMatch = window.handleCorrectMatch;
window.handleCorrectMatch = function() {
  try {
    // Capture game state BEFORE calling original function
    const flippedCards = gameState.flippedCards;
    
    if (flippedCards && flippedCards.length === 2) {
      const card1 = flippedCards[0];
      const card2 = flippedCards[1];
      
      // Get card identifiers from data attributes or image sources
      const card1Name = card1.querySelector('img')?.alt || 'unknown';
      const card2Name = card2.querySelector('img')?.alt || 'unknown';
      
      taskCounter++;
      
      // Record the task
      analytics.recordTask(
        currentLevelId,
        `task_${taskCounter}`,
        `Match: ${card1Name}`,
        card1Name,
        card2Name,
        0, // timeTaken - can be tracked if needed
        0  // xpEarned - calculated at level end
      );
      
      console.log(`[Analytics] Task Recorded - Correct Match: ${card1Name} = ${card2Name}`);
    }
  } catch (error) {
    console.error('[Analytics] Error in handleCorrectMatch hook:', error);
  }
  
  // Always call original function
  return originalHandleCorrectMatch.call(this);
};

// ========================================
// 6. HOOK: INCORRECT MATCH
// ========================================

const originalHandleIncorrectMatch = window.handleIncorrectMatch;
window.handleIncorrectMatch = function() {
  try {
    // Capture game state BEFORE calling original function
    const flippedCards = gameState.flippedCards;
    
    if (flippedCards && flippedCards.length === 2) {
      const card1 = flippedCards[0];
      const card2 = flippedCards[1];
      
      // Get card identifiers
      const card1Name = card1.querySelector('img')?.alt || 'unknown';
      const card2Name = card2.querySelector('img')?.alt || 'unknown';
      
      taskCounter++;
      
      // Record the task (incorrect)
      analytics.recordTask(
        currentLevelId,
        `task_${taskCounter}`,
        `Match: ${card1Name}`,
        card1Name,
        card2Name,
        0, // timeTaken
        0  // xpEarned
      );
      
      console.log(`[Analytics] Task Recorded - Incorrect Match: ${card1Name} ≠ ${card2Name}`);
    }
  } catch (error) {
    console.error('[Analytics] Error in handleIncorrectMatch hook:', error);
  }
  
  // Always call original function
  return originalHandleIncorrectMatch.call(this);
};

// ========================================
// 7. HOOK: CAMPAIGN WIN
// ========================================

const originalHandleCampaignWin = window.handleCampaignWin;
window.handleCampaignWin = function() {
  try {
    // Capture game state BEFORE calling original function
    const level = gameState.currentCampaignLevel;
    const turns = gameState.turns;
    const timeTaken = levelStartTime ? Date.now() - levelStartTime : 0;
    
    // Calculate XP (using same logic as game)
    const xp = calculateXP(level, turns);
    
    // End level tracking
    analytics.endLevel(currentLevelId, true, timeTaken, xp);
    
    // Add additional metrics
    analytics.addRawMetric('level', String(level));
    analytics.addRawMetric('turns', String(turns));
    analytics.addRawMetric('xp_earned', String(xp));
    analytics.addRawMetric('time_ms', String(timeTaken));
    
    // Submit report
    analytics.submitReport();
    
    console.log(`[Analytics] Completed Level: ${currentLevelId}, Success: true, Time: ${timeTaken}ms, XP: ${xp}`);
    console.log('[Analytics] Report submitted');
  } catch (error) {
    console.error('[Analytics] Error in handleCampaignWin hook:', error);
  }
  
  // Always call original function
  return originalHandleCampaignWin.call(this);
};

// ========================================
// 8. HOOK: REFLEX MODE END
// ========================================

const originalHandleReflexModeEnd = window.handleReflexModeEnd;
window.handleReflexModeEnd = function() {
  try {
    // Capture game state BEFORE calling original function
    const turns = gameState.turns;
    const timeTaken = levelStartTime ? Date.now() - levelStartTime : 0;
    
    // End level tracking (reflex mode doesn't have XP)
    analytics.endLevel(currentLevelId, true, timeTaken, 0);
    
    // Add additional metrics
    analytics.addRawMetric('mode', 'reflex');
    analytics.addRawMetric('total_moves', String(turns));
    analytics.addRawMetric('time_ms', String(timeTaken));
    
    // Submit report
    analytics.submitReport();
    
    console.log(`[Analytics] Completed Level: ${currentLevelId}, Success: true, Time: ${timeTaken}ms, Moves: ${turns}`);
    console.log('[Analytics] Report submitted');
  } catch (error) {
    console.error('[Analytics] Error in handleReflexModeEnd hook:', error);
  }
  
  // Always call original function
  return originalHandleReflexModeEnd.call(this);
};

// ========================================
// 9. GRACEFUL DEGRADATION
// ========================================

// Ensure analytics never breaks the game
window.addEventListener('error', function(event) {
  if (event.message && event.message.includes('Analytics')) {
    console.warn('[Analytics] Non-critical error caught:', event.message);
    event.preventDefault(); // Prevent game from breaking
  }
});

console.log('[Analytics] Integration complete. Ready to track game events.');
