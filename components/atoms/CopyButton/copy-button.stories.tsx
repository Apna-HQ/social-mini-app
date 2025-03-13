import type { Meta, StoryObj } from '@storybook/react'
import { CopyButton } from '.'

const meta: Meta<typeof CopyButton> = {
  title: 'Atoms/CopyButton',
  component: CopyButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'The text value to copy to clipboard',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'icon'],
      description: 'The size of the button',
    },
    variant: {
      control: 'select',
      options: ['default', 'ghost', 'outline'],
      description: 'The visual style of the button',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply',
    },
  },
}

export default meta
type Story = StoryObj<typeof CopyButton>

export const Default: Story = {
  args: {
    value: 'Text to copy',
    size: 'icon',
    variant: 'ghost',
  },
}

export const WithText: Story = {
  args: {
    value: 'Text to copy',
    size: 'default',
    variant: 'outline',
    className: 'flex items-center gap-2',
  },
  render: (args) => (
    <div className="flex items-center gap-2">
      <span>npub1abcdef123456789</span>
      <CopyButton {...args} />
    </div>
  ),
}

export const InlineWithNpub: Story = {
  args: {
    value: 'npub1w46mjnagz9f0u556fzva8ypfftc5yfm32n8ygqmd2r32mxw4cfnsvkvy9e',
    size: 'icon',
    variant: 'ghost',
    className: 'h-4 w-4 ml-1',
  },
  render: (args) => (
    <div className="flex items-center text-sm text-muted-foreground">
      <span>npub1w46m...svkvy9e</span>
      <CopyButton {...args} />
    </div>
  ),
}