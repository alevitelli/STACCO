from fastapi import FastAPI, HTTPException, UploadFile, File, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from datetime import datetime, date
from database.db_manager import DatabaseManager
from .models import Movie, Showtime, Cinema
from typing import List, Optional
import jwt
from datetime import datetime, timedelta
from email.mime.text import MIMEText
import smtplib
from pathlib import Path
import os
from jwt.exceptions import PyJWTError
from dotenv import load_dotenv
import sqlite3
from psycopg2.extras import RealDictCursor
import logging
from fastapi.responses import JSONResponse
import json

load_dotenv()

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY", "your-fallback-secret-key")
if not isinstance(SECRET_KEY, str):
    SECRET_KEY = str(SECRET_KEY)
logger.info(f"SECRET_KEY initialized: {bool(SECRET_KEY)}")
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')

# port = int(os.getenv("PORT", 8000))
# host = "0.0.0.0"  # Required for Railway

app = FastAPI(
    title="Stacco API",
    description="API for Stacco movie application",
    version="1.0.0",
    docs_url="/api/docs",  # Customize docs URL
    redoc_url="/api/redoc"  # Customize redoc URL
)

db = DatabaseManager()


# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# CORS configuration for Railway deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "https://stacco.vercel.app",
        "https://stacco-production.up.railway.app",
        os.getenv("NEXT_PUBLIC_FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Explicitly list allowed methods
    allow_headers=["*"],
)

# Upload directory configuration
UPLOAD_DIR = Path("uploads/profile_pictures")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Email configuration
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')

class UserRegister(BaseModel):
    email: str
    password: str
    nome: str
    cognome: str
    citta: str
    cap: str
    data_nascita: str
    telefono: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    nome: str
    cognome: str
    citta: str
    cap: str
    data_nascita: str
    telefono: str

class PasswordResetRequest(BaseModel):
    email: str

@app.post("/api/check_email")
async def check_email(email: str = Body(..., embed=True)):
    try:
        user = await db.get_user_by_email(email)
        return {"exists": user is not None}
    except Exception as e:
        logger.error(f"Error checking email: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error checking email: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """Health check endpoint for Railway to verify the application is running"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "environment": "production" if os.getenv("RAILWAY_ENVIRONMENT") else "development"
    }

@app.get("/api/movies")
async def get_movies():
    try:
        movies = await db.get_all_movies()
        # Add showtimes to each movie
        for movie in movies:
            showtimes = await db.get_movie_showtimes(movie["id"])
            movie["showtimes"] = [{
                "date": showtime["date"],
                "time": showtime["time"],
                "cinema": showtime["cinema_name"],
                "booking_link": showtime["booking_link"]
            } for showtime in showtimes]
        
        return movies
    except Exception as e:
        print(f"Error in get_movies: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/movies/{movie_id}")
async def get_movie(movie_id: str):
    movie = await db.get_movie_by_id(movie_id)
    
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    # Get actual showtimes from database
    showtimes = await db.get_movie_showtimes(movie_id)
    
    # Format showtimes to match the expected structure
    formatted_showtimes = [{
        "date": showtime["date"].strftime("%Y-%m-%d") if isinstance(showtime["date"], datetime) else showtime["date"],
        "time": showtime["time"],
        "cinema": showtime["cinema_name"],
        "booking_link": showtime["booking_link"]
    } for showtime in showtimes]
    
    movie["showtimes"] = formatted_showtimes
    return movie

@app.get("/api/cinemas")
async def get_cinemas():
    try:
        cinemas = await db.get_all_cinemas()
        
        # Add current movies to each cinema
        for cinema in cinemas:
            movies = await db.get_cinema_movies(cinema["id"])
            cinema["currentMovies"] = movies
        
        return cinemas
    except Exception as e:
        print(f"Error in get_cinemas: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/cinemas/{cinema_id}")
async def get_cinema(cinema_id: str):
    try:
        # Get the cinema details
        cinema = await db.get_cinema(cinema_id)
        if not cinema:
            raise HTTPException(status_code=404, detail="Cinema not found")

        # Get current movies for this cinema
        movies = await db.get_cinema_movies(cinema_id)
        
        # Ensure showtimes is never null
        for movie in movies:
            if movie['showtimes'] is None:
                movie['showtimes'] = []
        
        # Add the movies to the cinema object
        cinema['currentMovies'] = movies

        return cinema
    except Exception as e:
        logger.error(f"Error in get_cinema: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/users/register")
