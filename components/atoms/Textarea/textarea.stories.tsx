import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from '../../../components/ui/textarea';

const meta = {
  title: 'Atoms/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  render: () => (
    <div className="w-[600px] bg-background p-4">
      <Textarea placeholder="Type your message here" />
    </div>
  ),
};

export const WithValue: Story = {
  render: () => (
    <div className="w-[600px] bg-background p-4">
      <Textarea 
        value="This is some pre-filled content"
        onChange={(e) => console.log('Content changed:', e.target.value)}
      />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-[600px] bg-background p-4">
      <Textarea 
        disabled
        value="This textarea is disabled"
      />
    </div>
  ),
};

export const WithCustomHeight: Story = {
  render: () => (
    <div className="w-[600px] bg-background p-4">
      <Textarea 
        placeholder="This textarea has a custom height"
        className="min-h-[200px]"
      />
    </div>
  ),
};