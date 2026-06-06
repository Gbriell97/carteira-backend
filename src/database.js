const { Pool } = require('pg');

// Suporta DATABASE_URL ou variaveis separadas (DB_HOST, DB_USER, etc)
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  : {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'postgres',
      ssl: { rejectUnauthorized: false }
    };

const pool = new Pool(poolConfig);

// Cria todas as tabelas se nao existirem
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        initial_balance DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(80) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('income','expense','investment')),
        icon VARCHAR(10) DEFAULT '📦',
        color VARCHAR(20) DEFAULT '#6b7280',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        card_id INTEGER,
        type VARCHAR(20) NOT NULL CHECK (type IN ('income','expense','debit')),
        description VARCHAR(200) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        payment_method VARCHAR(30),
        notes TEXT,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(80) NOT NULL,
        bank VARCHAR(80),
        brand VARCHAR(30),
        total_limit DECIMAL(12,2) DEFAULT 0,
        closing_day INTEGER DEFAULT 10,
        due_day INTEGER DEFAULT 17,
        color VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS card_purchases (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        description VARCHAR(200) NOT NULL,
        total_amount DECIMAL(12,2) NOT NULL,
        installment_amount DECIMAL(12,2) NOT NULL,
        installments INTEGER DEFAULT 1,
        notes TEXT,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS investments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50),
        current_amount DECIMAL(12,2) DEFAULT 0,
        goal_amount DECIMAL(12,2) DEFAULT 0,
        target_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS friends (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(150),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS debts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        friend_id INTEGER REFERENCES friends(id) ON DELETE CASCADE,
        description VARCHAR(200) NOT NULL,
        original_amount DECIMAL(12,2) NOT NULL,
        paid_amount DECIMAL(12,2) DEFAULT 0,
        loan_date DATE NOT NULL,
        expected_payment_date DATE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','partially_paid','paid','overdue')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Banco de dados inicializado com sucesso!');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
