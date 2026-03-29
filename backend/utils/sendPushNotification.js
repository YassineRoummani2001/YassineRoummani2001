const axios = require('axios');

const sendPushNotification = async (pushToken, message, data = {}) => {
    if (!pushToken) {
        return;
    }

    // Basic validation for Expo Push Token
    if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
        // console.log(`⚠️ Invalid Expo Push Token format: ${pushToken}`);
        // Continue anyway in case of new formats, but log warning
    }

    const messageData = {
        to: pushToken,
        sound: 'default',
        title: 'Vibe',
        body: message,
        data: data,
    };

    try {
        const response = await axios.post('https://exp.host/--/api/v2/push/send', messageData, {
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
        });
        
        // Expo returns 200 even if some tickets failed
        // We can inspect response.data.data if needed
    } catch (error) {
        console.error('❌ Error sending push notification:', error.message);
    }
};

module.exports = sendPushNotification;
