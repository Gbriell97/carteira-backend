require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middlewares ──────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://*.github.io',
    '*'
  ],
  credentials: true
}));
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

// ── Inicializar banco ────────────────────────────────────
// No Vercel cada request é serverless, então iniciamos o banco uma vez
let dbInitialized = false;
async function ensureDB() {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}

// ── Para rodar localmente ────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  ensureDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
      console.log(`📦 Banco de dados conectado`);
    });
  }).catch(err => {
    console.error('❌ Erro ao iniciar:', err.message);
    process.exit(1);
  });
}

// ── Exporta para o Vercel ────────────────────────────────
ensureDB().catch(console.error);
module.exports = app;

