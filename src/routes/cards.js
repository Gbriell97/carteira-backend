const express = require('express');
const { pool } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ── GET /api/cards ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM cards WHERE user_id = $1 ORDER BY created_at ASC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar cartões.' });
  }
});

// ── POST /api/cards ──────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, bank, brand, totalLimit, closingDay, dueDay, color } = req.body;

  if (!name) return res.status(400).json({ error: 'Nome do cartão é obrigatório.' });

  try {
    const result = await pool.query(
      `INSERT INTO cards (user_id, name, bank, brand, total_limit, closing_day, due_day, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.userId, name, bank || null, brand || null, totalLimit || 0, closingDay || 10, dueDay || 17, color || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar cartão.' });
  }
});

// ── PUT /api/cards/:id ───────────────────────────────────
router.put('/:id', async (req, res) => {
  const { name, bank, brand, totalLimit, closingDay, dueDay, color } = req.body;
  try {
    const result = await pool.query(
      `UPDATE cards SET
        name = COALESCE($1, name), bank = COALESCE($2, bank), brand = COALESCE($3, brand),
        total_limit = COALESCE($4, total_limit), closing_day = COALESCE($5, closing_day),
        due_day = COALESCE($6, due_day), color = COALESCE($7, color)
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [name, bank, brand, totalLimit, closingDay, dueDay, color, req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cartão não encontrado.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao editar cartão.' });
  }
});

// ── DELETE /api/cards/:id ────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM cards WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cartão não encontrado.' });
    res.json({ message: 'Cartão excluído.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir cartão.' });
  }
});

// ── GET /api/cards/purchases ─────────────────────────────
router.get('/purchases', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cp.*, c.name as card_name, c.color as card_color,
              cat.name as category_name, cat.icon as category_icon
       FROM card_purchases cp
       LEFT JOIN cards c ON cp.card_id = c.id
       LEFT JOIN categories cat ON cp.category_id = cat.id
       WHERE cp.user_id = $1
       ORDER BY cp.date DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar compras.' });
  }
});

// ── POST /api/cards/purchases ────────────────────────────
router.post('/purchases', async (req, res) => {
  const { cardId, categoryId, description, totalAmount, installments, notes, date } = req.body;

  if (!cardId || !description || !totalAmount || !date) {
    return res.status(400).json({ error: 'Cartão, descrição, valor e data são obrigatórios.' });
  }

  const numInstallments = installments || 1;
  const installmentAmount = parseFloat(totalAmount) / numInstallments;

  try {
    // Verifica se o cartão pertence ao usuário
    const cardCheck = await pool.query('SELECT id FROM cards WHERE id = $1 AND user_id = $2', [cardId, req.userId]);
    if (cardCheck.rows.length === 0) return res.status(404).json({ error: 'Cartão não encontrado.' });

    const result = await pool.query(
      `INSERT INTO card_purchases (user_id, card_id, category_id, description, total_amount, installment_amount, installments, notes, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.userId, cardId, categoryId || null, description, totalAmount, installmentAmount, numInstallments, notes || null, date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar compra.' });
  }
});

// ── DELETE /api/cards/purchases/:id ─────────────────────
router.delete('/purchases/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM card_purchases WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Compra não encontrada.' });
    res.json({ message: 'Compra excluída.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir compra.' });
  }
});

module.exports = router;
