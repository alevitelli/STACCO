import asyncio
import sys
import os
from dotenv import load_dotenv

# Add the backend directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from scrapers.cinema_di_roma_scraper import CinemaDiRomaScraper

async def main():
    # Load environment variables
    load_dotenv()
    
    scraper = CinemaDiRomaScraper()
    try:
        print("\nFetching cinemas...")
        cinemas = await scraper.get_cinemas()
        print(f"Found {len(cinemas)} cinemas:")
        
        for cinema in cinemas:
            print(f"\n- {cinema['name']}")
            print("  Fetching showtimes...")
            try:
                movies = await scraper.get_showtimes(cinema['id'])
                print(f"  Found {len(movies)} movies:")
                for movie in movies:
                    print(f"    - {movie['title']} ({len(movie['showtimes'])} showtimes)")
                # Add delay between cinemas
                await asyncio.sleep(2)
            except Exception as e:
                print(f"  Error fetching showtimes for {cinema['name']}: {str(e)}")
                continue
                
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        await scraper.close()

if __name__ == "__main__":
    asyncio.run(main())