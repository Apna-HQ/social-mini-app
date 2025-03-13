import { nip19 } from 'nostr-tools';

/**
 * Converts a hex pubkey to npub format
 * @param pubkey Hex pubkey
 * @returns npub encoded pubkey
 */
export const hexToNpub = (pubkey: string): string => {
  try {
    // Check if already in npub format
    if (pubkey.startsWith('npub')) {
      return pubkey;
    }
    
    // Convert hex to npub
    return nip19.npubEncode(pubkey);
  } catch (error) {
    console.error('Error converting pubkey to npub:', error);
    return pubkey; // Return original if conversion fails
  }
};

/**
 * Trims an npub to a readable length with ellipsis in the middle
 * @param npub The npub to trim
 * @param startChars Number of characters to show at the start
 * @param endChars Number of characters to show at the end
 * @returns Trimmed npub with ellipsis
 */
export const trimNpub = (npub: string, startChars: number = 8, endChars: number = 8): string => {
  if (!npub || npub.length <= startChars + endChars + 3) {
    return npub;
  }
  
  return `${npub.slice(0, startChars)}...${npub.slice(-endChars)}`;
};