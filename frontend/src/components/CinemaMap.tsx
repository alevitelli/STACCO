'use client'

import { Map, Marker } from 'pigeon-maps'
import { useSearchParams } from 'next/navigation'
import { isTimeAfter } from '@/utils/time'

interface Cinema {
  id: string;
  name: string;
  address: string;
  location: [number, number];
  currentMovies?: {
    id: string;
    title: string;
    times: string[];
  }[];
}

interface CinemaMapProps {
  cinemas: Cinema[];
  selectedMovie?: string;
}

export default function CinemaMap({ cinemas, selectedMovie }: CinemaMapProps) {
  const searchParams = useSearchParams()
  const selectedTime = searchParams.get('time')

  return (
    <div style={{ height: "400px", width: '100%', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <Map
        defaultCenter={[41.9028, 12.4964]}
        defaultZoom={13}
        attribution={false}
      >
        {cinemas.map(cinema => {
          // Get movie times for this cinema and filter by time
          const movieTimes = cinema.currentMovies
            ?.find(m => m.id === selectedMovie)
            ?.times.filter(time => isTimeAfter(time, selectedTime)) || []

          return (
            <Marker
              key={cinema.id}
              width={50}
              anchor={cinema.location}
              onClick={() => {
                alert(
                  `${cinema.name}\n${cinema.address}${
                    movieTimes.length > 0
                      ? `\n\nShowtimes: ${movieTimes.join(', ')}`
                      : '\n\nNo showtimes available for selected filters'
                  }`
                )
              }}
            />
          )
        })}
      </Map>
    </div>
  )
}