import type { Meta, StoryObj } from '@storybook/react';
import { AuthorInfo } from '../../../components/ui/author-info';
import { StoryWrapper } from '../../../stories/mocks/apna-provider';

const meta = {
  title: 'Molecules/AuthorInfo',
  component: AuthorInfo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Story />
      </StoryWrapper>
    ),
  ],
} satisfies Meta<typeof AuthorInfo>;

export default meta;
type Story = StoryObj<typeof AuthorInfo>;

const baseProps = {
  pubkey: "npub1w46mjnagz9f0u556fzva8ypfftc5yfm32n8ygqmd2r32mxw4cfnsvkvy9e",
  timestamp: new Date().getTime() / 1000,
};

export const Default: Story = {
  render: () => (
    <div className="w-[600px] bg-background p-4">
      <AuthorInfo {...baseProps} />
    </div>
  ),
};

export const WithClick: Story = {
  render: () => (
    <div className="w-[600px] bg-background p-4">
      <AuthorInfo 
        {...baseProps}
        onClick={() => console.log('Author clicked')}
      />
    </div>
  ),
};