const body = document.body;
const weatherOptions = document.querySelectorAll('.weather-option');
const activeWeatherIcon = document.getElementById('active-weather-icon');
const activeWeatherLabel = document.getElementById('active-weather-label');
const weatherNote = document.getElementById('weather-note');
const currentWeatherBtn = document.getElementById('current-weather-btn');
const projectTitle = document.getElementById('project-title');
const writingBoard = document.getElementById('writing-board');
const saveDraftBtn = document.getElementById('save-draft-btn');
const focusModeBtn = document.getElementById('focus-mode-btn');
const clearDraftBtn = document.getElementById('clear-draft-btn');
const clearDialog = document.getElementById('clear-dialog');
const wordCount = document.getElementById('word-count');
const characterCount = document.getElementById('character-count');
const readingTime = document.getElementById('reading-time');
const autosaveStatus = document.getElementById('autosave-status');
const timerRing = document.getElementById('timer-ring');
const timerDisplay = document.getElementById('timer-display');
const timerState = document.getElementById('timer-state');
const timerStartBtn = document.getElementById('timer-start-btn');
const timerPauseBtn = document.getElementById('timer-pause-btn');
const timerResetBtn = document.getElementById('timer-reset-btn');
const durationOptions = document.querySelectorAll('.duration-option');
const assistantButtons = document.querySelectorAll('[data-assistant-action]');
const assistantOutput = document.getElementById('assistant-output');
const insertAssistantBtn = document.getElementById('insert-assistant-btn');
const musicRefreshBtn = document.getElementById('music-refresh-btn');
const trackList = document.getElementById('track-list');
const errorMsg = document.getElementById('error-msg');
const sessionToast = document.getElementById('session-toast');

const STORAGE_KEY = 'skymelody-writing-studio-v1';

const API_CONSTANTS = {
    REVERSE_GEOCODE_URL: 'https://api.bigdatacloud.net/data/reverse-geocode-client',
    WEATHER_URL: 'https://api.open-meteo.com/v1/forecast',
    ITUNES_URL: 'https://itunes.apple.com/search',
    ITUNES_LIMIT: 6,
    COVER_SIZE_FROM: '100x100',
    COVER_SIZE_TO: '300x300'
};

