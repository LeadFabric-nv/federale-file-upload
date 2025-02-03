import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const MARKETO_HOST = process.env.MARKETO_HOST;

export async function updateLeadField(email, fileNames, accessToken) {
    console.log(`Updating lead field for email: ${email} with files: ${fileNames}`);
    
    try {
        const updateEndpoint = `${MARKETO_HOST}/rest/v1/leads.json`;
        
        // Prepare the update payload
        const updateData = {
            action: "updateOnly",
            lookupField: "email",
            input: [{
                email: email,
                fVuploadedfiles: fileNames
            }]
        };

        const response = await fetch(updateEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(updateData)
        });

        const result = await response.json();
        console.log('Lead update result:', result);

        if (response.ok && result.success) {
            return {
                success: true,
                data: result
            };
        } else {
            return {
                success: false,
                error: {
                    status: response.status,
                    message: result.errors ? result.errors[0].message : 'Unknown error'
                }
            };
        }
    } catch (error) {
        console.error('Failed to update lead:', error);
        return {
            success: false,
            error: {
                status: 500,
                message: error.message
            }
        };
    }
}