async def register_user(user_data: UserRegister):
    try:
        # Check if user already exists
        existing_user = await db.get_user_by_email(user_data.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Hash the password
        hashed_password = pwd_context.hash(user_data.password)
        
        # Create user with hashed password
        user_dict = user_data.dict()
        user_dict["password"] = hashed_password
        
        # Create the user and get the created user data
        created_user = await db.create_user(user_dict)
        
        if not created_user:
            raise HTTPException(status_code=500, detail="Failed to create user")
            
        # Format the date in the response
        if isinstance(created_user["data_nascita"], date):
            created_user["data_nascita"] = created_user["data_nascita"].isoformat()
            
        # Return the created user data
        return JSONResponse(content={
            "message": "User registered successfully",
            "user": {
                "id": created_user["id"],
                "email": created_user["email"],
                "nome": created_user["nome"],
                "cognome": created_user["cognome"],
                "citta": created_user["citta"],
                "cap": created_user["cap"],
                "data_nascita": created_user["data_nascita"],
                "telefono": created_user["telefono"]
            }
        })
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Registration error: {str(e)}")  # Add logging
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/users/login")
async def login(user_data: UserLogin):
    try:
        email = user_data.email
        password = user_data.password  # Make sure we're getting the password
        logger.info(f"Login attempt for email: {email}")

        user = await db.get_user_by_email(email)
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        # Verify the password using the same pwd_context we used for hashing
        if not pwd_context.verify(password, user.get('password', '')):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        # Remove password from response
        user_response = {k: v for k, v in user.items() if k != 'password'}
        
        return {
            "message": "Login successful",
            "user": user_response
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Login failed"
        )

@app.get("/api/users", response_model=List[UserResponse])
async def get_users():
    try:
        logger.info("Fetching all users")
        users = await db.get_all_users()
        
        # Format the response
        formatted_users = []
        for user in users:
            # Convert date to string format
            data_nascita = user["data_nascita"]
            if isinstance(data_nascita, date):
                data_nascita = data_nascita.isoformat()
            
            formatted_user = {
                "id": user["id"],
                "email": user["email"],
                "nome": user["nome"],
                "cognome": user["cognome"],
                "citta": user["citta"],
                "cap": user["cap"],
                "data_nascita": data_nascita,
                "telefono": user["telefono"]
            }
            formatted_users.append(formatted_user)
        
        return JSONResponse(content=formatted_users)
        
    except Exception as e:
        logger.error(f"Error getting users: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving users: {str(e)}"
        )

@app.post("/api/users/send-verification")
async def send_verification_email(email_data: dict):
    try:
        # Generate verification token
        token = jwt.encode(
            {
                'email': email_data['email'],
                'exp': datetime.utcnow() + timedelta(hours=24)
            },
            SECRET_KEY,  # Move this to environment variables
            algorithm='HS256'
        )
        
        # Create verification link
        verification_link = f"{os.getenv('NEXT_PUBLIC_API_URL')}/verify-email?token={token}"
        
        # Email content
        msg = MIMEText(f'''
            <h1>Verifica il tuo indirizzo email</h1>
            <p>Clicca sul link seguente per verificare il tuo account:</p>
            <a href="{verification_link}">Verifica Email</a>
            <p>Il link scadrà tra 24 ore.</p>
        ''', 'html')
        
        msg['Subject'] = 'Verifica il tuo account'
        msg['From'] = EMAIL_HOST_USER  # Update with your email
        msg['To'] = email_data['email']
        
        # Send email (configure with your SMTP settings)
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)  # Use environment variables
            server.send_message(msg)
        
        return {"message": "Verification email sent"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error sending verification email: {str(e)}"
        )

