import { API_BASE_URL } from '@/constants/Config';

/**
 * Upload a file to the server using FormData (FAST!)
 * @param fileUri - Local file URI from ImagePicker
 * @param token - User auth token
 * @param type - File type ('image' or 'video')
 * @returns Promise with uploaded file URL
 */
export const uploadFile = async (
    fileUri: string,
    token: string,
    type: 'image' | 'video' = 'image'
): Promise<string> => {
    try {
        // console.log('📤 Starting file upload...');
        // console.log('📍 File URI:', fileUri);

        // Create FormData
        const formData = new FormData();

        // Get file extension
        const uriParts = fileUri.split('.');
        const fileExtension = uriParts[uriParts.length - 1];

        // Determine mime type
        let mimeType = 'image/jpeg';
        if (type === 'video') {
            mimeType = `video/${fileExtension}`;
        } else {
            mimeType = `image/${fileExtension}`;
        }

        // Append file to FormData
        formData.append('file', {
            uri: fileUri,
            type: mimeType,
            name: `upload.${fileExtension}`,
        } as any);

        // console.log('📡 Uploading to:', `${API_BASE_URL}/api/upload/single`);

        // Upload file
        const response = await fetch(`${API_BASE_URL}/api/upload/single`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                // Don't set Content-Type - let fetch set it automatically with boundary
            },
            body: formData,
        });

        // console.log('📥 Upload response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Upload failed:', errorText);
            throw new Error(`Upload failed: ${response.status}`);
        }

        const data = await response.json();
        // console.log('✅ Upload successful!');
        // console.log('📎 File URL:', data.url);

        // Return full URL
        return `${API_BASE_URL}${data.url}`;
    } catch (error: any) {
        console.error('❌ Upload error:', error);
        throw error;
    }
};

/**
 * Upload multiple files
 * @param fileUris - Array of local file URIs
 * @param token - User auth token
 * @param type - File type ('image' or 'video')
 * @returns Promise with array of uploaded file URLs
 */
export const uploadMultipleFiles = async (
    fileUris: string[],
    token: string,
    type: 'image' | 'video' = 'image'
): Promise<string[]> => {
    try {
        // console.log('📤 Starting multiple file upload...');
        // console.log('📍 Files count:', fileUris.length);

        const formData = new FormData();

        // Append all files
        fileUris.forEach((fileUri, index) => {
            const uriParts = fileUri.split('.');
            const fileExtension = uriParts[uriParts.length - 1];

            let mimeType = 'image/jpeg';
            if (type === 'video') {
                mimeType = `video/${fileExtension}`;
            } else {
                mimeType = `image/${fileExtension}`;
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
        // console.log('✅ Multiple upload successful!');

        // Return full URLs
        return data.files.map((file: any) => `${API_BASE_URL}${file.url}`);
    } catch (error: any) {
        console.error('❌ Multiple upload error:', error);
        throw error;
    }
};

/**
 * Delete uploaded file
 * @param filename - Filename to delete
 * @param token - User auth token
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

        // console.log('✅ File deleted:', filename);
    } catch (error: any) {
        console.error('❌ Delete error:', error);
        throw error;
    }
};
