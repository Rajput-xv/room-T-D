const fs = require('fs');
const path = require('path');

let truths = [];
let dares = [];

// Track used content per room to prevent repetition
// Map<roomId, { truths: Set<"groupIndex-itemIndex">, dares: Set<"groupIndex-itemIndex"> }>
const usedContent = new Map();

// Load content from files with error handling
const loadContent = () => {
  try {
    const truthsPath = path.join(__dirname, '../data/truths.json');
    const daresPath = path.join(__dirname, '../data/dares.json');
    
    if (fs.existsSync(truthsPath)) {
      truths = JSON.parse(fs.readFileSync(truthsPath, 'utf-8'));
    } else {
      console.warn('⚠️ truths.json not found, using defaults');
      // Default as nested array structure (1 group of 10)
      truths = [[
        'What is your biggest fear?',
        'What is your biggest secret?',
        'What is your most embarrassing moment?',
        'Who was your first crush?',
        'What is the worst lie you ever told?',
        'What is your guilty pleasure?',
        'What is your biggest regret?',
        'What is something you have never told anyone?',
        'What is your weirdest habit?',
        'What is the most childish thing you still do?'
      ]];
    }
    
    if (fs.existsSync(daresPath)) {
      dares = JSON.parse(fs.readFileSync(daresPath, 'utf-8'));
    } else {
      console.warn('⚠️ dares.json not found, using defaults');
      // Default as nested array structure (1 group of 10)
      dares = [[
        'Do 10 push-ups',
        'Sing a song',
        'Dance for 30 seconds',
        'Do your best animal impression',
        'Speak in an accent for the next 3 turns',
        'Let someone post anything on your social media',
        'Call a friend and sing happy birthday',
        'Do your best celebrity impression',
        'Tell a joke and make everyone laugh',
        'Do 20 jumping jacks'
      ]];
    }
  } catch (err) {
    console.error('Error loading content files:', err);
    // Use fallback content as nested arrays
    truths = [['What is your biggest fear?', 'What is your biggest secret?']];
    dares = [['Do 10 push-ups', 'Sing a song']];
  }
};

// Load content on startup
loadContent();

class ContentService {
  // Initialize tracking for a room
  static initRoom(roomId) {
    if (!usedContent.has(roomId)) {
      usedContent.set(roomId, { truths: new Set(), dares: new Set() });
    }
  }

  // Clean up room tracking when room is deleted
  static cleanupRoom(roomId) {
    usedContent.delete(roomId);
  }

