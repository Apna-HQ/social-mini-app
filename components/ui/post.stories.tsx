import type { Meta, StoryObj } from '@storybook/react'
import { Post } from './post'
import * as React from 'react'

// Mock the ApnaContext
import { ApnaContext } from '../../components/providers/ApnaProvider'

// Mock the useReactionCounts hook
import * as ReactionHooks from '../../lib/hooks/useReactionCounts'

// Create a mock implementation for useReactionCounts
const mockUseReactionCounts = (noteId: string) => {
  // Return different counts based on the noteId
  if (noteId === 'note-with-reactions') {
    return { likes: 42, reposts: 23, isLoading: false }
  } else if (noteId === 'note-with-no-reactions') {
    return { likes: 0, reposts: 0, isLoading: false }
  } else if (noteId === 'note-loading-reactions') {
    return { likes: 0, reposts: 0, isLoading: true }
  }
  return { likes: 0, reposts: 0, isLoading: false }
}

// Create a mock nostr API with proper types
const mockNostr: any = {
  fetchNoteLikes: async () => [],
  fetchNoteReposts: async () => [],
  likeNote: async () => ({ id: 'mock-like-id', kind: 7, content: '', created_at: Date.now(), pubkey: 'mock-pubkey', sig: '', tags: [] }),
  repostNote: async () => ({ id: 'mock-repost-id', kind: 6, content: '', created_at: Date.now(), pubkey: 'mock-pubkey', sig: '', tags: [] }),
  // Add other required methods with proper return types
  getActiveUserProfile: async () => ({
    nprofile: 'mock-nprofile',
    metadata: { name: 'Mock User', about: 'Mock Bio' },
    following: [],
    followers: []
  }),
  fetchUserMetadata: async () => ({ name: 'Mock User', about: 'Mock Bio' }),
  updateProfileMetadata: async () => ({
    nprofile: 'mock-nprofile',
    metadata: { name: 'Mock User', about: 'Mock Bio' },
    following: [],
    followers: []
  }),
  fetchUserProfile: async () => ({
    nprofile: 'mock-nprofile',
    metadata: { name: 'Mock User', about: 'Mock Bio' },
    following: [],
    followers: []
  }),
  followUser: async () => {},
  unfollowUser: async () => {},
  fetchNote: async () => ({ id: 'mock-note-id', kind: 1, content: 'Mock note content', created_at: Date.now(), pubkey: 'mock-pubkey', sig: '', tags: [] }),
  fetchNoteAndReplies: async () => ({
    note: { id: 'mock-note-id', kind: 1, content: 'Mock note content', created_at: Date.now(), pubkey: 'mock-pubkey', sig: '', tags: [] },
    replyNotes: []
  }),
  publishNote: async () => ({ id: 'mock-note-id', kind: 1, content: 'Mock note content', created_at: Date.now(), pubkey: 'mock-pubkey', sig: '', tags: [] }),
  replyToNote: async () => ({ id: 'mock-reply-id', kind: 1, content: 'Mock reply content', created_at: Date.now(), pubkey: 'mock-pubkey', sig: '', tags: [] }),
  fetchFeed: async () => [],
  fetchUserFeed: async () => [],
  subscribeToFeed: async () => {},
  subscribeToUserFeed: async () => {}
}

// Create a wrapper component that provides the mocked context
const MockApnaProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ApnaContext.Provider value={{
      nostr: mockNostr,
      isHighlighted: false,
      toggleHighlight: () => {}
    }}>
      {children}
    </ApnaContext.Provider>
  )
}

// Apply the mock for useReactionCounts
React.useEffect(() => {
  const original = ReactionHooks.useReactionCounts
  // @ts-ignore - for storybook mocking
  ReactionHooks.useReactionCounts = mockUseReactionCounts
  return () => {
    // @ts-ignore - for storybook mocking
    ReactionHooks.useReactionCounts = original
  }
}, [])

const meta: Meta<typeof Post> = {
  title: 'UI/Post',
  component: Post,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onHashtagClick: { action: 'hashtag clicked' },
  },
  // Wrap all stories with the MockApnaProvider
  decorators: [
    (Story) => (
      <MockApnaProvider>
        <Story />
      </MockApnaProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Post>

export const Default: Story = {
  args: {
    id: 'default-note',
    content: 'This is a test post with no reactions.',
    author: {
      name: 'Test User',
      pubkey: 'test-pubkey-123',
    },
    timestamp: Date.now(),
  },
}

export const WithReactions: Story = {
  args: {
    id: 'note-with-reactions',
    content: 'This post has 42 likes and 23 reposts!',
    author: {
      name: 'Popular User',
      pubkey: 'popular-pubkey-456',
    },
    timestamp: Date.now(),
  },
}

export const WithNoReactions: Story = {
  args: {
    id: 'note-with-no-reactions',
    content: 'This post has no likes or reposts yet.',
    author: {
      name: 'New User',
      pubkey: 'new-pubkey-789',
    },
    timestamp: Date.now(),
  },
}

export const LoadingReactions: Story = {
  args: {
    id: 'note-loading-reactions',
    content: 'This post is still loading its reaction counts.',
    author: {
      name: 'Loading User',
      pubkey: 'loading-pubkey-101',
    },
    timestamp: Date.now(),
  },
}

export const LongContent: Story = {
  args: {
    id: 'long-content-note',
    content: 'This is a post with very long content that should be truncated. '.repeat(20),
    author: {
      name: 'Verbose User',
      pubkey: 'verbose-pubkey-202',
    },
    timestamp: Date.now(),
  },
}

export const WithHashtags: Story = {
  args: {
    id: 'hashtag-note',
    content: 'This post contains #hashtags and #mentions that should be highlighted.',
    author: {
      name: 'Social User',
      pubkey: 'social-pubkey-303',
    },
    timestamp: Date.now(),
  },
}

export const AsReply: Story = {
  args: {
    id: 'reply-note',
    content: 'This is a reply to another post.',
    author: {
      name: 'Reply User',
      pubkey: 'reply-pubkey-404',
    },
    timestamp: Date.now(),
    isReply: true,
    parentNoteId: 'parent-note-123',
  },
}