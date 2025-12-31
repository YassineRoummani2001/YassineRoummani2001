// Safe Area Audit Script
// This script finds all pages that need safe area insets

const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '../app');

// Pages that need safe area insets
const pagesToFix = [];

// Function to check if file needs safe area
function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if has header/container with paddingTop
    const hasHeader = content.includes('header') || content.includes('Header');
    const hasPaddingTop = content.includes('paddingTop');
    const hasSafeArea = content.includes('useSafeAreaInsets');
    
    // If has header/paddingTop but no safe area, needs fix
    if ((hasHeader || hasPaddingTop) && !hasSafeArea) {
        return true;
    }
    
    return false;
}

// Function to scan directory
function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.')) {
            scanDirectory(filePath);
        } else if (file.endsWith('.tsx') && !file.startsWith('_')) {
            if (checkFile(filePath)) {
                pagesToFix.push(filePath.replace(__dirname + '/../', ''));
            }
        }
    });
}

// Scan app directory
scanDirectory(appDir);

// Print results
console.log('\n📋 Pages that need Safe Area Insets:\n');
pagesToFix.forEach((page, index) => {
    console.log(`${index + 1}. ${page}`);
});

console.log(`\n✅ Total: ${pagesToFix.length} pages\n`);

// Write to file
fs.writeFileSync(
    path.join(__dirname, 'safe-area-audit-results.txt'),
    pagesToFix.join('\n')
);

console.log('📝 Results saved to: .agent/safe-area-audit-results.txt\n');
