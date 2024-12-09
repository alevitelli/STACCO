import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from typing import List, Dict, Optional

load_dotenv()

class DatabaseManager:
    def __init__(self):
        # Get PostgreSQL connection details from environment variables
        self.db_config = {
            'dbname': os.getenv('PGDATABASE'),
            'user': os.getenv('PGUSER'),
            'password': os.getenv('PGPASSWORD'),
            'host': os.getenv('PGHOST'),
            'port': os.getenv('PGPORT', '5432')
        }
        self._ensure_db_exists()

    def _get_connection(self):
        return psycopg2.connect(**self.db_config)

    def _ensure_db_exists(self):
        """Create tables if they don't exist"""
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                with open(os.path.join(os.path.dirname(__file__), 'schema.sql'), 'r') as f:
                    cur.execute(f.read())
            conn.commit()

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
                print(f"Connected to database at {self.db_path}")  # Debug log
                cursor = conn.execute("""
                    SELECT DISTINCT 
                        m.id,
                        m.title,
                        m.genre,
                        m.duration,
                        m.language,
                        m.poster_url,
                        GROUP_CONCAT(DISTINCT c.name) as cinemas
                    FROM movies m
                    LEFT JOIN showtimes s ON m.id = s.movie_id
                    LEFT JOIN cinemas c ON s.cinema_id = c.id
                    GROUP BY m.id, m.title, m.genre, m.duration, m.language, m.poster_url
                    ORDER BY m.title
                """)
                
                columns = [col[0] for col in cursor.description]
                movies = [dict(zip(columns, row)) for row in cursor.fetchall()]
                print(f"Found {len(movies)} movies in database")  # Debug log
                return movies
                
        except Exception as e:
            print(f"Database error in get_all_movies: {str(e)}")  # Debug log
            raise Exception(f"Database error: {str(e)}")

    async def get_movie_showtimes(self, movie_id: str):
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT s.*, c.name as cinema_name
                FROM showtimes s
                JOIN cinemas c ON s.cinema_id = c.id
                WHERE s.movie_id = ?
                ORDER BY s.date, s.time
            """, (movie_id,))
            return [dict(zip([col[0] for col in cursor.description], row)) 
                    for row in cursor.fetchall()]

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
            cursor = conn.execute("""
                SELECT id, name, cinema_chain, latitude, longitude, website, icon_url
                FROM cinemas
                ORDER BY name
            """)
            return [dict(zip([col[0] for col in cursor.description], row)) 
                    for row in cursor.fetchall()]

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
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT DISTINCT m.id, m.title,
                       GROUP_CONCAT(s.time) as times
                FROM movies m
                JOIN showtimes s ON m.id = s.movie_id
                WHERE s.cinema_id = ? AND s.date = strftime('%d-%m-%Y',DATE('now'))
                GROUP BY m.id
            """, (cinema_id,))
            movies = []
            for row in cursor.fetchall():
                movie = dict(zip([col[0] for col in cursor.description], row))
                movie['times'] = movie['times'].split(',') if movie['times'] else []
                movies.append(movie)
            return movies

    async def create_user(self, user_data: dict):
        try:
            with self._get_connection() as conn:
                cursor = conn.execute("""
                    INSERT INTO users (
                        email, password, nome, cognome, 
                        citta, cap, data_nascita, telefono,
                        email_verified
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                
                # Get the created user data
                user_id = cursor.lastrowid
                cursor = conn.execute("""
                    SELECT id, email, nome, cognome, citta, cap, data_nascita, telefono
                    FROM users WHERE id = ?
                """, (user_id,))
                user = cursor.fetchone()
                
                if user:
                    return {
                        "id": user[0],
                        "email": user[1],
                        "nome": user[2],
                        "cognome": user[3],
                        "citta": user[4],
                        "cap": user[5],
                        "data_nascita": user[6],
                        "telefono": user[7]
                    }
                return None
        except Exception as e:
            print(f"Database error in create_user: {str(e)}")
            raise Exception(f"Database error: {str(e)}")

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        try:
            with self._get_connection() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute("""
                    SELECT * FROM users WHERE email = ?
                """, (email,))
                user = cursor.fetchone()
                return dict(user) if user else None
        except Exception as e:
            print(f"Database error: {str(e)}")  # Add logging for debugging
            raise Exception(f"Database error: {str(e)}")

    async def get_all_users(self) -> List[dict]:
        try:
            with self._get_connection() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute("""
                    SELECT id, email, nome, cognome, citta, cap, data_nascita, telefono
                    FROM users
                """)
                users = cursor.fetchall()
                return [dict(user) for user in users]
        except Exception as e:
            print(f"Database error: {str(e)}")
            raise Exception(f"Database error: {str(e)}")

    async def get_user_by_id(self, user_id: int) -> Optional[dict]:
        try:
            with self._get_connection() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute("""
                    SELECT id, email, nome, cognome, citta, cap, data_nascita, telefono
                    FROM users WHERE id = ?
                """, (user_id,))
                user = cursor.fetchone()
                return dict(user) if user else None
        except Exception as e:
            print(f"Database error: {str(e)}")
            raise Exception(f"Database error: {str(e)}")

    async def update_user(self, user_id: int, user_data: dict) -> Optional[dict]:
        try:
            with self._get_connection() as conn:
                conn.execute("""
                    UPDATE users 
                    SET nome = ?, cognome = ?, citta = ?, cap = ?, telefono = ?
                    WHERE id = ?
                """, (
                    user_data["nome"],
                    user_data["cognome"],
                    user_data["citta"],
                    user_data["cap"],
                    user_data["telefono"],
                    user_id
                ))
                conn.commit()
                return await self.get_user_by_id(user_id)
        except Exception as e:
            print(f"Database error: {str(e)}")
            raise Exception(f"Database error: {str(e)}")

    async def get_user_movie_history(self, user_id: int) -> List[dict]:
        try:
            with self._get_connection() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute("""
                    SELECT m.id, m.title, w.watch_date, c.name as cinema
                    FROM movie_watches w
                    JOIN movies m ON w.movie_id = m.id
                    JOIN cinemas c ON w.cinema_id = c.id
                    WHERE w.user_id = ?
                    ORDER BY w.watch_date DESC
                """, (user_id,))
                history = cursor.fetchall()
                return [dict(row) for row in history]
        except Exception as e:
            print(f"Database error: {str(e)}")
            raise Exception(f"Database error: {str(e)}")

    async def update_user_profile_picture(self, user_id: int, profile_picture_url: str):
        query = """
            UPDATE users 
            SET profile_picture = $1 
            WHERE id = $2 
            RETURNING *
        """
        return await sqlite3.fetch_one(query, profile_picture_url, user_id)

    async def update_user_password(self, user_id: int, hashed_password: str):
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                query = "UPDATE users SET password = ? WHERE id = ?"
                cursor.execute(query, (hashed_password, user_id))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error updating password: {str(e)}")
            return False

    async def delete_user(self, user_id: int):
        try:
            with self._get_connection() as conn:
                # First delete related records
                # conn.execute("DELETE FROM movie_watches WHERE user_id = ?", (user_id,))
                
                # Then delete the user
                cursor = conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
                conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            print(f"Database error in delete_user: {str(e)}")
            raise Exception(f"Database error: {str(e)}")

    async def get_cinema(self, cinema_id: str) -> Optional[Dict]:
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT id, name, cinema_chain, latitude, longitude, website, icon_url
                FROM cinemas
                WHERE id = ?
            """, (cinema_id,))
            row = cursor.fetchone()
            
            if row:
                return {
                    'id': row[0],
                    'name': row[1],
                    'cinema_chain': row[2],
                    'latitude': row[3],
                    'longitude': row[4],
                    'website': row[5],
                    'icon_url': row[6]
                }
            return None

    async def get_movies_by_cinema(self, cinema_id: str) -> List[Dict]:
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT DISTINCT 
                    m.id,
                    m.title,
                    m.genre,
                    m.duration,
                    m.language,
                    m.poster_url,
                    GROUP_CONCAT(s.date || ',' || s.time || ',' || s.booking_link) as showtimes
                FROM movies m
                JOIN showtimes s ON m.id = s.movie_id
                WHERE s.cinema_id = ?
                GROUP BY m.id
            """, (cinema_id,))
            
            movies = []
            for row in cursor.fetchall():
                showtimes_data = row[6].split(',') if row[6] else []
                showtimes = []
                
                # Process showtimes in groups of 3 (date, time, booking_link)
                for i in range(0, len(showtimes_data), 3):
                    if i + 2 < len(showtimes_data):
                        showtimes.append({
                            'date': showtimes_data[i],
                            'time': showtimes_data[i + 1],
                            'booking_link': showtimes_data[i + 2]
                        })
                
                movies.append({
                    'id': row[0],
                    'title': row[1],
                    'genre': row[2],
                    'duration': row[3],
                    'language': row[4],
                    'poster_url': row[5],
                    'showtimes': showtimes
                })
                
            return movies