@app.get("/api/users/verify/{token}")
async def verify_email(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        email = payload['email']
        
        # Update user verification status in database
        await db.update_user_verification(email)
        
        return {"message": "Email verified successfully"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=400,
            detail="Verification link has expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=400,
            detail="Invalid verification token"
        )

# Password Reset Request
@app.post("/api/users/password-reset/request")
async def request_password_reset(email_data: PasswordResetRequest):
    try:
        email = email_data.email
        logger.info(f"Processing password reset request for email: {email}")
        
        user = await db.get_user_by_email(email)
        
        if not user:
            logger.info(f"No user found for email: {email}")
            return {"message": "Se l'email esiste, riceverai il link per reimpostare la password"}
        
        try:
            # Generate reset token with proper expiration (1 hour from now)
            current_time = datetime.utcnow()
            exp_time = current_time + timedelta(hours=1)
            
            logger.info(f"Current UTC time: {current_time}")
            logger.info(f"Expiration UTC time: {exp_time}")
            
            token_data = {
                'user_id': str(user['id']),
                'exp': exp_time.timestamp(),
                'iat': current_time.timestamp()  # Add issued at time
            }
            
            logger.info(f"Token data structure: {token_data}")
            
            # Generate token
            token = jwt.encode(
                payload=token_data,
                key=str(SECRET_KEY),
                algorithm='HS256'
            )
            logger.info(f"Generated new token: {token[:20]}...")  # Log first 20 chars
            
            # Create reset link
            reset_link = f"{os.getenv('NEXT_PUBLIC_FRONTEND_URL')}/reset-password?token={token}"
            logger.info("Reset link generated successfully")
            
            # Email content
            msg = MIMEText(f'''
                <html>
                    <body>
                        <h1>Reimposta la tua password</h1>
                        <p>Hai richiesto di reimpostare la password del tuo account.</p>
                        <p>Clicca sul link seguente per procedere:</p>
                        <a href="{reset_link}">Reimposta Password</a>
                        <p>Il link scadrà tra 1 ora.</p>
                        <p>Se non hai richiesto tu il reset della password, ignora questa email.</p>
                    </body>
                </html>
            ''', 'html', 'utf-8')
            
            msg['Subject'] = 'Reimposta la tua password'
            msg['From'] = EMAIL_HOST_USER
            msg['To'] = email
            
            # Send email
            with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
                server.starttls()
                server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
                server.send_message(msg)
                logger.info(f"Password reset email sent successfully to {email}")
            
            return {"message": "Se l'email esiste, riceverai il link per reimpostare la password"}
            
        except Exception as jwt_error:
            logger.error(f"JWT encoding error: {str(jwt_error)}")
            raise
            
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Si è verificato un errore durante l'invio dell'email"
        )

# Reset Password with Token
@app.post("/api/users/reset-password/{token}")
async def reset_password(token: str, password_data: dict):
    try:
        logger.info(f"Attempting to verify token: {token[:20]}...")  # Log first 20 chars
        
        # Verify the token
        try:
            # Add leeway to handle slight time differences
            payload = jwt.decode(
                token, 
                str(SECRET_KEY), 
                algorithms=['HS256'],
                leeway=60  # Increase leeway to 60 seconds
            )
            
            logger.info(f"Token payload: {payload}")
            user_id = payload.get('user_id')
            exp = payload.get('exp')
            iat = payload.get('iat')
            
            logger.info(f"Token details - User ID: {user_id}, Issued at: {datetime.fromtimestamp(iat) if iat else 'N/A'}, Expires: {datetime.fromtimestamp(exp) if exp else 'N/A'}")
            logger.info(f"Current UTC time: {datetime.utcnow()}")
            
            if not user_id:
                raise HTTPException(status_code=400, detail="Invalid token")
                
            # Check if token is expired
            if exp and datetime.fromtimestamp(exp) < datetime.utcnow():
                logger.error(f"Token expired at {datetime.fromtimestamp(exp)}")
                raise HTTPException(status_code=400, detail="Token has expired")
                
        except jwt.ExpiredSignatureError:
            logger.error("JWT expired signature error")
            raise HTTPException(status_code=400, detail="Token has expired")
        except jwt.JWTError as e:
            logger.error(f"JWT decode error: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid token")

        # Get the new password from request body
        new_password = password_data.get('password')
        if not new_password:
            raise HTTPException(status_code=400, detail="Password is required")

        # Hash the new password
        hashed_password = pwd_context.hash(new_password)

        # Update the password in the database
        success = await db.update_user_password(int(user_id), hashed_password)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update password")

        return {"message": "Password updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error resetting password")