const WEATHER_PROFILES = {
    Clear: {
        room: 'Sun Room',
        label: 'Sunny',
        icon: '☀',
        pageTheme: 'clear',
        note: 'Sun Room is active. Music and prompts lean bright, open, and forward-moving.',
        tempo: 'bright and direct',
        sensory: 'warmth, glare, open windows, fast shadows',
        musicQueries: ['sunny happy pop', 'summer upbeat indie', 'bright morning acoustic'],
        prompts: [
            'Write about a character who mistakes brightness for certainty.',
            'Begin with a room so full of light that it hides one important detail.',
            'Describe a decision that becomes easier only after the clouds leave.'
        ]
    },
    Clouds: {
        room: 'Cloud Room',
        label: 'Cloudy',
        icon: '☁',
        pageTheme: 'clouds',
        note: 'Cloud Room is active. Music and prompts soften the edges for reflective writing.',
        tempo: 'gentle and reflective',
        sensory: 'muted skies, cotton light, gray-blue distance',
        musicQueries: ['chill indie mellow', 'soft relaxing vibes', 'dreamy alternative music'],
        prompts: [
            'Write about a thought that keeps changing shape before it can be named.',
            'Start with someone watching the sky instead of answering a question.',
            'Describe a memory that feels close but refuses to become clear.'
        ]
    },
    Rain: {
        room: 'Rain Room',
        label: 'Rainy',
        icon: '☂',
        pageTheme: 'rain',
        note: 'Rain Room is active. Music and prompts are tuned to a slower, more reflective mood.',
        tempo: 'slow and intimate',
        sensory: 'window streaks, wet pavement, low lamps, distant tires',
        musicQueries: ['rainy night jazz', 'soft rain acoustic', 'chill rainy day music'],
        prompts: [
            'Begin with the sound of rain interrupting something unsaid.',
            'Write a scene where two people are honest only because the weather is loud.',
            'Describe a street after rain as if it remembers everyone who crossed it.'
        ]
    },
    Snow: {
        room: 'Snow Room',
        label: 'Snowy',
        icon: '❄',
        pageTheme: 'snow',
        note: 'Snow Room is active. Music and prompts create a clean, quiet writing field.',
        tempo: 'quiet and precise',
        sensory: 'white roofs, muffled footsteps, cold glass, breath in the air',
        musicQueries: ['winter cozy piano', 'soft snowy day vibes', 'peaceful winter instrumental'],
        prompts: [
            'Write about a place that becomes honest only when covered in snow.',
            'Begin with a footprint that should not be there.',
            'Describe silence as if it has weight, temperature, and texture.'
        ]
    },
    Fog: {
        room: 'Fog Room',
        label: 'Foggy',
        icon: '≋',
        pageTheme: 'fog',
        note: 'Fog Room is active. Music and prompts invite mystery, fragments, and half-seen details.',
        tempo: 'hazy and patient',
        sensory: 'blurred streetlights, damp air, soft outlines, hidden turns',
        musicQueries: ['ambient lo-fi foggy', 'moody cinematic ambient', 'slow mysterious instrumental'],
        prompts: [
            'Start with a figure appearing before the narrator knows whether to trust them.',
            'Write a paragraph where every object is partly hidden.',
            'Describe uncertainty without using the words confused, lost, or afraid.'
        ]
    },
    Thunderstorm: {
        room: 'Storm Room',
        label: 'Stormy',
        icon: '⚡',
        pageTheme: 'storm',
        note: 'Storm Room is active. Music and prompts raise tension for bold, high-pressure writing.',
        tempo: 'charged and dramatic',
        sensory: 'hard rain, electric air, rattled windows, sudden dark',
        musicQueries: ['dramatic epic music', 'intense alternative rock', 'cinematic electronic storm'],
        prompts: [
            'Write the moment before someone says the sentence that changes everything.',
            'Begin with thunder covering the sound of a door opening.',
            'Describe a conflict that feels as if the room itself is taking sides.'
        ]
    }
};

const FALLBACK_TRACKS = {
    Clear: ['Golden Hour Draft', 'Open Window Chorus', 'Bright Page Morning'],
    Clouds: ['Low Cloud Notes', 'Gray Blue Outline', 'Soft Weather Sketch'],
    Rain: ['Window Rain Study', 'After Midnight Pavement', 'Quiet Lamp Melody'],
    Snow: ['White Room Piano', 'Footprints in Silence', 'Clean Page Waltz'],
    Fog: ['Hidden Streetlight', 'Edges Out of Focus', 'Slow Mist Theme'],
    Thunderstorm: ['Voltage Draft', 'Thunder Underline', 'Last Line Pressure']
};

const appState = {
    weather: 'Rain',
    selectedDuration: 1500,
    remainingSeconds: 1500,
    timerInterval: null,
    isTimerRunning: false,
    assistantText: '',
    assistantSeed: 0,
    musicQueryIndexes: {}
};

const queueAutoSave = debounce(() => saveDraft('Saved locally'), 500);

function initApp() {
    loadDraft();
    bindEvents();
    selectWeather(appState.weather, { fetchMusic: true, save: false });
    updateWritingStats();
    updateTimerDisplay();
}

function bindEvents() {
    weatherOptions.forEach((option) => {
        option.addEventListener('click', () => {
            selectWeather(option.dataset.weather, { fetchMusic: true, save: true });
        });
    });

    currentWeatherBtn.addEventListener('click', useCurrentWeather);
    saveDraftBtn.addEventListener('click', () => saveDraft('Saved manually'));
    focusModeBtn.addEventListener('click', toggleFocusMode);
    clearDraftBtn.addEventListener('click', openClearDialog);

    projectTitle.addEventListener('input', handleDraftInput);
    writingBoard.addEventListener('input', handleDraftInput);

    durationOptions.forEach((option) => {
        option.addEventListener('click', () => {
            setTimerDuration(Number(option.dataset.duration));
        });
    });

    timerStartBtn.addEventListener('click', startTimer);
    timerPauseBtn.addEventListener('click', pauseTimer);
    timerResetBtn.addEventListener('click', resetTimer);

    assistantButtons.forEach((button) => {
        button.addEventListener('click', () => {
            generateAssistantSuggestion(button.dataset.assistantAction);
        });
    });

    insertAssistantBtn.addEventListener('click', insertAssistantSuggestion);
    musicRefreshBtn.addEventListener('click', () => fetchMusicByWeather(appState.weather, { refresh: true }));

    clearDialog.addEventListener('close', () => {
        if (clearDialog.returnValue === 'confirm') {
            clearDraft();
        }
        clearDialog.returnValue = '';
    });
}

