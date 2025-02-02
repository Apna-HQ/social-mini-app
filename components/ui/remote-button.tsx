'use client';

import { useEffect, useState } from 'react';
import { loadRemote, registerRemotes } from '@/utils/federation';

interface RemoteButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

interface RemoteModule {
  default: React.ComponentType<RemoteButtonProps>;
}

const REMOTE_OPTIONS = [
  {
    name: 'apna_module_test',
    entry: 'https://cdn.jsdelivr.net/npm/@nandubatchu/apna-module-test@1.0.6/dist/mf-manifest.json'
  },
  {
    name: 'test_provider',
    entry: 'http://localhost:3004/remoteEntry.js'
  }
];

const DEFAULT_REMOTE = REMOTE_OPTIONS[0];

export default function RemoteButton({ children, ...props }: RemoteButtonProps) {
  const [Button, setButton] = useState<React.ComponentType<RemoteButtonProps> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRemote, setSelectedRemote] = useState(DEFAULT_REMOTE);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  async function loadButton() {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    setButton(null);
    setLogs([]);
    
    try {
      addLog('Updating remote configuration...');
      registerRemotes([
        {
          name: selectedRemote.name,
          entry: selectedRemote.entry,
        },
      ], { force: true });
      
      addLog('Loading remote component...');
      const remoteModule = await loadRemote(`${selectedRemote.name}/Button`) as RemoteModule;
      
      if (!remoteModule?.default) {
        throw new Error('Remote module does not contain a default export');
      }
      
      setButton(() => remoteModule.default);
      addLog('Component loaded successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load remote button';
      setError(errorMessage);
      addLog(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Select Remote:</label>
          <select
            value={selectedRemote.name}
            onChange={(e) => {
              const selected = REMOTE_OPTIONS.find(opt => opt.name === e.target.value);
              if (selected) setSelectedRemote(selected);
            }}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          >
            {REMOTE_OPTIONS.map((option) => (
              <option key={option.name} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={loadButton}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Load Remote Button'}
        </button>
      </div>

      {/* Logs Panel */}
      <div className="mt-4 p-2 bg-gray-50 rounded-md">
        <h4 className="text-sm font-medium mb-2">Loading Logs:</h4>
        <div className="text-xs font-mono space-y-1 max-h-32 overflow-y-auto">
          {logs.map((log: string, index: number) => (
            <div key={index} className={`${log.includes('Error') ? 'text-red-600' : 'text-gray-600'}`}>
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Button Display */}
      <div className="pt-3">
        {Button ? (
          <Button {...props} className="w-full px-4 py-2 bg-green-500 text-white rounded-md">
            {children}
          </Button>
        ) : (
          <button disabled className="w-full px-4 py-2 bg-gray-100 text-gray-400 rounded-md">
            {isLoading ? 'Loading Button...' : 'Button not loaded'}
          </button>
        )}
      </div>
    </div>
  );
}