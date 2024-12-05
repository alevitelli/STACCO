'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import LoginModal from './LoginModal'
import RegisterModal from './RegisterModal'

export default function Navigation() {
  const router = useRouter()
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Check if user is logged in
    const userId = localStorage.getItem('userId')
    if (userId) {
      fetch(`http://localhost:8000/api/users/${userId}`)
        .then(res => res.json())
        .then(data => setUser(data))
        .catch(console.error)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('userId')
    setUser(null)
    router.push('/')
  }

  const handleAccountClick = () => {
    console.log('Account clicked')
    router.push('/account')
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold text-emerald-600">
              STACCO
            </Link>
            <div className="hidden md:flex space-x-8">
              <Link 
                href="/movies" 
                className="text-gray-700 hover:text-emerald-600 transition-colors"
              >
                Film
              </Link>
              <Link 
                href="/cinemas" 
                className="text-gray-700 hover:text-emerald-600 transition-colors"
              >
                Cinema
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <button 
                  onClick={handleAccountClick}
                  className="text-gray-700 hover:text-emerald-600 transition-colors"
                >
                  {user.nome} {user.cognome}
                </button>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-emerald-600 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="text-gray-700 hover:text-emerald-600 transition-colors"
                >
                  Accedi
                </button>
                <button
                  onClick={() => setIsRegisterOpen(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg 
                           hover:bg-emerald-700 transition-colors"
                >
                  Registrati
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={setUser}
      />
      <RegisterModal 
        isOpen={isRegisterOpen} 
        onClose={() => setIsRegisterOpen(false)}
        onRegisterSuccess={setUser}
      />
    </nav>
  )
}