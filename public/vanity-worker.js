// Vanity Address Generator Web Worker
// Uses secp256k1 for address generation

// keccak256 implementation (simplified for addresses)
const KECCAK_ROUND_CONSTANTS = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n
];

function keccak256(data) {
  // Simple keccak-256 for Ethereum addresses
  const state = new BigUint64Array(25);
  const blockSize = 136; // 1088 bits for keccak-256
  
  // Pad the message
  const padded = new Uint8Array(Math.ceil((data.length + 1) / blockSize) * blockSize);
  padded.set(data);
  padded[data.length] = 0x01;
  padded[padded.length - 1] |= 0x80;
  
  // Process blocks
  for (let offset = 0; offset < padded.length; offset += blockSize) {
    // XOR block into state
    for (let i = 0; i < blockSize / 8; i++) {
      let value = 0n;
      for (let j = 0; j < 8; j++) {
        value |= BigInt(padded[offset + i * 8 + j]) << BigInt(j * 8);
      }
      state[i] ^= value;
    }
    
    // Keccak-f[1600] permutation
    for (let round = 0; round < 24; round++) {
      // θ step
      const C = new BigUint64Array(5);
      const D = new BigUint64Array(5);
      for (let x = 0; x < 5; x++) {
        C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
      }
      for (let x = 0; x < 5; x++) {
        D[x] = C[(x + 4) % 5] ^ ((C[(x + 1) % 5] << 1n) | (C[(x + 1) % 5] >> 63n));
      }
      for (let i = 0; i < 25; i++) {
        state[i] ^= D[i % 5];
      }
      
      // ρ and π steps
      const rotations = [
        0, 1, 62, 28, 27, 36, 44, 6, 55, 20,
        3, 10, 43, 25, 39, 41, 45, 15, 21, 8,
        18, 2, 61, 56, 14
      ];
      const piMapping = [
        0, 6, 12, 18, 24, 3, 9, 10, 16, 22,
        1, 7, 13, 19, 20, 4, 5, 11, 17, 23,
        2, 8, 14, 15, 21
      ];
      const temp = new BigUint64Array(25);
      for (let i = 0; i < 25; i++) {
        const r = rotations[i];
        temp[piMapping[i]] = r === 0 ? state[i] : ((state[i] << BigInt(r)) | (state[i] >> BigInt(64 - r)));
      }
      
      // χ step
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          state[y * 5 + x] = temp[y * 5 + x] ^ (~temp[y * 5 + (x + 1) % 5] & temp[y * 5 + (x + 2) % 5]);
        }
      }
      
      // ι step
      state[0] ^= KECCAK_ROUND_CONSTANTS[round];
    }
  }
  
  // Extract hash
  const hash = new Uint8Array(32);
  for (let i = 0; i < 4; i++) {
    const value = state[i];
    for (let j = 0; j < 8; j++) {
      hash[i * 8 + j] = Number((value >> BigInt(j * 8)) & 0xffn);
    }
  }
  
  return hash;
}

// secp256k1 curve parameters
const CURVE_P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
const CURVE_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
const CURVE_GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n;
const CURVE_GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n;

function modPow(base, exp, mod) {
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * base) % mod;
    }
    exp = exp / 2n;
    base = (base * base) % mod;
  }
  return result;
}

function modInverse(a, m) {
  return modPow(a, m - 2n, m);
}

function pointAdd(p1, p2) {
  if (!p1) return p2;
  if (!p2) return p1;
  
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  
  if (x1 === x2 && y1 === y2) {
    // Point doubling
    const s = (3n * x1 * x1 * modInverse(2n * y1, CURVE_P)) % CURVE_P;
    const x3 = (s * s - 2n * x1) % CURVE_P;
    const y3 = (s * (x1 - x3) - y1) % CURVE_P;
    return [(x3 + CURVE_P) % CURVE_P, (y3 + CURVE_P) % CURVE_P];
  }
  
  const s = ((y2 - y1) * modInverse((x2 - x1 + CURVE_P) % CURVE_P, CURVE_P)) % CURVE_P;
  const x3 = (s * s - x1 - x2) % CURVE_P;
  const y3 = (s * (x1 - x3) - y1) % CURVE_P;
  return [(x3 + CURVE_P) % CURVE_P, (y3 + CURVE_P) % CURVE_P];
}

