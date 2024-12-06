'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import { useRouter } from 'next/navigation'
import ConfirmationModal from '@/components/ConfirmationModal'

interface UserData {
  id: number
  email: string
  nome: string
  cognome: string
  citta: string
  cap: string
  dataNascita: string
  telefono: string
  profilePicture?: string
  emailVerified: boolean
}

interface MovieHistory {
  id: string
  title: string
  watchDate: string
  cinema: string
}

export default function AccountPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<UserData | null>(null)
  const [movieHistory, setMovieHistory] = useState<MovieHistory[]>([])
  const [error, setError] = useState('')
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profilePreview, setProfilePreview] = useState<string | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const userId = localStorage.getItem('userId')
      console.log('Account page - UserId:', userId)
      
      if (!userId) {
        console.log('No userId found, redirecting to home')
        router.push('/')
        return
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch user data')
        }
        const data = await response.json()
        setUserData(data)
        setEditedData(data)
      } catch (error: any) {
        console.error('Error fetching user data:', error)
        if (error?.message !== 'Failed to fetch user data') {
          localStorage.removeItem('userId')
          router.push('/')
        }
      }
    }

    checkAuth()
  }, [router])

  const fetchUserData = async (userId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`)
      if (!response.ok) throw new Error('Failed to fetch user data')
      const data = await response.json()
      setUserData(data)
      setEditedData(data)
    } catch (error) {
      console.error('Error fetching user data:', error)
      setError('Failed to load user data')
    }
  }

  const fetchMovieHistory = async (userId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}/movie-history`)
      if (!response.ok) throw new Error('Failed to fetch movie history')
      const data = await response.json()
      setMovieHistory(data)
    } catch (error) {
      console.error('Error fetching movie history:', error)
    }
  }

  const handleSave = async () => {
    if (!editedData || !userData) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedData)
      })

      if (!response.ok) throw new Error('Failed to update user data')
      
      setUserData(editedData)
      setIsEditing(false)
      setError('')
    } catch (error) {
      console.error('Error updating user data:', error)
      setError('Failed to update user data')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfileImage(file)
      setProfilePreview(URL.createObjectURL(file))
      
      const formData = new FormData()
      formData.append('profile_picture', file)

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userData?.id}/profile-picture`, {
          method: 'POST',
          body: formData,
        })
        
        if (!response.ok) throw new Error('Failed to upload profile picture')
        const data = await response.json()
        setUserData({ ...userData!, profilePicture: data.profile_picture })
      } catch (error) {
        console.error('Error uploading profile picture:', error)
        setError('Failed to upload profile picture')
      }
    }
  }

  const handleResendVerification = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userData?.id}/resend-verification`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to resend verification email')
      alert('Verification email sent! Please check your inbox.')
    } catch (error) {
      console.error('Error sending verification email:', error)
      setError('Failed to send verification email')
    }
  }

  const handleResetPassword = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userData?.email })
      })
      if (!response.ok) throw new Error('Failed to send password reset email')
      alert('Password reset email sent! Please check your inbox.')
    } catch (error) {
      console.error('Error sending password reset:', error)
      setError('Failed to send password reset email')
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteAccount = async () => {
    setIsDeleteModalOpen(false)

    try {
      const userId = localStorage.getItem('userId')
      if (!userId) {
        throw new Error('No user ID found')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to delete account')
      }

      localStorage.removeItem('userId')
      router.push('/')
    } catch (error) {
      console.error('Error deleting account:', error)
      setError('Failed to delete account')
    }
  }

  if (!userData) return null

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-4xl font-raleway tracking-tight text-gray-900 mb-4 sm:mb-8 text-center sm:text-left">
            Il mio account
          </h1>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 text-sm sm:text-base">
              {error}
            </div>
          )}

          <div className="bg-white shadow rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-8">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-raleway text-gray-900">
                Informazioni personali
              </h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-emerald-600 hover:text-emerald-700 text-sm sm:text-base"
              >
                {isEditing ? 'Annulla' : 'Modifica'}
              </button>
            </div>

            {isEditing ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm text-emerald-600">Nome</label>
                    <input
                      type="text"
                      value={editedData?.nome}
                      onChange={(e) => setEditedData({...editedData!, nome: e.target.value})}
                      className="w-full p-2 sm:p-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-emerald-600 focus:ring-0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm text-emerald-600">Cognome</label>
                    <input
                      type="text"
                      value={editedData?.cognome}
                      onChange={(e) => setEditedData({...editedData!, cognome: e.target.value})}
                      className="w-full p-2 sm:p-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-emerald-600 focus:ring-0"
                    />
                  </div>
                </div>

                <div className="flex space-x-2">
                  <div className="flex-1">
                    <label className="block text-xs sm:text-sm text-emerald-600">Città</label>
                    <input
                      type="text"
                      value={editedData?.citta}
                      onChange={(e) => setEditedData({...editedData!, citta: e.target.value})}
                      className="w-full p-2 sm:p-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-emerald-600 focus:ring-0"
                    />
                  </div>
                  <div className="w-1/3">
                    <label className="block text-xs sm:text-sm text-emerald-600">CAP</label>
                    <input
                      type="text"
                      value={editedData?.cap}
                      onChange={(e) => setEditedData({...editedData!, cap: e.target.value})}
                      className="w-full p-2 sm:p-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-emerald-600 focus:ring-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm text-emerald-600">Telefono</label>
                  <input
                    type="tel"
                    value={editedData?.telefono}
                    onChange={(e) => setEditedData({...editedData!, telefono: e.target.value})}
                    className="w-full p-2 sm:p-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-emerald-600 focus:ring-0"
                  />
                </div>

                <button
                  onClick={handleSave}
                  className="w-full bg-emerald-600 text-white p-2.5 sm:p-3 rounded-lg sm:rounded-xl text-sm sm:text-base
                           hover:bg-emerald-700 transition-colors duration-200"
                >
                  Salva modifiche
                </button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm text-gray-500">Nome</label>
                    <p className="text-base sm:text-lg">{userData.nome}</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm text-gray-500">Cognome</label>
                    <p className="text-base sm:text-lg">{userData.cognome}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm text-gray-500">Email</label>
                  <p className="text-base sm:text-lg">{userData.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm text-gray-500">Città</label>
                    <p className="text-base sm:text-lg">{userData.citta}</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm text-gray-500">CAP</label>
                    <p className="text-base sm:text-lg">{userData.cap}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm text-gray-500">Telefono</label>
                  <p className="text-base sm:text-lg">{userData.telefono}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white shadow rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-raleway text-gray-900 mb-4 sm:mb-6">
              Storico film
            </h2>
            
            {movieHistory.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {movieHistory.map((movie) => (
                  <div
                    key={`${movie.id}-${movie.watchDate}`}
                    className="flex items-center justify-between p-3 sm:p-4 border-2 border-gray-100 rounded-lg sm:rounded-xl"
                  >
                    <div>
                      <h3 className="font-medium text-sm sm:text-base">{movie.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-500">{movie.cinema}</p>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500">{movie.watchDate}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">
                Non hai ancora visto nessun film
              </p>
            )}
          </div>

          <div className="bg-white shadow rounded-xl sm:rounded-2xl p-4 sm:p-6 mt-4 sm:mt-8">
            <h2 className="text-xl sm:text-2xl font-raleway text-gray-900 mb-4 sm:mb-6">
              Account Management
            </h2>
            <div className="space-y-3 sm:space-y-4">
              <button
                onClick={handleResetPassword}
                className="w-full text-left px-3 sm:px-4 py-2 text-sm sm:text-base text-emerald-600 hover:text-emerald-700 hover:bg-gray-50 rounded-lg"
              >
                Reset Password
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full text-left px-3 sm:px-4 py-2 text-sm sm:text-base text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </main>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteAccount}
        message="Are you sure you want to delete your account? This action cannot be undone."
      />
    </div>
  )
}