require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ─────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: false
}));
app.options('*', cors());
app.use(express.json());

// ── Rotas ────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/cards',        require('./routes/cards'));
app.use('/api/investments',  require('./routes/investments'));
app.use('/api/friends',      require('./routes/friends'));
app.use('/api/categories',   require('./routes/categories'));

// ── Health check ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: '✅ Carteira Inteligente API funcionando!',
    version: '1.0.0'
  });
});

// ── 404 ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Rota ${req.method} ${req.path} não encontrada.` });
});

// ── Iniciar servidor ─────────────────────────────────────
async function start() {
  try {
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch (err) {
    console.error('Erro ao iniciar:', err.message);
    process.exit(1);
  }
}

start();
module.exports = app;
