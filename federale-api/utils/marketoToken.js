import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Environment variables for Marketo
const MARKETO_CLIENT_ID = process.env.MARKETO_CLIENT_ID;
const MARKETO_CLIENT_SECRET = process.env.MARKETO_CLIENT_SECRET;
const MARKETO_HOST = process.env.MARKETO_HOST;

// Add this log to verify values are assigned
console.log('Marketo config:', {
    host: MARKETO_HOST,
    clientId: MARKETO_CLIENT_ID,
    hasSecret: !!MARKETO_CLIENT_SECRET
});

export async function getMarketoToken() {
    const tokenEndpoint = `${MARKETO_HOST}/identity/oauth/token?grant_type=client_credentials&client_id=${MARKETO_CLIENT_ID}&client_secret=${MARKETO_CLIENT_SECRET}`;

    console.log('Attempting to fetch token from:', tokenEndpoint);

    try {
        const tokenResponse = await fetch(tokenEndpoint, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });

        const tokenData = await tokenResponse.json();

        if (tokenResponse.ok) {
            console.log('Successfully obtained Marketo token');
            return {
                success: true,
                data: {
                    access_token: tokenData.access_token,
                    expires_in: Date.now() + (tokenData.expires_in * 1000) // Convert seconds to milliseconds
                }
            };
        } else {
            console.error('Failed to obtain Marketo token:', tokenData.error_description || 'Unknown error');
            return {
                success: false,
                error: {
                    status: tokenResponse.status,
                    message: tokenData.error_description || 'Unknown error'
                }
            };
        }
    } catch (error) {
        console.error('Failed to obtain access token:', error.message);
        return {
            success: false,
            error: {
                status: 500,
                message: `Request failed: ${error.message}`
            }
        };
    }
}