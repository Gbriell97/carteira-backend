const express = require('express');
const { pool } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ══ AMIGOS ══════════════════════════════════════════════

// ── GET /api/friends ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*,
        COALESCE(SUM(CASE WHEN d.status != 'paid' THEN d.original_amount - d.paid_amount ELSE 0 END), 0) as total_to_receive
       FROM friends f
       LEFT JOIN debts d ON d.friend_id = f.id
       WHERE f.user_id = $1
       GROUP BY f.id
       ORDER BY f.name ASC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar amigos.' });
  }
});

// ── POST /api/friends ────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, phone, email, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });
  try {
    const result = await pool.query(
      'INSERT INTO friends (user_id, name, phone, email, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.userId, name, phone || null, email || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cadastrar amigo.' });
  }
});

// ── DELETE /api/friends/:id ──────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM friends WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Amigo não encontrado.' });
    res.json({ message: 'Amigo excluído.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir amigo.' });
  }
});

// ══ DÍVIDAS ═════════════════════════════════════════════

// ── GET /api/friends/debts ───────────────────────────────
router.get('/debts', async (req, res) => {
  try {
    // Atualiza status para 'overdue' automaticamente
    await pool.query(`
      UPDATE debts SET status = 'overdue'
      WHERE user_id = $1
        AND status NOT IN ('paid')
        AND expected_payment_date < CURRENT_DATE
    `, [req.userId]);

    const result = await pool.query(
      `SELECT d.*, f.name as friend_name
       FROM debts d
       JOIN friends f ON d.friend_id = f.id
       WHERE d.user_id = $1
       ORDER BY d.status ASC, d.expected_payment_date ASC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dívidas.' });
  }
});

// ── POST /api/friends/debts ──────────────────────────────
router.post('/debts', async (req, res) => {
  const { friendId, description, originalAmount, loanDate, expectedPaymentDate, notes } = req.body;

  if (!friendId || !description || !originalAmount || !loanDate) {
    return res.status(400).json({ error: 'Amigo, descrição, valor e data são obrigatórios.' });
  }

  try {
    // Verifica se amigo pertence ao usuário
    const friendCheck = await pool.query('SELECT id FROM friends WHERE id = $1 AND user_id = $2', [friendId, req.userId]);
    if (friendCheck.rows.length === 0) return res.status(404).json({ error: 'Amigo não encontrado.' });

    const result = await pool.query(
      `INSERT INTO debts (user_id, friend_id, description, original_amount, loan_date, expected_payment_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.userId, friendId, description, originalAmount, loanDate, expectedPaymentDate || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar dívida.' });
  }
});

// ── PATCH /api/friends/debts/:id/pay ────────────────────
router.patch('/debts/:id/pay', async (req, res) => {
  const { amount } = req.body; // se não informar, paga tudo
  try {
    const debt = await pool.query(
      'SELECT * FROM debts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (debt.rows.length === 0) return res.status(404).json({ error: 'Dívida não encontrada.' });

    const d = debt.rows[0];
    const payAmount = amount ? parseFloat(amount) : parseFloat(d.original_amount) - parseFloat(d.paid_amount);
    const newPaid = parseFloat(d.paid_amount) + payAmount;
    const newStatus = newPaid >= parseFloat(d.original_amount) ? 'paid' : 'partially_paid';

    const result = await pool.query(
      'UPDATE debts SET paid_amount = $1, status = $2 WHERE id = $3 RETURNING *',
      [newPaid, newStatus, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar pagamento.' });
  }
});

// ── DELETE /api/friends/debts/:id ───────────────────────
router.delete('/debts/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM debts WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Dívida não encontrada.' });
    res.json({ message: 'Dívida excluída.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir dívida.' });
  }
});

module.exports = router;
