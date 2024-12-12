'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import MovieCard from '@/components/MovieCard'
import DatePicker from '@/components/DatePicker'
import SearchFilters from '@/components/SearchFilters'

const formatDate = (date: string) => {
  if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = date.split('-')
    return `${day}-${month}-${year}`
  }
  if (date.match(/^\d{2}-\d{2}-\d{4}$/)) {
    const [day, month, year] = date.split('-')
    return `${year}-${month}-${day}`
  }
  return date
}

interface Showtime {
  date: string
  time: string
  cinema: string
  booking_link: string
}

function MoviesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [movies, setMovies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [selectedLanguage, setSelectedLanguage] = useState(searchParams.get('language') || '')
  const [selectedCinema, setSelectedCinema] = useState(searchParams.get('cinema') || '')
  const [selectedDate, setSelectedDate] = useState(
    searchParams.get('date') || new Date().toISOString().split('T')[0]
  )
  const [timeFilter, setTimeFilter] = useState('any')
  const [customTime, setCustomTime] = useState('')
  const [selectedTime, setSelectedTime] = useState(searchParams.get('time') || '')

  const handleTimeChange = (value: string, type: 'preset' | 'custom') => {
    if (type === 'preset') {
      setTimeFilter(value)
      if (value !== 'custom') {
        setSelectedTime(value === 'any' ? '' : value)
        updateURLParams('time', value === 'any' ? '' : value)
      }
    } else {
      setCustomTime(value)
      setSelectedTime(value)
      updateURLParams('time', value)
    }
  }

  const handleFilterChange = (type: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    switch(type) {
      case 'search':
        setSearchQuery(value)
        break
      case 'language':
        setSelectedLanguage(value)
        break
      case 'cinema':
        setSelectedCinema(value)
        break
      case 'date':
        setSelectedDate(value)
        break
    }

    if (value) {
      params.set(type, encodeURIComponent(value))
    } else {
      params.delete(type)
    }

    router.push(`/movies?${params.toString()}`, { scroll: false })
  }

  const updateURLParams = (param: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(param, value)
    } else {
      params.delete(param)
    }
    router.push(`/movies?${params.toString()}`)
  }

  useEffect(() => {
    setLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/movies`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch movies')
        return res.json()
      })
      .then(data => {
        console.log('Fetched movies:', data)
        if (!Array.isArray(data)) {
          console.warn('Expected array of movies, got:', typeof data)
          setMovies([])
        } else {
          setMovies(data)
        }
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching movies:', error)
        setMovies([])
        setLoading(false)
      })
  }, [])

  const filteredMovies = movies.filter(movie => {
    if (!movie) return false
    
    const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesLanguage = !selectedLanguage || (
        selectedLanguage === 'Italiano' 
            ? movie.language?.toLowerCase().startsWith('italiano')
            : selectedLanguage === 'Original' 
                ? !movie.language?.toLowerCase().startsWith('italiano')
                : true
    )
    
    const movieCinemas = movie.cinemas?.split(',').map(c => c.trim()) || []
    const matchesCinema = !selectedCinema || movieCinemas.includes(selectedCinema)
    
    const formattedSelectedDate = formatDate(selectedDate)
    const matchesDate = movie.showtimes && movie.showtimes.some(
        (showtime: Showtime) => showtime.date === formattedSelectedDate
    )
    
    console.log('Filtering movie:', {
      title: movie.title,
      language: movie.language,
      selectedLanguage,
      matchesLanguage,
      matchesSearch,
      matchesCinema,
      matchesDate,
    })

    return matchesSearch && matchesLanguage && matchesCinema && matchesDate
  })

  const availableCinemas = Array.from(new Set(
    movies
        .filter(movie => movie.cinemas)
        .flatMap(movie => movie.cinemas.split(',').map((cinema: string) => cinema.trim()))
  )).sort()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-gray-500">Caricamento film in corso...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        <div className="flex justify-center mb-6 sm:mb-8">
          <span className="bg-pink-100 text-pink-800 px-4 sm:px-6 py-2 rounded-full text-sm">
            Esplora Tutti i Film
          </span>
        </div>

        <div className="text-center mb-4 sm:mb-12">
          <h1 className="text-4xl sm:text-6xl font-raleway tracking-tight text-gray-900 mb-4 sm:mb-6">
            In Programmazione a Roma
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
            Scopri le ultime uscite e i grandi classici nei cinema indipendenti di Roma.
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-12">
          <DatePicker 
            onDateChange={(date) => handleFilterChange('date', date)} 
            initialDate={selectedDate} 
          />
          <SearchFilters
            onSearchChange={(value) => handleFilterChange('search', value)}
            onLanguageChange={(value) => handleFilterChange('language', value)}
            onCinemaChange={(value) => handleFilterChange('cinema', value)}
            availableCinemas={availableCinemas}
            selectedCinema={selectedCinema}
            selectedLanguage={selectedLanguage}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
          {filteredMovies.map((movie) => (
            <MovieCard 
              key={movie.id} 
              {...movie} 
              currentFilters={{
                date: selectedDate,
                cinema: selectedCinema,
                language: selectedLanguage
              }}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

export default function MoviesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-gray-500">Caricamento film in corso...</p>
          </div>
        </main>
      </div>
    }>
      <MoviesContent />
    </Suspense>
  )
}