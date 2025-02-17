import type { Meta, StoryObj } from '@storybook/react';
import { BottomNav } from '../../../components/ui/bottom-nav';

const meta = {
  title: 'Organisms/BottomNav',
  component: BottomNav,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof BottomNav>;

export default meta;
type Story = StoryObj<typeof BottomNav>;

export const Home: Story = {
  parameters: {
    nextjs: {
      pathname: '/',
    },
  },
  render: () => (
    <div className="w-[600px] h-[100px] bg-background relative">
      <BottomNav />
    </div>
  ),
};

export const Search: Story = {
  parameters: {
    nextjs: {
      pathname: '/search',
    },
  },
  render: () => (
    <div className="w-[600px] h-[100px] bg-background relative">
      <BottomNav />
    </div>
  ),
};

export const Profile: Story = {
  parameters: {
    nextjs: {
      pathname: '/profile',
    },
  },
  render: () => (
    <div className="w-[600px] h-[100px] bg-background relative">
      <BottomNav />
    </div>
  ),
};