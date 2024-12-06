import sqlite3
import os

def init_db():
    # Get the directory of the current file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, 'cinema.db')
    
    # Remove existing database if it exists
    if os.path.exists(db_path):
        os.remove(db_path)
    
    # Create new database and tables
    with sqlite3.connect(db_path) as conn:
        with open(os.path.join(current_dir, 'schema.sql'), 'r') as f:
            conn.executescript(f.read())
        
        print("Database initialized successfully!")

if __name__ == "__main__":
    init_db()