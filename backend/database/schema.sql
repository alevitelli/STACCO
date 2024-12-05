CREATE TABLE IF NOT EXISTS cinemas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cinema_chain TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    website TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    genre TEXT,
    duration INTEGER,
    language TEXT,
    poster_url TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS showtimes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movie_id TEXT,
    cinema_id TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    booking_link TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (movie_id) REFERENCES movies(id),
    FOREIGN KEY (cinema_id) REFERENCES cinemas(id),
    UNIQUE(movie_id, cinema_id, date, time)
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nome TEXT NOT NULL,
    cognome TEXT NOT NULL,
    indirizzo TEXT NOT NULL,
    data_nascita DATE NOT NULL,
    telefono TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    profile_picture VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS movie_watches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    movie_id TEXT NOT NULL,
    cinema_id TEXT NOT NULL,
    watch_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(id),
    FOREIGN KEY (cinema_id) REFERENCES cinemas(id)
);