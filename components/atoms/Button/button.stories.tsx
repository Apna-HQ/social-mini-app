import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../../components/ui/button';
import { Loader2 } from 'lucide-react';

const meta = {
  title: 'Atoms/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  render: () => <Button>Click me</Button>,
};

export const Ghost: Story = {
  render: () => <Button variant="ghost">Ghost</Button>,
};

export const Outline: Story = {
  render: () => <Button variant="outline">Outline</Button>,
};

export const Loading: Story = {
  render: () => (
    <Button disabled>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading
    </Button>
  ),
};

export const Large: Story = {
  render: () => <Button size="lg">Large</Button>,
};

export const Small: Story = {
  render: () => <Button size="sm">Small</Button>,
};

export const Icon: Story = {
  render: () => (
    <Button size="icon">
      <Loader2 className="h-4 w-4" />
    </Button>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Button>
      <Loader2 className="mr-2 h-4 w-4" />
      With Icon
    </Button>
  ),
};