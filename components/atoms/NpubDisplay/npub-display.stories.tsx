import type { Meta, StoryObj } from '@storybook/react'
import { NpubDisplay } from '.'

const meta: Meta<typeof NpubDisplay> = {
  title: 'Atoms/NpubDisplay',
  component: NpubDisplay,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    pubkey: {
      control: 'text',
      description: 'The hex pubkey to display as npub',
    },
    startChars: {
      control: { type: 'number', min: 4, max: 20 },
      description: 'Number of characters to show at the start',
    },
    endChars: {
      control: { type: 'number', min: 4, max: 20 },
      description: 'Number of characters to show at the end',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes for the container',
    },
    copyButtonClassName: {
      control: 'text',
      description: 'Additional CSS classes for the copy button',
    },
  },
}

export default meta
type Story = StoryObj<typeof NpubDisplay>

export const Default: Story = {
  args: {
    pubkey: '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d',
    startChars: 8,
    endChars: 8,
  },
}

export const WithNpubInput: Story = {
  args: {
    pubkey: 'npub1w46mjnagz9f0u556fzva8ypfftc5yfm32n8ygqmd2r32mxw4cfnsvkvy9e',
    startChars: 8,
    endChars: 8,
  },
}

export const MoreCharacters: Story = {
  args: {
    pubkey: '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d',
    startChars: 12,
    endChars: 12,
  },
}

export const CustomStyling: Story = {
  args: {
    pubkey: '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d',
    className: 'text-base font-mono bg-gray-100 p-2 rounded',
    copyButtonClassName: 'ml-2 bg-primary/10 rounded-full p-1',
  },
}