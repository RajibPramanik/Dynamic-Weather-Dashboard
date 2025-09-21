/**
 * Dynamic Weather Dashboard JavaScript
 * 
 * This script handles all the functionality for the weather dashboard including:
 * - API calls to OpenWeatherMap
 * - Geolocation services
 * - UI updates and interactions
 * - Temperature unit conversions
 * - Error handling
 */

// ===== CONFIGURATION AND GLOBAL VARIABLES =====

// OpenWeatherMap API configuration
const API_CONFIG = {
    key: '9fc67b87b2bfe061d8dfb530c5a6337d', // Your OpenWeatherMap API key
    baseUrl: 'https://api.openweathermap.org/data/2.5',
    oneCallUrl: 'https://api.openweathermap.org/data/3.0/onecall' // For detailed forecast data
};

// Global state management
let currentWeatherData = null;
let currentUnit = 'celsius'; // Default temperature unit
let currentLocation = { lat: null, lon: null };

// ===== DOM ELEMENT REFERENCES =====

// Get references to all important DOM elements for easy access
const elements = {
    // Search elements
    cityInput: document.getElementById('city-input'),
    searchBtn: document.getElementById('search-btn'),
    locationBtn: document.getElementById('location-btn'),
    
    // Display elements
    loading: document.getElementById('loading'),
    errorMessage: document.getElementById('error-message'),
    errorText: document.getElementById('error-text'),
    
    // Current weather elements
    currentLocation: document.getElementById('current-location'),
    currentDate: document.getElementById('current-date'),
    currentTemp: document.getElementById('current-temp'),
    weatherIcon: document.getElementById('weather-icon'),
    weatherDescription: document.getElementById('weather-description'),
    
    // Weather details
    feelsLike: document.getElementById('feels-like'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('wind-speed'),
    pressure: document.getElementById('pressure'),
    visibility: document.getElementById('visibility'),
    uvIndex: document.getElementById('uv-index'),
    
    // Sun times
    sunrise: document.getElementById('sunrise'),
    sunset: document.getElementById('sunset'),
    
    // Air quality
    aqiNumber: document.getElementById('aqi-number'),
    aqiLevel: document.getElementById('aqi-level'),
    aqiDesc: document.getElementById('aqi-desc'),
    
    // Temperature unit toggle
    celsiusBtn: document.getElementById('celsius-btn'),
    fahrenheitBtn: document.getElementById('fahrenheit-btn'),
    
    // Forecast
    forecastContainer: document.getElementById('forecast-container'),
    
    // Footer
    lastUpdated: document.getElementById('last-updated')
};

// ===== EVENT LISTENERS =====

/**
 * Initialize all event listeners when the page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Weather Dashboard initialized');
    
    // Search functionality
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.cityInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Location functionality
    elements.locationBtn.addEventListener('click', getCurrentLocation);
    
    // Temperature unit toggle
    elements.celsiusBtn.addEventListener('click', () => switchTemperatureUnit('celsius'));
    elements.fahrenheitBtn.addEventListener('click', () => switchTemperatureUnit('fahrenheit'));
    
    // Load default location on page load
    loadDefaultWeather();
});

// ===== MAIN FUNCTIONALITY =====

/**
 * Load weather for a default location when the page first loads
 */
async function loadDefaultWeather() {
    try {
        // Try to get user's location first, otherwise default to a major city
        if (navigator.geolocation) {
            getCurrentLocation();
        } else {
            // Default to New York if geolocation is not available
            await getWeatherByCity('New York');
        }
    } catch (error) {
        console.error('Error loading default weather:', error);
        showError('Unable to load default weather data');
    }
}

/**
 * Handle city search functionality
 */
async function handleSearch() {
    const city = elements.cityInput.value.trim();
    
    if (!city) {
        showError('Please enter a city name');
        return;
    }
    
    console.log(`Searching weather for: ${city}`);
    await getWeatherByCity(city);
}

/**
 * Get user's current location using browser geolocation
 */
function getCurrentLocation() {
    console.log('Requesting user location...');
    showLoading();
    
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }
    
    // Configure geolocation options
    const options = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds timeout
        maximumAge: 300000 // Cache position for 5 minutes
    };
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            console.log('Location obtained successfully');
            const { latitude, longitude } = position.coords;
            currentLocation = { lat: latitude, lon: longitude };
            await getWeatherByCoordinates(latitude, longitude);
        },
        (error) => {
            console.error('Geolocation error:', error);
            let errorMessage = 'Unable to get your location';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location access denied by user';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information unavailable';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Location request timed out';
                    break;
            }
            
            showError(errorMessage);
        },
        options
    );
}

