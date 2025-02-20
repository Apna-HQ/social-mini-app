"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './button'
import { userProfileDB } from '@/lib/userProfileDB'
import { nip19 } from 'nostr-tools'
import { useApna } from '@/components/providers/ApnaProvider'
import { UserProfileCard } from './user-profile-card'
import { IUserMetadata } from '@apna/sdk'

// List of suggested user npubs
const suggestedUserNpubs = [
  "npub1w46mjnagz9f0u556fzva8ypfftc5yfm32n8ygqmd2r32mxw4cfnsvkvy9e",
  "npub12rv5lskctqxxs2c8rf2zlzc7xx3qpvzs3w4etgemauy9thegr43sf485vg",
  "npub1gcxzte5zlkncx26j68ez60fzkvtkm9e0vrwdcvsjakxf9mu9qewqlfnj5z",
  "npub1xtscya34g58tk0z605fvr788k263gsu6cy9x0mhnm87echrgufzsevkk5s",
  "npub1qny3tkh0acurzla8x3zy4nhrjz5zd8l9sy9jys09umwng00manysew95gx"
]

export function Search() {
  const { nostr } = useApna()
  const [suggestedUsers, setSuggestedUsers] = useState<Array<{
    pubkey: string;
    npub: string;
    metadata?: IUserMetadata;
  }>>([])

  // Fetch user profiles on component mount
  useEffect(() => {
    const fetchProfiles = async () => {
      const users = await Promise.all(
        suggestedUserNpubs.map(async (npub) => {
          try {
            const decoded = nip19.decode(npub)
            if (decoded.type === 'npub') {
              // Try userProfileDB first
              const result = await userProfileDB.getProfile(decoded.data)
              if (result?.profile) {
                return {
                  pubkey: decoded.data,
                  npub,
                  metadata: result.profile.metadata
                }
              }
              // Fallback to apna.nostr.fetchUserMetadata
              const metadata = await nostr.fetchUserMetadata(npub)
              return {
                pubkey: decoded.data,
                npub,
                metadata
              }
            }
          } catch (e) {
            console.error('Error fetching profile:', e)
          }
          return { pubkey: npub, npub }
        })
      )
      setSuggestedUsers(users.filter(user => user !== undefined))
    }
    fetchProfiles()
  }, [nostr])

  const router = useRouter()
  const [searchInput, setSearchInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    try {
      setError('')
      let pubkey = searchInput

      // Check if input is npub and convert to hex pubkey
      if (searchInput.startsWith('npub')) {
        try {
          const decoded = nip19.decode(searchInput)
          if (decoded.type === 'npub') {
            pubkey = decoded.data
          }
        } catch (e) {
          setError('Invalid npub format')
          return
        }
      }

      // Validate hex pubkey format
      if (!/^[0-9a-f]{64}$/.test(pubkey)) {
        setError('Invalid public key format')
        return
      }

      router.push(`/user/${pubkey}`)
    } catch (error) {
      setError('Invalid input format')
    }
  }

  const startScanning = async () => {
    try {
      setScanning(true)
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      
      // Create video element
      const video = document.createElement('video')
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      
      // Create canvas
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play()
          resolve(null)
        }
      })

      // Set canvas size to video size
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Add video element to DOM temporarily
      video.style.position = 'fixed'
      video.style.top = '0'
      video.style.left = '0'
      video.style.width = '100%'
      video.style.height = '100%'
      video.style.objectFit = 'cover'
      video.style.zIndex = '1000'
      document.body.appendChild(video)

      // Add close button
      const closeButton = document.createElement('button')
      closeButton.innerText = '✕'
      closeButton.style.position = 'fixed'
      closeButton.style.top = '20px'
      closeButton.style.right = '20px'
      closeButton.style.zIndex = '1001'
      closeButton.style.background = 'white'
      closeButton.style.border = 'none'
      closeButton.style.borderRadius = '50%'
      closeButton.style.width = '40px'
      closeButton.style.height = '40px'
      closeButton.style.cursor = 'pointer'
      document.body.appendChild(closeButton)

      // Handle close
      const cleanup = () => {
        stream.getTracks().forEach(track => track.stop())
        video.remove()
        closeButton.remove()
        setScanning(false)
      }

      closeButton.onclick = cleanup

      // Start QR code detection
      const detectQR = async () => {
        if (!context) return
        
        try {
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          
          // Use the BarcodeDetector API if available
          if ('BarcodeDetector' in window) {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['qr_code']
            })
            
            const codes = await barcodeDetector.detect(imageData)
            if (codes.length > 0) {
              const qrData = codes[0].rawValue
              if (qrData.startsWith('npub') || /^[0-9a-f]{64}$/.test(qrData)) {
                cleanup()
                setSearchInput(qrData)
                handleSearch()
                return
              }
            }
          }
        } catch (error) {
          console.error('QR detection error:', error)
        }

        if (scanning) {
          requestAnimationFrame(detectQR)
        }
      }

      detectQR()

    } catch (error) {
      console.error('Camera access error:', error)
      setError('Could not access camera')
      setScanning(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Enter npub or public key"
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button onClick={handleSearch}>Search</Button>
      </div>
      
      <Button 
        onClick={startScanning}
        disabled={scanning}
        className="w-full"
      >
        {scanning ? 'Scanning...' : 'Scan QR Code'}
      </Button>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {suggestedUsers.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Suggested users to follow</h2>
          <div className="space-y-4">
            {suggestedUsers.map((user) => (
              <UserProfileCard
                key={user.npub}
                pubkey={user.pubkey}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}