function selectWeather(weatherKey, options = {}) {
    const profile = WEATHER_PROFILES[weatherKey] || WEATHER_PROFILES.Rain;
    appState.weather = weatherKey;
    body.dataset.theme = profile.pageTheme;

    weatherOptions.forEach((option) => {
        const isActive = option.dataset.weather === weatherKey;
        option.classList.toggle('active', isActive);
        option.setAttribute('aria-pressed', String(isActive));
    });

    activeWeatherIcon.textContent = profile.icon;
    activeWeatherLabel.textContent = profile.room;
    weatherNote.textContent = options.note || profile.note;
    assistantOutput.textContent = `The ${profile.room} is ready. Ask for a spark, continuation, or shaping note when the page needs a nudge.`;
    insertAssistantBtn.disabled = true;
    appState.assistantText = '';

    if (options.fetchMusic) {
        fetchMusicByWeather(weatherKey);
    }

    if (options.save) {
        saveDraft('Atmosphere saved');
    }
}

function handleDraftInput() {
    updateWritingStats();
    autosaveStatus.textContent = 'Saving...';
    queueAutoSave();
}

function updateWritingStats() {
    const text = writingBoard.value.trim();
    const words = text ? text.split(/\s+/).filter(Boolean) : [];
    const characters = writingBoard.value.length;
    const minutes = words.length === 0 ? 0 : Math.max(1, Math.ceil(words.length / 220));

    wordCount.textContent = words.length;
    characterCount.textContent = characters;
    readingTime.textContent = minutes;
}

function saveDraft(statusText) {
    const draft = {
        title: projectTitle.value,
        text: writingBoard.value,
        weather: appState.weather,
        selectedDuration: appState.selectedDuration,
        remainingSeconds: appState.remainingSeconds,
        updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    autosaveStatus.textContent = `${statusText} at ${formatTimeOfDay(new Date())}`;
    showToast(statusText);
}

function loadDraft() {
    const rawDraft = localStorage.getItem(STORAGE_KEY);
    if (!rawDraft) return;

    try {
        const draft = JSON.parse(rawDraft);
        projectTitle.value = draft.title || '';
        writingBoard.value = draft.text || '';

        if (WEATHER_PROFILES[draft.weather]) {
            appState.weather = draft.weather;
        }

        if (Number.isFinite(draft.selectedDuration)) {
            appState.selectedDuration = draft.selectedDuration;
            appState.remainingSeconds = Number.isFinite(draft.remainingSeconds)
                ? draft.remainingSeconds
                : draft.selectedDuration;
        }
    } catch (err) {
        console.error('Draft could not be loaded:', err);
    }
}

function openClearDialog() {
    if (typeof clearDialog.showModal === 'function') {
        clearDialog.showModal();
        return;
    }

    clearDraft();
}

function clearDraft() {
    projectTitle.value = '';
    writingBoard.value = '';
    localStorage.removeItem(STORAGE_KEY);
    updateWritingStats();
    autosaveStatus.textContent = 'Draft cleared';
    showToast('Draft cleared');
}

function toggleFocusMode() {
    const isFocused = body.classList.toggle('focus-mode');
    focusModeBtn.textContent = isFocused ? '◰' : '◱';
    focusModeBtn.setAttribute('aria-label', isFocused ? 'Exit focus mode' : 'Toggle focus mode');
    showToast(isFocused ? 'Focus mode on' : 'Focus mode off');
}

function setTimerDuration(seconds) {
    pauseTimer();
    appState.selectedDuration = seconds;
    appState.remainingSeconds = seconds;

    durationOptions.forEach((option) => {
        option.classList.toggle('active', Number(option.dataset.duration) === seconds);
    });

    updateTimerDisplay();
    saveDraft('Timer saved');
}

function startTimer() {
    if (appState.isTimerRunning) return;

    if (appState.remainingSeconds <= 0) {
        appState.remainingSeconds = appState.selectedDuration;
    }

    appState.isTimerRunning = true;
    timerState.textContent = 'Running';
    timerState.classList.add('running');

    appState.timerInterval = setInterval(() => {
        appState.remainingSeconds -= 1;
        updateTimerDisplay();

        if (appState.remainingSeconds <= 0) {
            completeTimer();
        }
    }, 1000);
}

function pauseTimer() {
    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
        appState.timerInterval = null;
    }

    appState.isTimerRunning = false;
    timerState.textContent = 'Paused';
    timerState.classList.remove('running');
}

