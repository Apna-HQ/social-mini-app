# Social Mini App - Reactions System

This document describes the reactions system implemented for the Social Mini App, which allows users to like and repost notes.

## Database Structure

The reactions system uses IndexedDB to store user reactions to notes. The main database is `feedReactionsDB`, which stores two types of reactions:

- **Likes**: When a user likes a note
- **Reposts**: When a user reposts a note

### Schema

The database schema includes:

```typescript
interface BaseReaction {
  id: string // Unique ID for the reaction
  noteId: string // ID of the note being reacted to
  pubkey: string // Public key of the user who reacted
  type: ReactionType // Type of reaction (like or repost)
  created_at: number // Timestamp when the reaction was created
}

interface StoredReaction extends BaseReaction {
  cached_at: number // Timestamp when the reaction was cached
}
```

### Indexes

The database uses the following indexes for efficient querying:

- `by-note-id`: To quickly find all reactions for a specific note
- `by-type`: To filter reactions by type (like or repost)
- `by-timestamp`: To sort reactions by creation time
- `by-cached-at`: For cache management and cleanup

## Components and Hooks

### Components

- **Post**: Updated to display reaction counts next to the Like and Repost buttons
- **PostWithReactions**: Example component that demonstrates how to use the Post component with reactions

### Hooks

- **useReactionCounts**: Fetches and returns the counts of likes and reposts for a specific note
  ```typescript
  const { likes, reposts, isLoading } = useReactionCounts(noteId, refreshKey)
  ```

- **useReactions**: Provides handlers for liking and reposting notes, with automatic count refreshing
  ```typescript
  const { likes, reposts, isLoading, handleLike, handleRepost } = useReactions({
    noteId,
    pubkey: currentUserPubkey
  })
  ```

### Utility Functions

- **likeNote**: Adds or removes a like reaction for a note using the nostr API
  ```typescript
  await likeNote(noteId, pubkey, nostr)
  ```

- **repostNote**: Adds or removes a repost reaction for a note using the nostr API
  ```typescript
  await repostNote(noteId, pubkey, nostr)
  ```

## Usage Example

```tsx
import { PostWithReactions } from "../components/examples/post-with-reactions"

// In your component
return (
  <PostWithReactions
    id="note-123"
    content="This is a test note"
    author={{
      name: "Test User",
      pubkey: "user-pubkey-123"
    }}
    timestamp={Date.now()}
    currentUserPubkey="current-user-pubkey"
    onReply={() => console.log("Reply clicked")}
  />
)
```

## Implementation Details

1. The reactions are stored in IndexedDB for persistence across sessions
2. The system fetches fresh reaction counts from the nostr API while displaying cached counts initially
3. Reactions have a toggle behavior - clicking again removes the reaction
4. The system includes automatic cleanup to prevent the database from growing too large
5. Reaction counts are displayed next to the buttons in the Post component
6. The hooks handle all the complexity of managing reactions and refreshing counts

## Data Flow

1. When a component renders, it initially displays cached reaction counts from IndexedDB
2. In the background, it fetches fresh counts from the nostr API using `fetchNoteLikes` and `fetchNoteReposts`
3. Once the fresh data is received, it updates the UI and stores the new reactions in IndexedDB
4. When a user likes or reposts a note, the action is sent to the nostr API and also stored locally
5. The local database serves as a cache to provide fast access to reaction data even when offline

## Storybook Integration

The Post component includes Storybook stories that demonstrate different states:
- Posts with many reactions
- Posts with no reactions
- Posts with loading reactions

The stories use mocked data to simulate the different states without requiring a real nostr connection.