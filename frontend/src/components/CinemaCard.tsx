import Link from 'next/link'

interface CinemaCardProps {
    id: string;
    name: string;
    cinema_chain: string;
    address: string;
    latitude: number;
    longitude: number;
    website: string;
    currentMovies: Array<{
      id: string;
      title: string;
      times: string[];
    }>;
  }

export default function CinemaCard({
  id,
  name,
  address,
  website,
  currentMovies,
  cinema_chain
}: CinemaCardProps) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="p-6">
        <h2 className="font-serif text-2xl font-medium tracking-tight mb-2">
          {name}
        </h2>
        <p className="text-gray-600 mb-4">
          {address}
        </p>
        <p className="text-gray-600 mb-4">
          {cinema_chain}
        </p>

        <div className="mt-6">
          <h3 className="font-medium text-gray-900 mb-3">
            Now Playing
          </h3>
          <div className="space-y-2">
            {currentMovies?.map((movie) => (
              <Link
                key={movie.id}
                href={`/movies/${movie.id}`}
                className="block text-sm text-gray-600 hover:text-pink-800 transition-colors"
              >
                {movie.title}
                <span className="text-gray-400 ml-2">
                  • {movie.times.join(', ')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}