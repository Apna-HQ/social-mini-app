import type { Meta, StoryObj } from '@storybook/react';
import { Post } from '../../../components/ui/post';
import { StoryWrapper } from '../../../stories/mocks/apna-provider';

const meta = {
  title: 'Organisms/Post',
  component: Post,
  parameters: {
    layout: 'centered',
    nextjs: {
      navigation: {
        pathname: '/',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Story />
      </StoryWrapper>
    ),
  ],
} satisfies Meta<typeof Post>;

export default meta;
type Story = StoryObj<typeof Post>;

const mockAuthor = {
  name: "Test User",
  picture: "https://github.com/shadcn.png",
  pubkey: "test-pubkey-1",
};

const baseProps = {
  id: "test-post-1",
  content: "This is a test post with some interesting content! #test #social",
  author: mockAuthor,
  timestamp: new Date().getTime() / 1000,
};

const longContent = `This is a much longer post that demonstrates how the component handles larger amounts of text. It might include multiple sentences and even some line breaks.

It could also include some #hashtags and @mentions to show how those are styled. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;

export const Default: Story = {
  render: () => <Post {...baseProps} />,
};

export const WithImage: Story = {
  render: () => (
    <Post 
      {...baseProps} 
      id="test-post-2"
      content="Check out this image! https://picsum.photos/400/300" 
    />
  ),
};

export const LongPost: Story = {
  render: () => (
    <Post 
      {...baseProps}
      id="test-post-3"
      content={longContent}
    />
  ),
};

export const WithInteractions: Story = {
  render: () => (
    <Post 
      {...baseProps}
      onReply={() => console.log('Reply clicked')}
      onRepost={() => console.log('Repost clicked')}
      onLike={() => console.log('Like clicked')}
    />
  ),
};

export const AsReply: Story = {
  render: () => (
    <Post 
      {...baseProps}
      isReply={true}
      content="This is a reply to another post!"
    />
  ),
};