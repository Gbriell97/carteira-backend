const express = require('express');
const { pool } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();
// Todas as rotas precisam de login
router.use(auth);

// ── GET /api/transactions ────────────────────────────────
router.get('/', async (req, res) => {
  const { month, type } = req.query; // ?month=2025-06&type=income
  try {
    let query = `
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             ca.name as card_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN cards ca ON t.card_id = ca.id
      WHERE t.user_id = $1
    `;
    const params = [req.userId];

    if (month) {
      params.push(month + '-01');
      params.push(month + '-31');
      query += ` AND t.date BETWEEN $${params.length - 1} AND $${params.length}`;
    }
    if (type) {
      params.push(type);
      query += ` AND t.type = $${params.length}`;
    }

    query += ' ORDER BY t.date DESC, t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar transações.' });
  }
});

// ── POST /api/transactions ───────────────────────────────
router.post('/', async (req, res) => {
  const { categoryId, cardId, type, description, amount, paymentMethod, notes, date } = req.body;

  if (!type || !description || !amount || !date) {
    return res.status(400).json({ error: 'Tipo, descrição, valor e data são obrigatórios.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO transactions (user_id, category_id, card_id, type, description, amount, payment_method, notes, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.userId, categoryId || null, cardId || null, type, description, amount, paymentMethod || null, notes || null, date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar transação.' });
  }
});

// ── DELETE /api/transactions/:id ─────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transação não encontrada.' });
    }
    res.json({ message: 'Transação excluída.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir transação.' });
  }
});

module.exports = router;
