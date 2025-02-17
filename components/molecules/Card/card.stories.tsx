import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';

const meta = {
  title: 'Molecules/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof Card>;

export const Complete: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>Deploy your new project in one-click.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Create a new project with pre-configured settings and dependencies.</p>
      </CardContent>
      <CardFooter>
        <Button>Create</Button>
      </CardFooter>
    </Card>
  ),
};

export const Simple: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardContent className="pt-6">
        <p>A simple card with only content.</p>
      </CardContent>
    </Card>
  ),
};

export const HeaderOnly: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>You have 3 unread messages.</CardDescription>
      </CardHeader>
    </Card>
  ),
};

export const CustomFooter: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Manage your account settings.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Update your account preferences and privacy settings.</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Save</Button>
      </CardFooter>
    </Card>
  ),
};

export const ComplexContent: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
        <CardDescription>Manage your team members and their roles.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">John Doe</h4>
              <p className="text-sm text-muted-foreground">Admin</p>
            </div>
            <Button variant="outline" size="sm">Edit</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Jane Smith</h4>
              <p className="text-sm text-muted-foreground">Member</p>
            </div>
            <Button variant="outline" size="sm">Edit</Button>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Add Member</Button>
      </CardFooter>
    </Card>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <Card className="w-[250px]">
        <CardHeader>
          <CardTitle>Small</CardTitle>
        </CardHeader>
        <CardContent>
          <p>A small card.</p>
        </CardContent>
      </Card>
      
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Medium</CardTitle>
        </CardHeader>
        <CardContent>
          <p>A medium-sized card.</p>
        </CardContent>
      </Card>
      
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle>Large</CardTitle>
        </CardHeader>
        <CardContent>
          <p>A large card with more space for content.</p>
        </CardContent>
      </Card>
    </div>
  ),
};