import type { Meta, StoryObj } from '@storybook/react';
import { Fab } from '../../../components/ui/fab';

const meta = {
  title: 'Molecules/Fab',
  component: Fab,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Fab>;

export default meta;
type Story = StoryObj<typeof Fab>;

export const Default: Story = {
  render: () => (
    <div className="h-[200px] w-[200px] relative bg-background">
      <Fab onPublish={(content) => console.log('Published:', content)} />
    </div>
  ),
};

export const WithMockPublish: Story = {
  render: () => (
    <div className="h-[200px] w-[200px] relative bg-background">
      <Fab 
        onPublish={async (content) => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('Published after delay:', content);
        }} 
      />
    </div>
  ),
};