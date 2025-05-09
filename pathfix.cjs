// CommonJS module to make a global fix for path resolution
const path = require('path');

// Set a global variable to provide the project root directory
global.__projectRoot = path.resolve(__dirname);

console.log('Project root path fixed:', global.__projectRoot);