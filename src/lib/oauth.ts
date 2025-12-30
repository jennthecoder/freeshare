import { getAuthToken } from './api-client';

export interface OAuthProviderConfig {
    clientId: string;
    clientSecret: string;
    authUrl: string;
    tokenUrl: string;
    userUrl: string;
    scope: string;
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scope: 'email profile',
    },
    facebook: {
        clientId: process.env.FACEBOOK_CLIENT_ID || '',
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
        userUrl: 'https://graph.facebook.com/me?fields=id,name,email,picture',
        scope: 'email,public_profile',
    },
    // Apple requires more complex JWT signing usually, keeping it simple/placeholder for now
    apple: {
        clientId: process.env.APPLE_CLIENT_ID || '',
        clientSecret: process.env.APPLE_CLIENT_SECRET || '',
        authUrl: 'https://appleid.apple.com/auth/authorize',
        tokenUrl: 'https://appleid.apple.com/auth/token',
        userUrl: '', // Apple sends user info in the initial ID token
        scope: 'name email',
    }
};

export function getOAuthUrl(provider: string): string {
    const config = OAUTH_PROVIDERS[provider];
    if (!config) throw new Error(`Unknown provider: ${provider}`);

    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: `${BASE_URL}/api/auth/${provider}/callback`,
        response_type: 'code',
        scope: config.scope,
        state: crypto.randomUUID(), // In prod, should cache this to verify on callback
    });

    return `${config.authUrl}?${params.toString()}`;
}

export async function exchangeCodeForToken(provider: string, code: string): Promise<any> {
    const config = OAUTH_PROVIDERS[provider];
    if (!config) throw new Error(`Unknown provider: ${provider}`);

    const body = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: `${BASE_URL}/api/auth/${provider}/callback`,
        grant_type: 'authorization_code',
    });

    const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        body: body.toString(),
    });

    if (!response.ok) {
        throw new Error(`Failed to exchange code: ${await response.text()}`);
    }

    return response.json();
}

export async function getUserProfile(provider: string, accessToken: string): Promise<{ id: string; email: string; name: string; avatar?: string }> {
    const config = OAUTH_PROVIDERS[provider];

    if (provider === 'google') {
        const res = await fetch(config.userUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = await res.json();
        return {
            id: data.id,
            email: data.email,
            name: data.name,
            avatar: data.picture,
        };
    }

    if (provider === 'facebook') {
        const res = await fetch(config.userUrl + `&access_token=${accessToken}`);
        const data = await res.json();
        return {
            id: data.id,
            email: data.email,
            name: data.name,
            avatar: data.picture?.data?.url
        };
    }

    throw new Error(`Profile fetch not implemented for ${provider}`);
}
