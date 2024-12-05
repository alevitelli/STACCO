import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from backend.scrapers.cinema_di_roma_scraper import CinemaDiRomaScraper

async def main():
    scraper = CinemaDiRomaScraper()
    try:
        cinemas = await scraper.get_cinemas()
        print("\nFetching cinemas...")
        print(f"Found cinemas: {cinemas}")
        
        for cinema in cinemas:
            print("\n" + "=" * 80)
            print(f"Showtimes for {cinema['name']}:")
            print("=" * 80)
            movies = await scraper.get_showtimes(cinema['id'])
            
            for movie in movies:
                print(f"\nMovie: {movie['title']}")
                print("Details:")
                for key, value in movie['details'].items():
                    print(f"  {key}: {value}")
                print("\nShowtimes:")
                for showtime in movie['showtimes']:
                    print(f"  {showtime['date']} - {showtime['time']}")
                print("-" * 40)
    finally:
        await scraper.close()

if __name__ == "__main__":
    asyncio.run(main()) 