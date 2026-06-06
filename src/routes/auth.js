const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../database');

const router = express.Router();

// ── POST /api/auth/register ──────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password, initialBalance = 0 } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    // Verifica se e-mail já existe
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
    }

    // Criptografa a senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Cria o usuário
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, initial_balance) VALUES ($1, $2, $3, $4) RETURNING id, name, email, initial_balance',
      [name, email, passwordHash, initialBalance]
    );
    const user = result.rows[0];

    // Cria categorias padrão para o usuário
    await createDefaultCategories(user.id);

    // Gera o token JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      message: 'Conta criada com sucesso!',
      token,
      user: { id: user.id, name: user.name, email: user.email, initialBalance: user.initial_balance }
    });

  } catch (err) {
    console.error('Erro no register:', err);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      message: 'Login realizado com sucesso!',
      token,
      user: { id: user.id, name: user.name, email: user.email, initialBalance: user.initial_balance }
    });

  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// ── PUT /api/auth/profile ────────────────────────────────
const authMiddleware = require('../middleware/auth');

router.put('/profile', authMiddleware, async (req, res) => {
  const { name, email, initialBalance } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), initial_balance = COALESCE($3, initial_balance) WHERE id = $4 RETURNING id, name, email, initial_balance',
      [name, email, initialBalance, req.userId]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

// ── Categorias padrão ────────────────────────────────────
async function createDefaultCategories(userId) {
  const defaults = [
    { name: 'Salário',       type: 'income',     icon: '💰', color: '#16a34a' },
    { name: 'Renda extra',   type: 'income',     icon: '💼', color: '#1a6ef5' },
    { name: 'Alimentação',   type: 'expense',    icon: '🍔', color: '#dc2626' },
    { name: 'Mercado',       type: 'expense',    icon: '🛒', color: '#d97706' },
    { name: 'Transporte',    type: 'expense',    icon: '🚗', color: '#7c3aed' },
    { name: 'Moradia',       type: 'expense',    icon: '🏠', color: '#0891b2' },
    { name: 'Saúde',         type: 'expense',    icon: '💊', color: '#dc2626' },
    { name: 'Educação',      type: 'expense',    icon: '📚', color: '#1a6ef5' },
    { name: 'Lazer',         type: 'expense',    icon: '🎮', color: '#7c3aed' },
    { name: 'Assinaturas',   type: 'expense',    icon: '🎵', color: '#0891b2' },
    { name: 'Investimentos', type: 'investment', icon: '📈', color: '#16a34a' },
    { name: 'Outros',        type: 'expense',    icon: '📦', color: '#6b7280' },
  ];

  for (const cat of defaults) {
    await pool.query(
      'INSERT INTO categories (user_id, name, type, icon, color) VALUES ($1, $2, $3, $4, $5)',
      [userId, cat.name, cat.type, cat.icon, cat.color]
    );
  }
}

module.exports = router;
