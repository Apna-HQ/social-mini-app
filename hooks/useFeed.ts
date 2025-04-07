import { useState, useEffect, useCallback } from "react";
import { useApna } from "@/components/providers/ApnaProvider";
import { nip19 } from "nostr-tools";
// Removed incorrect import of IEvent from @apna/sdk
import { feedDB, INITIAL_FETCH_SIZE, LOAD_MORE_SIZE, type StoredNote } from "@/lib/feedDB"; // Import feedDB, constants, and StoredNote type
import type { INote } from "@apna/sdk";

// Define the structure for decoded nprofile if not already globally available
type DecodedNprofile = {
  type: 'nprofile';
  data: {
    pubkey: string;
    relays?: string[];
  };
};

// Define the return type for the hook
interface UseFeedResult {
  notes: INote[];
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  loadMore: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  userPubkey: string | null;
}

export function useFeed(): UseFeedResult {
  const [notes, setNotes] = useState<INote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Removed lastTimestamp state
  const [userPubkey, setUserPubkey] = useState<string | null>(null);
  const apna = useApna();

  // --- Fetching Logic (to be moved from AppProvider) ---

  const fetchInitialFeed = useCallback(async () => {
    if (!userPubkey) {
      console.error("fetchInitialFeed called without userPubkey");
      setLoading(false);
      return;
    }
   setLoading(true);
   try {
     const cachedStoredNotes: StoredNote[] = await feedDB.getNotes(userPubkey, INITIAL_FETCH_SIZE);
     const cachedNotes: INote[] = cachedStoredNotes.map(storedNoteToINote);

     if (cachedNotes.length > 0) {
        setNotes(cachedNotes);
        // Removed setLastTimestamp call
        // Don't set loading false yet, fetch fresh notes first
      } else {
        // If no cache, set loading false only after network fetch attempt
      }

      // Fetch fresh notes regardless of cache state initially
      const fetchSize = cachedNotes.length === 0 ? INITIAL_FETCH_SIZE : 20; // Fetch more if cache is empty
      let latestTimestamp: number | undefined = undefined;
      if (cachedNotes.length > 0) {
        const timestamp = await feedDB.getLatestTimestamp(userPubkey);
        if (timestamp !== null) {
           latestTimestamp = timestamp;
        }
      }

     // Rely on type inference for the result of fetchFeed
     const freshEvents = await apna.nostr.fetchFeed(
       'FOLLOWING_FEED',
       latestTimestamp,
       undefined,
       fetchSize
     );
     // Filter for kind 1 notes and map to INote if necessary (assuming IEvent structure matches INote for kind 1)
     // Assuming IEvent structure for kind 1 is compatible with INote or needs mapping
     // Let's assume direct compatibility for now, adjust if INote has extra fields not in IEvent
     const freshNotes: INote[] = freshEvents.filter(event => event.kind === 1) as INote[];

      if (freshNotes.length > 0) {
        // Map INote[] to BaseNote[] before adding to DB
        const notesForDb = freshNotes.map(note => ({
          id: note.id,
          content: note.content,
          pubkey: note.pubkey,
          created_at: note.created_at,
          tags: note.tags as string[][], // Assert type compatibility
          sig: note.sig,
        }));
        await feedDB.addNotes(userPubkey, notesForDb);

      // Update notes state and then reliably set lastTimestamp from the updated notes array
      setNotes(prev => {
        const seenIds = new Set(prev.map(note => note.id));
        const uniqueNewNotes = freshNotes.filter(note => !seenIds.has(note.id));
        const updatedNotes = [...uniqueNewNotes, ...prev].sort((a, b) => b.created_at - a.created_at);

        return updatedNotes;
      });
    }
    // Removed logic that set lastTimestamp based on current notes

    } catch (error) {
      console.error("Failed to fetch initial feed:", error);
    } finally {
      setLoading(false); // Set loading false after all operations
    }
  }, [apna, userPubkey]); // Removed notes.length dependency

  const refreshFeed = useCallback(async () => {
    if (refreshing || !userPubkey) return;

    setRefreshing(true);
    try {
     const timestamp = await feedDB.getLatestTimestamp(userPubkey);

     // Rely on type inference for the result of fetchFeed
     const freshEvents = await apna.nostr.fetchFeed(
       'FOLLOWING_FEED',
       timestamp || undefined,
       undefined,
       20 // Fetch a fixed number for refresh
     );
     const freshNotes: INote[] = freshEvents.filter(event => event.kind === 1) as INote[];

      if (freshNotes.length > 0) {
        // Map INote[] to BaseNote[] before adding to DB
        const notesForDbRefresh = freshNotes.map(note => ({
          id: note.id,
          content: note.content,
          pubkey: note.pubkey,
          created_at: note.created_at,
          tags: note.tags as string[][], // Assert type compatibility
          sig: note.sig,
        }));
        await feedDB.addNotes(userPubkey, notesForDbRefresh);

      // Update notes state after refresh and ensure lastTimestamp is correct
      setNotes(prev => {
        const seenIds = new Set(prev.map(note => note.id));
        const uniqueNewNotes = freshNotes.filter(note => !seenIds.has(note.id));
        const updatedNotes = [...uniqueNewNotes, ...prev].sort((a, b) => b.created_at - a.created_at);

        return updatedNotes;
      });
    }
    // Removed logic setting lastTimestamp after refresh
    } catch (error) {
      console.error("Failed to refresh feed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [apna, userPubkey, refreshing]); // Add refreshing dependency

  const loadMore = useCallback(async () => {
   // Ensure notes are sorted descending by created_at before getting the oldest
   const sortedNotes = [...notes].sort((a, b) => b.created_at - a.created_at);
  const oldestNoteTimestamp = sortedNotes.length > 0 ? sortedNotes[sortedNotes.length - 1].created_at : null;
  console.log(`[loadMore] Attempting to load more before timestamp: ${oldestNoteTimestamp}`);

  if (loadingMore || oldestNoteTimestamp === null || !userPubkey) {
    console.log(`[loadMore] Aborting: loadingMore=${loadingMore}, oldestNoteTimestamp=${oldestNoteTimestamp}, userPubkey=${!!userPubkey}`);
    if (oldestNoteTimestamp === null && sortedNotes.length > 0) {
      console.warn("[loadMore] Oldest note timestamp is null despite notes existing.");
    }
    return;
  }

    setLoadingMore(true);
    try {
      // Use the already sorted notes array for seen IDs
      const seenNoteIds = new Set(sortedNotes.map(note => note.id));

     // Try fetching from cache first
    console.log(`[loadMore] Fetching from cache before ${oldestNoteTimestamp}...`);
    const cachedOlderStoredNotes: StoredNote[] = await feedDB.getNotes(userPubkey, LOAD_MORE_SIZE, oldestNoteTimestamp);
    console.log(`[loadMore] Fetched ${cachedOlderStoredNotes.length} notes from cache.`);
     const cachedOlderNotes: INote[] = cachedOlderStoredNotes.map(storedNoteToINote);
    const uniqueCachedNotes = cachedOlderNotes.filter(note => !seenNoteIds.has(note.id));
    console.log(`[loadMore] Found ${uniqueCachedNotes.length} unique notes from cache after filtering.`); // Add this log

     let newNotesFound = false;
     // No need for oldestTimestampFromBatch, we'll derive from the final notes array

      if (uniqueCachedNotes.length > 0) {
        newNotesFound = true;
       uniqueCachedNotes.forEach(note => seenNoteIds.add(note.id));
       // Restore sorting
       setNotes(prevNotes =>
         [...prevNotes, ...uniqueCachedNotes].sort((a, b) => b.created_at - a.created_at)
       );
     }

     // If cache didn't provide enough notes, fetch from network
     if (uniqueCachedNotes.length < LOAD_MORE_SIZE) {
      console.log(`[loadMore] Fetching from network before ${oldestNoteTimestamp}...`);
      // Rely on type inference for the result of fetchFeed
       const olderEvents = await apna.nostr.fetchFeed(
         'FOLLOWING_FEED',
         undefined,
         oldestNoteTimestamp, // Fetch notes older than the current oldest note
         LOAD_MORE_SIZE
       );
      const olderNotes: INote[] = olderEvents.filter(event => event.kind === 1) as INote[];
      console.log(`[loadMore] Fetched ${olderEvents.length} events from network, ${olderNotes.length} are notes.`);
      const uniqueNetworkNotes = olderNotes.filter(note => !seenNoteIds.has(note.id));
      console.log(`[loadMore] Found ${uniqueNetworkNotes.length} unique notes from network after filtering.`); // Add this log

        if (uniqueNetworkNotes.length > 0) {
          newNotesFound = true;
          // Map INote[] to BaseNote[] before adding to DB
          const networkNotesForDb = uniqueNetworkNotes.map(note => ({
            id: note.id,
            content: note.content,
            pubkey: note.pubkey,
            created_at: note.created_at,
            tags: note.tags as string[][], // Assert type compatibility
            sig: note.sig,
          }));
          await feedDB.addNotes(userPubkey, networkNotesForDb);

         // Restore sorting
         setNotes(prevNotes =>
           [...prevNotes, ...uniqueNetworkNotes].sort((a, b) => b.created_at - a.created_at)
         );
        }
      }

    // No need to update lastTimestamp state anymore

    } catch (error) {
      console.error("Failed to load more notes:", error);
    } finally {
      setLoadingMore(false);
    }
  // Add notes.length as dependency to re-evaluate oldestNoteTimestamp when notes change
  }, [apna, userPubkey, loadingMore, notes, notes.length]);

  // --- Effects ---

  useEffect(() => {
    // Fetch user pubkey first, then initial feed
    const initialize = async () => {
      setLoading(true);
      try {
        const userProfile = await apna.nostr.getActiveUserProfile();
        let pubkey: string | null = null;
        if (userProfile) {
          try {
            const decoded = nip19.decode(userProfile.nprofile) as DecodedNprofile;
            if (decoded.type === 'nprofile' && decoded.data.pubkey) {
              const npub = nip19.npubEncode(decoded.data.pubkey);
              pubkey = nip19.decode(npub).data as string;
            }
          } catch (decodeError) {
           console.error("Failed to decode nprofile:", decodeError);
           // If decoding fails, we cannot reliably get the pubkey here.
           // The logic relies on a valid nprofile.
          }
        }

        if (pubkey) {
          setUserPubkey(pubkey);
          // Now fetch initial feed using this pubkey
          // (fetchInitialFeed logic will be added in the next step)
        } else {
          console.error("No active user pubkey found");
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to get active user profile:", error);
        setLoading(false);
      }
    };
    initialize();
  }, [apna]); // Dependency on apna ensures it runs when apna context is ready

  // Effect to run fetchInitialFeed once userPubkey is set
  useEffect(() => {
    if (userPubkey) {
      fetchInitialFeed();
    }
  }, [userPubkey, fetchInitialFeed]);

// Removed useEffect that updated lastTimestamp


  return {
    notes,
    loading,
    loadingMore,
    refreshing,
    loadMore,
    refreshFeed,
    userPubkey,
  };
}

// Helper function to map StoredNote to INote
// Makes assumptions about missing fields based on INote structure.
// Adjust if StoredNote structure or INote requirements differ.
function storedNoteToINote(storedNote: StoredNote): INote {
  // Basic validation or default values
  const tags = storedNote.tags && Array.isArray(storedNote.tags) ? storedNote.tags : [];
  const sig = typeof storedNote.sig === 'string' ? storedNote.sig : '';

  return {
    id: storedNote.id,
    pubkey: storedNote.pubkey,
    created_at: storedNote.created_at,
    content: storedNote.content,
    kind: 1, // Assuming StoredNote always represents kind 1 for INote mapping
    sig: sig,
    tags: tags,
    // Add other INote fields if they exist in StoredNote or have defaults
    // e.g., reactions: storedNote.reactions || {}, profile: storedNote.profile || null
  };
}