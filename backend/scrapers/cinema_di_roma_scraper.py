import aiohttp
from bs4 import BeautifulSoup
from typing import List, Dict
from backend.scrapers.base_scraper import BaseScraper
import re
from urllib.parse import urljoin
from backend.database.db_manager import DatabaseManager
import asyncio
from aiohttp import ClientTimeout
from aiohttp.client_exceptions import ClientError

class CinemaDiRomaScraper(BaseScraper):
    def __init__(self):
        super().__init__()
        self.cinema_chain_name = "Cinema di Roma"
        self.base_url = "https://www.cinemadiroma.it"
        self.cinemas = {}  # Will be populated dynamically
        self.session = None
        self.db = DatabaseManager()
        # Add timeout settings
        self.timeout = ClientTimeout(total=30, connect=10)
        self.max_retries = 3
        self.retry_delay = 2

    async def _get_session(self):
        """Get or create an aiohttp session with timeout"""
        if self.session is None:
            self.session = aiohttp.ClientSession(timeout=self.timeout)
        return self.session

    async def _make_request(self, url: str, retry_count: int = 0) -> str:
        """Make HTTP request with retry logic"""
        try:
            session = await self._get_session()
            async with session.get(url) as response:
                if response.status == 200:
                    return await response.text()
                else:
                    raise aiohttp.ClientError(f"HTTP {response.status}")
        except Exception as e:
            if retry_count < self.max_retries:
                print(f"Request failed, retrying in {self.retry_delay} seconds... ({retry_count + 1}/{self.max_retries})")
                await asyncio.sleep(self.retry_delay)
                return await self._make_request(url, retry_count + 1)
            raise Exception(f"Failed after {self.max_retries} retries: {str(e)}")

    async def _initialize_cinemas(self):
        """Fetch cinema URLs and icons from the main page"""
        if self.cinemas:  # Already initialized
            return
        
        session = await self._get_session()
        async with session.get(self.base_url) as response:
            if response.status != 200:
                return
            
            html = await response.text()
            soup = BeautifulSoup(html, 'html.parser')
            
            # Find all cinema blocks
            cinema_blocks = soup.find_all('div', class_='singleService')
            
            for block in cinema_blocks:
                # Find the image element
                img = block.find('img')
                if not img:
                    continue
                    
                # Extract cinema ID from alt text or image filename
                alt_text = img['alt']
                cinema_id = alt_text.lower().replace('cinema', '').strip()
                
                # Get the icon URL
                icon_url = urljoin(self.base_url, img['src'])
                
                # Map to full names
                cinema_names = {
                    'intrastevere': 'Cinema Intrastevere',
                    'lux': 'Multisala Lux',
                    'odeon': 'Multisala Odeon',
                    'tibur': 'Cinema Tibur'
                }
                
                # Map to URL paths
                cinema_urls = {
                    'intrastevere': 'programmazione-cinema-intrastevere',
                    'lux': 'programmazione-multisala-lux',
                    'odeon': 'programmazione-multisala-odeon',
                    'tibur': 'programmazione-cinema-tibur'
                }
                
                if cinema_id in cinema_names:
                    self.cinemas[cinema_id] = {
                        'name': cinema_names[cinema_id],
                        'url_path': cinema_urls[cinema_id],
                        'icon_url': icon_url
                    }

    async def get_cinemas(self) -> List[Dict]:
        """Get all cinemas from Cinema di Roma chain"""
        try:
            await self._initialize_cinemas()
            cinemas_data = []
            
            # Cinema coordinates
            cinema_locations = {
                'intrastevere': {'lat': 41.8891, 'lon': 12.4697},
                'lux': {'lat': 41.8819, 'lon': 12.4987},
                'odeon': {'lat': 41.9009, 'lon': 12.4833},
                'tibur': {'lat': 41.8937, 'lon': 12.5240}
            }

            for cinema_id, cinema_info in self.cinemas.items():
                try:
                    cinema_data = {
                        'id': cinema_id,
                        'name': cinema_info['name'],
                        'cinema_chain': self.cinema_chain_name,
                        'latitude': cinema_locations[cinema_id]['lat'],
                        'longitude': cinema_locations[cinema_id]['lon'],
                        'website': f"{self.base_url}/{cinema_info['url_path']}",
                        'icon_url': cinema_info['icon_url']
                    }
                    cinemas_data.append(cinema_data)
                except Exception as e:
                    print(f"Error fetching cinema {cinema_info['name']}: {str(e)}")

            # Save to database with error handling
            try:
                await self.db.update_cinemas(cinemas_data)
            except Exception as e:
                print(f"Error saving cinemas to database: {str(e)}")
            
            return cinemas_data
        except Exception as e:
            print(f"Error fetching cinemas: {str(e)}")
            return []

    async def get_showtimes(self, cinema_id: str) -> List[Dict]:
        """Get showtimes for a specific cinema"""
        await self._initialize_cinemas()
        
        if cinema_id not in self.cinemas:
            print(f"Unknown cinema ID: {cinema_id}")
            return []
            
        url = f"{self.base_url}/{self.cinemas[cinema_id]['url_path']}"
        print(f"Fetching showtimes from: {url}\n")
        
        try:
            html = await self._make_request(url)
            soup = BeautifulSoup(html, 'html.parser')
            movies_dict = {}
            
            # Find all movie blocks
            movie_blocks = soup.find_all('div', class_='row-fluid')
            
            for block in movie_blocks:
                title_tag = block.find('h1', class_='borderLine')
                if not title_tag:
                    continue
                    
                title = title_tag.find('span', class_='bg').text.strip()
                
                # Generate a consistent ID from the title
                movie_id = title.lower().replace(' ', '-').replace("'", '')
                
                details = block.find('div', class_='span8')
                if not details:
                    continue
                    
                info_text = details.find('p').text.strip()
                
                # Extract movie details
                movie_details = {
                    'id': movie_id,
                    'title': title,
                    'genre': '',
                    'duration': '',
                    'language': '',
                    'poster_url': '',  # We'll add this later
                    'showtimes': []
                }
                
                # Parse movie info
                if 'Genere:' in info_text:
                    movie_details['genre'] = info_text.split('Genere:')[1].split('-')[0].strip()
                if 'Durata:' in info_text:
                    duration_text = info_text.split('Durata:')[1].split('min.')[0].strip()
                    try:
                        movie_details['duration'] = int(duration_text)
                    except ValueError:
                        movie_details['duration'] = 0
                if 'Lingua:' in info_text:
                    movie_details['language'] = info_text.split('Lingua:')[1].strip()
                
                # Try to find poster image
                poster_p = block.find('p', class_='icon190')
                if poster_p:
                    poster_img = poster_p.find('img')
                    if poster_img and 'src' in poster_img.attrs:
                        movie_details['poster_url'] = poster_img['src']
                
                # Get showtimes
                date_blocks = details.find_all('span', style=lambda x: x and 'text-align:left; display: block;' in x)
                
                # Use a set to store unique showtimes
                unique_showtimes = set()

                for date_block in date_blocks:
                    date = date_block.find('b').text.strip().rstrip(':')
                    showtime_links = date_block.find_next_siblings('a', class_='btn')
                    
                    for link in showtime_links:
                        if not isinstance(link, str):  # Make sure it's a valid link element
                            time = link.text.strip()
                            if time:
                                # Create a unique key for this showtime
                                showtime_key = f"{date}-{time}-{self.cinemas[cinema_id]['name']}"
                                if showtime_key not in unique_showtimes:
                                    unique_showtimes.add(showtime_key)
                                    showtime = {
                                        'date': date,
                                        'time': time,
                                        'cinema': self.cinemas[cinema_id]['name'],
                                        'booking_link': urljoin(self.base_url, link['href'])
                                    }
                                    movie_details['showtimes'].append(showtime)
                
                # Store in movies dictionary
                movies_dict[movie_id] = movie_details
            
            # Convert to list and sort by title
            movies = sorted(movies_dict.values(), key=lambda x: x['title'])
            if movies:
                await self.db.update_movies_and_showtimes(cinema_id, movies)
            # Add delay between requests to avoid overwhelming the server
            await asyncio.sleep(1)
            
            return movies

        except Exception as e:
            print(f"Error fetching showtimes for {cinema_id}: {str(e)}")
            return []

    async def get_movie_details(self, movie_id: str) -> Dict:
        """Get detailed information about a specific movie"""
        movie_details = {}
        
        async with aiohttp.ClientSession() as session:
            try:
                url = f"{self.base_url}/schede-film/in-sala/{movie_id}"
                async with session.get(url) as response:
                    if response.status == 200:
                        html = await response.text()
                        soup = BeautifulSoup(html, 'html.parser')
                        
                        # Implementation needed based on actual HTML structure
                        
            except Exception as e:
                print(f"Error fetching movie details for {movie_id}: {str(e)}")
        
        return movie_details

    async def _parse_showtime_page(self, html: str) -> List[Dict]:
        """Helper method to parse the showtime page HTML"""
        showtimes = []
        soup = BeautifulSoup(html, 'html.parser')
        # Implementation needed based on actual HTML structure
        return showtimes

    async def close(self):
        """Close the session when done"""
        if self.session:
            await self.session.close()
            self.session = None