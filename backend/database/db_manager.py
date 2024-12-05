import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Optional

class DatabaseManager:
    def __init__(self, db_path="backend/database/cinema.db"):
        self.db_path = db_path
        self._ensure_db_exists()

    def _ensure_db_exists(self):
        if not os.path.exists(os.path.dirname(self.db_path)):
            os.makedirs(os.path.dirname(self.db_path))
        
        if not os.path.exists(self.db_path):
            self._init_db()

    def _init_db(self):
        with open('backend/database/schema.sql') as f:
            schema = f.read()
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript(schema)

    async def update_cinemas(self, cinemas: List[Dict]):
        with sqlite3.connect(self.db_path) as conn:
            for cinema in cinemas:
                conn.execute("""
                    INSERT OR REPLACE INTO cinemas (id, name, cinema_chain, latitude, longitude, website)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (cinema['id'], cinema['name'], cinema['cinema_chain'], 
                     cinema['latitude'], cinema['longitude'], cinema['website']))

    async def update_movies_and_showtimes(self, cinema_id: str, movies: List[Dict]):
        with sqlite3.connect(self.db_path) as conn:
            for movie in movies:
                # Update movie info
                conn.execute("""
                    INSERT OR REPLACE INTO movies (id, title, genre, duration, language, poster_url)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (movie['id'], movie['title'], movie['genre'], 
                     movie['duration'], movie['language'], movie['poster_url']))
                
                # Update showtimes
                for showtime in movie['showtimes']:
                    conn.execute("""
                        INSERT OR REPLACE INTO showtimes (movie_id, cinema_id, date, time, booking_link)
                        VALUES (?, ?, ?, ?, ?)
                    """, (movie['id'], cinema_id, showtime['date'], 
                         showtime['time'], showtime['booking_link']))

    async def get_all_movies(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
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
        with sqlite3.connect(self.db_path) as conn:
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
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT id, name, cinema_chain, latitude, longitude, website
                FROM cinemas
                ORDER BY name
            """)
            return [dict(zip([col[0] for col in cursor.description], row)) 
                    for row in cursor.fetchall()]

    async def get_cinema_by_id(self, cinema_id: str):
        with sqlite3.connect(self.db_path) as conn:
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
        with sqlite3.connect(self.db_path) as conn:
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
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                INSERT INTO users (
                    email, password, nome, cognome, 
                    indirizzo, data_nascita, telefono
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                user_data["email"],
                user_data["password"],
                user_data["nome"],
                user_data["cognome"],
                user_data["indirizzo"],
                user_data["dataNascita"],
                user_data["telefono"]
            ))
            conn.commit()
            return cursor.lastrowid

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        try:
            with sqlite3.connect(self.db_path) as conn:
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
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute("""
                    SELECT id, email, nome, cognome, indirizzo, data_nascita, telefono
                    FROM users
                """)
                users = cursor.fetchall()
                return [dict(user) for user in users]
        except Exception as e:
            print(f"Database error: {str(e)}")
            raise Exception(f"Database error: {str(e)}")

    async def get_user_by_id(self, user_id: int) -> Optional[dict]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute("""
                    SELECT id, email, nome, cognome, indirizzo, data_nascita, telefono
                    FROM users WHERE id = ?
                """, (user_id,))
                user = cursor.fetchone()
                return dict(user) if user else None
        except Exception as e:
            print(f"Database error: {str(e)}")
            raise Exception(f"Database error: {str(e)}")

    async def update_user(self, user_id: int, user_data: dict) -> Optional[dict]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    UPDATE users 
                    SET nome = ?, cognome = ?, indirizzo = ?, telefono = ?
                    WHERE id = ?
                """, (
                    user_data["nome"],
                    user_data["cognome"],
                    user_data["indirizzo"],
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
            with sqlite3.connect(self.db_path) as conn:
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
        return await database.fetch_one(query, profile_picture_url, user_id)

    async def update_user_password(self, user_id: int, hashed_password: str):
        query = """
            UPDATE users 
            SET password = $1 
            WHERE id = $2 
            RETURNING *
        """
        return await database.fetch_one(query, hashed_password, user_id)

    async def delete_user(self, user_id: int):
        try:
            # First, delete any related records (if you have foreign key constraints)
            # For example:
            # await database.execute("DELETE FROM user_movies WHERE user_id = $1", user_id)
            
            # Then delete the user
            query = "DELETE FROM users WHERE id = $1"
            result = await database.execute(query, user_id)
            print(f"Delete query result: {result}")  # Debug log
            return result
        except Exception as e:
            print(f"Database error in delete_user: {str(e)}")  # Debug log
            raise e