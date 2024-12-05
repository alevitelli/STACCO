from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class Showtime(BaseModel):
    date: str  # ISO format date string
    time: str
    cinema: str
    booking_link: str = "#"

class Movie(BaseModel):
    id: str
    title: str
    genre: str
    duration: int
    language: str
    poster_url: str
    cinemas: str
    showtimes: List[Showtime] = []