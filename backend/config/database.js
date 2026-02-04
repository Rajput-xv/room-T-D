const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  url: process.env.MONGODB_URI || 'mongodb://localhost:27017/truth-dare-game',
  options: {
    maxPoolSize: isProduction ? 50 : 10,
    minPoolSize: isProduction ? 10 : 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4 // Use IPv4
  }
};