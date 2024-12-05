'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import Navigation from '@/components/Navigation'

// Mock user data (in a real app, this would come from your auth system)
const MOCK_USER = {
  name: 'Marco Rossi',
  email: 'marco.rossi@example.com',
  address: 'Via Roma 123',
  city: 'Milano',
  postalCode: '20121',
  country: 'Italy',
}

const PAYMENT_METHODS = [
  {
    id: 'apple-pay',
    name: '',
    icon: '/icons/apple-pay.svg',
  },
  {
    id: 'google-pay',
    name: '',
    icon: '/icons/google-pay.svg',
  },
  {
    id: 'paypal',
    name: '',
    icon: '/icons/paypal.svg',
  },
  {
    id: 'credit-card',
    name: 'Credit Card',
    icon: '/icons/credit-card.svg',
  },
]

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('credit-card')

  // Get data from URL parameters
  const seats = searchParams.get('seats')?.split(',') || []
  const showtime = searchParams.get('showtime') ? JSON.parse(decodeURIComponent(searchParams.get('showtime')!)) : null
  const movie = searchParams.get('movie') ? decodeURIComponent(searchParams.get('movie')!) : ''
  const total = searchParams.get('total') ? parseFloat(searchParams.get('total')!) : 0

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-16">
        <h1 className="font-raleway text-2xl sm:text-4xl font-medium tracking-tight text-gray-900 mb-6 sm:mb-8">
          Checkout
        </h1>

        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
          {/* Left column - User info and payment */}
          <div className="flex-1 space-y-4 sm:space-y-6">
            {/* User Information */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-black/5 shadow-sm">
              <h2 className="font-raleway text-xl sm:text-2xl font-medium mb-3 sm:mb-4">I tuoi Dati</h2>
              <div className="space-y-2 sm:space-y-3 font-raleway text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Nome:</span>
                  <span>{MOCK_USER.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email:</span>
                  <span>{MOCK_USER.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Indirizzo:</span>
                  <span>{MOCK_USER.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Città:</span>
                  <span>{MOCK_USER.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">CAP:</span>
                  <span>{MOCK_USER.postalCode}</span>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-black/5 shadow-sm">
              <h2 className="font-raleway text-xl sm:text-2xl font-medium mb-3 sm:mb-4">Metodo di Pagamento</h2>
              <div className="space-y-2 sm:space-y-3">
                {PAYMENT_METHODS.map((method) => (
                  <div
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border cursor-pointer transition-all
                      ${selectedPaymentMethod === method.id 
                        ? 'border-[#0D0C22] bg-gray-50' 
                        : 'border-black/5 hover:border-black/10'}`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <img src={method.icon} alt={method.name} className="h-6 sm:h-8 w-auto" />
                      <span className="font-raleway text-sm sm:text-base">{method.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column - Order summary */}
          <div className="w-full sm:w-80">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-black/5 shadow-sm sm:sticky sm:top-8">
              <h2 className="font-raleway text-xl sm:text-2xl font-medium mb-3 sm:mb-4">Riepilogo Ordine</h2>
              
              {/* Movie Poster and Details in a row on mobile */}
              <div className="flex sm:block gap-4 mb-4">
                {/* Movie Poster */}
                {searchParams.get('poster') && (
                  <div className="w-24 sm:w-40 sm:mx-auto shrink-0">
                    <img 
                      src={decodeURIComponent(searchParams.get('poster')!)} 
                      alt={movie}
                      className="w-full h-auto rounded-xl sm:rounded-2xl shadow-sm object-cover border border-black/5"
                    />
                  </div>
                )}
                
                {/* Movie Details */}
                <div className="flex-1 sm:mt-4">
                  <h3 className="font-raleway text-base sm:text-lg mb-1 sm:mb-2">{movie}</h3>
                  <div className="text-xs sm:text-sm font-raleway text-gray-500">
                    <p>{showtime?.date}</p>
                    <p>{showtime?.time}</p>
                    <p>{showtime?.cinema}</p>
                  </div>
                </div>
              </div>

              {/* Seats */}
              <div className="mb-4 sm:mb-6">
                <h3 className="font-raleway text-xs sm:text-sm text-gray-500 mb-2">Posti Selezionati</h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {seats.map((seat) => (
                    <span key={seat} className="px-2 py-1 bg-[#0D0C22] text-white rounded-lg text-xs sm:text-sm font-raleway">
                      {seat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-gray-200 pt-3 sm:pt-4 mt-3 sm:mt-4">
                <div className="flex justify-between font-raleway text-sm sm:text-base">
                  <span className="font-medium">Totale</span>
                  <span className="font-medium">€{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => {
                  // Handle payment processing here
                  alert('Payment processing would happen here!')
                }}
                className="w-full mt-4 sm:mt-6 py-2.5 sm:py-3 px-3 sm:px-4 bg-blue-500 hover:bg-gray-800 
                         text-white font-raleway text-xs sm:text-sm rounded-lg sm:rounded-xl
                         transition-colors duration-200
                         flex items-center justify-center gap-1.5 sm:gap-2"
              >
                Completa Acquisto
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 sm:h-4 w-3.5 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}