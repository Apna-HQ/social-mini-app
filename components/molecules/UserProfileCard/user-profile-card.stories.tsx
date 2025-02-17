import type { Meta, StoryObj } from '@storybook/react';
import { UserProfileCard } from '../../ui/user-profile-card';

const meta = {
  title: 'Molecules/UserProfileCard',
  component: UserProfileCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof UserProfileCard>;

export default meta;
type Story = StoryObj<typeof UserProfileCard>;

const baseProps = {
  pubkey: "npub1w46mjnagz9f0u556fzva8ypfftc5yfm32n8ygqmd2r32mxw4cfnsvkvy9e",
  name: "Test User",
  about: "This is a test user's profile with a longer description to test truncation",
  picture: "https://github.com/shadcn.png",
};

export const Default: Story = {
  render: () => (
    <div className="w-[600px] bg-background">
      <UserProfileCard {...baseProps} />
    </div>
  ),
};

export const WithoutImage: Story = {
  render: () => (
    <div className="w-[600px] bg-background">
      <UserProfileCard 
        {...baseProps}
        picture={undefined}
      />
    </div>
  ),
};

export const MinimalInfo: Story = {
  render: () => (
    <div className="w-[600px] bg-background">
      <UserProfileCard 
        pubkey={baseProps.pubkey}
      />
    </div>
  ),
};

export const WithFollowButton: Story = {
  render: () => (
    <div className="w-[600px] bg-background">
      <UserProfileCard 
        {...baseProps}
        showFollowButton
        isFollowing={false}
        onFollowToggle={async () => {
          console.log('Follow toggled');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }}
      />
    </div>
  ),
};

export const Following: Story = {
  render: () => (
    <div className="w-[600px] bg-background">
      <UserProfileCard 
        {...baseProps}
        showFollowButton
        isFollowing={true}
        onFollowToggle={async () => {
          console.log('Follow toggled');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }}
      />
    </div>
  ),
};

export const WithCustomClick: Story = {
  render: () => (
    <div className="w-[600px] bg-background">
      <UserProfileCard 
        {...baseProps}
        onClick={() => console.log('Custom click handler')}
      />
    </div>
  ),
};