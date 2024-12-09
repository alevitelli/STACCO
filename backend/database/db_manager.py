from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from datetime import datetime
from typing import List, Dict, Optional

class DatabaseManager:
    def __init__(self):
        # Get DATABASE_URL from environment variable
        database_url = os.getenv('DATABASE_URL')
        if database_url and database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)
        
        self.engine = create_engine(database_url or 'sqlite:///backend/database/cinema.db')
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

    def _ensure_db_exists(self):
        # Create all tables if they don't exist
        with open('backend/database/schema.sql') as f:
            schema = f.read()
            with self.engine.connect() as conn:
                conn.execute(schema)
                conn.commit()

    async def update_cinemas(self, cinemas: List[Dict]):
        with self.SessionLocal() as db:
            for cinema in cinemas:
                db.execute("""
                    INSERT OR REPLACE INTO cinemas 
                    (id, name, cinema_chain, latitude, longitude, website, icon_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    cinema['id'], 
                    cinema['name'], 
                    cinema['cinema_chain'],
                    cinema['latitude'], 
                    cinema['longitude'], 
                    cinema['website'],
                    cinema.get('icon_url', '')  # Use get() to handle missing icons
                ))

    async def update_movies_and_showtimes(self, cinema_id: str, movies: List[Dict]):
        with self.SessionLocal() as db:
            for movie in movies:
                # Update movie info
                db.execute("""
                    INSERT OR REPLACE INTO movies (id, title, genre, duration, language, poster_url)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (movie['id'], movie['title'], movie['genre'], 
                     movie['duration'], movie['language'], movie['poster_url']))
                
                # Update showtimes
                for showtime in movie['showtimes']:
                    db.execute("""
                        INSERT OR REPLACE INTO showtimes (movie_id, cinema_id, date, time, booking_link)
                        VALUES (?, ?, ?, ?, ?)
                    """, (movie['id'], cinema_id, showtime['date'], 
                         showtime['time'], showtime['booking_link']))

    async def get_all_movies(self):
        with self.SessionLocal() as db:
            cursor = db.execute("""
                SELECT m.*, GROUP_CONCAT(DISTINCT c.name) as cinemas
                FROM movies m
                LEFT JOIN showtimes s ON m.id = s.movie_id
                LEFT JOIN cinemas c ON s.cinema_id = c.id
                GROUP BY m.id
                ORDER BY m.title
            """)
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

    async def get_movie_showtimes(self, movie_id: str):
        with self.SessionLocal() as db:
            cursor = db.execute("""
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
        with self.SessionLocal() as db:
            cursor = db.execute("""
                SELECT id, name, cinema_chain, latitude, longitude, website, icon_url
                FROM cinemas
                ORDER BY name
            """)
            return [dict(zip([col[0] for col in cursor.description], row)) 
                    for row in cursor.fetchall()]

    async def get_cinema_by_id(self, cinema_id: str):
        with self.SessionLocal() as db:
            cursor = db.execute("""
                SELECT id, name, cinema_chain, latitude, longitude, website
                FROM cinemas
                WHERE id = ?
            """, (cinema_id,))
            row = cursor.fetchone()
            if row:
                return dict(zip([col[0] for col in cursor.description], row))
            return None

    async def get_cinema_movies(self, cinema_id: str):
        with self.SessionLocal() as db:
            cursor = db.execute("""
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
            with self.SessionLocal() as db:
                db.execute("""
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
                db.commit()
                
                # Get the created user data
                user_id = db.lastrowid
                cursor = db.execute("""
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
            with self.SessionLocal() as db:
                conn.row_factory = sqlite3.Row
                cursor = db.execute("""
                    SELECT * FROM users WHERE email = ?
                """, (email,))
                user = cursor.fetchone()
                return dict(user) if user else None
        except Exception as e:
            print(f"Database error: {str(e)}")  # Add logging for debugging
            raise Exception(f"Database error: {str(e)}")

    async def get_all_users(self) -> List[dict]:
        try:
            with self.SessionLocal() as db:
                conn.row_factory = sqlite3.Row
                cursor = db.execute("""
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
            with self.SessionLocal() as db:
                conn.row_factory = sqlite3.Row
                cursor = db.execute("""
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
            with self.SessionLocal() as db:
                db.execute("""
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
                db.commit()
                return await self.get_user_by_id(user_id)
        except Exception as e:
            print(f"Database error: {str(e)}")
            raise Exception(f"Database error: {str(e)}")

    async def get_user_movie_history(self, user_id: int) -> List[dict]:
        try:
            with self.SessionLocal() as db:
                conn.row_factory = sqlite3.Row
                cursor = db.execute("""
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
            with self.SessionLocal() as db:
                cursor = db.cursor()
                query = "UPDATE users SET password = ? WHERE id = ?"
                cursor.execute(query, (hashed_password, user_id))
                db.commit()
                return True
        except Exception as e:
            print(f"Error updating password: {str(e)}")
            return False

    async def delete_user(self, user_id: int):
        try:
            with self.SessionLocal() as db:
                # First delete related records
                # conn.execute("DELETE FROM movie_watches WHERE user_id = ?", (user_id,))
                
                # Then delete the user
                cursor = db.execute("DELETE FROM users WHERE id = ?", (user_id,))
                db.commit()
                return cursor.rowcount > 0
        except Exception as e:
            print(f"Database error in delete_user: {str(e)}")
            raise Exception(f"Database error: {str(e)}")

    async def get_cinema(self, cinema_id: str) -> Optional[Dict]:
        with self.SessionLocal() as db:
            cursor = db.execute("""
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
        with self.SessionLocal() as db:
            cursor = db.execute("""
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