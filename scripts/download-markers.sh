#!/bin/bash

# Create public directory if it doesn't exist
mkdir -p public

# Download marker icons
curl https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x.png -o public/marker-icon-2x.png
curl https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon.png -o public/marker-icon.png
curl https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png -o public/marker-shadow.png