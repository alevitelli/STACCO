import { useRouter } from 'next/navigation'

interface CinemaCardProps {
    id: string;
    name: string;
    cinema_chain: string;
    icon_url: string;
    website: string;
  }

export default function CinemaCard({
  id,
  name,
  cinema_chain,
  icon_url,
  website
}: CinemaCardProps) {
  const router = useRouter()

  return (
    <div 
      onClick={() => router.push(`/cinemas/${id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg 
                 transition-all duration-300 cursor-pointer"
    >
      <div className="aspect-video bg-gray-50 p-8 flex items-center justify-center">
        <img
          src={icon_url}
          alt={name}
          className="max-w-full max-h-full object-contain"
        />
      </div>
      <div className="p-6">
        <h2 className="font-serif text-2xl font-medium tracking-tight mb-2">
          {name}
        </h2>
        <p className="text-gray-600">
          {cinema_chain}
        </p>
      </div>
    </div>
  )
}