// ===== API FUNCTIONS =====

/**
 * Fetch weather data by city name
 * @param {string} city - Name of the city
 */
async function getWeatherByCity(city) {
    showLoading();
    
    try {
        // First, get coordinates from city name
        const geocodingUrl = `${API_CONFIG.baseUrl}/weather?q=${encodeURIComponent(city)}&appid=${API_CONFIG.key}&units=metric`;
        const response = await fetch(geocodingUrl);
        
        if (!response.ok) {
            throw new Error(`City not found: ${city}`);
        }
        
        const data = await response.json();
        currentLocation = { lat: data.coord.lat, lon: data.coord.lon };
        
        // Now get detailed weather data using coordinates
        await getWeatherByCoordinates(data.coord.lat, data.coord.lon, city);
        
    } catch (error) {
        console.error('Error fetching weather by city:', error);
        showError(`Unable to find weather data for "${city}". Please check the city name.`);
    }
}

/**
 * Fetch weather data by coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} cityName - Optional city name for display
 */
async function getWeatherByCoordinates(lat, lon, cityName = null) {
    try {
        console.log(`Fetching weather for coordinates: ${lat}, ${lon}`);
        
        // Fetch current weather data
        const currentWeatherUrl = `${API_CONFIG.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${API_CONFIG.key}&units=metric`;
        const currentResponse = await fetch(currentWeatherUrl);
        
        if (!currentResponse.ok) {
            throw new Error('Failed to fetch current weather data');
        }
        
        const currentData = await currentResponse.json();
        
        // Fetch 5-day forecast data
        const forecastUrl = `${API_CONFIG.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${API_CONFIG.key}&units=metric`;
        const forecastResponse = await fetch(forecastUrl);
        
        if (!forecastResponse.ok) {
            throw new Error('Failed to fetch forecast data');
        }
        
        const forecastData = await forecastResponse.json();
        
        // Store the data globally
        currentWeatherData = {
            current: currentData,
            forecast: forecastData
        };
        
        // Update the UI with the fetched data
        updateCurrentWeatherUI(currentData);
        updateForecastUI(forecastData);
        updateLastUpdated();
        
        hideLoading();
        hideError();
        
        console.log('Weather data loaded successfully');
        
    } catch (error) {
        console.error('Error fetching weather by coordinates:', error);
        showError('Unable to fetch weather data. Please try again.');
    }
}

// ===== UI UPDATE FUNCTIONS =====

/**
 * Update the current weather section of the UI
 * @param {Object} data - Current weather data from API
 */
