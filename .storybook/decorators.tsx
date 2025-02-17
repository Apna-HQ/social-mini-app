import React from 'react';
import { ApnaContext } from '../components/providers/ApnaProvider';

// Mock nostr implementation
const mockNostr = {
  fetchUserMetadata: async () => ({
    name: "Test User",
    about: "This is a test user",
    picture: "https://github.com/shadcn.png"
  }),
  getActiveUserProfile: async () => ({
    name: "Active User",
    about: "This is the active user",
    picture: "https://github.com/shadcn.png"
  })
};

// Mock ApnaProvider for stories
export const withApnaProvider = (Story: React.ComponentType) => (
  <ApnaContext.Provider 
    value={{
      nostr: mockNostr,
      isHighlighted: false,
      toggleHighlight: () => {},
    }}
  >
    <Story />
  </ApnaContext.Provider>
);