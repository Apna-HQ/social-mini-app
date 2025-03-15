import type { Meta, StoryObj } from "@storybook/react"
import { PostActions } from "./post-actions"
import React from "react"

// Create a decorator to mock the hooks
const withMocks = (Story: React.ComponentType) => {
  // Mock the hooks
  const mockUseApp = {
    likeNote: () => console.log("Like note called"),
    repostNote: () => console.log("Repost note called"),
  }
  
  const mockRouter = {
    push: (path: string) => console.log(`Router push called with: ${path}`),
  }
  
  // Override the modules
  // @ts-ignore - This is for Storybook only
  window.nextNavigation = { useRouter: () => mockRouter }
  // @ts-ignore - This is for Storybook only
  window.appProviders = { useApp: () => mockUseApp }
  
  return <Story />
}

const meta: Meta<typeof PostActions> = {
  title: "UI/PostActions",
  component: PostActions,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    id: { control: "text" },
    likes: { control: { type: "number", min: 0 } },
    reposts: { control: { type: "number", min: 0 } },
  },
  decorators: [withMocks],
}

export default meta
type Story = StoryObj<typeof PostActions>

export const Default: Story = {
  args: {
    id: "post-123",
    likes: 0,
    reposts: 0,
  },
}

export const WithCounts: Story = {
  args: {
    id: "post-456",
    likes: 42,
    reposts: 12,
  },
}

export const WithCustomClassName: Story = {
  args: {
    id: "post-789",
    likes: 5,
    reposts: 2,
    className: "bg-slate-100 rounded-md",
  },
}