function resetTimer() {
    pauseTimer();
    appState.remainingSeconds = appState.selectedDuration;
    updateTimerDisplay();
    saveDraft('Timer reset');
}

function completeTimer() {
    pauseTimer();
    appState.remainingSeconds = 0;
    updateTimerDisplay();
    timerState.textContent = 'Complete';
    body.classList.add('timer-complete');
    showToast('Writing sprint complete');

    setTimeout(() => {
        body.classList.remove('timer-complete');
    }, 1800);
}

function updateTimerDisplay() {
    const minutes = Math.floor(appState.remainingSeconds / 60);
    const seconds = appState.remainingSeconds % 60;
    const elapsed = appState.selectedDuration - appState.remainingSeconds;
    const progress = appState.selectedDuration === 0 ? 0 : Math.max(0, Math.min(360, (elapsed / appState.selectedDuration) * 360));

    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    timerRing.style.setProperty('--progress', `${progress}deg`);
}

function generateAssistantSuggestion(action) {
    const profile = WEATHER_PROFILES[appState.weather];
    const text = writingBoard.value.trim();
    const title = projectTitle.value.trim() || 'this piece';
    const lastSentence = getLastSentence(text);
    const prompt = profile.prompts[appState.assistantSeed % profile.prompts.length];

    appState.assistantSeed += 1;

    if (action === 'spark') {
        appState.assistantText = `${prompt}\n\nWeather lens: use ${profile.sensory}. Keep the rhythm ${profile.tempo}.`;
    } else if (action === 'continue') {
        appState.assistantText = buildContinuation(lastSentence, profile, title);
    } else {
        appState.assistantText = buildShapeAdvice(text, profile, title);
    }

    assistantOutput.textContent = appState.assistantText;
    insertAssistantBtn.disabled = false;
}

function buildContinuation(lastSentence, profile, title) {
    if (!lastSentence) {
        return `For ${title}, begin with one concrete image from the ${profile.room.toLowerCase()}: ${profile.sensory}. Then let the narrator notice what feels different today.`;
    }

    return `Continue after: "${lastSentence}"\n\nLet the next paragraph slow down for one sensory detail, then turn toward a choice the character has been avoiding. Keep the atmosphere ${profile.tempo}.`;
}

function buildShapeAdvice(text, profile, title) {
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;

    if (words < 40) {
        return `${title} is still opening. Add a grounded image first: ${profile.sensory}. Then write one sentence that hints at what the speaker wants.`;
    }

    if (words < 160) {
        return `The draft has a beginning. Shape the middle by adding contrast: one external weather detail, one internal reaction, and one small action. Keep the movement ${profile.tempo}.`;
    }

    return `This piece has enough material to refine. Look for one abstract sentence and replace it with a physical detail from the ${profile.room.toLowerCase()}. Then end the next paragraph with a question or decision.`;
}

function insertAssistantSuggestion() {
    if (!appState.assistantText) return;

    const insertion = `\n\n${appState.assistantText}`;
    const start = writingBoard.selectionStart;
    const end = writingBoard.selectionEnd;
    const before = writingBoard.value.slice(0, start);
    const after = writingBoard.value.slice(end);

    writingBoard.value = before + insertion + after;
    writingBoard.focus();
    writingBoard.selectionStart = writingBoard.selectionEnd = start + insertion.length;
    handleDraftInput();
}

