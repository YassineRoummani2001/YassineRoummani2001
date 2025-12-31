const common = {
    primary: '#6d5de8', // Vibrant Purple
    white: '#FFFFFF',
    black: '#000000',
    danger: '#FF4757',
};

const light = {
    ...common,
    text: '#1A1A1A',
    textSecondary: '#666666',
    background: '#FFFFFF',
    gray: '#F5F5F5',
    darkGray: '#EEEEEE',
    border: '#E0E0E0',
    glass: 'rgba(255,255,255,0.9)',
    glassWhite: 'rgba(0,0,0,0.05)',
    tint: common.primary,
    tabIconDefault: '#ccc',
    tabIconSelected: common.primary,
};

const dark = {
    ...common,
    text: '#FFFFFF',
    textSecondary: '#AAAAAA',
    background: '#000000', // Deep Black
    gray: '#1A1A1A', // Dark Gray for cards
    darkGray: '#121212',
    border: '#333333',
    glass: 'rgba(20,20,20,0.9)',
    glassWhite: 'rgba(255,255,255,0.1)',
    tint: common.white,
    tabIconDefault: '#ccc',
    tabIconSelected: common.white,
};

export const Colors = {
    light,
    dark,
};

export const Layout = {
    padding: 16,
    borderRadius: 32, // More rounded
    headerHeight: 60,
    tabBarHeight: 80,
};
