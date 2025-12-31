/**
 * Email validation utility
 * Validates email format using regex
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Password validation utility
 * Ensures password meets minimum requirements
 */
const isValidPassword = (password) => {
    // At least 6 characters
    return password && password.length >= 6;
};

/**
 * Name validation utility
 * Ensures name is not empty and has reasonable length
 */
const isValidName = (name) => {
    return name && name.trim().length >= 2 && name.trim().length <= 50;
};

module.exports = {
    isValidEmail,
    isValidPassword,
    isValidName
};
