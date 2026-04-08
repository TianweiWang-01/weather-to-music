const weatherCard = document.getElementById('weather-card');
const musicCard = document.getElementById('music-card');
const manualSection = document.getElementById('manual-section');
const errorMsg = document.getElementById('error-msg');
const cityForm = document.getElementById('city-form');
const cityInput = document.getElementById('city-input');
const moodText = document.getElementById('mood-text');
const themeLabel = document.getElementById('theme-label');
const statusLabel = document.getElementById('status-label');
const musicRefreshBtn = document.querySelector('.music-refresh');

const API_CONSTANTS = {
    REVERSE_GEOCODE_URL: 'https://api.bigdatacloud.net/data/reverse-geocode-client',
    WEATHER_URL: 'https://api.open-meteo.com/v1/forecast',
    GEOCODING_URL: 'https://geocoding-api.open-meteo.com/v1/search',
    ITUNES_URL: 'https://itunes.apple.com/search',
    ITUNES_LIMIT: 6,
    COVER_SIZE_FROM: '100x100',
    COVER_SIZE_TO: '200x200'
};

let currentWeatherMain = 'Clouds';

const themeMap = {
    Clear: {
        mood: "Mood: bright and light",
        theme: "Sunny Glow",
        direction: "Light pop",
        pageTheme: "clear"
    },
    Clouds: {
        mood: "Mood: calm and reflective",
        theme: "Soft Cloud",
        direction: "Ambient ease",
        pageTheme: "clouds"
    },
    Fog: {
        mood: "Mood: quiet and hazy",
        theme: "Misty Air",
        direction: "Lo-fi slow beats",
        pageTheme: "clouds"
    },
    Rain: {
        mood: "Mood: soft and fluid",
        theme: "Rain Hush",
        direction: "Rainy-night folk",
        pageTheme: "rain"
    },
    Snow: {
        mood: "Mood: cool and gentle",
        theme: "Snow Soft",
        direction: "Piano ambience",
        pageTheme: "snow"
    },
    Thunderstorm: {
        mood: "Mood: dramatic tension",
        theme: "Storm Pulse",
        direction: "Cinematic electronic",
        pageTheme: "storm"
    }
};

function initApp() {
    if (!navigator.geolocation) {
        showError("Your browser does not support location access. Please enter a city manually.");
        showManualInput();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            getCityNameByCoords(lat, lon);
        },
        (error) => {
            console.log("Location failed:", error.code);
            showError("Unable to access your location. Switched to manual search mode.");
            showManualInput();
        }
    );
}

