'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import CinemaCard from '@/components/CinemaCard'
import SearchFilters from '@/components/SearchFilters'

interface Cinema {
  id: string
  name: string
  cinema_chain: string
  icon_url: string
  website: string
  currentMovies: any[]
}

function CinemasContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [cinemas, setCinemas] = useState<Cinema[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [selectedChain, setSelectedChain] = useState(searchParams.get('chain') || '')

  const handleFilterChange = (type: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    switch(type) {
      case 'search':
        setSearchQuery(value)
        break
      case 'chain':
        setSelectedChain(value)
        break
    }

    if (value) {
      params.set(type, encodeURIComponent(value))
    } else {
      params.delete(type)
    }

    router.push(`/cinemas?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cinemas`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch cinemas')
        return res.json()
      })
      .then(data => {
        if (!Array.isArray(data)) {
          console.warn('Expected array of cinemas, got:', typeof data)
          setCinemas([])
        } else {
          setCinemas(data)
        }
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching cinemas:', error)
        setCinemas([])
        setLoading(false)
      })
  }, [])

  const filteredCinemas = cinemas.filter(cinema => {
    const matchesSearch = cinema.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesChain = !selectedChain || cinema.cinema_chain === selectedChain
    return matchesSearch && matchesChain
  })

  const availableChains = Array.from(new Set(
    cinemas.map(cinema => cinema.cinema_chain)
  )).sort()

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

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        <div className="flex justify-center mb-6 sm:mb-8">
          <span className="bg-pink-100 text-pink-800 px-4 sm:px-6 py-2 rounded-full text-sm">
            Esplora i Cinema
          </span>
        </div>

        <div className="text-center mb-4 sm:mb-12">
          <h1 className="text-4xl sm:text-6xl font-raleway tracking-tight text-gray-900 mb-4 sm:mb-6">
            Cinema Indipendenti
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
            Scopri la collezione unica di cinema indipendenti di Roma
          </p>
        </div>

        <div className="mb-8 sm:mb-12">
          <SearchFilters
            onSearchChange={(value) => handleFilterChange('search', value)}
            onLanguageChange={() => {}} // Not used for cinemas
            onCinemaChange={(value) => handleFilterChange('chain', value)}
            availableCinemas={availableChains}
            selectedCinema={selectedChain}
            selectedLanguage=""
            placeholderText="Cerca cinema..."
            filterLabel="Catena"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCinemas.map((cinema) => (
            <CinemaCard key={cinema.id} {...cinema} />
          ))}
        </div>
      </main>
    </div>
  )
}

export default function CinemasPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-gray-500">Caricamento cinema in corso...</p>
          </div>
        </main>
      </div>
    }>
      <CinemasContent />
    </Suspense>
  )
}