@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    try:
        user = await db.get_user_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )
            
        # Format the date
        if isinstance(user["data_nascita"], date):
            user["data_nascita"] = user["data_nascita"].isoformat()
            
        return JSONResponse(content=user)
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error getting user: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error retrieving user"
        )        

@app.put("/api/users/{user_id}")
async def update_user(user_id: int, user_data: dict):
    try:
        updated_user = await db.update_user(user_id, user_data)
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Format the date in the response
        if isinstance(updated_user["data_nascita"], date):
            updated_user["data_nascita"] = updated_user["data_nascita"].isoformat()
            
        return JSONResponse(content=updated_user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users/{user_id}/movie-history")
async def get_user_movie_history(user_id: int):
    try:
        history = await db.get_user_movie_history(user_id)
        
        # Format dates in the movie history
        for entry in history:
            if isinstance(entry.get("watch_date"), (date, datetime)):
                entry["watch_date"] = entry["watch_date"].isoformat()
                
        return JSONResponse(content=history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Profile Picture Upload
@app.post("/api/users/{user_id}/profile-picture")
async def upload_profile_picture(user_id: int, profile_picture: UploadFile = File(...)):
    try:
        # Create unique filename
        file_extension = profile_picture.filename.split(".")[-1]
        new_filename = f"user_{user_id}_{datetime.now().timestamp()}.{file_extension}"
        file_path = UPLOAD_DIR / new_filename
        
        # Save the file
        with file_path.open("wb") as buffer:
            content = await profile_picture.read()
            buffer.write(content)
        
        # Update user profile in database with new picture URL
        profile_picture_url = f"/uploads/profile_pictures/{new_filename}"
        await db.update_user_profile_picture(user_id, profile_picture_url)
        
        return {"profile_picture": profile_picture_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Resend Verification Email
@app.post("/api/users/{user_id}/resend-verification")
async def resend_verification_email(user_id: int):
    try:
        # Get user email
        user = await db.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate verification token
        token = jwt.encode(
            {
                'email': user['email'],
                'exp': datetime.utcnow() + timedelta(hours=24)
            },
            SECRET_KEY,  # Move to environment variables
            algorithm='HS256'
        )
        
        # Create verification link
        verification_link = f"{os.getenv('NEXT_PUBLIC_FRONTEND_URL')}/verify-email?token={token}"
        
        # Email content
        msg = MIMEText(f'''
            <h1>Verifica il tuo indirizzo email</h1>
            <p>Clicca sul link seguente per verificare il tuo account:</p>
            <a href="{verification_link}">Verifica Email</a>
            <p>Il link scadrà tra 24 ore.</p>
        ''', 'html')
        
        msg['Subject'] = 'Verifica il tuo account'
        msg['From'] = 'your-email@example.com'  # Update with your email
        msg['To'] = user['email']
        
        # Send email
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login('your-email@example.com', 'your-password')  # Use environment variables
            server.send_message(msg)
        
        return {"message": "Verification email sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Delete Account
@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int):
    try:
        # Get user to check if exists
        user = await db.get_user_by_id(user_id)
        print(f"Attempting to delete user {user_id}")  # Debug log
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Delete profile picture if exists
        if user.get('profile_picture'):
            try:
                file_path = UPLOAD_DIR / user['profile_picture'].split('/')[-1]
                if file_path.exists():
                    file_path.unlink()
            except Exception as e:
                print(f"Error deleting profile picture: {str(e)}")  # Debug log
                # Continue with user deletion even if picture deletion fails
        
        # Delete user from database
        try:
            await db.delete_user(user_id)
            print(f"User {user_id} deleted successfully")  # Debug log
            return {"message": "User account deleted successfully"}
        except Exception as e:
            print(f"Database error deleting user: {str(e)}")  # Debug log
            raise HTTPException(
                status_code=500,
                detail=f"Database error: {str(e)}"
            )
            
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Unexpected error deleting user: {str(e)}")  # Debug log
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete account: {str(e)}"
        )

@app.get("/api/debug/db-status")
async def check_db_status():
    try:
        with db._get_connection() as conn:
            with conn.cursor() as cur:
                # Check movies table
                cur.execute("SELECT COUNT(*) as count FROM movies")
                movie_count = cur.fetchone()[0]
                
                # Check cinemas table
                cur.execute("SELECT COUNT(*) as count FROM cinemas")
                cinema_count = cur.fetchone()[0]
                
                # Check showtimes table
                cur.execute("SELECT COUNT(*) as count FROM showtimes")
                showtime_count = cur.fetchone()[0]
                
                return {
                    "database_connection": "successful",
                    "movie_count": movie_count,
                    "cinema_count": cinema_count,
                    "showtime_count": showtime_count
                }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@app.get("/api/debug/db-connection")
async def test_db_connection():
    try:
        with db._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT version();")
                version = cur.fetchone()
                return {
                    "status": "connected",
                    "postgres_version": version['version']
                }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@app.get("/api/debug/data")
async def get_debug_data():
    try:
        with db._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get cinemas count
                cur.execute("SELECT COUNT(*) as cinema_count FROM cinemas")
                cinema_count = cur.fetchone()['cinema_count']
                
                # Get movies count
                cur.execute("SELECT COUNT(*) as movie_count FROM movies")
                movie_count = cur.fetchone()['movie_count']
                
                # Get showtimes count
                cur.execute("SELECT COUNT(*) as showtime_count FROM showtimes")
                showtime_count = cur.fetchone()['showtime_count']
                
                # Get sample data
                cur.execute("SELECT * FROM cinemas LIMIT 2")
                sample_cinemas = cur.fetchall()
                
                cur.execute("SELECT * FROM movies LIMIT 2")
                sample_movies = cur.fetchall()
                
                cur.execute("SELECT * FROM showtimes LIMIT 2")
                sample_showtimes = cur.fetchall()
                
                return {
                    "counts": {
                        "cinemas": cinema_count,
                        "movies": movie_count,
                        "showtimes": showtime_count
                    },
                    "samples": {
                        "cinemas": sample_cinemas,
                        "movies": sample_movies,
                        "showtimes": sample_showtimes
                    }
                }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/debug/users")
async def debug_users():
    try:
        with db._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Check table existence
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'users'
                    );
                """)
                table_exists = cur.fetchone()['exists']
                
                if not table_exists:
                    return {"error": "Users table does not exist"}
                
                # Get table structure
                cur.execute("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'users';
                """)
                columns = cur.fetchall()
                
                # Get row count
                cur.execute("SELECT COUNT(*) as count FROM users;")
                count = cur.fetchone()['count']
                
                # Get sample data (first row)
                cur.execute("SELECT * FROM users LIMIT 1;")
                sample = cur.fetchone()
                
                return {
                    "table_exists": table_exists,
                    "columns": columns,
                    "row_count": count,
                    "sample_data": sample
                }
    except Exception as e:
        return {"error": str(e)}

@app.on_event("startup")
async def startup_event():
    """Initialize application state on startup"""
    try:
        # Test database connection
        await db.test_connection()
        
        # Log important configuration
        port = int(os.getenv("PORT", 8000))
        logger.info(f"Starting application on port {port}")
        logger.info(f"Database host: {os.getenv('PGHOST') or 'using DATABASE_URL'}")
        
        # Store CORS origins in app state
        app.state.cors_origins = [
            "http://localhost:3000",
            "https://stacco.vercel.app",
            "https://stacco-production.up.railway.app",
            os.getenv("NEXT_PUBLIC_FRONTEND_URL", "")
        ]
        
        # Initialize database tables
        try:
            await db._ensure_db_exists()
        except Exception as e:
            logger.error(f"Database initialization error: {e}")
            # Don't raise here, allow the application to start even if tables exist
            
    except Exception as e:
        logger.error(f"Startup error: {e}")
        raise

# Proper shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown"""
    try:
        await db.close_connections()
    except Exception as e:
        print(f"Shutdown error: {e}")

@app.get("/api/test")
async def test_endpoint():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        proxy_headers=True,
        forwarded_allow_ips="*"
    )