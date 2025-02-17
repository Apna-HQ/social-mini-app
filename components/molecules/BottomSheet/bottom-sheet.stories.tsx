import type { Meta, StoryObj } from '@storybook/react';
import { BottomSheet, SelectOption } from '../../ui/bottom-sheet';
import { Button } from '../../ui/button';
import { useState } from 'react';

const meta = {
  title: 'Molecules/BottomSheet',
  component: BottomSheet,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof BottomSheet>;

export default meta;
type Story = StoryObj<typeof BottomSheet>;

export const Basic: Story = {
  render: function Render() {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="h-[400px] relative">
        <Button onClick={() => setIsOpen(true)}>Open Sheet</Button>
        <BottomSheet
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        >
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Bottom Sheet Title</h3>
            <p>This is a basic bottom sheet with some content.</p>
          </div>
        </BottomSheet>
      </div>
    );
  },
};

export const WithSelectOptions: Story = {
  render: function Render() {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState('');

    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ];

    return (
      <div className="h-[400px] relative">
        <div className="space-y-4">
          <Button onClick={() => setIsOpen(true)}>Select Option</Button>
          {selected && (
            <p>Selected: {options.find(opt => opt.value === selected)?.label}</p>
          )}
        </div>
        <BottomSheet
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        >
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Select an Option</h3>
            <div className="space-y-2">
              {options.map((option) => (
                <SelectOption
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  onClick={() => {
                    setSelected(option.value);
                    setIsOpen(false);
                  }}
                />
              ))}
            </div>
          </div>
        </BottomSheet>
      </div>
    );
  },
};

export const WithForm: Story = {
  render: function Render() {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="h-[400px] relative">
        <Button onClick={() => setIsOpen(true)}>Open Form</Button>
        <BottomSheet
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        >
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Form</h3>
            <form className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Name
                </label>
                <input
                  id="name"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Enter your name"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Enter your email"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => setIsOpen(false)}>
                  Submit
                </Button>
              </div>
            </form>
          </div>
        </BottomSheet>
      </div>
    );
  },
};

export const CustomContent: Story = {
  render: function Render() {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="h-[400px] relative">
        <Button onClick={() => setIsOpen(true)}>Share</Button>
        <BottomSheet
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        >
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Share</h3>
            <div className="grid grid-cols-4 gap-4">
              {['Twitter', 'Facebook', 'LinkedIn', 'Email'].map((platform) => (
                <button
                  key={platform}
                  className="flex flex-col items-center space-y-2"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                    {platform[0]}
                  </div>
                  <span className="text-sm">{platform}</span>
                </button>
              ))}
            </div>
          </div>
        </BottomSheet>
      </div>
    );
  },
};