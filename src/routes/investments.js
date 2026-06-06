const express = require('express');
const { pool } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ── GET /api/investments ─────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM investments WHERE user_id = $1 ORDER BY created_at ASC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar investimentos.' });
  }
});

// ── POST /api/investments ────────────────────────────────
router.post('/', async (req, res) => {
  const { name, type, currentAmount, goalAmount, targetDate, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome do objetivo é obrigatório.' });
  try {
    const result = await pool.query(
      `INSERT INTO investments (user_id, name, type, current_amount, goal_amount, target_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.userId, name, type || null, currentAmount || 0, goalAmount || 0, targetDate || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar objetivo.' });
  }
});

// ── PUT /api/investments/:id ─────────────────────────────
router.put('/:id', async (req, res) => {
  const { name, type, currentAmount, goalAmount, targetDate, notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE investments SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        current_amount = COALESCE($3, current_amount),
        goal_amount = COALESCE($4, goal_amount),
        target_date = COALESCE($5, target_date),
        notes = COALESCE($6, notes)
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [name, type, currentAmount, goalAmount, targetDate, notes, req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Objetivo não encontrado.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar objetivo.' });
  }
});

// ── DELETE /api/investments/:id ──────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM investments WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Objetivo não encontrado.' });
    res.json({ message: 'Objetivo excluído.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir objetivo.' });
  }
});

module.exports = router;
