import { feedReactionsDB, ReactionType } from '../feedReactionsDB'
import { INostr, INoteLike, INoteRepost } from '@apna/sdk'

/**
 * Adds a like reaction to a note using the nostr API
 * @param noteId The ID of the note
 * @param pubkey The public key of the user
 * @param nostr The nostr API instance
 * @returns Promise that resolves to true if successful
 */
export async function likeNote(noteId: string, pubkey: string, nostr: INostr): Promise<boolean> {
  if (!noteId || !pubkey) {
    console.error('Note ID and pubkey are required to like a note')
    return false
  }

  try {
    // Check if the user has already liked this note
    const hasLiked = await feedReactionsDB.hasUserReacted(noteId, pubkey, ReactionType.LIKE)
    
    if (hasLiked) {
      // If already liked, remove the like (toggle behavior)
      // Note: The nostr API doesn't have a direct way to unlike, so we just remove from local DB
      await feedReactionsDB.removeReaction(noteId, pubkey, ReactionType.LIKE)
      console.log(`Removed like from note ${noteId} by user ${pubkey}`)
      return true
    }
    
    // Call the nostr API to like the note
    const result = await nostr.likeNote(noteId)
    
    if (result) {
      // Add the like reaction to our local database
      await feedReactionsDB.addReaction({
        id: `${pubkey}:${noteId}:${ReactionType.LIKE}`,
        noteId,
        pubkey,
        type: ReactionType.LIKE,
        created_at: result.created_at || Date.now()
      })
      
      console.log(`Added like to note ${noteId} by user ${pubkey}`)
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error liking note:', error)
    return false
  }
}

/**
 * Adds a repost reaction to a note using the nostr API
 * @param noteId The ID of the note
 * @param pubkey The public key of the user
 * @param nostr The nostr API instance
 * @returns Promise that resolves to true if successful
 */
export async function repostNote(noteId: string, pubkey: string, nostr: INostr): Promise<boolean> {
  if (!noteId || !pubkey) {
    console.error('Note ID and pubkey are required to repost a note')
    return false
  }

  try {
    // Check if the user has already reposted this note
    const hasReposted = await feedReactionsDB.hasUserReacted(noteId, pubkey, ReactionType.REPOST)
    
    if (hasReposted) {
      // If already reposted, remove the repost (toggle behavior)
      // Note: The nostr API doesn't have a direct way to unrepost, so we just remove from local DB
      await feedReactionsDB.removeReaction(noteId, pubkey, ReactionType.REPOST)
      console.log(`Removed repost from note ${noteId} by user ${pubkey}`)
      return true
    }
    
    // Call the nostr API to repost the note (empty quote content)
    const result = await nostr.repostNote(noteId, '')
    
    if (result) {
      // Add the repost reaction to our local database
      await feedReactionsDB.addReaction({
        id: `${pubkey}:${noteId}:${ReactionType.REPOST}`,
        noteId,
        pubkey,
        type: ReactionType.REPOST,
        created_at: result.created_at || Date.now()
      })
      
      console.log(`Added repost to note ${noteId} by user ${pubkey}`)
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error reposting note:', error)
    return false
  }
}