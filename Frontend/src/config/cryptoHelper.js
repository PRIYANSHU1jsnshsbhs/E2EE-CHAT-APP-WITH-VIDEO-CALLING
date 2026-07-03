import toast from "react-hot-toast";
// Convert BETWEEN ArrayBuffer/Base64 and String

export function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

export async function generateKeyPair() {
    try {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"]
        );
        const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
        const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
        return {
            publicKey: bufferToBase64(publicKey),
            privateKey: bufferToBase64(privateKey),
        };
    } catch (error) {
        console.error("Error generating key pair:", error);
        toast.error("Error in generating key pair");
        throw error;
    }
}

export async function encryptMessage(plainText, publicKeyBase64) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(plainText);

        const publicKey = await window.crypto.subtle.importKey(
            "spki",
            base64ToBuffer(publicKeyBase64),
            {
                name: "RSA-OAEP",
                hash: "SHA-256",
            },
            false,
            ["encrypt"]
        );

        const encryptedData = await window.crypto.subtle.encrypt(
            {
                name: "RSA-OAEP",
            },
            publicKey,
            data
        );
        return bufferToBase64(encryptedData);
    } catch (error) {
        console.error("Error encrypting message:", error);
        toast.error("Error in encrypting message");
        throw error;
    }
}

export async function decryptMessage(encryptedBase64, privateKeyBase64) {
    try {
        const encryptedData = base64ToBuffer(encryptedBase64);

        const privateKey = await window.crypto.subtle.importKey(
            "pkcs8",
            base64ToBuffer(privateKeyBase64),
            {
                name: "RSA-OAEP",
                hash: "SHA-256",
            },
            false,
            ["decrypt"]
        );

        const decryptedData = await window.crypto.subtle.decrypt(
            {
                name: "RSA-OAEP",
            },
            privateKey,
            encryptedData
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedData);
    } catch (error) {
        // Rethrow so callers can handle gracefully (e.g. key mismatch from old sessions)
        throw error;
    }
}

export async function getUserPublicKey() {
    const userData = localStorage.getItem('userCryptoKeys');
    if (userData) {
        const keys = JSON.parse(userData);
        return keys.publicKey;
    }
    return null;
}

export async function storeUserKeys(publicKey, privateKey) {
    const userData = {
        publicKey: publicKey,
        privateKey: privateKey,
        createdAt: new Date().toISOString()
    };
    localStorage.setItem('userCryptoKeys', JSON.stringify(userData));   
}

export async function getOrCreateUserKeys() {
    let keys = localStorage.getItem('userCryptoKeys');

    if (!keys) {
        console.log("Generating new key pair...");
        const newKeys = await generateKeyPair();
        storeUserKeys(newKeys.publicKey, newKeys.privateKey);
        return newKeys;
    }
    return JSON.parse(keys);
} 

export function clearUserKeys() {
    localStorage.removeItem('userCryptoKeys');
}

export async function hashKey(publicKeyBase64) {
    const publicKeyBuffer = base64ToBuffer(publicKeyBase64);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", publicKeyBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}