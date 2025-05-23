// Módulo principal da aplicação
const app = (function() {
    // Credenciais de login válidas (apenas para demonstração)
    const validCredentials = {
        username: "admin",
        password: "admin" // Senha forte para demonstração
    };
    
    // Configurações de segurança
    const securityConfig = {
        maxAttempts: 3,
        lockoutTime: 5 * 60 * 1000 // 5 minutos em milissegundos
    };
    
    // Estado da aplicação
    let state = {
        loginAttempts: 0,
        lastFailedAttempt: null,
        isLocked: false
    };
    
    // Elementos do DOM
    const elements = {
        loginContainer: document.getElementById("login-container"),
        mainContent: document.getElementById("main-content"),
        loginForm: document.getElementById("login-form"),
        usernameInput: document.getElementById("username"),
        passwordInput: document.getElementById("password"),
        loginBtn: document.getElementById("login-btn"),
        loginError: document.getElementById("login-error"),
        loginAttempts: document.getElementById("login-attempts"),
        passwordStrength: document.getElementById("password-strength"),
        cityInput: document.getElementById("city-input"),
        searchBtn: document.getElementById("search"),
        weatherData: document.getElementById("weather-data"),
        errorMessage: document.getElementById("error-message"),
        loader: document.getElementById("loader"),
        historyList: document.getElementById("history-list")
    };
    
    // API Key - Em produção, isso deveria ser armazenado de forma mais segura
    const apiKey = "ba605efc18f1572f61892fe426f18a1a";
    
    // Inicialização do módulo
    function init() {
        setupEventListeners();
        checkLockoutStatus();
        loadHistory();
    }
    
    // Configura os event listeners
    function setupEventListeners() {
        // Login
        elements.loginForm.addEventListener("submit", handleLogin);
        elements.passwordInput.addEventListener("input", checkPasswordStrength);
        
        // Busca de clima
        elements.searchBtn.addEventListener("click", (e) => {
            e.preventDefault();
            getWeather(elements.cityInput.value);
        });
        
        elements.cityInput.addEventListener("keyup", (e) => {
            if (e.key === "Enter") {
                getWeather(elements.cityInput.value);
            }
        });
    }
    
    // Verifica força da senha
    function checkPasswordStrength() {
        const password = elements.passwordInput.value;
        let strength = 0;
        
        // Verifica o comprimento
        if (password.length >= 8) strength++;
        
        // Verifica letras maiúsculas
        if (/[A-Z]/.test(password)) strength++;
        
        // Verifica letras minúsculas
        if (/[a-z]/.test(password)) strength++;
        
        // Verifica números
        if (/[0-9]/.test(password)) strength++;
        
        // Verifica caracteres especiais
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        // Atualiza a exibição
        elements.passwordStrength.className = `strength-${Math.min(strength, 4)}`;
    }
    
    // Manipula o login
    function handleLogin(e) {
        e.preventDefault();
        
        const username = elements.usernameInput.value;
        const password = elements.passwordInput.value;
        
        // Verifica se está bloqueado
        if (state.isLocked) {
            const remainingTime = Math.ceil((securityConfig.lockoutTime - (Date.now() - state.lastFailedAttempt)) / 1000 / 60);
            elements.loginError.textContent = `Conta bloqueada. Tente novamente em ${remainingTime} minutos.`;
            elements.loginError.style.display = "block";
            return;
        }
        
        // Validação básica
        if (!username || !password) {
            elements.loginError.textContent = "Por favor, preencha todos os campos.";
            elements.loginError.style.display = "block";
            return;
        }
        
        // Verifica credenciais
        if (username === validCredentials.username && password === validCredentials.password) {
            // Login bem-sucedido
            elements.loginContainer.style.display = "none";
            elements.mainContent.style.display = "block";
            state.loginAttempts = 0;
            elements.loginError.style.display = "none";
            elements.loginAttempts.style.display = "none";
            
            // Log de login bem-sucedido
            logActivity(`Login bem-sucedido para o usuário ${username}`);
        } else {
            // Login falhou
            state.loginAttempts++;
            state.lastFailedAttempt = Date.now();
            
            // Log de tentativa falha
            logActivity(`Tentativa de login falhou para o usuário ${username}`);
            
            if (state.loginAttempts >= securityConfig.maxAttempts) {
                state.isLocked = true;
                elements.loginError.textContent = `Muitas tentativas falhas. Sua conta foi bloqueada por ${securityConfig.lockoutTime / 1000 / 60} minutos.`;
                elements.loginBtn.disabled = true;
                
                // Temporizador para desbloquear
                setTimeout(() => {
                    state.isLocked = false;
                    state.loginAttempts = 0;
                    elements.loginBtn.disabled = false;
                    elements.loginError.style.display = "none";
                    elements.loginAttempts.style.display = "none";
                }, securityConfig.lockoutTime);
            } else {
                elements.loginError.textContent = "Usuário ou senha incorretos.";
                elements.loginAttempts.textContent = `Tentativas restantes: ${securityConfig.maxAttempts - state.loginAttempts}`;
            }
            
            elements.loginError.style.display = "block";
            elements.loginAttempts.style.display = "block";
        }
    }
    
    // Verifica status de bloqueio ao carregar a página
    function checkLockoutStatus() {
        if (state.isLocked && (Date.now() - state.lastFailedAttempt) < securityConfig.lockoutTime) {
            const remainingTime = Math.ceil((securityConfig.lockoutTime - (Date.now() - state.lastFailedAttempt)) / 1000 / 60);
            elements.loginError.textContent = `Conta bloqueada. Tente novamente em ${remainingTime} minutos.`;
            elements.loginError.style.display = "block";
            elements.loginBtn.disabled = true;
        }
    }
    
    // Log de atividades
    function logActivity(message) {
        console.log(`[LOG] ${new Date().toISOString()} - ${message}`);
        // Em produção, isso poderia ser enviado para um servidor
    }
    
    // Logout
    function logout() {
        elements.loginContainer.style.display = "block";
        elements.mainContent.style.display = "none";
        elements.usernameInput.value = "";
        elements.passwordInput.value = "";
        elements.passwordStrength.className = "strength-0";
        
        // Log de logout
        logActivity("Usuário fez logout");
    }
    
    // Busca dados do clima
    async function getWeatherData(query) {
        // Verifica se a query é coordenadas (formato: "lat,lon" ou "lat, lon")
        const coordPattern = /^-?\d{1,3}\.?\d*,\s*-?\d{1,3}\.?\d*$/;
        let apiUrl, forecastUrl;
        
        if (coordPattern.test(query)) {
            const [lat, lon] = query.split(',').map(coord => coord.trim());
            apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}&lang=pt_br`;
            forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}&lang=pt_br`;
        } else {
            // Consulta por nome da cidade
            apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${query}&units=metric&appid=${apiKey}&lang=pt_br`;
            forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${query}&units=metric&appid=${apiKey}&lang=pt_br`;
        }
        
        try {
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error("Localização não encontrada");
            }
            
            const data = await response.json();
            
            // Obter dados da previsão
            const forecastResponse = await fetch(forecastUrl);
            const forecastData = await forecastResponse.json();
            
            // Log de consulta bem-sucedida
            logActivity(`Consulta de clima para: ${query}`);
            
            return {
                current: data,
                forecast: forecastData
            };
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
            
            // Log de erro na consulta
            logActivity(`Falha na consulta de clima para: ${query} - ${error.message}`);
            
            throw error;
        }
    }
    
    // Exibe dados do clima
    function showWeatherData(data) {
        const { current, forecast } = data;
        
        // Dados atuais
        document.getElementById("city").textContent = current.name || "Local Desconhecido";
        document.getElementById("country-name").textContent = current.sys?.country || "N/A";
        
        if (current.sys?.country) {
            const flagImg = document.getElementById("country-flag");
            flagImg.src = `https://flagcdn.com/w20/${current.sys.country.toLowerCase()}.png`;
            flagImg.style.display = "inline-block";
        } else {
            document.getElementById("country-flag").style.display = "none";
        }
        
        document.getElementById("temperature").innerHTML = `${Math.round(current.main.temp)}<span>°C</span>`;
        document.getElementById("description").textContent = current.weather[0].description;
        document.getElementById("weather-icon").src = `https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`;
        document.getElementById("umidity").querySelector("span").textContent = current.main.humidity;
        document.getElementById("wind").querySelector("span").textContent = Math.round(current.wind.speed * 3.6);
        document.getElementById("pressure").querySelector("span").textContent = current.main.pressure;
        document.getElementById("feels-like").querySelector("span").textContent = Math.round(current.main.feels_like);
        document.getElementById("visibility").querySelector("span").textContent = current.visibility;
        
        // Índice UV (simulado - a API gratuita não fornece UV)
        const uvIndex = Math.floor(Math.random() * 11); // Simulação
        let uvLevel = "";
        if (uvIndex <= 2) uvLevel = "Baixo";
        else if (uvIndex <= 5) uvLevel = "Moderado";
        else if (uvIndex <= 7) uvLevel = "Alto";
        else if (uvIndex <= 10) uvLevel = "Muito Alto";
        else uvLevel = "Extremo";
        
        document.getElementById("uv-index").querySelector("span").textContent = `${uvIndex} (${uvLevel})`;
        
        // Nascer e pôr do sol
        const sunriseTime = new Date(current.sys.sunrise * 1000).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        const sunsetTime = new Date(current.sys.sunset * 1000).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        
        document.getElementById("sunrise").querySelector("span").textContent = sunriseTime;
        document.getElementById("sunset").querySelector("span").textContent = sunsetTime;
        
        document.getElementById("latitude").textContent = current.coord.lat;
        document.getElementById("longitude").textContent = current.coord.lon;
        
        // Previsão para os próximos dias
        const forecastDaysContainer = document.getElementById("forecast-days");
        forecastDaysContainer.innerHTML = "";
        
        // Agrupar por dia (pegar um horário por dia)
        const dailyForecasts = {};
        forecast.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dateStr = date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
            
            if (!dailyForecasts[dateStr] || date.getHours() === 12) {
                dailyForecasts[dateStr] = item;
            }
        });
        
        // Exibir até 5 dias
        const daysToShow = Object.values(dailyForecasts).slice(0, 5);
        
        daysToShow.forEach(day => {
            const date = new Date(day.dt * 1000);
            const dayElement = document.createElement("div");
            dayElement.className = "forecast-day";
            
            dayElement.innerHTML = `
                <p>${date.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                <p class="mt-1">${date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</p>
                <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" alt="${day.weather[0].description}">
                <p class="mt-1">${Math.round(day.main.temp)}°C</p>
                <p class="mt-1">${day.weather[0].description}</p>
            `;
            
            forecastDaysContainer.appendChild(dayElement);
        });
        
        elements.weatherData.classList.remove("hide");
        elements.errorMessage.classList.add("hide");
        
        // Adiciona ao histórico
        addToHistory(current.name || elements.cityInput.value, current.sys?.country);
    }
    
    // Adiciona consulta ao histórico
    function addToHistory(city, country) {
        let history = JSON.parse(localStorage.getItem('weatherHistory')) || [];
        
        // Remove duplicatas
        history = history.filter(item => !(item.city === city && item.country === country));
        
        // Adiciona no início
        history.unshift({
            city,
            country,
            timestamp: new Date().toISOString()
        });
        
        // Mantém apenas os últimos 3 itens
        history = history.slice(0, 3);
        
        localStorage.setItem('weatherHistory', JSON.stringify(history));
        loadHistory();
    }
    
    // Carrega o histórico
    function loadHistory() {
        const history = JSON.parse(localStorage.getItem('weatherHistory')) || [];
        elements.historyList.innerHTML = "";
        
        history.forEach(item => {
            const historyItem = document.createElement("div");
            historyItem.className = "history-item";
            historyItem.textContent = `${item.city}${item.country ? `, ${item.country}` : ''}`;
            historyItem.addEventListener("click", () => {
                app.searchCity(`${item.city}${item.country ? `,${item.country}` : ''}`);
            });
            elements.historyList.appendChild(historyItem);
        });
    }
    
    // Mostra mensagem de erro
    function showError() {
        elements.errorMessage.classList.remove("hide");
        elements.weatherData.classList.add("hide");
    }
    
    // Busca cidade ou coordenadas
    function searchCity(query) {
        elements.cityInput.value = query;
        getWeather(query);
    }
    
    // Função principal para buscar o clima
    async function getWeather(query) {
        if (!query) return;
        
        elements.loader.classList.remove("hide");
        elements.weatherData.classList.add("hide");
        elements.errorMessage.classList.add("hide");
        
        try {
            const data = await getWeatherData(query);
            showWeatherData(data);
        } catch (error) {
            showError();
        } finally {
            elements.loader.classList.add("hide");
        }
    }
    
    // Expõe métodos públicos
    return {
        init,
        logout,
        searchCity,
        getWeather
    };
})();

// Inicializa a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', app.init);

