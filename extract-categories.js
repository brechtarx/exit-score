// Extract category structure from the HTML file
const fs = require('fs');

const htmlContent = fs.readFileSync('/Users/brechtpalombo/Score/index.html', 'utf8');

// Find the categories array in the JavaScript
const categoriesMatch = htmlContent.match(/const categories = \[([\s\S]*?)\];/);

if (categoriesMatch) {
  console.log('Found categories structure:');
  console.log('const categories = [' + categoriesMatch[1] + '];');
} else {
  console.log('Categories structure not found');
}