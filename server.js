import express from 'express';          // Framework para criar servidor web
import jwt from 'jsonwebtoken';         // Biblioteca para gerar e validar tokens JWT
import dotenv from 'dotenv';            // Para carregar variáveis de ambiente do arquivo .env
import axios from 'axios';              // Cliente HTTP para fazer requisições externas


// ================== CONFIGURAÇÃO DO EXPRESS ==================
const app = express();
app.use(express.json()); // Permite que a API receba dados JSON
app.use(express.static('public')); // Serve arquivos estáticos da pasta public

// ================== BANCO DE DADOS SIMULADO ==================
const users = [
  { id: 1, username: 'user1', password: 'password1', role: 'user' },
  { id: 2, username: 'admin', password: 'adminpass', role: 'admin' }
];

// ================== ROTA DO CLIMA ==================
app.get('/weather', authenticateToken, async (req, res) => {
    const city = req.query.city?.replace(/([A-Z])/g, ' $1').trim().replace(/\s+/g, ' ');
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!city) {
        return res.status(400).json({ error: 'Cidade é obrigatória' });
    }

    try {
        console.log(`Buscando clima para: ${city}`);
        const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
            params: {
                q: city,
                appid: apiKey,
                units: 'metric',
                lang: 'pt_br'
            }
        });

        const weather = response.data;
        res.json({
            cidade: weather.name,
            temperatura: weather.main.temp,
            descricao: weather.weather[0].description,
            humidade: weather.main.humidity,
            vento: weather.wind.speed
        });
    } catch (error) {
        console.error('Erro na API do OpenWeather:', error.response?.data);
        if (error.response?.status === 404) {
            return res.status(404).json({ error: 'Cidade não encontrada' });
        }
        res.status(500).json({ error: 'Erro ao obter dados do clima' });
    }
});

// ================== FUNÇÕES DE AUTENTICAÇÃO ==================
function generateToken(user) {
  const secret = process.env.SECRET_KEY || 'Aula01';
  return jwt.sign(
    { id: user.id, role: user.role },
    secret,
    { expiresIn: '1h' }
  );
}

function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).send('Token não fornecido');
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).send('Token inválido');
    }
    req.user = user;
    next();
  });
}

// ================== ROTA DE LOGIN ==================
app.post('/login', (req, res) => {
  if (!req.body || !req.body.username || !req.body.password) {
    return res.status(400).json({ error: 'Username e password são obrigatórios' });
  }

  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    const token = generateToken(user);
    return res.json({ token });
  } else {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

// ================== INICIANDO O SERVIDOR ==================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});