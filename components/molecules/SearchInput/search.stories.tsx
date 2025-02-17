import type { Meta, StoryObj } from '@storybook/react';
import { Search } from '../../../components/ui/search';
import { StoryWrapper } from '../../../stories/mocks/apna-provider';

const meta = {
  title: 'Molecules/Search',
  component: Search,
  parameters: {
    layout: 'centered',
    nextjs: {
      navigation: {
        pathname: '/search',
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
} satisfies Meta<typeof Search>;

export default meta;
type Story = StoryObj<typeof Search>;

export const Default: Story = {
  render: () => <Search />,
};

export const WithSuggestedUsers: Story = {
  render: () => <Search />,
  parameters: {
    mockData: {
      suggestedUsers: [
        {
          pubkey: "test-pubkey-1",
          npub: "npub1w46mjnagz9f0u556fzva8ypfftc5yfm32n8ygqmd2r32mxw4cfnsvkvy9e",
          metadata: {
            name: "Test User 1",
            about: "This is test user 1",
            picture: "https://github.com/shadcn.png"
          }
        },
        {
          pubkey: "test-pubkey-2",
          npub: "npub12rv5lskctqxxs2c8rf2zlzc7xx3qpvzs3w4etgemauy9thegr43sf485vg",
          metadata: {
            name: "Test User 2",
            about: "This is test user 2",
            picture: "https://github.com/shadcn.png"
          }
        }
      ]
    }
  }
};

export const WithError: Story = {
  render: () => <Search />,
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector('input');
    const searchButton = canvasElement.querySelector('button');
    
    if (input && searchButton) {
      input.value = 'invalid-input';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      searchButton.click();
    }
  },
};