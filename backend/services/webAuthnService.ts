import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoUint8Array, isoBase64URL } from '@simplewebauthn/server/helpers';

const RP_NAME = 'Zium Nova Protocol';

export async function createRegistrationOptions(

    userId: string, 
    deviceId: string, 
    existingCredentialIds: string[],
    rpID: string
) {
    const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID,
        userID: isoUint8Array.fromUTF8String(userId),
        userName: `operator-${userId.slice(0, 4)}`,
        attestationType: 'none',
        excludeCredentials: existingCredentialIds.map(id => ({
            id: id,
            type: 'public-key',
        })),
        authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
            authenticatorAttachment: 'platform',
        },
    });

    const { updateChallenge } = await import('../db/authQueries.js');
    await updateChallenge(deviceId, options.challenge);
    return options;
}

export async function verifyRegistration(
    userId: string, 
    deviceId: string, 
    body: any,
    expectedOrigin: string,
    expectedRPID: string
) {
    const { getChallenge } = await import('../db/authQueries.js');
    const expectedChallenge = await getChallenge(deviceId);
    
    if (!expectedChallenge) {
        throw new Error('CHALLENGE_EXPIRED: Registration window closed.');
    }

    try {
        const verification = await verifyRegistrationResponse({
            getPublicKey: async (credentialID: Uint8Array) => {
                // Not used for registration verification itself but part of common flow
                return new Uint8Array(); 
            },
            response: body,
            expectedChallenge,
            expectedOrigin,
            expectedRPID,
        } as any);

        if (verification.verified && verification.registrationInfo) {
            const info = verification.registrationInfo as any;
            
            // Hyper-Resilient Structural Probe
            console.log('[WebAuthn] Registration Info Probe:', JSON.stringify(Object.keys(info)));

            let rId = null, rPk = null, rCounter = 0;

            if (info.credentialID) rId = info.credentialID;
            else if (info.credential && info.credential.id) rId = info.credential.id;

            if (info.credentialPublicKey) rPk = info.credentialPublicKey;
            else if (info.credential && info.credential.publicKey) rPk = info.credential.publicKey;

            if (typeof info.counter === 'number') rCounter = info.counter;
            else if (info.credential && typeof info.credential.counter === 'number') rCounter = info.credential.counter;

            if (!rId || !rPk) {
                console.error('[WebAuthn] Incomplete Registration Context:', info);
                throw new Error('PROTOCOL_ASYNC_BINDING: Identity data fragmented.');
            }

            return {
                verified: true,
                credentialId: typeof rId === 'string' ? rId : isoBase64URL.fromBuffer(rId),
                publicKey: typeof rPk === 'string' ? rPk : isoBase64URL.fromBuffer(rPk),
                counter: rCounter
            };
        }


        
        console.error('[WebAuthn] Registration Verification Failed:', verification);
        return { verified: false };
    } catch (err: any) {
        console.error('[WebAuthn] Registration Critical Error:', err.message);
        throw err;
    }
}

export async function createLoginOptions(userCredentials: { id: string }[], rpID: string) {
    const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: userCredentials.map(cred => ({
            id: cred.id,
            type: 'public-key',
            transports: ['internal'],
        })),

        userVerification: 'preferred',
    });

    return options;
}


export async function verifyLogin(
    body: any, 
    expectedChallenge: string, 
    publicKey: string, 
    credentialId: string, 
    counter: number,
    expectedOrigin: string,
    expectedRPID: string
) {
    try {
        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin,
            expectedRPID,
            credential: {
                id: credentialId,
                publicKey: isoBase64URL.toBuffer(publicKey),
                counter,
            },
        } as any);

        if (!verification.verified) {
            console.error('[WebAuthn] Login Verification Failed:', verification);
        }
        
        return {
            verified: verification.verified,
            newCounter: verification.authenticationInfo?.newCounter
        };
    } catch (err: any) {
        console.error('[WebAuthn] Login Critical Error:', err.message);
        throw err;
    }
}



