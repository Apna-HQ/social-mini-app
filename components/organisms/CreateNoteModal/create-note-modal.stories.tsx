import type { Meta, StoryObj } from '@storybook/react';
import { CreateNoteModal } from '../../../components/ui/create-note-modal';

const meta = {
  title: 'Organisms/CreateNoteModal',
  component: CreateNoteModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CreateNoteModal>;

export default meta;
type Story = StoryObj<typeof CreateNoteModal>;

export const Closed: Story = {
  render: () => (
    <CreateNoteModal 
      isOpen={false}
      onClose={() => console.log('Modal closed')}
      onPublish={(content) => console.log('Published:', content)}
    />
  ),
};

export const Open: Story = {
  render: () => (
    <CreateNoteModal 
      isOpen={true}
      onClose={() => console.log('Modal closed')}
      onPublish={(content) => console.log('Published:', content)}
    />
  ),
};

export const WithDelayedPublish: Story = {
  render: () => (
    <CreateNoteModal 
      isOpen={true}
      onClose={() => console.log('Modal closed')}
      onPublish={async (content) => {
        console.log('Publishing:', content);
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Published after delay');
      }}
    />
  ),
};