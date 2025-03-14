import { ReactNode } from 'react';
import { ApnaContext } from '../../components/providers/ApnaProvider';
import { INostr, IUserMetadata, IUserProfile, INote, INoteAndReplies } from '@apna/sdk';

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

const mockNostr: INostr = {
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
  subscribeToFeed: async (feedType, onevent) => {
    onevent(mockNote);
  },
  subscribeToUserFeed: async (npub, feedType, onevent) => {
    onevent(mockNote);
  },
  subscribeToUserNotifications: async (onevent) => {
    onevent(mockNote);
  }
};

export const MockApnaProvider = ({ children }: { children: ReactNode }) => (
  <ApnaContext.Provider 
    value={{
      nostr: mockNostr,
      isHighlighted: false,
      toggleHighlight: () => console.log('Toggle highlight clicked'),
    }}
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
