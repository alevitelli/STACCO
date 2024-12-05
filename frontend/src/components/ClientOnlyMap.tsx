'use client'

import dynamic from 'next/dynamic'

// Import CinemaMap dynamically with SSR disabled
const CinemaMap = dynamic(() => import('./CinemaMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-gray-100 rounded-lg animate-pulse" />
  )
})

// Pass through props
export default CinemaMap