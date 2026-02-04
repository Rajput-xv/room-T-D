const fs = require('fs');
const path = require('path');

let truths = [];
let dares = [];

// Load content from files with error handling
const loadContent = () => {
  try {
    const truthsPath = path.join(__dirname, '../data/truths.json');
    const daresPath = path.join(__dirname, '../data/dares.json');
    
    if (fs.existsSync(truthsPath)) {
      truths = JSON.parse(fs.readFileSync(truthsPath, 'utf-8'));
      // console.log(`✅ Loaded ${truths.length} truths`);
    } else {
      console.warn('⚠️ truths.json not found, using defaults');
      truths = ['What is your biggest fear?', 'What is your biggest secret?'];
    }
    
    if (fs.existsSync(daresPath)) {
      dares = JSON.parse(fs.readFileSync(daresPath, 'utf-8'));
      // console.log(`✅ Loaded ${dares.length} dares`);
    } else {
      console.warn('⚠️ dares.json not found, using defaults');
      dares = ['Do 10 push-ups', 'Sing a song'];
    }
  } catch (err) {
    console.error('Error loading content files:', err);
    // Use fallback content
    truths = ['What is your biggest fear?', 'What is your biggest secret?'];
    dares = ['Do 10 push-ups', 'Sing a song'];
  }
};

// Load content on startup
loadContent();

class ContentService {
  static getTruth() {
    if (truths.length === 0) {
      return 'What is your biggest fear?';
    }
    return truths[Math.floor(Math.random() * truths.length)];
  }

  static getDare() {
    if (dares.length === 0) {
      return 'Do 10 push-ups';
    }
    return dares[Math.floor(Math.random() * dares.length)];
  }

  // Get all truths (for wheel spinning)
  static getTruths() {
    return truths.length > 0 ? truths : ['What is your biggest fear?', 'What is your biggest secret?'];
  }

  // Get all dares (for wheel spinning)
  static getDares() {
    return dares.length > 0 ? dares : ['Do 10 push-ups', 'Sing a song'];
  }

  // Get content by wheel number (1-10) with random group selection
  // Groups the content into chunks of 10, randomly picks a group, then uses wheelNumber to index
  static getContentByWheelNumber(type, wheelNumber) {
    const content = type === 'truth' ? this.getTruths() : this.getDares();
    
    // If 10 or fewer items, just use wheelNumber directly
    if (content.length <= 10) {
      const index = Math.min(wheelNumber - 1, content.length - 1);
      return content[index];
    }
    
    // Group content into chunks of 10
    const groups = [];
    for (let i = 0; i < content.length; i += 10) {
      groups.push(content.slice(i, i + 10));
    }
    
    // Randomly select a group
    const randomGroupIndex = Math.floor(Math.random() * groups.length);
    const selectedGroup = groups[randomGroupIndex];
    
    // Use wheelNumber (1-10) to get item from selected group
    // wheelNumber 1 = index 0, wheelNumber 10 = index 9
    const index = Math.min(wheelNumber - 1, selectedGroup.length - 1);
    return selectedGroup[index];
  }

  static getTruthsCount() {
    return truths.length;
  }

  static getDaresCount() {
    return dares.length;
  }

  static reloadContent() {
    loadContent();
  }
}

module.exports = ContentService;