async function getCityNameByCoords(lat, lon) {
    try {
        const url = `${API_CONSTANTS.REVERSE_GEOCODE_URL}?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
        const res = await fetch(url);

        if (!res.ok) throw new Error("Reverse geocoding failed");

        const data = await res.json();
        const cityName = data.city || data.locality || data.principalSubdivision || "Unknown location";
        getWeatherByCoords(lat, lon, cityName);
    } catch (err) {
        console.error("BigDataCloud error:", err);
        getWeatherByCoords(lat, lon, "Current location");
    }
}

async function getWeatherByCoords(lat, lon, cityName) {
    try {
        const url = `${API_CONSTANTS.WEATHER_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
        const res = await fetch(url);

        if (!res.ok) throw new Error("Weather request failed");

        const data = await res.json();
        const weatherInfo = parseWeatherData(data, cityName);
        renderWeather(weatherInfo);
        getMusicByWeather(weatherInfo.weatherMain);
    } catch (err) {
        console.error("Open-Meteo error:", err);
        showError("Failed to load weather data. Please try again later.");
        showManualInput();
    }
}

async function getCoordsByCityName(cityName) {
    try {
        const url = `${API_CONSTANTS.GEOCODING_URL}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
        const res = await fetch(url);

        if (!res.ok) throw new Error("City search failed");

        const data = await res.json();
        if (!data.results || data.results.length === 0) {
            throw new Error("City not found. Please check the spelling and try again.");
        }

        const { latitude, longitude, name } = data.results[0];
        getWeatherByCoords(latitude, longitude, name);
    } catch (err) {
        console.error("Open-Meteo geocoding error:", err);
        showError(err.message);
    }
}

function parseWeatherData(data, cityName) {
    const temp = Math.round(data.current.temperature_2m);
    const weatherCode = data.current.weather_code;

    let weatherMain = "";
    let description = "";
    let icon = "";

    if (weatherCode === 0) {
        weatherMain = "Clear";
        description = "Sunny";
        icon = "☀";
    } else if (weatherCode <= 3) {
        weatherMain = "Clouds";
        description = "Cloudy";
        icon = "☁";
    } else if (weatherCode <= 49) {
        weatherMain = "Fog";
        description = "Foggy";
        icon = "≋";
    } else if (weatherCode <= 67) {
        weatherMain = "Rain";
        description = "Rainy";
        icon = "☂";
    } else if (weatherCode <= 77) {
        weatherMain = "Snow";
        description = "Snowy";
        icon = "❄";
    } else if (weatherCode <= 82) {
        weatherMain = "Rain";
        description = "Showers";
        icon = "☂";
    } else if (weatherCode <= 86) {
        weatherMain = "Snow";
        description = "Snow Showers";
        icon = "❄";
    } else {
        weatherMain = "Thunderstorm";
        description = "Thunderstorm";
        icon = "⚡";
    }

    return {
        cityName,
        temp,
        description,
        icon,
        weatherMain
    };
}

function renderWeather(weather) {
    const themeInfo = themeMap[weather.weatherMain] || themeMap.Clouds;
    currentWeatherMain = weather.weatherMain;

    document.getElementById('location').textContent = weather.cityName;
    document.getElementById('temperature').textContent = `${weather.temp}°C`;
    document.getElementById('description').textContent = weather.description;
    document.getElementById('weather-icon').textContent = weather.icon;
    moodText.textContent = themeInfo.mood;
    themeLabel.textContent = themeInfo.theme;
    statusLabel.textContent = themeInfo.direction;

    changeBackground(weather.weatherMain);

    document.body.classList.add('has-weather');
    document.body.classList.remove('manual-mode');
    weatherCard.classList.remove('hidden');
    errorMsg.classList.add('hidden');
    manualSection.classList.add('hidden');
}

async function getMusicByWeather(weatherCondition) {
    let musicQueries = [];
    switch (weatherCondition) {
        case "Clear":
            musicQueries = ["sunny happy pop", "summer upbeat hits", "bright cheerful music"];
            break;
        case "Clouds":
        case "Fog":
            musicQueries = ["chill indie mellow", "soft relaxing vibes", "calm lo-fi beats"];
            break;
        case "Rain":
            musicQueries = ["rainy night jazz", "soft rain acoustic", "chill rainy day music"];
            break;
        case "Snow":
            musicQueries = ["winter cozy piano", "warm christmas music", "soft snowy day vibes"];
            break;
        case "Thunderstorm":
            musicQueries = ["intense rock energy", "dramatic epic music", "powerful alternative hits"];
            break;
        default:
            musicQueries = ["popular pop songs", "chill music playlist", "soft indie songs"];
    }

    for (const query of musicQueries) {
        try {
            const url = `${API_CONSTANTS.ITUNES_URL}?term=${encodeURIComponent(query)}&entity=song&limit=${API_CONSTANTS.ITUNES_LIMIT}`;
            const res = await fetch(url);

            if (!res.ok) throw new Error("Music search failed");

            const data = await res.json();
            if (data.resultCount > 0) {
                renderMusicList(data.results);
                return;
            }
        } catch (err) {
            console.error("iTunes search attempt failed:", query, err);
            continue;
        }
    }

    renderMusicFallback();
}

function renderMusicList(tracks) {
    const trackList = document.getElementById('track-list');
    trackList.innerHTML = "";

    tracks.forEach((track, index) => {
        const coverUrl = track.artworkUrl100.replace(API_CONSTANTS.COVER_SIZE_FROM, API_CONSTANTS.COVER_SIZE_TO);

        const li = document.createElement('li');
        li.innerHTML = `
            <img src="${coverUrl}" alt="${track.trackName} cover" class="track-cover">
            <div class="track-info">
                <span class="track-title">${index + 1}. ${track.trackName}</span>
                <span class="track-artist">${track.artistName}</span>
                <audio controls class="track-audio" src="${track.previewUrl}">
                    Your browser does not support audio playback.
                </audio>
            </div>
        `;
        trackList.appendChild(li);
    });

    musicCard.classList.remove('hidden');
}

function renderMusicFallback() {
    const trackList = document.getElementById('track-list');
    trackList.innerHTML = `
        <li>
            <div class="track-info" style="text-align: center; width: 100%;">
                <span class="track-title">Music service is temporarily unavailable</span>
                <span class="track-artist">Try opening your favorite music app and playing something that fits the current weather.</span>
            </div>
        </li>
    `;
    musicCard.classList.remove('hidden');
}

function showManualInput() {
    document.body.classList.remove('has-weather');
    document.body.classList.add('manual-mode');
    document.body.dataset.theme = "storm";
    manualSection.classList.remove('hidden');
    weatherCard.classList.add('hidden');
    musicCard.classList.add('hidden');
}

function showError(message) {
    errorMsg.textContent = message;
    errorMsg.classList.remove('hidden');
}

function changeBackground(weatherCondition) {
    const body = document.body;
    switch (weatherCondition) {
        case "Clear":
            body.dataset.theme = "clear";
            break;
        case "Rain":
            body.dataset.theme = "rain";
            break;
        case "Thunderstorm":
            body.dataset.theme = "storm";
            break;
        case "Snow":
            body.dataset.theme = "snow";
            break;
        case "Clouds":
        case "Fog":
            body.dataset.theme = "clouds";
            break;
        default:
            body.dataset.theme = "clouds";
    }
}

cityForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (city) {
        getCoordsByCityName(city);
    }
});

musicRefreshBtn.addEventListener('click', () => {
    musicRefreshBtn.style.pointerEvents = 'none';
    musicRefreshBtn.textContent = '…';
    getMusicByWeather(currentWeatherMain).finally(() => {
        musicRefreshBtn.textContent = '↻';
        musicRefreshBtn.style.pointerEvents = '';
    });
});

initApp();
