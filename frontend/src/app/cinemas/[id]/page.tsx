'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import SearchFilters from '@/components/SearchFilters'
import DatePicker from '@/components/DatePicker'

interface Movie {
  id: string
  title: string
  genre: string
  duration: number
  language: string
  poster_url: string
  showtimes: Array<{
    date: string
    time: string
    booking_link: string
  }>
}

interface Cinema {
  id: string
  name: string
  cinema_chain: string
  icon_url: string
  website: string
  currentMovies: Movie[]
}

const formatDate = (date: string) => {
  // Convert YYYY-MM-DD to DD-MM-YYYY
  if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = date.split('-')
    return `${day}-${month}-${year}`
  }
  // Convert DD-MM-YYYY to YYYY-MM-DD
  if (date.match(/^\d{2}-\d{2}-\d{4}$/)) {
    const [day, month, year] = date.split('-')
    return `${year}-${month}-${day}`
  }
  return date
}

export default function CinemaDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [cinema, setCinema] = useState<Cinema | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState(searchParams.get('language') || '')
  const [selectedDate, setSelectedDate] = useState(
    searchParams.get('date') || new Date().toISOString().split('T')[0]
  )

  const handleFilterChange = (type: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    switch(type) {
      case 'language':
        setSelectedLanguage(value)
        if (value) {
          params.set('language', value)
        } else {
          params.delete('language')
        }
        break
      case 'date':
        setSelectedDate(value)
        params.set('date', value)
        break
    }
    
    router.push(`/cinemas/${cinema?.id}?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if (!params.id) return

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cinemas/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch cinema')
        return res.json()
      })
      .then(data => {
        setCinema(data)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching cinema:', error)
        setLoading(false)
      })
  }, [params.id])

  const filteredMovies = cinema?.currentMovies.filter(movie => {
    const matchesLanguage = !selectedLanguage || (
      selectedLanguage === 'Italiano' 
        ? movie.language.toLowerCase().startsWith('italiano')
        : selectedLanguage === 'Original' 
          ? !movie.language.toLowerCase().startsWith('italiano')
          : true
    )
    
    // Convert selected date to DD-MM-YYYY format for comparison
    const formattedSelectedDate = formatDate(selectedDate)
    
    // Check if movie has showtimes for selected date
    const hasShowtimesForDate = movie.showtimes.some(
      showtime => showtime.date === formattedSelectedDate
    )

    return matchesLanguage && hasShowtimesForDate
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-gray-500">Caricamento cinema in corso...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!cinema) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-gray-500">Cinema non trovato</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
          <div className="w-full md:w-1/3 aspect-video bg-gray-50 rounded-2xl p-8 flex items-center justify-center">
            <img
              src={cinema?.icon_url}
              alt={cinema?.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl sm:text-5xl font-raleway tracking-tight text-gray-900 mb-4">
              {cinema?.name}
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              {cinema?.cinema_chain}
            </p>
            <a
              href={cinema?.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 
                       border border-transparent text-base font-medium rounded-full 
                       text-white bg-emerald-600 hover:bg-emerald-700 
                       transition-colors duration-200"
            >
              Visita il sito web
            </a>
          </div>
        </div>

        {/* Date Picker */}
        <div className="mb-8">
          <DatePicker
            onDateChange={(date) => handleFilterChange('date', date)}
            initialDate={selectedDate}
          />
        </div>

        {/* Filters Section */}
        <div className="mb-8">
          <SearchFilters
            onSearchChange={() => {}}
            onLanguageChange={(value) => handleFilterChange('language', value)}
            onCinemaChange={() => {}}
            availableCinemas={[]}
            selectedCinema=""
            selectedLanguage={selectedLanguage}
            placeholderText=""
          />
        </div>

        {/* Movies Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {filteredMovies?.map(movie => (
            <div 
              key={movie.id}
              className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div className="aspect-[2/3] relative">
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3 sm:p-4">
                <h2 className="font-serif text-sm sm:text-base font-medium tracking-tight mb-1 sm:mb-2 line-clamp-1">
                  {movie.title}
                </h2>
                <p className="text-gray-600 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-1">
                  {movie.genre} • {movie.duration} min
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {movie.showtimes
                    .filter(showtime => showtime.date === formatDate(selectedDate))
                    .map((showtime, index) => (
                      <a
                        key={index}
                        href={showtime.booking_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 text-xs sm:text-sm
                                 bg-gray-50 text-gray-700 rounded-lg 
                                 hover:bg-gray-100 transition-colors duration-200
                                 whitespace-nowrap"
                      >
                        {showtime.time}
                      </a>
                    ))
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}