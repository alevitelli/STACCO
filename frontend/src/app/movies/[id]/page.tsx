'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import DatePicker from '@/components/DatePicker'
import CinemaMap from '@/components/ClientOnlyMap'
import SeatSelector from '@/components/SeatSelector'

interface Showtime {
  date: string
  time: string
  cinema: string
  booking_link: string
}

interface Movie {
  id: string
  title: string
  genre: string
  duration: number
  language: string
  poster_url: string
  cinemas: string
  showtimes: Showtime[]
}

const formatDate = (date: string | null) => {
  if (!date) return '';
  
  // Convert YYYY-MM-DD to DD-MM-YYYY
  if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = date.split('-')
    return `${day}-${month}-${year}`
  }
  return date
}

// Update the interface for params
interface MoviePageProps {
  params: {
    id: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function MoviePage({ params }: MoviePageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [movieId, setMovieId] = useState<string | null>(null)
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null)
  
  // Get filters from URL and provide default value if not present
  const selectedDate = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const selectedCinema = searchParams.get('cinema')
  const selectedLanguage = searchParams.get('language')
  const selectedTime = searchParams.get('time')

  const [movieData, setMovieData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleDateChange = (newDate: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('date', newDate)
    router.push(`/movies/${movieId}?${params.toString()}`)
  }

  // Update the useEffect to use params.id directly
  useEffect(() => {
    setMovieId(params.id)
  }, [params.id])

  useEffect(() => {
    if (!movieId) return

    setLoading(true)
    setError(null)
    
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/movies/${movieId}`)
      .then(res => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Movie not found')
          }
          throw new Error('Failed to fetch movie')
        }
        return res.json()
      })
      .then(data => {
        if (!data) throw new Error('No data received')
        
        // Filter showtimes based on all criteria
        const filteredShowtimes = data.showtimes?.filter((showtime: any) => {
          // Format the selected date to match the API date format
          const formattedSelectedDate = formatDate(selectedDate);
          
          // Check if cinema matches (if a cinema is selected)
          const matchesCinema = !selectedCinema || 
            showtime.cinema.toLowerCase().replace(/\s+/g, '+') === 
            decodeURIComponent(selectedCinema).toLowerCase().replace(/\s+/g, '+');
          
          // Check if date matches
          const matchesDate = showtime.date === formattedSelectedDate;
          
          console.log('Filtering showtime:', {
            showtime,
            selectedDate: formattedSelectedDate,
            selectedCinema: selectedCinema ? decodeURIComponent(selectedCinema) : 'none',
            matchesDate,
            matchesCinema,
          });
          
          return matchesDate && matchesCinema;
        }) || [];
        
        setMovieData({ ...data, showtimes: filteredShowtimes })
        setLoading(false)
      })
      .catch(error => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        console.warn('Error fetching movie:', errorMessage)
        setError(errorMessage)
        setLoading(false)
      })
  }, [movieId, selectedDate, selectedCinema])

  const handleShowtimeClick = (showtime: Showtime) => {
    setSelectedShowtime(showtime);
    // Add a small delay to ensure the seat selector is rendered
    setTimeout(() => {
      document.getElementById('seat-selector')?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
      });
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-gray-500">Loading movie details...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !movieData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-red-500">{error || 'Movie not found'}</p>
            <button 
              onClick={() => router.push('/movies')}
              className="mt-4 text-indigo-600 hover:text-indigo-500"
            >
              Back to movies
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Group showtimes by cinema
  const showtimesByCinema = movieData.showtimes.reduce((acc, showtime) => {
    if (!acc[showtime.cinema]) {
      acc[showtime.cinema] = []
    }
    acc[showtime.cinema].push(showtime)
    return acc
  }, {} as Record<string, typeof movieData.showtimes>)

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
            {/* Movie poster */}
            <div className="md:w-1/3">
              <img 
                src={movieData.poster_url} 
                alt={movieData.title}
                className="w-full rounded-xl sm:rounded-2xl shadow-sm border border-black/5"
              />
            </div>
            
            {/* Movie details */}
            <div className="md:w-2/3">
              <h1 className="font-raleway text-3xl sm:text-4xl font-medium tracking-tight text-gray-900 mb-3 sm:mb-4">
                {movieData.title}
              </h1>
              
              <div className="space-y-3 sm:space-y-4">
                {/* Movie metadata */}
                <div className="flex items-center space-x-1.5 sm:space-x-2 font-raleway text-xs sm:text-sm text-gray-500">
                  <span>{movieData.duration} min</span>
                  <span>•</span>
                  <span>{movieData.genre}</span>
                  <span>•</span>
                  <span>{movieData.language}</span>
                </div>
              </div>

              {/* Showtimes section */}
              <div className="mt-6 sm:mt-8">
                <h2 className="font-raleway text-xl sm:text-2xl font-medium mb-3 sm:mb-4">Orari Spettacoli</h2>
                <DatePicker 
                  onDateChange={handleDateChange}
                  initialDate={selectedDate}
                />
                
                <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
                  {Object.entries(showtimesByCinema).map(([cinema, showtimes]) => (
                    <div key={cinema} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-black/5 shadow-sm">
                      <h3 className="font-raleway font-medium mb-2 sm:mb-3">{cinema}</h3>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {showtimes.map((showtime, idx) => (
                          <button 
                            key={idx}
                            onClick={() => handleShowtimeClick(showtime)}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-raleway rounded-lg sm:rounded-xl
                                     bg-[#0D0C22] text-white
                                     hover:bg-gray-800 cursor-pointer
                                     transition-colors duration-200"
                          >
                            {showtime.time}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {Object.keys(showtimesByCinema).length === 0 && (
                    <div className="text-center py-6 sm:py-8">
                      <p className="font-raleway text-gray-500">
                        Nessuno spettacolo disponibile per questa data
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {selectedShowtime && (
        <div id="seat-selector" className="mt-12 sm:mt-16 border-t border-gray-800 pt-6 sm:pt-8">
          <SeatSelector 
            selectedShowtime={selectedShowtime}
            movieTitle={movieData.title}
            cinema={selectedShowtime.cinema}
            posterUrl={movieData.poster_url}
            onSeatSelect={(seats) => {
              // Handle seat selection
            }}
          />
        </div>
      )}
    </div>
  )
}