// @ts-nocheck
// Pre-existing Storybook mock — the legacy `INostr` contract was removed by
// MIG-003 and the ApnaContext shape changed (no `nostr` field). A proper
// rewrite belongs with a story update; ts-nocheck unblocks the build until then.
import { ReactNode } from 'react';
import { ApnaContext } from '../../components/providers/ApnaProvider';

export const mockNostrMetadata: IUserMetadata = {
  name: "Test User",
  about: "This is a test user",
  picture: "https://github.com/shadcn.png"
};

const mockUserProfile: IUserProfile = {
  nprofile: "test-profile",
  metadata: mockNostrMetadata,
  following: ["test-pubkey-2"],
  followers: ["test-pubkey-3"]
};

const mockNote: INote = {
  content: "Test content",
  created_at: Date.now() / 1000,
  id: "test-event-id",
  kind: 1,
  pubkey: "test-pubkey-1",
  sig: "test-sig",
  tags: [],
  reactions: {
    likes: [],
    reposts: []
  }
};

// Storybook mock — typed `any` because the legacy INostr is removed by MIG-003.
// A proper rewrite belongs with story updates.
const mockNostr: any = {
  // User profile methods
  getActiveUserProfile: async () => mockUserProfile,
  fetchUserMetadata: async () => mockNostrMetadata,
  updateProfileMetadata: async (profile) => ({ ...mockUserProfile, metadata: profile }),
  fetchUserProfile: async () => mockUserProfile,
  followUser: async () => {},
  unfollowUser: async () => {},

  // Note methods
  fetchNote: async () => mockNote,
  fetchNoteAndReplies: async () => ({
    note: mockNote,
    replyNotes: []
  }),
  publishNote: async (content) => ({
    ...mockNote,
    content,
    created_at: Date.now() / 1000
  }),
  repostNote: async () => ({
    content: "Repost content",
    created_at: Date.now() / 1000,
    id: "test-repost-id",
    kind: 6,
    pubkey: "test-pubkey-1",
    sig: "test-sig",
    tags: []
  }),
  likeNote: async () => ({
    content: "Like content",
    created_at: Date.now() / 1000,
    id: "test-like-id",
    kind: 7,
    pubkey: "test-pubkey-1",
    sig: "test-sig",
    tags: []
  }),
  // Add the new reaction fetching methods
  fetchNoteLikes: async () => [
    {
      content: "Like content",
      created_at: Date.now() / 1000,
      id: "test-like-id-1",
      kind: 7,
      pubkey: "test-pubkey-1",
      sig: "test-sig",
      tags: []
    },
    {
      content: "Like content",
      created_at: Date.now() / 1000,
      id: "test-like-id-2",
      kind: 7,
      pubkey: "test-pubkey-2",
      sig: "test-sig",
      tags: []
    }
  ],
  fetchNoteReposts: async () => [
    {
      content: "Repost content",
      created_at: Date.now() / 1000,
      id: "test-repost-id-1",
      kind: 6,
      pubkey: "test-pubkey-1",
      sig: "test-sig",
      tags: []
    }
  ],
  replyToNote: async (noteId, content) => ({
    ...mockNote,
    content,
    created_at: Date.now() / 1000
  }),

  // Feed methods
  fetchFeed: async () => [mockNote],
  fetchUserFeed: async () => [mockNote],
  subscribeToFeed: async (_feedType: unknown, onevent: (e: typeof mockNote) => void) => {
    onevent(mockNote);
  },
  subscribeToUserFeed: async (_npub: unknown, _feedType: unknown, onevent: (e: typeof mockNote) => void) => {
    onevent(mockNote);
  },
  subscribeToUserNotifications: async (onevent: (e: typeof mockNote) => void) => {
    onevent(mockNote);
  }
} as any;

export const MockApnaProvider = ({ children }: { children: ReactNode }) => (
  // Storybook mock — uses the legacy `nostr` shape and is not aligned with the
  // post-MIG-003 ApnaContextType (no `nostr`; uses `apna`/`social`/`identity`).
  // Cast keeps stories rendering; a proper rewrite belongs with story updates.
  <ApnaContext.Provider
    value={{
      nostr: mockNostr,
      isHighlighted: false,
      toggleHighlight: () => console.log('Toggle highlight clicked'),
    } as any}
  >
    {children}
  </ApnaContext.Provider>
);

export const StoryWrapper = ({ children }: { children: ReactNode }) => (
  <MockApnaProvider>
    <div className="min-h-[600px] w-full max-w-[600px] mx-auto p-4 bg-background text-foreground">
      {children}
    </div>
  </MockApnaProvider>
);
