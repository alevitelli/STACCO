'use client'

import { useState } from 'react'
import RegisterModal from './RegisterModal'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess?: (userData: any) => void
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [showRegister, setShowRegister] = useState(false)

  if (!isOpen) return null

  if (showRegister) {
    return (
      <RegisterModal 
        isOpen={true}
        onClose={() => {
          setShowRegister(false)
          onClose()
        }}
        onRegisterSuccess={onLoginSuccess}
      />
    )
  }

  const handleClose = () => {
    setError('')
    setFormData({ email: '', password: '' })
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      const response = await fetch('http://localhost:8000/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Error during login')
      }

      localStorage.setItem('userId', data.user.id.toString())
      
      if (onLoginSuccess) {
        onLoginSuccess(data.user)
      }
      onClose()
    } catch (error) {
      console.error('Login error:', error)
      setError('Email o password non corretti')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 relative">
        <h2 className="text-3xl font-raleway text-center mb-8">
          Accedi
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-600 focus:ring-0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-600 focus:ring-0"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-emerald-600 text-white p-4 rounded-xl 
                     hover:bg-emerald-700 transition-colors duration-200"
          >
            Accedi
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {/* TODO: Implement password reset */}}
              className="text-sm text-emerald-600 hover:underline"
            >
              Password dimenticata?
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OPPURE</span>
            </div>
          </div>

          <p className="text-center text-sm text-gray-600">
            Non hai un account?{' '}
            <button 
              type="button"
              onClick={() => setShowRegister(true)}
              className="text-emerald-600 hover:underline"
            >
              Registrati
            </button>
          </p>
        </form>

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </div>
  )
}