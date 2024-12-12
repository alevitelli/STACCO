import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from urllib.parse import urlparse
from typing import List, Dict, Optional
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

class DatabaseManager:
    def __init__(self):
        try:
            # Check if we're in local mode
            is_local = os.getenv('LOCAL_MODE', 'false').lower() == 'true'
            
            if is_local:
                logger.info("Using local database")
                database_url = os.getenv('LOCAL_DATABASE_URL')
            else:
                logger.info("Using production database")
                database_url = os.getenv('DATABASE_PUBLIC_URL') or os.getenv('DATABASE_URL')
            
            if not database_url:
                raise ValueError("No database URL configured")

            result = urlparse(database_url)
            logger.info(f"Parsed URL components: host={result.hostname}, port={result.port}")
            
            self.db_config = {
                'dbname': result.path[1:],
                'user': result.username,
                'password': result.password,
                'host': result.hostname,
                'port': result.port
            }
            
            # Test connection
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute('SELECT version()')
                    version = cur.fetchone()[0]
                    logger.info(f"Successfully connected to PostgreSQL: {version}")
                    
        except Exception as e:
            logger.error(f"Database initialization error: {str(e)}")
            raise

    async def test_connection(self):
        """Test the database connection"""
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute('SELECT version()')
                    version = cur.fetchone()[0]
                    logger.info(f"Successfully connected to PostgreSQL: {version}")
                    return True
        except Exception as e:
            logger.error(f"Database connection test failed: {str(e)}")
            raise

    async def close_connections(self):
        """Close any open database connections"""
        try:
            # If you have any connection pooling or persistent connections, close them here
            logger.info("Closing database connections")
            return True
        except Exception as e:
            logger.error(f"Error closing database connections: {str(e)}")
            raise

    def _get_connection(self):
        try:
            conn = psycopg2.connect(**self.db_config)
            return conn
        except Exception as e:
            logger.error(f"Connection error: {str(e)}")
            logger.error(f"Attempted connection to: {self.db_config['host']}:{self.db_config['port']}")
            raise

    async def _ensure_db_exists(self):
        """Create tables if they don't exist"""
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    with open(os.path.join(os.path.dirname(__file__), 'schema.sql'), 'r') as f:
                        cur.execute(f.read())
                conn.commit()
            logger.info("Database tables verified/created successfully")
        except Exception as e:
            logger.error(f"Error ensuring database exists: {e}")
            raise

    async def update_cinemas(self, cinemas: List[Dict]):
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                for cinema in cinemas:
                    cur.execute("""
                        INSERT INTO cinemas 
                        (id, name, cinema_chain, latitude, longitude, website, icon_url)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            cinema_chain = EXCLUDED.cinema_chain,
                            latitude = EXCLUDED.latitude,
                            longitude = EXCLUDED.longitude,
                            website = EXCLUDED.website,
                            icon_url = EXCLUDED.icon_url,
                            last_updated = CURRENT_TIMESTAMP
                    """, (
                        cinema['id'],
                        cinema['name'],
                        cinema['cinema_chain'],
                        cinema['latitude'],
                        cinema['longitude'],
                        cinema['website'],
                        cinema.get('icon_url', '')
                    ))
            conn.commit()

    async def update_movies_and_showtimes(self, cinema_id: str, movies: List[Dict]):
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                for movie in movies:
                    # Insert/update movie
                    cur.execute("""
                        INSERT INTO movies 
                        (id, title, genre, duration, language, poster_url)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            title = EXCLUDED.title,
                            genre = EXCLUDED.genre,
                            duration = EXCLUDED.duration,
                            language = EXCLUDED.language,
                            poster_url = EXCLUDED.poster_url,
                            last_updated = CURRENT_TIMESTAMP
                    """, (
                        movie['id'],
                        movie['title'],
                        movie['genre'],
                        movie['duration'],
                        movie['language'],
                        movie['poster_url']
                    ))

                    # Insert showtimes
                    for showtime in movie['showtimes']:
                        cur.execute("""
                            INSERT INTO showtimes 
                            (movie_id, cinema_id, date, time, booking_link)
                            VALUES (%s, %s, %s, %s, %s)
                            ON CONFLICT (movie_id, cinema_id, date, time) DO UPDATE SET
                                booking_link = EXCLUDED.booking_link,
                                last_updated = CURRENT_TIMESTAMP
                        """, (
                            movie['id'],
                            cinema_id,
                            showtime['date'],
                            showtime['time'],
                            showtime['booking_link']
                        ))
            conn.commit()

    async def get_all_movies(self):
        try:
            with self._get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT DISTINCT m.*,
                            (
                                SELECT string_agg(DISTINCT c.name, ', ')
                                FROM showtimes s
                                JOIN cinemas c ON s.cinema_id = c.id
                                WHERE s.movie_id = m.id
                            ) as cinemas,
                            (
                                SELECT jsonb_agg(
                                    jsonb_build_object(
                                        'date', s.date,
                                        'time', s.time,
                                        'cinema', c.name,
                                        'booking_link', s.booking_link
                                    )
                                )
                                FROM showtimes s
                                JOIN cinemas c ON s.cinema_id = c.id
                                WHERE s.movie_id = m.id
                            ) as showtimes
                        FROM movies m
                        ORDER BY m.title
                    """)
                    return cur.fetchall()
        except Exception as e:
            logger.error(f"Error in get_all_movies: {str(e)}")
            raise

    async def get_movie_showtimes(self, movie_id: str):
        try:
            with self._get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT s.date, s.time, c.name as cinema_name, s.booking_link
                        FROM showtimes s
                        JOIN cinemas c ON s.cinema_id = c.id
                        WHERE s.movie_id = %s
                        ORDER BY s.date, s.time
                    """, (movie_id,))
                    return cur.fetchall()
        except Exception as e:
            print(f"Error in get_movie_showtimes: {str(e)}")
            raise e

    async def get_movie_by_id(self, movie_id: str):
        # Get all movies first
        movies = await self.get_all_movies()
        
        # Find the movie with matching ID
        for movie in movies:
            if movie["id"] == movie_id:
                return movie
                
        return None

    async def get_all_cinemas(self):
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT * FROM cinemas
                    ORDER BY name
                """)
                return cur.fetchall()

    async def get_cinema_by_id(self, cinema_id: str):
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT id, name, cinema_chain, latitude, longitude, website
                FROM cinemas
                WHERE id = ?
            """, (cinema_id,))
            row = cursor.fetchone()
            if row:
                return dict(zip([col[0] for col in cursor.description], row))
            return None

    async def get_cinema_movies(self, cinema_id: str):
        try:
            with self._get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT DISTINCT m.*,
                        (
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'date', s.date,
                                    'time', s.time,
                                    'booking_link', s.booking_link
                                )
                            )
                            FROM showtimes s
                            WHERE s.movie_id = m.id AND s.cinema_id = %s
                        ) as showtimes
                        FROM movies m
                        JOIN showtimes s ON m.id = s.movie_id
                        WHERE s.cinema_id = %s
                    """, (cinema_id, cinema_id))
                    
                    movies = cur.fetchall()
                    return [dict(movie) for movie in movies]
        except Exception as e:
            print(f"Error in get_cinema_movies: {str(e)}")
            raise e

    async def create_user(self, user_data: dict):
        try:
            with self._get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO users (
                            email, password, nome, cognome, 
                            citta, cap, data_nascita, telefono,
                            email_verified
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id, email, nome, cognome, citta, cap, data_nascita, telefono
                    """, (
                        user_data["email"],
                        user_data["password"],
                        user_data["nome"],
                        user_data["cognome"],
                        user_data["citta"],
                        user_data["cap"],
                        user_data["data_nascita"],
                        user_data["telefono"],
                        False  # email_verified default value
                    ))
                    conn.commit()
                    return cur.fetchone()
        except Exception as e:
            logger.error(f"Database error in create_user: {str(e)}")
            raise

    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        try:
            logger.info(f"Checking database for email: {email}")
            with self._get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
                    result = cur.fetchone()
                    logger.info(f"Database query result: {result is not None}")
                    if result:
                        # Log user data (excluding sensitive info)
                        safe_result = {k: v for k, v in result.items() if k != 'password'}
                        logger.info(f"User data retrieved: {safe_result}")
                    return result
        except Exception as e:
            logger.error(f"Database error in get_user_by_email: {str(e)}")
            raise

    async def get_all_users(self) -> List[dict]:
        try:
            with self._get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT *
                        FROM users
                    """)
                    return cur.fetchall()
        except Exception as e:
            logger.error(f"Database error in get_all_users: {str(e)}")
            raise

    async def get_user_by_id(self, user_id: int) -> Optional[dict]:
        try:
            with self._get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT id, email, nome, cognome, citta, cap, data_nascita, telefono
                        FROM users WHERE id = %s
                    """, (user_id,))
                    return cur.fetchone()
        except Exception as e:
            logger.error(f"Database error in get_user_by_id: {str(e)}")
            raise

    async def update_user(self, user_id: int, user_data: dict) -> Optional[dict]:
        try:
            with self._get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        UPDATE users 
                        SET nome = %s, cognome = %s, citta = %s, cap = %s, telefono = %s
                        WHERE id = %s
                        RETURNING *
                    """, (
                        user_data["nome"],
                        user_data["cognome"],
                        user_data["citta"],
                        user_data["cap"],
                        user_data["telefono"],
                        user_id
                    ))
                    conn.commit()
                    return cur.fetchone()
        except Exception as e:
            logger.error(f"Database error in update_user: {str(e)}")
            raise

    async def get_user_movie_history(self, user_id: int) -> List[dict]:
        try:
            with self._get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT m.id, m.title, w.watch_date, c.name as cinema
                        FROM movie_watches w
                        JOIN movies m ON w.movie_id = m.id
                        JOIN cinemas c ON w.cinema_id = c.id
                        WHERE w.user_id = %s
                        ORDER BY w.watch_date DESC
                    """, (user_id,))
                    return cur.fetchall()
        except Exception as e:
            logger.error(f"Database error in get_user_movie_history: {str(e)}")
            raise

    # async def update_user_profile_picture(self, user_id: int, profile_picture_url: str):
    #     query = """
    #         UPDATE users 
    #         SET profile_picture = $1 
    #         WHERE id = $2 
    #         RETURNING *
    #     """
    #     return await sqlite3.fetch_one(query, profile_picture_url, user_id)

    async def update_user_password(self, user_id: int, hashed_password: str):
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("UPDATE users SET password = %s WHERE id = %s", (hashed_password, user_id))
                    conn.commit()
                    return True
        except Exception as e:
            logger.error(f"Error updating password: {str(e)}")
            return False
    
    async def delete_user(self, user_id: int):
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    # First delete related records if needed
                    # cur.execute("DELETE FROM movie_watches WHERE user_id = %s", (user_id,))
                    
                    # Then delete the user
                    cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
                    conn.commit()
                    return True
        except Exception as e:
            logger.error(f"Database error in delete_user: {str(e)}")
            raise

    async def get_cinema(self, cinema_id: str) -> Optional[Dict]:
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM cinemas WHERE id = %s", (cinema_id,))
                return cur.fetchone()

    async def get_movies_by_cinema(self, cinema_id: str) -> List[Dict]:
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT DISTINCT m.*, 
                           array_agg(json_build_object(
                               'date', s.date,
                               'time', s.time,
                               'booking_link', s.booking_link
                           )) as showtimes
                    FROM movies m
                    JOIN showtimes s ON m.id = s.movie_id
                    WHERE s.cinema_id = %s
                    GROUP BY m.id
                    ORDER BY m.title
                """, (cinema_id,))
                return cur.fetchall()