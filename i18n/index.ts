import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

// Import translation files
import ar from './translations/ar.json';
import en from './translations/en.json';
import fr from './translations/fr.json';

const RESOURCES = {
    en: { translation: en },
    fr: { translation: fr },
    ar: { translation: ar },
};

const LANGUAGE_KEY = 'vibe_user_language';

const getBestAvailableLanguage = () => {
    try {
        const deviceLanguage = Localization.getLocales()[0]?.languageCode;
        return deviceLanguage && ['en', 'fr', 'ar'].includes(deviceLanguage) ? deviceLanguage : 'en';
    } catch {
        return 'en';
    }
};

// Initialize i18next synchronously with best guess
i18n
    .use(initReactI18next)
    .init({
        resources: RESOURCES,
        lng: getBestAvailableLanguage(),
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        // @ts-ignore
        compatibilityJSON: 'v3'
    });

// Async hydration from storage
const hydrateLanguage = async () => {
    try {
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (savedLanguage && savedLanguage !== i18n.language) {
            await i18n.changeLanguage(savedLanguage);

            const isRTL = savedLanguage === 'ar';
            if (I18nManager.isRTL !== isRTL) {
                I18nManager.allowRTL(isRTL);
                I18nManager.forceRTL(isRTL);
            }
        } else {
            // Ensure RTL is correct for device language if no saved pref
            const currentIsRTL = i18n.language === 'ar';
            if (I18nManager.isRTL !== currentIsRTL) {
                I18nManager.allowRTL(currentIsRTL);
                I18nManager.forceRTL(currentIsRTL);
            }
        }
    } catch (e) {
        // console.log('Failed to hydrate language preference:', e);
    }
};

hydrateLanguage();

export default i18n;

export const changeLanguage = async (lang: 'en' | 'fr' | 'ar') => {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    await i18n.changeLanguage(lang);

    const isRTL = lang === 'ar';
    if (I18nManager.isRTL !== isRTL) {
        I18nManager.allowRTL(isRTL);
        I18nManager.forceRTL(isRTL);
        // In a real production app, you might want to trigger a reload here
        // import * as Updates from 'expo-updates'; await Updates.reloadAsync();
        // For managed workflow without updates, typically a JS reload provided by some routers works, 
        // or instructing user to restart. 
        // However, many simple layouts will update if they use flex-start/end correctly.
    }
};