async function fetchMusicByWeather(weatherKey, options = {}) {
    const profile = WEATHER_PROFILES[weatherKey] || WEATHER_PROFILES.Rain;
    const query = getNextMusicQuery(profile, weatherKey, options.refresh);

    renderMusicLoading(profile);
    musicRefreshBtn.disabled = true;
    musicRefreshBtn.textContent = '…';

    try {
        const url = `${API_CONSTANTS.ITUNES_URL}?term=${encodeURIComponent(query)}&entity=song&limit=${API_CONSTANTS.ITUNES_LIMIT}`;
        const res = await fetch(url);

        if (!res.ok) throw new Error('Music search failed');

        const data = await res.json();
        if (!data.results || data.results.length === 0) {
            throw new Error('No tracks returned');
        }

        renderMusicList(data.results);
        hideError();
    } catch (err) {
        console.error('iTunes search error:', err);
        renderMusicFallback(profile, weatherKey);
        showError('Music recommendations are using local fallbacks because the iTunes API did not respond.');
    } finally {
        musicRefreshBtn.disabled = false;
        musicRefreshBtn.textContent = '↻';
    }
}

function getNextMusicQuery(profile, weatherKey, shouldAdvance) {
    const currentIndex = appState.musicQueryIndexes[weatherKey] || 0;
    const nextIndex = shouldAdvance ? currentIndex + 1 : currentIndex;
    const query = profile.musicQueries[nextIndex % profile.musicQueries.length];

    appState.musicQueryIndexes[weatherKey] = nextIndex % profile.musicQueries.length;
    return query;
}

function renderMusicLoading(profile) {
    trackList.replaceChildren();

    for (let index = 0; index < 3; index += 1) {
        const li = document.createElement('li');
        li.className = 'track-item loading-track';

        const cover = document.createElement('span');
        cover.className = 'track-cover placeholder-cover';
        cover.textContent = profile.icon;

        const info = document.createElement('span');
        info.className = 'track-info';

        const title = document.createElement('span');
        title.className = 'track-title';
        title.textContent = 'Finding weather-matched music';

        const artist = document.createElement('span');
        artist.className = 'track-artist';
        artist.textContent = profile.room;

        info.append(title, artist);
        li.append(cover, info);
        trackList.appendChild(li);
    }
}

function renderMusicList(tracks) {
    trackList.replaceChildren();

    tracks.forEach((track, index) => {
        const li = document.createElement('li');
        li.className = 'track-item';

        const cover = document.createElement('img');
        const artwork = track.artworkUrl100 || '';
        cover.src = artwork.replace(API_CONSTANTS.COVER_SIZE_FROM, API_CONSTANTS.COVER_SIZE_TO);
        cover.alt = `${track.trackName || 'Track'} cover`;
        cover.className = 'track-cover';
        cover.loading = 'lazy';

        const info = document.createElement('div');
        info.className = 'track-info';

        const title = document.createElement('span');
        title.className = 'track-title';
        title.textContent = `${index + 1}. ${track.trackName || 'Untitled Track'}`;

        const artist = document.createElement('span');
        artist.className = 'track-artist';
        artist.textContent = track.artistName || 'Unknown artist';

        info.append(title, artist);

        if (track.previewUrl) {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.className = 'track-audio';
            audio.src = track.previewUrl;
            audio.textContent = 'Your browser does not support audio playback.';
            info.appendChild(audio);
        }

        li.append(cover, info);
        trackList.appendChild(li);
    });
}

