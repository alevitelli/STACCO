'use client'

import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import { useEffect, useState } from 'react'
import RegisterModal from '@/components/RegisterModal'

interface Movie {
  id: string
  title: string
  poster_url: string
}

interface Cinema {
  id: string
  name: string
  icon_url: string
  website: string
}

export default function HomePage() {
  const router = useRouter()
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([])
  const [featuredCinemas, setFeaturedCinemas] = useState<Cinema[]>([])
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    console.log('Using API URL:', apiUrl); // Debug log

    // Add check for logged in status
    const userId = localStorage.getItem('userId')
    setIsLoggedIn(!!userId)

    // Fetch movies with error handling
    fetch(`${apiUrl}/api/movies`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Movies API error: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Successfully fetched movies:', data);
        setFeaturedMovies(data.slice(0, 8))
      })
      .catch(error => {
        console.error('Failed to fetch movies:', error);
        setFeaturedMovies([]); // Set empty array on error
      });

    // Fetch cinemas with error handling
    fetch(`${apiUrl}/api/cinemas`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Cinemas API error: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Successfully fetched cinemas:', data);
        setFeaturedCinemas(data.slice(0, 4))
      })
      .catch(error => {
        console.error('Failed to fetch cinemas:', error);
        setFeaturedCinemas([]); // Set empty array on error
      });
  }, [])

  const scrollCarousel = (direction: 'left' | 'right') => {
    const carousel = document.getElementById('movie-carousel');
    if (carousel) {
      const scrollAmount = 288; // This is the width of one card (w-72 = 18rem = 288px)
      carousel.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleRegisterSuccess = () => {
    setIsRegisterOpen(false)
    setIsLoggedIn(true)
    router.push('/movies')
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        {/* Pink badge */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <span className="bg-pink-100 text-pink-800 px-4 sm:px-6 py-2 rounded-full text-sm">
            Oltre 50 cinema a Roma!
          </span>
        </div>

        {/* Main heading */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-4xl sm:text-6xl font-raleway tracking-tight text-gray-900 mb-4 sm:mb-6">
            La destinazione per il cinema
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
            Cerca e prenota biglietti per tutti i cinema Roma in un unico posto.
            Scegli tra centinaia di film in programmazione.
          </p>
        </div>

        {/* Updated CTA Button */}
        <div className="flex justify-center mb-12 sm:mb-16">
          <button
            onClick={() => isLoggedIn ? router.push('/movies') : setIsRegisterOpen(true)}
            className="bg-emerald-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full 
                     hover:bg-black transition-colors duration-200 text-sm sm:text-base"
          >
            {isLoggedIn ? 'Inizia la ricerca' : 'Registrati'}
          </button>
        </div>

        <RegisterModal 
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
          onRegisterSuccess={handleRegisterSuccess}
        />

        {/* Movie Showcase */}
        <div className="relative mb-24 sm:mb-32">
          <div 
            id="movie-carousel"
            className="overflow-x-auto scrollbar-hide snap-x snap-mandatory flex gap-3 sm:gap-4 pb-4"
          >
            {featuredMovies.map((movie, index) => (
              <div 
                key={movie.id}
                className="relative aspect-[3/4] w-36 sm:w-48 flex-none snap-start rounded-xl sm:rounded-2xl overflow-hidden 
                         transform transition-transform duration-300 hover:scale-105"
                onClick={() => router.push(`/movies/${movie.id}`)}
              >
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-full h-full object-cover cursor-pointer"
                />
              </div>
            ))}
          </div>
          
          {/* Carousel controls - keeping desktop version, hiding on mobile */}
          <div className="hidden sm:flex absolute right-0 top-1/2 transform translate-y-[-50%] bg-gradient-to-l from-white via-white/90 to-transparent w-20 h-full items-center justify-end pr-4">
            <div 
              onClick={() => scrollCarousel('right')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200"
            >
              →
            </div>
          </div>
          <div className="hidden sm:flex absolute left-0 top-1/2 transform translate-y-[-50%] bg-gradient-to-r from-white via-white/90 to-transparent w-20 h-full items-center pl-4">
            <div 
              onClick={() => scrollCarousel('left')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200"
            >
              ←
            </div>
          </div>
        </div>

        {/* "Trova il film" section */}
        <section className="mb-24 sm:mb-32">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 sm:gap-12">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl sm:text-4xl font-raleway tracking-tight text-gray-900 mb-4 sm:mb-6">
                Scopri i film in programmazione
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8">
                Esplora tutti i film disponibili nei cinema di Roma. 
                Dalle ultime uscite ai grandi classici.
              </p>
              <button
                onClick={() => router.push('/movies')}
                className="bg-emerald-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full 
                         hover:bg-black transition-colors duration-200"
              >
                Trova il film
              </button>
            </div>
            <div className="flex-1 grid grid-cols-4 gap-2 sm:gap-4 px-4 sm:px-0">
              {featuredMovies.slice(0, 8).map((movie, index) => (
                <div 
                  key={movie.id}
                  className="relative aspect-[3/4] rounded-lg sm:rounded-xl overflow-hidden"
                >
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* "Trova il Cinema" section */}
        <section className="mb-24 sm:mb-32">
          <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-8 sm:gap-12">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl sm:text-4xl font-raleway tracking-tight text-gray-900 mb-4 sm:mb-6">
                Trova il cinema più vicino a te
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8">
                Oltre 50 cinema a Roma ti aspettano. Scegli quello più comodo 
                e goditi il tuo film preferito.
              </p>
              <button
                onClick={() => router.push('/cinemas')}
                className="bg-emerald-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full 
                         hover:bg-black transition-colors duration-200"
              >
                Trova il Cinema
              </button>
            </div>
            <div className="flex-1 px-4 sm:px-0">
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                {featuredCinemas.slice(0, 4).map((cinema) => (
                  <div
                    key={cinema.id}
                    onClick={() => router.push('/cinemas')}
                    className="aspect-video bg-gray-50 rounded-xl overflow-hidden p-4 
                             hover:bg-gray-100 transition-colors duration-200 cursor-pointer
                             flex items-center justify-center"
                  >
                    <img
                      src={cinema.icon_url}
                      alt={cinema.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ))}
                {/* Add placeholder boxes if we have less than 4 cinemas */}
                {Array.from({ length: Math.max(0, 4 - featuredCinemas.length) }).map((_, index) => (
                  <div
                    key={`placeholder-${index}`}
                    className="aspect-video bg-gray-50 rounded-xl overflow-hidden p-4"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}