from setuptools import setup, find_packages

setup(
    name="stacco",
    version="0.1",
    packages=find_packages(),
    install_requires=[
        'aiohttp',
        'beautifulsoup4',
        'pytest',
        'pytest-asyncio'
    ],
) 