function updateCurrentWeatherUI(data) {
    console.log('Updating current weather UI', data);
    
    // Update location and date
    elements.currentLocation.textContent = `${data.name}, ${data.sys.country}`;
    elements.currentDate.textContent = formatDate(new Date());
    
    // Update temperature
    const temp = Math.round(data.main.temp);
    elements.currentTemp.textContent = `${temp}°${currentUnit === 'celsius' ? 'C' : 'F'}`;
    
    // Update weather icon and description
    updateWeatherIcon(data.weather[0].icon, data.weather[0].main);
    elements.weatherDescription.textContent = data.weather[0].description;
    
    // Update weather details
    elements.feelsLike.textContent = `${Math.round(data.main.feels_like)}°${currentUnit === 'celsius' ? 'C' : 'F'}`;
    elements.humidity.textContent = `${data.main.humidity}%`;
    elements.windSpeed.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`; // Convert m/s to km/h
    elements.pressure.textContent = `${data.main.pressure} hPa`;
    elements.visibility.textContent = `${Math.round(data.visibility / 1000)} km`; // Convert meters to km
    elements.uvIndex.textContent = 'N/A'; // UV index not available in basic weather API
    
    // Update sun times
    elements.sunrise.textContent = formatTime(new Date(data.sys.sunrise * 1000));
    elements.sunset.textContent = formatTime(new Date(data.sys.sunset * 1000));
    
    // Air quality data not available in basic API
    elements.aqiNumber.textContent = '--';
    elements.aqiLevel.textContent = '--';
    elements.aqiDesc.textContent = 'Data not available';
}

/**
 * Update the weather icon based on weather conditions
 * @param {string} iconCode - Weather icon code from API
 * @param {string} mainWeather - Main weather condition
 */
function updateWeatherIcon(iconCode, mainWeather) {
    const iconMap = {
        '01d': 'fas fa-sun',           // clear sky day
        '01n': 'fas fa-moon',          // clear sky night
        '02d': 'fas fa-cloud-sun',     // few clouds day
        '02n': 'fas fa-cloud-moon',    // few clouds night
        '03d': 'fas fa-cloud',         // scattered clouds
        '03n': 'fas fa-cloud',         // scattered clouds
        '04d': 'fas fa-clouds',        // broken clouds
        '04n': 'fas fa-clouds',        // broken clouds
        '09d': 'fas fa-cloud-rain',    // shower rain
        '09n': 'fas fa-cloud-rain',    // shower rain
        '10d': 'fas fa-cloud-sun-rain', // rain day
        '10n': 'fas fa-cloud-moon-rain', // rain night
        '11d': 'fas fa-bolt',          // thunderstorm
        '11n': 'fas fa-bolt',          // thunderstorm
        '13d': 'fas fa-snowflake',     // snow
        '13n': 'fas fa-snowflake',     // snow
        '50d': 'fas fa-smog',          // mist
        '50n': 'fas fa-smog'           // mist
    };
    
    const iconClass = iconMap[iconCode] || 'fas fa-question-circle';
    elements.weatherIcon.className = `${iconClass} weather-icon`;
}

/**
 * Update the 5-day forecast section
 * @param {Object} data - Forecast data from API
 */
function updateForecastUI(data) {
    console.log('Updating forecast UI', data);
    
    // Clear existing forecast cards
    elements.forecastContainer.innerHTML = '';
    
    // Group forecast data by day (API returns 3-hour intervals)
    const dailyForecasts = groupForecastByDay(data.list);
    
    // Create forecast cards for the next 5 days
    dailyForecasts.slice(0, 5).forEach((forecast, index) => {
        const forecastCard = createForecastCard(forecast, index);
        elements.forecastContainer.appendChild(forecastCard);
    });
}

/**
 * Group forecast data by day
 * @param {Array} forecastList - List of forecast data points
 * @returns {Array} Array of daily forecast objects
 */
function groupForecastByDay(forecastList) {
    const dailyData = {};
    
    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toDateString();
        
        if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
                date: date,
                temps: [],
                weather: item.weather[0],
                humidity: [],
                windSpeed: []
            };
        }
        
        dailyData[dateKey].temps.push(item.main.temp);
        dailyData[dateKey].humidity.push(item.main.humidity);
        dailyData[dateKey].windSpeed.push(item.wind.speed);
    });
    
    // Convert to array and calculate min/max values
    return Object.values(dailyData).map(day => ({
        date: day.date,
        maxTemp: Math.round(Math.max(...day.temps)),
        minTemp: Math.round(Math.min(...day.temps)),
        weather: day.weather,
        avgHumidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
        avgWindSpeed: Math.round(day.windSpeed.reduce((a, b) => a + b, 0) / day.windSpeed.length * 3.6) // Convert to km/h
    }));
}

/**
 * Create a forecast card element
 * @param {Object} forecast - Daily forecast data
 * @param {number} index - Index of the forecast day
 * @returns {HTMLElement} Forecast card element
 */
function createForecastCard(forecast, index) {
    const card = document.createElement('div');
    card.className = 'forecast-card';
    
    const dayName = index === 0 ? 'Today' : forecast.date.toLocaleDateString('en-US', { weekday: 'short' });
    const date = forecast.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const tempUnit = currentUnit === 'celsius' ? '°C' : '°F';
    const maxTemp = currentUnit === 'celsius' ? forecast.maxTemp : celsiusToFahrenheit(forecast.maxTemp);
    const minTemp = currentUnit === 'celsius' ? forecast.minTemp : celsiusToFahrenheit(forecast.minTemp);
    
    card.innerHTML = `
        <div class="forecast-date">${dayName}</div>
        <div class="forecast-date">${date}</div>
        <i class="fas fa-${getWeatherIconClass(forecast.weather.icon)} forecast-icon"></i>
        <div class="forecast-temps">
            <span class="forecast-high">${Math.round(maxTemp)}${tempUnit}</span>
            <span class="forecast-low">${Math.round(minTemp)}${tempUnit}</span>
        </div>
        <div class="forecast-desc">${forecast.weather.description}</div>
        <div class="forecast-details">
            <small>💧 ${forecast.avgHumidity}% | 💨 ${forecast.avgWindSpeed} km/h</small>
        </div>
    `;
    
    return card;
}

/**
 * Get weather icon class name for forecast
 * @param {string} iconCode - Weather icon code
 * @returns {string} Icon class name
 */
function getWeatherIconClass(iconCode) {
    const iconMap = {
        '01d': 'sun', '01n': 'moon',
        '02d': 'cloud-sun', '02n': 'cloud-moon',
        '03d': 'cloud', '03n': 'cloud',
        '04d': 'clouds', '04n': 'clouds',
        '09d': 'cloud-rain', '09n': 'cloud-rain',
        '10d': 'cloud-sun-rain', '10n': 'cloud-moon-rain',
        '11d': 'bolt', '11n': 'bolt',
        '13d': 'snowflake', '13n': 'snowflake',
        '50d': 'smog', '50n': 'smog'
    };
    
    return iconMap[iconCode] || 'question-circle';
}

// ===== TEMPERATURE UNIT FUNCTIONS =====

/**
 * Switch between Celsius and Fahrenheit
 * @param {string} unit - Target temperature unit ('celsius' or 'fahrenheit')
 */
function switchTemperatureUnit(unit) {
    if (currentUnit === unit) return;
    
    console.log(`Switching temperature unit to: ${unit}`);
    currentUnit = unit;
    
    // Update button states
    elements.celsiusBtn.classList.toggle('active', unit === 'celsius');
    elements.fahrenheitBtn.classList.toggle('active', unit === 'fahrenheit');
    
    // Re-render the UI with new temperature units
    if (currentWeatherData) {
        updateCurrentWeatherUI(currentWeatherData.current);
        updateForecastUI(currentWeatherData.forecast);
    }
}

/**
 * Convert Celsius to Fahrenheit
 * @param {number} celsius - Temperature in Celsius
 * @returns {number} Temperature in Fahrenheit
 */
function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

/**
 * Convert Fahrenheit to Celsius
 * @param {number} fahrenheit - Temperature in Fahrenheit
 * @returns {number} Temperature in Celsius
 */
function fahrenheitToCelsius(fahrenheit) {
    return (fahrenheit - 32) * 5/9;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Format date for display
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Format time for display
 * @param {Date} date - Date object
 * @returns {string} Formatted time string
 */
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

/**
 * Update the last updated timestamp
 */
function updateLastUpdated() {
    const now = new Date();
    elements.lastUpdated.textContent = now.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// ===== UI STATE MANAGEMENT =====

/**
 * Show loading spinner
 */
function showLoading() {
    elements.loading.classList.remove('hidden');
    elements.errorMessage.classList.add('hidden');
}

/**
 * Hide loading spinner
 */
function hideLoading() {
    elements.loading.classList.add('hidden');
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    elements.errorText.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    elements.loading.classList.add('hidden');
    
    console.error('Error:', message);
}

/**
 * Hide error message
 */
function hideError() {
    elements.errorMessage.classList.add('hidden');
}

// ===== ERROR HANDLING =====

/**
 * Global error handler for unhandled promises
 */
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showError('An unexpected error occurred. Please try again.');
});

/**
 * Global error handler for JavaScript errors
 */
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showError('An error occurred while loading the application.');
});

// ===== API KEY VALIDATION =====

/**
 * Check if API key is configured
 * @returns {boolean} True if API key is set
 */
function isApiKeyConfigured() {
    return API_CONFIG.key && API_CONFIG.key !== 'YOUR_API_KEY_HERE';
}

/**
 * Show API key warning if not configured
 */
function checkApiKeyConfiguration() {
    if (!isApiKeyConfigured()) {
        showError('Please configure your OpenWeatherMap API key in the script.js file. Get your free API key at openweathermap.org');
        return false;
    }
    return true;
}

// ===== INITIALIZATION =====

/**
 * Enhanced initialization with API key check
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Weather Dashboard initialized');
    
    // Check if API key is configured
    if (!checkApiKeyConfiguration()) {
        return;
    }
    
    // Initialize event listeners and load default weather
    initializeEventListeners();
    loadDefaultWeather();
});

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
    // Search functionality
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.cityInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Location functionality
    elements.locationBtn.addEventListener('click', getCurrentLocation);
    
    // Temperature unit toggle
    elements.celsiusBtn.addEventListener('click', () => switchTemperatureUnit('celsius'));
    elements.fahrenheitBtn.addEventListener('click', () => switchTemperatureUnit('fahrenheit'));
    
    // Clear search input when clicked
    elements.cityInput.addEventListener('focus', function() {
        this.select();
    });
}

// ===== ADDITIONAL FEATURES =====

/**
 * Add keyboard shortcuts for common actions
 */
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + L for location
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        getCurrentLocation();
    }
    
    // Escape to clear search
    if (e.key === 'Escape') {
        elements.cityInput.value = '';
        elements.cityInput.blur();
    }
});

/**
 * Auto-refresh weather data every 10 minutes
 */
setInterval(function() {
    if (currentLocation.lat && currentLocation.lon) {
        console.log('Auto-refreshing weather data...');
        getWeatherByCoordinates(currentLocation.lat, currentLocation.lon);
    }
}, 600000); // 10 minutes

console.log('Weather Dashboard script loaded successfully!');