function renderMusicFallback(profile, weatherKey) {
    trackList.replaceChildren();
    const fallbackTracks = FALLBACK_TRACKS[weatherKey] || FALLBACK_TRACKS.Rain;

    fallbackTracks.forEach((trackName, index) => {
        const li = document.createElement('li');
        li.className = 'track-item';

        const cover = document.createElement('span');
        cover.className = 'track-cover placeholder-cover';
        cover.textContent = profile.icon;

        const info = document.createElement('div');
        info.className = 'track-info';

        const title = document.createElement('span');
        title.className = 'track-title';
        title.textContent = `${index + 1}. ${trackName}`;

        const artist = document.createElement('span');
        artist.className = 'track-artist';
        artist.textContent = `${profile.room} fallback cue`;

        info.append(title, artist);
        li.append(cover, info);
        trackList.appendChild(li);
    });
}

async function useCurrentWeather() {
    if (!navigator.geolocation) {
        showError('This browser does not support location access. Choose a weather room manually.');
        return;
    }

    currentWeatherBtn.disabled = true;
    currentWeatherBtn.innerHTML = '<span>⌖</span> Locating';

    try {
        const position = await getCurrentPosition();
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const [weatherData, cityName] = await Promise.all([
            getWeatherByCoords(lat, lon),
            getCityNameByCoords(lat, lon)
        ]);
        const weather = parseWeatherData(weatherData);
        const profile = WEATHER_PROFILES[weather.weatherMain] || WEATHER_PROFILES.Rain;
        const place = cityName || 'your location';

        selectWeather(weather.weatherMain, {
            fetchMusic: true,
            save: true,
            note: `Matched ${profile.room} to the current weather in ${place}: ${weather.description}, ${weather.temp}°C.`
        });
        showToast('Current weather matched');
    } catch (err) {
        console.error('Current weather error:', err);
        showError('Current weather could not be loaded. Choose a weather room manually.');
    } finally {
        currentWeatherBtn.disabled = false;
        currentWeatherBtn.innerHTML = '<span>⌖</span> Use Current Weather';
    }
}

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000
        });
    });
}

async function getWeatherByCoords(lat, lon) {
    const url = `${API_CONSTANTS.WEATHER_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
    const res = await fetch(url);

    if (!res.ok) throw new Error('Weather request failed');
    return res.json();
}

async function getCityNameByCoords(lat, lon) {
    try {
        const url = `${API_CONSTANTS.REVERSE_GEOCODE_URL}?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
        const res = await fetch(url);

        if (!res.ok) throw new Error('Reverse geocoding failed');

        const data = await res.json();
        return data.city || data.locality || data.principalSubdivision || '';
    } catch (err) {
        console.error('Reverse geocoding error:', err);
        return '';
    }
}

function parseWeatherData(data) {
    const temp = Math.round(data.current.temperature_2m);
    const weatherCode = data.current.weather_code;

    if (weatherCode === 0) {
        return { temp, description: 'Sunny', weatherMain: 'Clear' };
    }

    if (weatherCode <= 3) {
        return { temp, description: 'Cloudy', weatherMain: 'Clouds' };
    }

    if (weatherCode <= 49) {
        return { temp, description: 'Foggy', weatherMain: 'Fog' };
    }

    if (weatherCode <= 67) {
        return { temp, description: 'Rainy', weatherMain: 'Rain' };
    }

    if (weatherCode <= 77) {
        return { temp, description: 'Snowy', weatherMain: 'Snow' };
    }

    if (weatherCode <= 82) {
        return { temp, description: 'Showers', weatherMain: 'Rain' };
    }

    if (weatherCode <= 86) {
        return { temp, description: 'Snow showers', weatherMain: 'Snow' };
    }

    return { temp, description: 'Thunderstorm', weatherMain: 'Thunderstorm' };
}

function getLastSentence(text) {
    if (!text) return '';
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
    return sentences ? sentences[sentences.length - 1].trim() : text;
}

function showError(message) {
    errorMsg.textContent = message;
    errorMsg.classList.remove('hidden');
}

function hideError() {
    errorMsg.textContent = '';
    errorMsg.classList.add('hidden');
}

function showToast(message) {
    sessionToast.textContent = message;
    sessionToast.classList.remove('hidden');
    clearTimeout(showToast.timeoutId);

    showToast.timeoutId = setTimeout(() => {
        sessionToast.classList.add('hidden');
    }, 2200);
}

function formatTimeOfDay(date) {
    return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function debounce(fn, delay) {
    let timeoutId;

    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

initApp();
