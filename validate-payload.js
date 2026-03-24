/**
 * Payload Validation Script
 * 
 * This script validates that the analytics payload matches the exact format
 * specified in PAYLOAD_FORMAT.md
 * 
 * Usage: Run this in browser console after playing a level
 * > validatePayload(analytics.getReportData())
 */

function validatePayload(payload) {
  console.log('=== PAYLOAD VALIDATION ===\n');
  
  const requiredFields = {
    // Top-level required fields
    'gameId': 'string',
    'sessionId': 'string',
    'timestamp': 'string',
    'name': 'string',
    'xpEarnedTotal': 'number',
    'xpEarned': 'number',
    'xpTotal': 'number',
    'bestXp': 'number',
    'lastPlayedLevel': 'string',
    'highestLevelPlayed': 'string',
    'perLevelAnalytics': 'object',
    'rawData': 'array',
    'diagnostics': 'object'
  };
  
  let allValid = true;
  
  // Check top-level fields
  console.log('✓ Checking Top-Level Fields:');
  for (const [field, expectedType] of Object.entries(requiredFields)) {
    const value = payload[field];
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    const isValid = value !== undefined && actualType === expectedType;
    
    if (isValid) {
      console.log(`  ✓ ${field}: ${actualType} ✓`);
    } else {
      console.error(`  ✗ ${field}: expected ${expectedType}, got ${actualType} (value: ${value})`);
      allValid = false;
    }
  }
  
  // Check perLevelAnalytics structure
  console.log('\n✓ Checking perLevelAnalytics structure:');
  const perLevelFields = ['attempts', 'wins', 'losses', 'totalTimeMs', 'bestTimeMs', 'totalXp', 'averageTimeMs'];
  
  if (payload.perLevelAnalytics && typeof payload.perLevelAnalytics === 'object') {
    const levelIds = Object.keys(payload.perLevelAnalytics);
    
    if (levelIds.length === 0) {
      console.warn('  ⚠ No levels in perLevelAnalytics (may be valid if no levels played)');
    } else {
      for (const levelId of levelIds) {
        const stats = payload.perLevelAnalytics[levelId];
        console.log(`  Level: ${levelId}`);
        
        for (const field of perLevelFields) {
          if (stats[field] !== undefined && typeof stats[field] === 'number') {
            console.log(`    ✓ ${field}: ${stats[field]}`);
          } else {
            console.error(`    ✗ ${field}: missing or invalid`);
            allValid = false;
          }
        }
      }
    }
  } else {
    console.error('  ✗ perLevelAnalytics is missing or not an object');
    allValid = false;
  }
  
  // Check diagnostics structure
  console.log('\n✓ Checking diagnostics structure:');
  if (payload.diagnostics && payload.diagnostics.levels && Array.isArray(payload.diagnostics.levels)) {
    console.log(`  ✓ diagnostics.levels is array with ${payload.diagnostics.levels.length} entries`);
    
    if (payload.diagnostics.levels.length > 0) {
      const levelFields = ['levelId', 'successful', 'timeTaken', 'timeDirection', 'xpEarned', 'tasks'];
      const level = payload.diagnostics.levels[0];
      
      console.log('  Checking first level entry:');
      for (const field of levelFields) {
        const value = level[field];
        const hasField = value !== undefined;
        
        if (hasField) {
          console.log(`    ✓ ${field}: ${typeof value}`);
        } else {
          console.error(`    ✗ ${field}: missing`);
          allValid = false;
        }
      }
      
      // Check task structure
      if (level.tasks && Array.isArray(level.tasks) && level.tasks.length > 0) {
        console.log('  Checking first task entry:');
        const task = level.tasks[0];
        const taskFields = ['taskId', 'question', 'options', 'correctChoice', 'choiceMade', 'successful', 'timeTaken', 'xpEarned'];
        
        for (const field of taskFields) {
          if (task[field] !== undefined) {
            console.log(`    ✓ ${field}: ${typeof task[field]}`);
          } else {
            console.error(`    ✗ ${field}: missing`);
            allValid = false;
          }
        }
      }
    }
  } else {
    console.error('  ✗ diagnostics.levels is missing or not an array');
    allValid = false;
  }
  
  // Check rawData structure
  console.log('\n✓ Checking rawData structure:');
  if (Array.isArray(payload.rawData)) {
    console.log(`  ✓ rawData is array with ${payload.rawData.length} entries`);
    
    if (payload.rawData.length > 0) {
      const item = payload.rawData[0];
      if (item.key && item.value) {
        console.log(`    ✓ First entry has key: "${item.key}", value: "${item.value}"`);
      } else {
        console.error(`    ✗ First entry missing key or value`);
        allValid = false;
      }
    }
  } else {
    console.error('  ✗ rawData is not an array');
    allValid = false;
  }
  
  // Final result
  console.log('\n=== VALIDATION RESULT ===');
  if (allValid) {
    console.log('✓ ALL CHECKS PASSED - Payload matches PAYLOAD_FORMAT.md');
  } else {
    console.error('✗ VALIDATION FAILED - Some fields are missing or incorrect');
  }
  
  // Display complete payload
  console.log('\n=== COMPLETE PAYLOAD ===');
  console.log(JSON.stringify(payload, null, 2));
  
  return allValid;
}

// Make it available globally
if (typeof window !== 'undefined') {
  window.validatePayload = validatePayload;
  console.log('Payload validation loaded. Use: validatePayload(analytics.getReportData())');
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = validatePayload;
}
