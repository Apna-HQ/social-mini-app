import type { Meta, StoryObj } from '@storybook/react';
import { Avatar, AvatarImage, AvatarFallback } from '../../../components/ui/avatar';

const meta = {
  title: 'Atoms/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://github.com/shadcn.png" alt="User" />
    </Avatar>
  ),
};

export const WithFallback: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

export const Large: Story = {
  render: () => (
    <Avatar className="h-16 w-16">
      <AvatarImage src="https://github.com/shadcn.png" alt="User" />
    </Avatar>
  ),
};

export const Small: Story = {
  render: () => (
    <Avatar className="h-8 w-8">
      <AvatarImage src="https://github.com/shadcn.png" alt="User" />
    </Avatar>
  ),
};