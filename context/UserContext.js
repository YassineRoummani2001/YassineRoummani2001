import { createContext, useContext } from 'react';

export const UserContext = createContext(null);

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === null) {
        // console.warn('⚠️ useUser called outside of UserProvider');
    }
    return context;
};
