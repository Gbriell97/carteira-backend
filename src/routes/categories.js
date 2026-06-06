const express = require('express');
const { pool } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ── GET /api/categories ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories WHERE user_id = $1 ORDER BY type ASC, name ASC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar categorias.' });
  }
});

// ── POST /api/categories ─────────────────────────────────
router.post('/', async (req, res) => {
  const { name, type, icon, color } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Nome e tipo são obrigatórios.' });
  try {
    const result = await pool.query(
      'INSERT INTO categories (user_id, name, type, icon, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.userId, name, type, icon || '📦', color || '#6b7280']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar categoria.' });
  }
});

// ── DELETE /api/categories/:id ───────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Categoria não encontrada.' });
    res.json({ message: 'Categoria excluída.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir categoria.' });
  }
});

module.exports = router;
