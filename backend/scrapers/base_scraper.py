class BaseScraper:
    def __init__(self):
        pass

    async def get_cinemas(self):
        raise NotImplementedError

    async def get_showtimes(self, cinema_id: str):
        raise NotImplementedError

    async def get_movie_details(self, movie_id: str):
        raise NotImplementedError