  // Get random truth (picks random group + random item within group)
  // Uses roomId to track and avoid repetition
  static getTruth(roomId = null) {
    if (truths.length === 0 || truths[0].length === 0) {
      return 'What is your biggest fear?';
    }

    if (roomId) {
      this.initRoom(roomId);
      const roomHistory = usedContent.get(roomId);
      
      // Find all unused truths
      const available = [];
      for (let g = 0; g < truths.length; g++) {
        for (let i = 0; i < truths[g].length; i++) {
          const key = `${g}-${i}`;
          if (!roomHistory.truths.has(key)) {
            available.push({ groupIndex: g, itemIndex: i, key });
          }
        }
      }

      if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)];
        roomHistory.truths.add(pick.key);
        return truths[pick.groupIndex][pick.itemIndex];
      }

      // All used, reset and pick fresh
      roomHistory.truths.clear();
    }

    const groupIndex = Math.floor(Math.random() * truths.length);
    const itemIndex = Math.floor(Math.random() * truths[groupIndex].length);
    
    if (roomId) {
      usedContent.get(roomId).truths.add(`${groupIndex}-${itemIndex}`);
    }
    
    return truths[groupIndex][itemIndex];
  }

  // Get random dare (picks random group + random item within group)
  // Uses roomId to track and avoid repetition
  static getDare(roomId = null) {
    if (dares.length === 0 || dares[0].length === 0) {
      return 'Do 10 push-ups';
    }

    if (roomId) {
      this.initRoom(roomId);
      const roomHistory = usedContent.get(roomId);
      
      // Find all unused dares
      const available = [];
      for (let g = 0; g < dares.length; g++) {
        for (let i = 0; i < dares[g].length; i++) {
          const key = `${g}-${i}`;
          if (!roomHistory.dares.has(key)) {
            available.push({ groupIndex: g, itemIndex: i, key });
          }
        }
      }

      if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)];
        roomHistory.dares.add(pick.key);
        return dares[pick.groupIndex][pick.itemIndex];
      }

      // All used, reset and pick fresh
      roomHistory.dares.clear();
    }

    const groupIndex = Math.floor(Math.random() * dares.length);
    const itemIndex = Math.floor(Math.random() * dares[groupIndex].length);
    
    if (roomId) {
      usedContent.get(roomId).dares.add(`${groupIndex}-${itemIndex}`);
    }
    
    return dares[groupIndex][itemIndex];
  }

  // Get all truths (flattened for wheel spinning display)
  static getTruths() {
    if (truths.length === 0) return ['What is your biggest fear?', 'What is your biggest secret?'];
    return truths.flat();
  }

  // Get all dares (flattened for wheel spinning display)
  static getDares() {
    if (dares.length === 0) return ['Do 10 push-ups', 'Sing a song'];
    return dares.flat();
  }

  // Get content by wheel number (1-10) with random group selection
  // Properly handles nested array structure: [[group1], [group2], [group3], [group4]]
  // Each group has 10 items, wheelNumber maps to item index (1=0, 10=9)
  static getContentByWheelNumber(type, wheelNumber, roomId = null) {
    // Validate type
    if (type !== 'truth' && type !== 'dare') {
      console.error(`Invalid content type: ${type}`);
      return type === 'truth' ? 'What is your biggest fear?' : 'Do 10 push-ups';
    }
    
    // Get the correct content array based on type (already nested)
    const content = type === 'truth' ? truths : dares;
    
    if (content.length === 0) {
      console.warn(`No content found for type: ${type}`);
      return type === 'truth' ? 'What is your biggest fear?' : 'Do 10 push-ups';
    }

    const numGroups = content.length;
    const itemIndex = Math.min(wheelNumber - 1, 9); // wheelNumber 1-10 -> index 0-9

    // If tracking room history, try to find unused content
    if (roomId) {
      this.initRoom(roomId);
      const roomHistory = usedContent.get(roomId);
      const usedSet = type === 'truth' ? roomHistory.truths : roomHistory.dares;
      
      // Try to find an unused combination (random group with this item index)
      const availableGroups = [];
      for (let g = 0; g < numGroups; g++) {
        const key = `${g}-${itemIndex}`;
        if (!usedSet.has(key) && content[g] && content[g][itemIndex]) {
          availableGroups.push(g);
        }
      }

      if (availableGroups.length > 0) {
        // Pick random from available groups
        const randomGroupIndex = availableGroups[Math.floor(Math.random() * availableGroups.length)];
        const key = `${randomGroupIndex}-${itemIndex}`;
        usedSet.add(key);
        return content[randomGroupIndex][itemIndex];
      }

      // All groups used for this item index, try any unused item from random group
      const randomGroup = Math.floor(Math.random() * numGroups);
      for (let i = 0; i < content[randomGroup].length; i++) {
        const key = `${randomGroup}-${i}`;
        if (!usedSet.has(key)) {
          usedSet.add(key);
          return content[randomGroup][i];
        }
      }

      // All items in that group used, reset history for this type and pick fresh
      usedSet.clear();
    }

    // No room tracking or fallback: pick random group, use wheelNumber for item
    const randomGroupIndex = Math.floor(Math.random() * numGroups);
    const selectedGroup = content[randomGroupIndex];
    const safeIndex = Math.min(itemIndex, selectedGroup.length - 1);
    
    if (roomId) {
      const roomHistory = usedContent.get(roomId);
      const usedSet = type === 'truth' ? roomHistory.truths : roomHistory.dares;
      usedSet.add(`${randomGroupIndex}-${safeIndex}`);
    }

    return selectedGroup[safeIndex];
  }

  // Get total count of truths (all items across all groups)
  static getTruthsCount() {
    return truths.reduce((sum, group) => sum + group.length, 0);
  }

  // Get total count of dares (all items across all groups)
  static getDaresCount() {
    return dares.reduce((sum, group) => sum + group.length, 0);
  }

  // Get number of groups
  static getTruthGroupsCount() {
    return truths.length;
  }

  static getDareGroupsCount() {
    return dares.length;
  }

  static reloadContent() {
    loadContent();
  }
}

module.exports = ContentService;