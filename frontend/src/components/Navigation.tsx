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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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
    setIsMobileMenuOpen(false)
  }

  const handleAccountClick = () => {
    console.log('Account clicked')
    router.push('/account')
    setIsMobileMenuOpen(false)
  }

  return (
    <nav className="bg-white shadow-sm relative">
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

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
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

          {/* Mobile Hamburger Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 hover:text-emerald-600 transition-colors"
            >
              {!isMobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white shadow-lg z-50">
          <div className="px-4 pt-2 pb-3 space-y-2">
            <Link 
              href="/movies" 
              className="block text-gray-700 hover:text-emerald-600 transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Film
            </Link>
            <Link 
              href="/cinemas" 
              className="block text-gray-700 hover:text-emerald-600 transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Cinema
            </Link>
            {user ? (
              <>
                <button 
                  onClick={handleAccountClick}
                  className="block w-full text-left text-gray-700 hover:text-emerald-600 transition-colors py-2"
                >
                  {user.nome} {user.cognome}
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left text-gray-700 hover:text-emerald-600 transition-colors py-2"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    setIsLoginOpen(true)
                  }}
                  className="block w-full text-left text-gray-700 hover:text-emerald-600 transition-colors py-2"
                >
                  Accedi
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    setIsRegisterOpen(true)
                  }}
                  className="block w-full text-left bg-emerald-600 text-white px-4 py-2 rounded-lg 
                           hover:bg-emerald-700 transition-colors"
                >
                  Registrati
                </button>
              </>
            )}
          </div>
        </div>
      )}

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