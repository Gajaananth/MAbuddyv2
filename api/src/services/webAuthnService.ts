import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoUint8Array, isoBase64URL } from '@simplewebauthn/server/helpers';

const RP_NAME = 'Zium Nova Protocol';
const RP_ID = 'localhost'; // In production, this would be the domain
const ORIGIN = `http://${RP_ID}:5173`;

// In-memory challenge store (simplified for 2 users)
const challenges = new Map<string, string>();

export async function createRegistrationOptions(userId: string, existingCredentialIds: string[]) {
    const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userID: isoUint8Array.fromUTF8String(userId),
        userName: `operator-${userId.slice(0, 4)}`,
        attestationType: 'none',
        excludeCredentials: existingCredentialIds.map(id => ({
            id: id, // Strings are expected in JSON-compatible options
            type: 'public-key',
        })),
        authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
            authenticatorAttachment: 'platform',
        },
    });

    challenges.set(userId, options.challenge);
    return options;
}

export async function verifyRegistration(userId: string, body: any) {
    const expectedChallenge = challenges.get(userId);
    if (!expectedChallenge) {
        throw new Error('CHALLENGE EXPIRED: Registration window closed.');
    }

    const verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
    });

    if (verification.verified && verification.registrationInfo) {
        const { credential } = verification.registrationInfo;

        return {
            verified: true,
            credentialId: Buffer.from(credential.id).toString('base64'),
            publicKey: Buffer.from(credential.publicKey).toString('base64'),
            counter: credential.counter
        };
    }

    return { verified: false };
}

export async function createLoginOptions(userCredentials: { id: string }[]) {
    const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        allowCredentials: userCredentials.map(cred => ({
            id: cred.id,
            type: 'public-key',
            transports: ['internal'],
        })),
        userVerification: 'preferred',
    });

    return options;
}

export async function verifyLogin(body: any, expectedChallenge: string, publicKey: string, counter: number) {
    const verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        authenticator: {
            credentialID: Buffer.from(body.id, 'base64'),
            credentialPublicKey: Buffer.from(publicKey, 'base64'),
            counter,
        },
    } as any);

    return verification;
}
