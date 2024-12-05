'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface MovieCardProps {
  id: string;
  title: string;
  genre: string;
  duration: number;
  language: string;
  poster_url: string;
  cinemas: string;
  currentFilters?: {
    date?: string;
    cinema?: string;
    language?: string;
  };
}

export default function MovieCard({ 
  id, 
  title, 
  genre, 
  duration, 
  language, 
  poster_url,
  cinemas,
  currentFilters 
}: MovieCardProps) {
  const searchParams = useSearchParams()
  
  // Create URL with current filters
  const params = new URLSearchParams()
  if (currentFilters?.date) params.set('date', currentFilters.date)
  if (currentFilters?.cinema) params.set('cinema', currentFilters.cinema)
  if (currentFilters?.language) params.set('language', currentFilters.language)
  
  const href = `/movies/${id}?${params.toString()}`

  // Standardize language display
  const displayLanguage = language.toLowerCase().startsWith('italiano') 
    ? 'Italiano' 
    : 'Versione Originale'

  return (
    <Link href={href} className="block">
      <div className="group bg-white rounded-xl sm:rounded-2xl overflow-hidden transform transition-all duration-300 hover:scale-105 
                    border border-black/5 shadow-sm hover:shadow-md">
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={poster_url}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="p-2 sm:p-3 h-[4rem] sm:h-[4.5rem]">
          <h3 className="font-raleway text-sm sm:text-base font-medium tracking-tight text-gray-900 mb-1 sm:mb-1.5 
                       line-clamp-1 overflow-hidden">
            {title}
          </h3>
          <div className="flex items-center space-x-1 sm:space-x-1.5 text-xs text-gray-500">
            <span>{duration} min</span>
            <span>•</span>
            <span>{displayLanguage}</span>
          </div>
        </div>
      </div>
    </Link>
  )
} 