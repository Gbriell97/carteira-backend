# 💳 Carteira Inteligente — Backend

API REST em Node.js + Express + PostgreSQL para o app Carteira Inteligente.

## Estrutura do projeto

```
carteira-backend/
├── src/
│   ├── server.js          ← Arquivo principal
│   ├── database.js        ← Conexão e criação das tabelas
│   ├── middleware/
│   │   └── auth.js        ← Validação do JWT
│   └── routes/
│       ├── auth.js        ← Login e cadastro
│       ├── transactions.js ← Entradas e saídas
│       ├── cards.js       ← Cartões e compras
│       ├── investments.js ← Objetivos/investimentos
│       ├── friends.js     ← Amigos e dívidas
│       └── categories.js  ← Categorias
├── .env.example           ← Modelo das variáveis de ambiente
├── .gitignore
└── package.json
```

## Como rodar localmente

1. Instale as dependências:
```bash
npm install
```

2. Copie o arquivo de variáveis:
```bash
cp .env.example .env
```

3. Edite o `.env` com sua DATABASE_URL do Railway

4. Rode o servidor:
```bash
npm run dev
```

## Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/auth/register | Criar conta |
| POST | /api/auth/login | Fazer login |
| PUT | /api/auth/profile | Atualizar perfil |
| GET | /api/transactions | Listar transações |
| POST | /api/transactions | Nova transação |
| DELETE | /api/transactions/:id | Excluir transação |
| GET | /api/cards | Listar cartões |
| POST | /api/cards | Novo cartão |
| DELETE | /api/cards/:id | Excluir cartão |
| GET | /api/cards/purchases | Listar compras |
| POST | /api/cards/purchases | Nova compra |
| DELETE | /api/cards/purchases/:id | Excluir compra |
| GET | /api/investments | Listar objetivos |
| POST | /api/investments | Novo objetivo |
| PUT | /api/investments/:id | Atualizar objetivo |
| DELETE | /api/investments/:id | Excluir objetivo |
| GET | /api/friends | Listar amigos |
| POST | /api/friends | Novo amigo |
| DELETE | /api/friends/:id | Excluir amigo |
| GET | /api/friends/debts | Listar dívidas |
| POST | /api/friends/debts | Nova dívida |
| PATCH | /api/friends/debts/:id/pay | Registrar pagamento |
| DELETE | /api/friends/debts/:id | Excluir dívida |
| GET | /api/categories | Listar categorias |
| POST | /api/categories | Nova categoria |
| DELETE | /api/categories/:id | Excluir categoria |