function scalarMultiply(k, point) {
  let result = null;
  let addend = point;
  
  while (k > 0n) {
    if (k & 1n) {
      result = pointAdd(result, addend);
    }
    addend = pointAdd(addend, addend);
    k >>= 1n;
  }
  
  return result;
}

function privateKeyToPublicKey(privateKey) {
  const G = [CURVE_GX, CURVE_GY];
  return scalarMultiply(privateKey, G);
}

function publicKeyToAddress(publicKey) {
  const [x, y] = publicKey;
  
  // Encode public key (uncompressed, without 04 prefix for hashing)
  const pubKeyBytes = new Uint8Array(64);
  for (let i = 0; i < 32; i++) {
    pubKeyBytes[31 - i] = Number((x >> BigInt(i * 8)) & 0xffn);
    pubKeyBytes[63 - i] = Number((y >> BigInt(i * 8)) & 0xffn);
  }
  
  // Keccak256 hash
  const hash = keccak256(pubKeyBytes);
  
  // Take last 20 bytes as address
  const addressBytes = hash.slice(12);
  
  // Convert to hex string
  let address = '0x';
  for (const byte of addressBytes) {
    address += byte.toString(16).padStart(2, '0');
  }
  
  return address;
}

function generateRandomPrivateKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let key = 0n;
  for (let i = 0; i < 32; i++) {
    key = (key << 8n) | BigInt(bytes[i]);
  }
  // Ensure key is in valid range
  return key % CURVE_N || 1n;
}

function bytesToHex(bytes) {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function privateKeyToHex(key) {
  const hex = key.toString(16).padStart(64, '0');
  return '0x' + hex;
}

// Check if address matches pattern
function matchesPattern(address, prefix, suffix, caseSensitive) {
  const addr = caseSensitive ? address : address.toLowerCase();
  const prefixCheck = caseSensitive ? prefix : prefix.toLowerCase();
  const suffixCheck = caseSensitive ? suffix : suffix.toLowerCase();
  
  const matchesPrefix = !prefixCheck || addr.slice(2).startsWith(prefixCheck);
  const matchesSuffix = !suffixCheck || addr.endsWith(suffixCheck);
  
  return matchesPrefix && matchesSuffix;
}

// Message handler
self.onmessage = function(e) {
  const { prefix, suffix, caseSensitive, batchSize = 1000 } = e.data;
  
  let attempts = 0;
  let lastUpdate = Date.now();
  const startTime = Date.now();
  
  function processBatch() {
    for (let i = 0; i < batchSize; i++) {
      attempts++;
      
      const privateKey = generateRandomPrivateKey();
      const publicKey = privateKeyToPublicKey(privateKey);
      const address = publicKeyToAddress(publicKey);
      
      if (matchesPattern(address, prefix, suffix, caseSensitive)) {
        // Found a match!
        const elapsed = (Date.now() - startTime) / 1000;
        self.postMessage({
          type: 'found',
          result: {
            address: address,
            privateKey: privateKeyToHex(privateKey),
            attempts: attempts,
            time: elapsed < 1 ? `${(elapsed * 1000).toFixed(0)}ms` : `${elapsed.toFixed(1)}s`
          }
        });
        return;
      }
    }
    
    // Send progress update
    const now = Date.now();
    if (now - lastUpdate > 200) {
      const elapsed = (now - startTime) / 1000;
      self.postMessage({
        type: 'progress',
        attempts: attempts,
        rate: Math.round(attempts / elapsed)
      });
      lastUpdate = now;
    }
    
    // Continue processing
    setTimeout(processBatch, 0);
  }
  
  processBatch();
};
