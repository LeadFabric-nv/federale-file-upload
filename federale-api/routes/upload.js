import express from 'express';
import multer from 'multer';
import { getMarketoToken } from '../utils/marketoToken.js';
import { updateLeadField } from '../utils/marketoLead.js';
import fetch from 'node-fetch';
import FormData from 'form-data';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
        files: 3 // Maximum 3 files
    }
});

async function uploadFilesToMarketo(tokenResponse, files) {
    console.log('Marketo Token:', tokenResponse);

    if (!tokenResponse.success) {
        console.error('Failed to obtain Marketo token');
        throw new Error('Failed to obtain Marketo token');
    }

    const uploadResults = [];

    for (const file of files) {
        console.log(`Attempting to upload file: ${file.originalname}`);

        const formData = new FormData();
        formData.append('file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
        });

        try {
            console.log('Marketo Upload Endpoint:', `${process.env.MARKETO_HOST}/rest/asset/v1/files.json?folder=99`);

            const marketoUploadResponse = await fetch(`${process.env.MARKETO_HOST}/rest/asset/v1/files.json?folder=99`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tokenResponse.data.access_token}`,
                    ...formData.getHeaders()
                },
                body: formData
            });

            console.log('Marketo Response Status:', marketoUploadResponse.status);
            const uploadResult = await marketoUploadResponse.json();
            console.log('Marketo Upload Result:', JSON.stringify(uploadResult, null, 2));

            uploadResults.push({
                originalName: file.originalname,
                success: marketoUploadResponse.ok,
                marketoResponse: uploadResult
            });
        } catch (error) {
            console.error(`Upload Error for ${file.originalname}:`, error);
            uploadResults.push({
                originalName: file.originalname,
                success: false,
                error: error.message
            });
        }
    }
    return uploadResults;
}

// Test endpoint to check if route is working
router.get('/test-token', async (req, res) => {
    try {
        const tokenResponse = await getMarketoToken();
        res.json(tokenResponse);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// File upload endpoint
router.post('/upload', upload.array('files'), async (req, res) => {
    console.log('Upload Endpoint Hit');
    console.log('Files Received:', req.files.map(file => ({
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
    })));

    console.log('Email:', req.body.email);

    try {
        // Check if files were provided
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No files uploaded'
            });
        }

        // Get Marketo authentication token
        console.log('Attempting to Get Marketo Token');
        const tokenResponse = await getMarketoToken();
        console.log('Token Response:', JSON.stringify(tokenResponse, null, 2));

        // Upload files to Marketo
        console.log('Uploading Files to Marketo');
        const uploadResults = await uploadFilesToMarketo(tokenResponse, req.files);

        console.log('Marketo Upload Results:', JSON.stringify(uploadResults, null, 2));

        // If files were uploaded successfully, update the lead field
        if (uploadResults.every(result => result.success)) {
            // Create a comma-separated list of file names
            const fileNames = uploadResults
                .map(result => result.originalName)
                .join(', ');

            // Update the lead's field with the file names
            const updateResult = await updateLeadField(
                req.body.email,
                fileNames,
                tokenResponse.data.access_token
            );

            console.log('Lead Update Result:', updateResult);

            if (!updateResult.success) {
                console.error('Failed to update lead field:', updateResult.error);
            }
        }

        // Determine overall success
        const allSucceeded = uploadResults.every(result => result.success);

        // For now, just acknowledge receipt
        res.json({
            success: allSucceeded,
            message: allSucceeded 
                ? 'All files uploaded successfully' 
                : 'Some files failed to upload',
            files: uploadResults

        });

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({
            success: false,
            errorDetails: {
                code: 'UPLOAD_ERROR',
                message: error.message
            }
        });
    }
});

export default router;