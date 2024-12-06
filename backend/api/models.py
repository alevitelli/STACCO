from pydantic import BaseModel
from typing import List, Optional

class Showtime(BaseModel):
    date: str
    time: str
    booking_link: str

class Movie(BaseModel):
    id: str
    title: str
    genre: str
    duration: int
    language: str
    poster_url: str
    showtimes: List[Showtime]

class Cinema(BaseModel):
    id: str
    name: str
    cinema_chain: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    website: str
    icon_url: str
    currentMovies: List[Movie] = []