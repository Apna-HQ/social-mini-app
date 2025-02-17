import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs';

const meta = {
  title: 'Atoms/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <div className="w-[600px] bg-background p-4">
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>
        <TabsContent value="all">All posts content</TabsContent>
        <TabsContent value="following">Following posts content</TabsContent>
      </Tabs>
    </div>
  ),
};

export const WithMultipleTabs: Story = {
  render: () => (
    <div className="w-[600px] bg-background p-4">
      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="replies">Replies</TabsTrigger>
          <TabsTrigger value="likes">Likes</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">User's posts</TabsContent>
        <TabsContent value="replies">User's replies</TabsContent>
        <TabsContent value="likes">User's likes</TabsContent>
      </Tabs>
    </div>
  ),
};

export const WithCustomStyles: Story = {
  render: () => (
    <div className="w-[600px] bg-background p-4">
      <Tabs defaultValue="tab1" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="tab1" className="flex-1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2" className="flex-1">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content for tab 1</TabsContent>
        <TabsContent value="tab2">Content for tab 2</TabsContent>
      </Tabs>
    </div>
  ),
};