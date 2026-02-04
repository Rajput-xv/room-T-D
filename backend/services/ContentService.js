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
    } else {
      console.warn('⚠️ truths.json not found, using defaults');
      truths = [
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
      ];
    }
    
    if (fs.existsSync(daresPath)) {
      dares = JSON.parse(fs.readFileSync(daresPath, 'utf-8'));
    } else {
      console.warn('⚠️ dares.json not found, using defaults');
      dares = [
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
      ];
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
    // Validate type
    if (type !== 'truth' && type !== 'dare') {
      console.error(`Invalid content type: ${type}`);
      return type === 'truth' ? 'What is your biggest fear?' : 'Do 10 push-ups';
    }
    
    // Get the correct content array based on type
    const content = type === 'truth' ? [...truths] : [...dares];
    
    if (content.length === 0) {
      console.warn(`No content found for type: ${type}`);
      return type === 'truth' ? 'What is your biggest fear?' : 'Do 10 push-ups';
    }
    
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