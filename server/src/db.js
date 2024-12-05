const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database('./model/db');

db.serialize(() => {
  // Tabela de usuários
  db.run(`CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY, 
    username TEXT NOT NULL UNIQUE, 
    password TEXT NOT NULL
  );`);

  // Lista de amigos
  db.run(`CREATE TABLE IF NOT EXISTS friends(
    id INTEGER PRIMARY KEY,
    id_friend1 INTEGER NOT NULL,
    id_friend2 INTEGER NOT NULL,
    FOREIGN KEY(id_friend1) REFERENCES users(id),
    FOREIGN KEY(id_friend2) REFERENCES users(id)
  );`);

  // Grupos
  db.run(`CREATE TABLE IF NOT EXISTS groups(
    id INTEGER PRIMARY KEY, 
    admin INTEGER NOT NULL, 
    group_name TEXT NOT NULL, 
    FOREIGN KEY(admin) REFERENCES users(id)
  );`);

  // Membros de grupos
  db.run(`CREATE TABLE IF NOT EXISTS group_members(
    id INTEGER PRIMARY KEY, 
    group_id INTEGER NOT NULL, 
    user INTEGER NOT NULL, 
    FOREIGN KEY(group_id) REFERENCES groups(id), 
    FOREIGN KEY(user) REFERENCES users(id)
  );`);
});

module.exports = db;
