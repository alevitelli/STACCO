'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import CinemaCard from '@/components/CinemaCard'

export default function CinemasPage() {
  const [cinemas, setCinemas] = useState<any[]>([]) // Initialize as empty array with type
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:8000/api/cinemas')
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
        setCinemas([]) // Ensure cinemas is always an array
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-gray-500 font-geist-sans">Loading cinemas...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {/* Pink badge */}
        <div className="flex justify-center mb-8">
          <span className="bg-pink-100 text-pink-800 px-6 py-2 rounded-full text-sm">
            Discover Our Cinemas
          </span>
        </div>

        {/* Main heading */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-raleway tracking-tight text-gray-900 mb-6">
            Independent Cinemas
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore Rome's unique collection of independent movie theaters
          </p>
        </div>

        {/* Cinema Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cinemas.map((cinema) => (
            <CinemaCard key={cinema.id} {...cinema} />
          ))}
        </div>
      </main>
    </div>
  )
}