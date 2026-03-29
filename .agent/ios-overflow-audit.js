#!/usr/bin/env node

/**
 * iOS Overflow Fix - Automated Script
 * 
 * This script identifies all StyleSheet definitions with borderRadius
 * that are missing overflow: 'hidden' and could cause iOS rendering issues.
 */

const fs = require('fs');
const path = require('path');

// Components that need manual review
const componentsToCheck = [
    'components/SimpleReelItem.tsx',
    'components/StoryList.tsx',
    'app/user/[id].tsx',
    'app/(tabs)/profile.tsx',
    'app/story-view.tsx',
    'app/media-view.tsx',
    'components/ShareToUsersModal.tsx',
    'components/CommentsModal.tsx',
    'components/NewChatModal.tsx',
    'components/DeleteConfirmModal.tsx',
    'components/ConfirmationModal.tsx',
];

// console.log('🔍 iOS Overflow Fix - Audit Report\n');
// console.log('=' .repeat(60));

componentsToCheck.forEach((file, index) => {
    // console.log(`\n${index + 1}. ${file}`);
    // console.log('-'.repeat(60));
    
    const filePath = path.join(__dirname, '..', file);
    
    if (!fs.existsSync(filePath)) {
        // console.log('   ❌ File not found');
        return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Find StyleSheet.create blocks
    const styleRegex = /(\w+):\s*{([^}]+borderRadius[^}]+)}/g;
    let match;
    let issuesFound = 0;
    
    while ((match = styleRegex.exec(content)) !== null) {
        const styleName = match[1];
        const styleContent = match[2];
        
        // Check if it has borderRadius but no overflow
        if (styleContent.includes('borderRadius') && !styleContent.includes('overflow')) {
            issuesFound++;
            // console.log(`   ⚠️  ${styleName}: has borderRadius but missing overflow`);
        }
    }
    
    if (issuesFound === 0) {
        // console.log('   ✅ No issues found');
    } else {
        // console.log(`   📊 Total issues: ${issuesFound}`);
    }
});

// console.log('\n' + '='.repeat(60));
// console.log('\n📋 Summary:');
// console.log('   - Run this script to identify components needing fixes');
// console.log('   - Add overflow: "hidden" to styles with borderRadius + Image/Video');
// console.log('   - Test on iOS device after fixes');
// console.log('\n✅ Audit complete!\n');
