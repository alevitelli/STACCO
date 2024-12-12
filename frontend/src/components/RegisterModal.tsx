'use client'

import { useState, useEffect } from 'react'
import LoginModal from './LoginModal'

interface RegisterModalProps {
  isOpen: boolean
  onClose: () => void
  onRegisterSuccess: (userData: any) => void
}

export default function RegisterModal({ isOpen, onClose, onRegisterSuccess }: RegisterModalProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nome: '',
    cognome: '',
    citta: '',
    cap: '',
    dataNascita: '',
    telefono: ''
  })
  const [error, setError] = useState('')
  const [showLogin, setShowLogin] = useState(false)

  const checkEmailExists = async (email: string) => {
    try {
      console.log('Checking email:', email);
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/check_email`;
      console.log('Making request to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        if (response.status === 404) {
          throw new Error('API endpoint not found. Please check the URL.');
        }
        
        throw new Error(
          `Server error: ${response.status} ${errorText}`
        );
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      return data.exists;
    } catch (error) {
      console.error('Error in checkEmailExists:', error);
      throw error;
    }
  }

  const handleContinue = async () => {
    setError('');
    
    if (!formData.email || !formData.password) {
      setError('Per favore, compila tutti i campi obbligatori');
      return;
    }

    try {
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        setError('Email già registrata. Accedi al tuo account esistente.');
        return;
      }
      setStep(2);
    } catch (error) {
      console.error('Error in handleContinue:', error);
      setError('Si è verificato un errore. Riprova più tardi.');
    }
  }

  const handleSocialLogin = (provider: string) => {
    console.log(`Login with ${provider}`)
  }

  if (showLogin) {
    return <LoginModal isOpen={true} onClose={onClose} />
  }

  if (!isOpen) return null

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];
    if (password.length < minLength) errors.push(`Almeno ${minLength} caratteri`);
    if (!hasUpperCase) errors.push('Una lettera maiuscola');
    if (!hasLowerCase) errors.push('Una lettera minuscola');
    if (!hasNumbers) errors.push('Un numero');
    if (!hasSpecialChar) errors.push('Un carattere speciale');

    return errors;
  }

  const PasswordStrengthIndicator = ({ password }: { password: string }) => {
    const errors = validatePassword(password);
    const strength = Math.max(0, 5 - errors.length) * 20;

    return (
      <div className="mt-2">
        <div className="h-1 w-full bg-gray-200 rounded">
          <div 
            className={`h-1 rounded transition-all duration-300 ${
              strength > 80 ? 'bg-green-500' : 
              strength > 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${strength}%` }}
          />
        </div>
        <ul className="mt-2 text-xs text-gray-500 space-y-1">
          {errors.map((error, index) => (
            <li key={index}>• {error}</li>
          ))}
        </ul>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (step === 1) {
      await handleContinue()
    } else if (step === 2) {
      try {
        const registrationData = {
          email: formData.email,
          password: formData.password,
          nome: formData.nome,
          cognome: formData.cognome,
          citta: formData.citta,
          cap: formData.cap,
          data_nascita: formData.dataNascita,
          telefono: formData.telefono
        }

        console.log('Sending registration data:', registrationData)

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(registrationData)
        })

        console.log('Response status:', response.status)
        const data = await response.json()
        console.log('Response data:', data)

        if (!response.ok) {
          throw new Error(data.detail || 'Registration failed')
        }

        if (data.user && data.user.id) {
          localStorage.setItem('userId', data.user.id.toString())
        }

        setStep(3)
        
        if (onRegisterSuccess) {
          onRegisterSuccess(data.user)
          
          setTimeout(() => {
            window.location.href = '/account'
          }, 2000)
        }
      } catch (error: any) {
        console.error('Registration error:', error)
        setError(error.message || 'Errore durante la registrazione. Riprova.')
      }
    }
  }

  const handleRegistrationSuccess = async (userData: any) => {
    setStep(3)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userData.email })
      });

      setTimeout(() => {
        window.location.href = '/account'
      }, 2000)
    } catch (error) {
      console.error('Error sending verification email:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 relative">
        <h2 className="text-2xl font-raleway text-center mb-4">
          {step === 1 ? 'Crea un account' : step === 2 ? 'Informazioni personali' : 'Verifica Email'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-1">
                <label className="text-emerald-600 text-sm">
                  Indirizzo e-mail*
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-600 focus:ring-0"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-emerald-600 text-sm">
                  Password*
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-600 focus:ring-0"
                  required
                />
                <PasswordStrengthIndicator password={formData.password} />
              </div>

              {error && typeof error === 'string' && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-600 text-white p-3 rounded-xl 
                         hover:bg-emerald-700 transition-colors duration-200"
              >
                Continua
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OPPURE</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  className="w-full p-2 border border-gray-300 rounded-xl flex items-center justify-center space-x-2 hover:bg-gray-50"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5" />
                  <span>Continua con Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialLogin('microsoft')}
                  className="w-full p-2 border border-gray-300 rounded-xl flex items-center justify-center space-x-2 hover:bg-gray-50"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/512px-Microsoft_logo.svg.png?20210729021049" alt="Microsoft" className="w-5 h-5" />
                  <span>Continua con Microsoft</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialLogin('apple')}
                  className="w-full p-2 border border-gray-300 rounded-xl flex items-center justify-center space-x-2 hover:bg-gray-50"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple" className="w-5 h-5" />
                  <span>Continua con Apple</span>
                </button>
              </div>

              <p className="text-center text-sm text-gray-600 mt-2">
                Hai già un account?{' '}
                <button 
                  type="button"
                  onClick={() => setShowLogin(true)}
                  className="text-emerald-600 hover:underline"
                >
                  Accedi
                </button>
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-1">
                <label className="text-emerald-600 text-sm">
                  Nome*
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-600 focus:ring-0"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-emerald-600 text-sm">
                  Cognome*
                </label>
                <input
                  type="text"
                  value={formData.cognome}
                  onChange={(e) => setFormData({...formData, cognome: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-600 focus:ring-0"
                  required
                />
              </div>

              <div className="flex space-x-2">
                <div className="flex-1 space-y-1">
                  <label className="text-emerald-600 text-sm">
                    Città*
                  </label>
                  <input
                    type="text"
                    value={formData.citta}
                    onChange={(e) => setFormData({...formData, citta: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-600 focus:ring-0"
                    required
                  />
                </div>

                <div className="w-1/3 space-y-1">
                  <label className="text-emerald-600 text-sm">
                    CAP*
                  </label>
                  <input
                    type="text"
                    value={formData.cap}
                    onChange={(e) => setFormData({...formData, cap: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-600 focus:ring-0"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-emerald-600 text-sm">
                  Data di nascita*
                </label>
                <input
                  type="date"
                  value={formData.dataNascita}
                  onChange={(e) => setFormData({...formData, dataNascita: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-600 focus:ring-0"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-emerald-600 text-sm">
                  Telefono*
                </label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-600 focus:ring-0"
                  required
                />
              </div>

              {error && typeof error === 'string' && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-600 text-white p-3 rounded-xl 
                         hover:bg-emerald-700 transition-colors duration-200 
                         cursor-pointer active:bg-emerald-800 
                         disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={
                  !formData.nome || 
                  !formData.cognome || 
                  !formData.citta || 
                  !formData.cap || 
                  !formData.dataNascita || 
                  !formData.telefono
                }
              >
                Registrati
              </button>
            </>
          )}

          {step === 3 && (
            <div className="text-center">
              <div className="mb-6">
                <svg className="mx-auto h-12 w-12 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
              </div>
              <h3 className="text-xl mb-4">Registrazione completata!</h3>
              <p className="text-gray-600">
                Abbiamo inviato un link di verifica a<br/>
                <span className="font-medium">{formData.email}</span>
              </p>
              <p className="text-sm text-emerald-600 mt-4">
                Verrai reindirizzato al tuo account tra pochi secondi...
              </p>
            </div>
          )}
        </form>

        <button
          onClick={() => {
            setStep(1)
            setError('')
            onClose()
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </div>
  )
}