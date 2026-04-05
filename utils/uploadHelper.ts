import { Platform } from 'react-native';
import { API_BASE_URL } from '@/constants/Config';

/**
 * Upload a file to the server using FormData (FAST!)
 * Supports both Mobile (File URI) and Web (Blob URI)
 */
export const uploadFile = async (
    fileUri: string,
    token: string,
    type: 'image' | 'video' = 'image'
): Promise<string> => {
    try {
        const formData = new FormData();

        // Get file extension
        const uriParts = fileUri.split('.');
        const fileExtension = uriParts[uriParts.length - 1] || 'jpg';

        // Determine mime type
        let mimeType = type === 'video' ? `video/${fileExtension}` : `image/${fileExtension}`;
        if (fileExtension.toLowerCase() === 'jpg' || fileExtension.toLowerCase() === 'jpeg') {
            mimeType = 'image/jpeg';
        }

        if (Platform.OS === 'web' && fileUri.startsWith('blob:')) {
            // WEB: Fetch the blob from the URI and append it directly
            const response = await fetch(fileUri);
            const blob = await response.blob();
            formData.append('image', blob, `upload.${fileExtension}`);
        } else {
            // MOBILE: Use the file URI with name and type
            formData.append('image', {
                uri: fileUri,
                type: mimeType,
                name: `upload.${fileExtension}`,
            } as any);
        }

        // Use /api/upload as it's the more flexible endpoint used throughout the app (groups, marketplace, etc.)
        const response = await fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Upload failed:', errorText);
            throw new Error(`Upload failed: ${response.status}`);
        }

        const data = await response.json();

        // Fix: Return ONLY the path/filename, stripping the API_BASE_URL if it's there.
        // Storing absolute URLs (like localhost) in the DB breaks cross-device sync.
        let finalPath = data.url;
        if (finalPath && typeof finalPath === 'string') {
            // Remove absolute part if present
            if (finalPath.startsWith('http')) {
                try {
                    const urlObj = new URL(finalPath);
                    finalPath = urlObj.pathname;
                } catch (e) {
                    console.error("URL parsing error:", e);
                }
            }
            // Ensure it's relative starting with uploads or similar
            finalPath = finalPath.replace('/api/upload/', '').replace('/uploads/', '').replace(/^\//, '');
        }
        return finalPath;
    } catch (error: any) {
        console.error('❌ Upload error:', error);
        throw error;
    }
};

/**
 * Upload multiple files
 */
export const uploadMultipleFiles = async (
    fileUris: string[],
    token: string,
    type: 'image' | 'video' = 'image'
): Promise<string[]> => {
    try {
        const formData = new FormData();

        fileUris.forEach((fileUri, index) => {
            const uriParts = fileUri.split('.');
            const fileExtension = uriParts[uriParts.length - 1] || 'jpg';

            let mimeType = type === 'video' ? `video/${fileExtension}` : `image/${fileExtension}`;
            if (fileExtension.toLowerCase() === 'jpg' || fileExtension.toLowerCase() === 'jpeg') {
                mimeType = 'image/jpeg';
            }

            formData.append('files', {
                uri: fileUri,
                type: mimeType,
                name: `upload-${index}.${fileExtension}`,
            } as any);
        });

        const response = await fetch(`${API_BASE_URL}/api/upload/multiple`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }

        const data = await response.json();
        return data.files.map((file: any) => {
            let path = file.url;
            if (path && typeof path === 'string') {
                if (path.startsWith('http')) {
                    try {
                        const urlObj = new URL(path);
                        path = urlObj.pathname;
                    } catch (e) {}
                }
                path = path.replace('/api/upload/', '').replace('/uploads/', '').replace(/^\//, '');
            }
            return path;
        });
    } catch (error: any) {
        console.error('❌ Multiple upload error:', error);
        throw error;
    }
};

/**
 * Delete uploaded file
 */
export const deleteFile = async (filename: string, token: string): Promise<void> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/upload/${filename}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Delete failed: ${response.status}`);
        }
    } catch (error: any) {
        console.error('❌ Delete error:', error);
        throw error;
    }
};
