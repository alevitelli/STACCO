from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
from datetime import datetime
from ..database.db_manager import DatabaseManager
from .models import Movie, Showtime
from typing import List, Optional
import jwt
from datetime import datetime, timedelta
from email.mime.text import MIMEText
import smtplib
from pathlib import Path

app = FastAPI()
db = DatabaseManager()

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add these configurations at the top of your file
UPLOAD_DIR = Path("uploads/profile_pictures")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class UserRegister(BaseModel):
    email: str
    password: str
    nome: str
    cognome: str
    indirizzo: str
    dataNascita: str
    telefono: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    nome: str
    cognome: str
    indirizzo: str
    data_nascita: str
    telefono: str

@app.get("/api/movies")
async def get_movies():
    movies = await db.get_all_movies()
    
    # Add real showtimes to each movie
    for movie in movies:
        showtimes = await db.get_movie_showtimes(movie["id"])
        movie["showtimes"] = [{
            "date": showtime["date"],
            "time": showtime["time"],
            "cinema": showtime["cinema_name"],
            "booking_link": showtime["booking_link"]
        } for showtime in showtimes]
    
    return movies

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
    cinemas = await db.get_all_cinemas()
    
    # Add current movies to each cinema
    for cinema in cinemas:
        movies = await db.get_cinema_movies(cinema["id"])
        cinema["currentMovies"] = movies
    
    return cinemas

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
        
        await db.create_user(user_dict)
        return {"message": "User registered successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/users/login")
async def login_user(user_data: UserLogin):
    try:
        # Get user from database
        user = await db.get_user_by_email(user_data.email)
        
        # Check if user exists
        if user is None:
            raise HTTPException(
                status_code=400,
                detail="Email o password non corretti"
            )
        
        # Verify password
        if not pwd_context.verify(user_data.password, user["password"]):
            raise HTTPException(
                status_code=400,
                detail="Email o password non corretti"
            )
        
        # Remove sensitive data before sending response
        user_response = {
            "id": user["id"],
            "email": user["email"],
            "nome": user["nome"],
            "cognome": user["cognome"]
        }
        
        return {
            "message": "Login successful",
            "user": user_response
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Login error: {str(e)}")  # Add logging for debugging
        raise HTTPException(
            status_code=500,
            detail="Si è verificato un errore durante il login"
        )

@app.get("/api/users", response_model=List[UserResponse])
async def get_users():
    try:
        users = await db.get_all_users()
        return users
    except Exception as e:
        print(f"Error getting users: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error retrieving users"
        )

@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    try:
        user = await db.get_user_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )
        return user
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error getting user: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error retrieving user"
        )

@app.post("/api/users/check-email")
async def check_email(email_data: dict):
    try:
        existing_user = await db.get_user_by_email(email_data["email"])
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )
        return {"message": "Email available"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error checking email: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error checking email"
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
            'your-secret-key',  # Move this to environment variables
            algorithm='HS256'
        )
        
        # Create verification link
        verification_link = f"http://localhost:3000/verify-email?token={token}"
        
        # Email content
        msg = MIMEText(f'''
            <h1>Verifica il tuo indirizzo email</h1>
            <p>Clicca sul link seguente per verificare il tuo account:</p>
            <a href="{verification_link}">Verifica Email</a>
            <p>Il link scadrà tra 24 ore.</p>
        ''', 'html')
        
        msg['Subject'] = 'Verifica il tuo account'
        msg['From'] = 'your-email@example.com'  # Update with your email
        msg['To'] = email_data['email']
        
        # Send email (configure with your SMTP settings)
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login('your-email@example.com', 'your-password')  # Use environment variables
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
        payload = jwt.decode(token, 'your-secret-key', algorithms=['HS256'])
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

@app.put("/api/users/{user_id}")
async def update_user(user_id: int, user_data: dict):
    try:
        updated_user = await db.update_user(user_id, user_data)
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        return updated_user
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users/{user_id}/movie-history")
async def get_user_movie_history(user_id: int):
    try:
        history = await db.get_user_movie_history(user_id)
        return history
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
            'your-secret-key',  # Move to environment variables
            algorithm='HS256'
        )
        
        # Create verification link
        verification_link = f"http://localhost:3000/verify-email?token={token}"
        
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

# Password Reset Request
@app.post("/api/users/reset-password")
async def request_password_reset(email_data: dict):
    try:
        user = await db.get_user_by_email(email_data['email'])
        if not user:
            # Return success even if email doesn't exist (security best practice)
            return {"message": "If the email exists, a password reset link has been sent"}
        
        # Generate reset token
        token = jwt.encode(
            {
                'user_id': user['id'],
                'exp': datetime.utcnow() + timedelta(hours=1)
            },
            'your-secret-key',  # Move to environment variables
            algorithm='HS256'
        )
        
        # Create reset link
        reset_link = f"http://localhost:3000/reset-password?token={token}"
        
        # Email content
        msg = MIMEText(f'''
            <h1>Reset Password</h1>
            <p>Click the following link to reset your password:</p>
            <a href="{reset_link}">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
        ''', 'html')
        
        msg['Subject'] = 'Reset Password Request'
        msg['From'] = 'your-email@example.com'  # Update with your email
        msg['To'] = user['email']
        
        # Send email
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login('your-email@example.com', 'your-password')  # Use environment variables
            server.send_message(msg)
        
        return {"message": "If the email exists, a password reset link has been sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Reset Password with Token
@app.post("/api/users/reset-password/{token}")
async def reset_password(token: str, new_password: dict):
    try:
        # Verify token
        payload = jwt.decode(token, 'your-secret-key', algorithms=['HS256'])
        user_id = payload['user_id']
        
        # Hash new password
        hashed_password = pwd_context.hash(new_password['password'])
        
        # Update password in database
        await db.update_user_password(user_id, hashed_password)
        
        return {"message": "Password reset successful"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Reset link has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=400, detail="Invalid reset token")
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