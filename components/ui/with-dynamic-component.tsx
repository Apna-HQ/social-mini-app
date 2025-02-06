"use client"

import { useState, useEffect } from "react"
import { BottomSheet, SelectOption } from "./bottom-sheet"
import { loadRemote, registerRemotes } from '@/utils/federation'
import { useApna } from "@/components/providers/ApnaProvider" 

interface RemoteButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

interface RemoteModule {
  default: React.ComponentType<RemoteButtonProps>
}

interface ValidRemote {
  name: string;
  entry: string;
}

export const withDynamicComponent = (remoteModuleName: string, DefaultComponent: React.ComponentType<any>) => {
  function DynamicComponent(props: any) {
    const { isHighlighted } = useApna()
    console.log(isHighlighted)
    const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
    const [RemoteComponent, setRemoteComponent] = useState<React.ComponentType<RemoteButtonProps> | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [validRemotes, setValidRemotes] = useState<Map<string, ValidRemote>>(new Map())
    const [showSubmitForm, setShowSubmitForm] = useState(false)
    const [formData, setFormData] = useState({ remoteName: '', remoteEntry: '' })

    const validateRemote = async (remote: ValidRemote) => {
      try {
        console.log(remote)
        await registerRemotes([
          {
            name: remote.name,
            entry: remote.entry,
          },
        ], { force: true })
        
        // Try to load the module to validate it exists
        await loadRemote(`${remote.name}/${remoteModuleName}`)
        setValidRemotes(prev => new Map(prev).set(remote.name, remote))
      } catch (err) {
        console.log(`Remote ${remote.name} does not have module ${remoteModuleName}`)
      }
    }

    // Load stored selection on mount
    useEffect(() => {
      const storedSelections = localStorage.getItem('remoteComponentSelections')
      if (storedSelections) {
        const selections = JSON.parse(storedSelections)
        const storedRemoteData = selections[remoteModuleName]
        if (storedRemoteData) {
          setValidRemotes(prev => new Map(prev).set(storedRemoteData.name, storedRemoteData))
          loadComponent(storedRemoteData, false)
        }
      }
    }, [])

    const loadComponent = async (remote: ValidRemote, updateStorage: boolean = true) => {
      try {
        console.log('Updating remote configuration...')
        registerRemotes([
          {
            name: remote.name,
            entry: remote.entry,
          },
        ], { force: true })
        
        console.log('Loading remote component...')
        const remoteModule = await loadRemote(`${remote.name}/${remoteModuleName}`) as RemoteModule
        
        if (!remoteModule?.default) {
          throw new Error('Remote module does not contain a default export')
        }
        
        setRemoteComponent(() => remoteModule.default)
        console.log('Component loaded successfully')
        setIsBottomSheetOpen(false)

        // Store selection in localStorage
        if (updateStorage) {
          const storedSelections = localStorage.getItem('remoteComponentSelections')
          const selections = storedSelections ? JSON.parse(storedSelections) : {}
          selections[remoteModuleName] = {
            name: remote.name,
            entry: remote.entry
          }
          localStorage.setItem('remoteComponentSelections', JSON.stringify(selections))
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load remote component'
        setError(errorMessage)
        console.error(`Error: ${errorMessage}`)
      }
    }

    const handleBorderClick = (e: React.MouseEvent) => {
      // Get click coordinates relative to the target element
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const border = 4 // border width

      // Only trigger if click is on the border area
      if (
        x <= border || 
        x >= rect.width - border || 
        y <= border || 
        y >= rect.height - border
      ) {
        setIsBottomSheetOpen(true)
      }
    }

    const SelectedComponent = RemoteComponent || DefaultComponent

    return (

          <>
            <div 
              className={`${isHighlighted ? "border-4 border-[#368564] rounded-md" : ""}`}
              onClick={isHighlighted ? handleBorderClick : undefined}
            >
              <SelectedComponent {...props} />
            </div>

            <BottomSheet 
              isOpen={isBottomSheetOpen} 
              onClose={() => setIsBottomSheetOpen(false)}
            >
              <div className="space-y-2">
                <h3 className="font-medium px-4 mb-4">Select Remote Component</h3>
                {!showSubmitForm && (
                  <>
                    <SelectOption
                      key="default"
                      value="default"
                      label="Default"
                      onClick={() => {
                        setRemoteComponent(null);
                        setIsBottomSheetOpen(false);
                        // Clear from localStorage
                        const storedSelections = localStorage.getItem('remoteComponentSelections')
                        if (storedSelections) {
                          const selections = JSON.parse(storedSelections)
                          delete selections[remoteModuleName]
                          localStorage.setItem('remoteComponentSelections', JSON.stringify(selections))
                        }
                      }}
                    />
                    {Array.from(validRemotes.values()).map(remote => (
                      <SelectOption
                        key={remote.name}
                        value={remote.name}
                        label={remote.name}
                        onClick={() => loadComponent(remote)}
                      />
                    ))}
                    <div className="flex gap-2 px-4 mt-4">
                      <button
                        onClick={() => setShowSubmitForm(true)}
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                      >
                        Submit Remote
                      </button>
                      <button
                        onClick={() => console.log(`Create Remote clicked for ${remoteModuleName}`)}
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                      >
                        Create Remote
                      </button>
                    </div>
                  </>
                )}
                
                {showSubmitForm && (
                  <div className="px-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Remote Name</label>
                        <input
                          type="text"
                          value={formData.remoteName}
                          onChange={(e) => setFormData(prev => ({ ...prev, remoteName: e.target.value }))}
                          className="w-full p-2 border rounded-md"
                          placeholder="Enter remote name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Remote Entry</label>
                        <input
                          type="text"
                          value={formData.remoteEntry}
                          onChange={(e) => setFormData(prev => ({ ...prev, remoteEntry: e.target.value }))}
                          className="w-full p-2 border rounded-md"
                          placeholder="Enter remote entry URL"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const newRemote = {
                              name: formData.remoteName,
                              entry: formData.remoteEntry
                            };
                            validateRemote(newRemote);
                            setFormData({ remoteName: '', remoteEntry: '' });
                            setShowSubmitForm(false);
                          }}
                          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                          Submit
                        </button>
                        <button
                          onClick={() => {
                            setFormData({ remoteName: '', remoteEntry: '' });
                            setShowSubmitForm(false);
                          }}
                          className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </BottomSheet>
          </>

    )
  }

  return DynamicComponent
}