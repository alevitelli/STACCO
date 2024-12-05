'use client'

import { useState, useEffect, useRef } from 'react'

interface Showtime {
  date: string
  time: string
  cinema: string
  booking_link: string
}

interface Seat {
  id: string
  row: string
  number: string
  isAvailable: boolean
  isNearScreen?: boolean
}

interface SeatSelectorProps {
  selectedShowtime: Showtime
  movieTitle: string
  cinema: string
  posterUrl: string
  onSeatSelect: (seats: string[]) => void
}

// Define the theater layout
const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'L']
const SEATS_PER_ROW = 12
const NEAR_SCREEN_ROWS = ['A', 'B', 'C']

// Simulate some taken seats
const TAKEN_SEATS = [
  'A1', 'A2', 'B1', 'B2', 'C1', 'C2',
  'F10', 'F11', 'F12', 'G10', 'G11', 'G12',
  'L5', 'L6', 'L7', 'M5', 'M6', 'M7'
]

// Add price constant at the top with other constants
const PRICE_PER_SEAT = 8.50

export default function SeatSelector({ selectedShowtime, movieTitle, cinema, posterUrl, onSeatSelect }: SeatSelectorProps) {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const totalPrice = selectedSeats.length * PRICE_PER_SEAT
  const seatGridRef = useRef<HTMLDivElement>(null)

  const handleSeatClick = (seat: Seat) => {
    if (!seat.isAvailable) return

    setSelectedSeats(prev => {
      if (prev.includes(seat.id)) {
        return prev.filter(id => id !== seat.id)
      }
      return [...prev, seat.id]
    })
  }

  // Center the seat map on load
  useEffect(() => {
    if (seatGridRef.current) {
      seatGridRef.current.scrollLeft = (seatGridRef.current.scrollWidth - seatGridRef.current.clientWidth) / 2
    }
  }, [])

  return (
    <div id="seat-selector" className="max-w-7xl mx-auto px-4">
      {/* Movie and Showtime Info */}
      <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl border border-black/5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <h2 className="text-lg sm:text-2xl font-raleway font-medium text-center sm:text-left">{movieTitle}</h2>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-8 font-raleway text-xs sm:text-sm text-gray-500">
            <p>{cinema}</p>
            <p>Data: {selectedShowtime.date}</p>
            <p>Ora: {selectedShowtime.time}</p>
          </div>
        </div>
      </div>

      {/* Legend for Mobile */}
      <div className="mb-6 sm:hidden p-4 bg-white rounded-xl border border-black/5 shadow-sm">
        <h3 className="font-raleway text-xs font-medium mb-3">Legenda Posti</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-[#0D0C22]" />
            <span>Disponibile</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-blue-500" />
            <span>Selezionato</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-gray-400" />
            <span>Occupato</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Left Side - Seat Map */}
        <div className="flex-1">
          <div className="relative">
            {/* Screen */}
            <div className="w-full mb-8 sm:mb-12">
              <div className="h-2 sm:h-3 bg-[#0D0C22] rounded-full w-full" />
              <p className="text-center text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 font-raleway">SCHERMO | SALA 1</p>
            </div>

            {/* Seat Grid with Horizontal Scroll */}
            <div ref={seatGridRef} className="overflow-x-auto pb-4 -mx-4 px-4">
              <div className="grid gap-y-1.5 sm:gap-y-2 min-w-[600px]">
                {ROWS.map((row) => (
                  <div key={row} className="flex gap-1.5 sm:gap-2 justify-center items-center">
                    <span className="w-5 sm:w-6 text-right text-xs sm:text-sm text-gray-400 font-geist-mono">
                      {row}
                    </span>
                    <div className="flex gap-1.5 sm:gap-2">
                      {Array.from({ length: SEATS_PER_ROW }, (_, i) => {
                        const seatNumber = (i + 1).toString()
                        const seatId = `${row}${seatNumber}`
                        const isNearScreen = NEAR_SCREEN_ROWS.includes(row)
                        const isTaken = TAKEN_SEATS.includes(seatId)

                        return (
                          <button
                            key={seatId}
                            onClick={() => handleSeatClick({
                              id: seatId,
                              row,
                              number: seatNumber,
                              isAvailable: !isTaken,
                              isNearScreen
                            })}
                            disabled={isTaken}
                            className={`
                              w-7 sm:w-8 h-7 sm:h-8 rounded-md text-xs font-raleway
                              transition-all duration-200
                              ${selectedSeats.includes(seatId)
                                ? 'bg-blue-500 text-white transform scale-105'
                                : isTaken
                                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
                              ${isNearScreen ? 'hover:before:content-["Near_screen"] hover:before:absolute hover:before:-top-8 hover:before:text-xs hover:before:text-gray-400 relative' : ''}
                            `}
                          >
                            {seatId}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scroll Indicators */}
            <div className="absolute left-0 top-1/2 w-8 bg-gradient-to-r from-white to-transparent h-20 -translate-y-1/2 pointer-events-none" />
            <div className="absolute right-0 top-1/2 w-8 bg-gradient-to-l from-white to-transparent h-20 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Right Side - Legend and Recap for Desktop */}
        <div className="w-full sm:w-80 space-y-6 hidden sm:block">
          {/* Legend */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-black/5 shadow-sm">
            <h3 className="font-raleway text-base sm:text-lg font-medium mb-4">Legenda Posti</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[#0D0C22]" />
                <span className="font-raleway text-sm">Disponibile</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-blue-500" />
                <span className="font-raleway text-sm">Selezionato</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-gray-400" />
                <span className="font-raleway text-sm">Occupato</span>
              </div>
            </div>
          </div>

          {/* Recap Section */}
          {selectedSeats.length > 0 && (
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-black/5 shadow-sm">
              <h3 className="font-raleway text-base sm:text-lg font-medium mb-4">Riepilogo</h3>
              
              {/* Selected Seats */}
              <div className="flex justify-between items-center mb-4 font-raleway text-sm">
                <span className="text-gray-500">Posti selezionati:</span>
                <span>{selectedSeats.join(', ')}</span>
              </div>

              {/* Price per Seat */}
              <div className="flex justify-between items-center mb-2 font-raleway text-sm">
                <span className="text-gray-500">Prezzo per posto:</span>
                <span>€{PRICE_PER_SEAT.toFixed(2)}</span>
              </div>

              {/* Number of Seats */}
              <div className="flex justify-between items-center mb-4 font-raleway text-sm">
                <span className="text-gray-500">Numero posti:</span>
                <span>{selectedSeats.length}</span>
              </div>

              {/* Total with Border */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center font-raleway text-sm font-medium">
                  <span>Totale:</span>
                  <span>€{totalPrice.toFixed(2)}</span>
                </div>
              </div>

              {/* Proceed Button */}
              <button
                onClick={() => {
                  window.location.href = `/checkout?seats=${selectedSeats.join(',')}&showtime=${encodeURIComponent(JSON.stringify(selectedShowtime))}&movie=${encodeURIComponent(movieTitle)}&total=${totalPrice}&poster=${encodeURIComponent(posterUrl)}`
                }}
                className="w-full mt-4 py-3 px-4 bg-blue-500 hover:bg-gray-800 
                         text-white font-raleway text-sm rounded-xl
                         transition-colors duration-200
                         flex items-center justify-between"
              >
                <span>Procedi al pagamento</span>
                <div className="flex items-center gap-2">
                  <span>€{totalPrice.toFixed(2)}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile-only floating button */}
      {selectedSeats.length > 0 && (
        <div className="fixed sm:hidden bottom-4 left-4 right-4">
          <button
            onClick={() => {
              window.location.href = `/checkout?seats=${selectedSeats.join(',')}&showtime=${encodeURIComponent(JSON.stringify(selectedShowtime))}&movie=${encodeURIComponent(movieTitle)}&total=${totalPrice}&poster=${encodeURIComponent(posterUrl)}`
            }}
            className="w-full py-3 px-4 bg-blue-500 text-white font-raleway text-sm rounded-xl
                     shadow-lg transition-colors duration-200 hover:bg-gray-800
                     flex items-center justify-between"
          >
            <span>Continua con {selectedSeats.length} {selectedSeats.length === 1 ? 'posto' : 'posti'} selezionati</span>
            <span>€{totalPrice.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  )
}