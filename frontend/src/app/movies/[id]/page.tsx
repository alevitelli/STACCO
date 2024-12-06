import MoviePageClient from './MoviePageClient'

// Define the params type as a Promise
type Params = Promise<{ id: string }>

export default async function MoviePage({
  params,
}: {
  params: Params
}) {
  const { id } = await params
  return <MoviePageClient params={{ id }} />
}