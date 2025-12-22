// Web Worker for parallel HD wallet generation
// This runs in a separate thread for maximum performance

import { generateMnemonic, mnemonicToAccount, english } from 'https://esm.sh/viem@2.21.0/accounts'

self.onmessage = async (e) => {
  const { batchSize, workerId, prefix, suffix, fastMode } = e.data
  const results = []
  
  const prefixLower = (prefix || '').toLowerCase().replace('0x', '')
  const suffixLower = (suffix || '').toLowerCase()
  const hasVanity = prefixLower || suffixLower
  
  for (let i = 0; i < batchSize; i++) {
    try {
      const mnemonic = generateMnemonic(english)
      const account = mnemonicToAccount(mnemonic)
      
      if (hasVanity) {
        const addressLower = account.address.toLowerCase()
        const matchesPrefix = !prefixLower || addressLower.slice(2).startsWith(prefixLower)
        const matchesSuffix = !suffixLower || addressLower.endsWith(suffixLower)
        
        if (!matchesPrefix || !matchesSuffix) {
          continue
        }
      }
      
      const privateKeyBytes = account.getHdKey().privateKey
      let privateKeyHex = ''
      if (privateKeyBytes) {
        privateKeyHex = '0x' + Array.from(privateKeyBytes).map(b => b.toString(16).padStart(2, '0')).join('')
      }
      
      results.push({
        address: account.address,
        privateKey: privateKeyHex,
        mnemonic: mnemonic,
      })
    } catch (error) {
      console.error('Worker error:', error)
    }
  }
  
  self.postMessage({ workerId, results })
}
