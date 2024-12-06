import asyncio
import pytest
from backend.scrapers.cinema_di_roma_scraper import CinemaDiRomaScraper
from urllib.parse import urljoin

@pytest.mark.asyncio
async def test_get_cinemas():
    scraper = CinemaDiRomaScraper()
    cinemas = await scraper.get_cinemas()
    print("Cinemas:", cinemas)
    assert len(cinemas) == 4
    assert all(isinstance(cinema, dict) for cinema in cinemas)
    assert all('name' in cinema for cinema in cinemas)
    assert all('latitude' in cinema for cinema in cinemas)
    assert all('longitude' in cinema for cinema in cinemas)
    assert all('icon_url' in cinema for cinema in cinemas)
    assert all(cinema['icon_url'].startswith('http') for cinema in cinemas)

@pytest.mark.asyncio
async def test_get_showtimes():
    scraper = CinemaDiRomaScraper()
    showtimes = await scraper.get_showtimes('intrastevere')
    print("\nShowtimes for Cinema Intrastevere:")
    print(showtimes)
    assert isinstance(showtimes, list)
    if len(showtimes) > 0:
        movie = showtimes[0]
        assert 'id' in movie
        assert 'title' in movie
        assert 'genre' in movie
        assert 'duration' in movie
        assert 'language' in movie
        assert 'showtimes' in movie
        assert isinstance(movie['showtimes'], list)

async def main():
    scraper = CinemaDiRomaScraper()
    try:
        print("\nFetching cinemas...")
        cinemas = await scraper.get_cinemas()
        print(f"Found {len(cinemas)} cinemas:")
        for cinema in cinemas:
            print(f"- {cinema['name']}")
        
        print("\nFetching showtimes for each cinema...")
        for cinema in cinemas:
            print("\n" + "=" * 80)
            print(f"Showtimes for {cinema['name']}:")
            print("=" * 80)
            movies = await scraper.get_showtimes(cinema['id'])
            for movie in movies:
                print(f"\nMovie: {movie['title']}")
                print(f"Genre: {movie['genre']}")
                print(f"Duration: {movie['duration']} minutes")
                print(f"Language: {movie['language']}")
                print(f"Poster URL: {movie['poster_url']}")
                print("Showtimes:")
                for showtime in movie['showtimes']:
                    print(f"- {showtime['date']} at {showtime['time']}")

    finally:
        await scraper.close()

if __name__ == "__main__":
    asyncio.run(main())