'use client'

import { useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import DatePicker from '@/components/DatePicker'
import CinemaMap from '@/components/ClientOnlyMap'

// Helper function to check if a time is after selected time
const isTimeAfter = (showtime: string, selectedTime: string) => {
  if (!selectedTime) return true
  const [showHour, showMinute] = showtime.split(':').map(Number)
  const [selectedHour, selectedMinute] = selectedTime.split(':').map(Number)
  
  if (showHour > selectedHour) return true
  if (showHour === selectedHour && showMinute >= selectedMinute) return true
  return false
}

export default function MoviePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const movieId = params.id as string

  // Get filters from URL
  const [selectedDate, setSelectedDate] = useState(
    searchParams.get('date') || new Date().toISOString().split('T')[0]
  )
  const selectedTime = searchParams.get('time') || ''
  const selectedCinema = searchParams.get('cinema') || ''

  // Filter cinema locations based on selected cinema
  const filteredCinemaLocations = selectedCinema 
    ? cinemaLocations.filter(cinema => 
        cinema.name.replace(/\s+/g, '+') === selectedCinema.replace(/\s+/g, '+')
      )
    : cinemaLocations

  // Sample movie data (make sure times are in 24h format)
  const movieData = {
    showtimes: [
      {
        date: new Date().toISOString().split('T')[0],
        time: "18:45",
        cinema: "Cinema Intrastevere",
        booking_link: "#"
      },
      {
        date: new Date().toISOString().split('T')[0],
        time: "21:30", // 9:30 PM
        cinema: "Cinema Intrastevere",
        booking_link: "#"
      }
    ]
  }

  // Filter showtimes based on all URL params
  const filteredShowtimes = movieData.showtimes.filter(showtime => {
    console.log('Filtering showtime:', {
      showtime,
      selectedTime,
      isAfter: isTimeAfter(showtime.time, selectedTime)
    }) // Debug log
    
    const matchesDate = showtime.date === selectedDate
    const matchesTime = !selectedTime || isTimeAfter(showtime.time, selectedTime)
    const matchesCinema = !selectedCinema || 
      showtime.cinema.replace(/\s+/g, '+') === selectedCinema.replace(/\s+/g, '+')
    
    return matchesDate && matchesTime && matchesCinema
  })

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold mb-4">Showtimes</h2>
      <DatePicker 
        onDateChange={handleDateChange}
        initialDate={selectedDate}
      />

      <div className="mt-6 space-y-6">
        {filteredShowtimes.length > 0 ? (
          filteredShowtimes.map((showtime, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-medium">{showtime.cinema}</h3>
              <a
                href={showtime.booking_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100"
              >
                {showtime.time}
              </a>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No showtimes found for the selected filters.{' '}
              <button 
                onClick={() => router.push(`/movies/${movieId}`)}
                className="text-indigo-600 hover:text-indigo-500"
              >
                Clear filters
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}