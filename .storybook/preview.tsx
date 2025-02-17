import type { Preview } from "@storybook/react";
import React, { useEffect } from 'react';
import '../app/globals.css';

// Mock router functions
const mockRouter = {
  push: (path: string) => console.log('Navigation to:', path),
  back: () => console.log('Navigation: back'),
  forward: () => console.log('Navigation: forward'),
  refresh: () => console.log('Navigation: refresh'),
  replace: (path: string) => console.log('Replace navigation to:', path),
};

// Mock pathname
let currentPathname = '/';

// Mock next/navigation module
const mockNavigation = {
  useRouter: () => mockRouter,
  usePathname: () => currentPathname,
};

// Override next/navigation module
const NavigationDecorator = (Story: React.ComponentType, context: any) => {
  const pathname = context.parameters.nextjs?.pathname || '/';
  currentPathname = pathname;

  // Override next/navigation module
  useEffect(() => {
    // @ts-ignore
    window.next = {
      navigation: mockNavigation,
    };

    // Mock the modules
    // @ts-ignore
    window.__NEXT_DATA__ = { props: {} };
    // @ts-ignore
    window.__NEXT_ROUTER__ = mockRouter;
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Story />
    </div>
  );
};

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    nextjs: {
      appDirectory: true,
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#0f172a',
        },
      ],
    },
  },
  decorators: [NavigationDecorator],
};

export default preview;