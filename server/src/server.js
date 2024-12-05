require("dotenv").config();

const { createServer } = require("node:http");
const express = require("express");
const path = require("node:path");
const { Server } = require("socket.io");
const { randomUUID } = require("node:crypto");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const port = 3000;
const host = "127.0.0.1";

// Initialize SQLite database
const db = new sqlite3.Database('./model/db');

// Initialize tables in the database
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY, 
    username TEXT NOT NULL UNIQUE, 
    password TEXT NOT NULL);`);

  db.run(`CREATE TABLE IF NOT EXISTS friends(id INTEGER PRIMARY KEY,
    id_friend1 INTEGER NOT NULL,
    id_friend2 INTEGER NOT NULL,
    FOREIGN KEY(id_friend1) REFERENCES users(id),
    FOREIGN KEY(id_friend2) REFERENCES users(id));`);

  db.run(
  `CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY, 
    admin INTEGER NOT NULL, 
    group_name TEXT NOT NULL, 
    FOREIGN KEY(admin) REFERENCES users(id)
  );`);

  db.run(
  `CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY, 
    group_id INTEGER NOT NULL, 
    user INTEGER NOT NULL, 
    FOREIGN KEY(group_id) REFERENCES groups(id), 
    FOREIGN KEY(user) REFERENCES users(id)
  );`);

  db.run(`CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    refresh_token TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );`);
});

const app = express();
const server = createServer(app);
const io = new Server(server);

// Define root directory and static files location
const rootDir = process.cwd();
const staticFilesRoot = path.join(rootDir, "client/src");

// Middleware setup
app.use("/scripts", express.static(path.join(staticFilesRoot, "scripts/")));
app.use("/pages", express.static(path.join(staticFilesRoot, "pages/")));
app.use("/styles", express.static(path.join(staticFilesRoot, "styles/")));
app.use(express.json());

// Authentication middleware
function authenticateUser(req, res, next) {
  const token = req.query.token;
  if (!token) {
    console.log("error sem token");
    return res.sendStatus(400);
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      console.log(err);
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
}

// Routes
app.get("/", (req, res) => {
  res.redirect("/welcome");
});

app.get("/welcome", (req, res) => {
  res.sendFile(path.join(staticFilesRoot, "pages/welcome.html"));
});

app.get("/chat", authenticateUser, (req, res) => {
  if (!req.user) {
    return res.redirect("/"); // Ends the response here
  }
  res.sendFile(path.join(staticFilesRoot, "pages/chat.html"));
});

app.get("/admin/api/users", (req, res) => {
  db.all("SELECT * FROM users;", (err, rows) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ message: "Erro ao buscar os usuários no banco de dados" });
    }

    if (rows && rows.length > 0) {
      return res.status(200).json({ users: rows });
    } else {
      return res.status(404).json({ message: "Nenhum usuário registrado" });
    }
  });
});

app.post("/token", (req, res) => {
  const refreshToken = req.body.refreshToken;
  if (!refreshToken) return res.status(401).send("Refresh token requerido.");
  
  db.get("SELECT * FROM refresh_tokens WHERE refresh_token = ?", [refreshToken], (err, row) => {
    if (err || !row) return res.status(403).send("Refresh token inválido.");

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
      if (err) return res.status(403).send("Token inválido.");
      const accessToken = jwt.sign({ username: user.username }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
      res.json({ accessToken });
    });
  });
});

let refresh = [];

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT username, password FROM users WHERE username = ?;", [username], (err, user) => {
    if (err) {
      console.error("Error: ", err);
      return res.status(500).json({ message: "Ocorreu um erro de conexão com o banco de dados" });
    } else if (!user) {
      return res.status(404).json({ message: "Username não existe no banco de dados" });
    } else {
      bcrypt.compare(password, user.password)
        .then((match) => {
          if (match) {
            const payload = { username: user.username };
            const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
            const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET);
            refresh.push(refreshToken);

            // Store refresh token in the database
            db.run("INSERT INTO refresh_tokens (user_id, refresh_token) VALUES (?, ?)", [user.id, refreshToken]);

            return res.status(200).json({ message: "Login successful!", accessToken, refreshToken });
          } else {
            return res.status(401).json({ message: "Invalid credentials." });
          }
        })
        .catch((error) => {
          console.error("Error: ", error);
          return res.status(500).json({ message: "Ocorreu um erro durante o login!" });
        });
    }
  });
});

app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  const saltRounds = 10;

  if (!username || !password) {
    return res.status(400).json({ message: "Usuário e senha são obrigatórios." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "A senha deve ter no mínimo 6 caracteres." });
  }

  db.get("SELECT username FROM users WHERE username = ?;", [username], (err, row) => {
    if (err) {
      console.error("Database query error: ", err);
      return res.status(500).json({ message: "Erro ao verificar o usuário no banco de dados" });
    }

    if (row) {
      // User already exists
      return res.status(409).json({ message: "Este usuário já existe" });
    }

    bcrypt
      .hash(password, saltRounds)
      .then((hash) => {
        db.run("INSERT INTO users VALUES (NULL, ?, ?);", [username, hash], (err) => {
          if (err) {
            console.error("Erro durante o INSERT INTO: ", err);
            return res.status(500).json({ message: "Erro ao registrar o usuário no banco de dados" });
          }

          return res.status(200).json({ message: "Usuário registrado com sucesso" });
        });
      })
      .catch((error) => {
        console.error("Error hashing password: ", error);
        return res.status(500).json({ message: "Erro ao processar o registro do usuário" });
      });
  });
});

// WebSocket namespace setup
const ioUser = io.of("/users");
const ioGroup = io.of("/groups");

ioUser.use((socket, next) => {
  const token = socket.handshake.auth["token"];
  if (!token) return next(new Error('Authorization token is required'));

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return next(new Error('Invalid token'));
    socket.user = { decoded };
    next();
  });
});

ioGroup.use((socket, next) => {
  const token = socket.handshake.auth["token"];
  if (!token) return next(new Error('Authorization token is required'));

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return next(new Error('Invalid token'));
    socket.user = { decoded };
    next();
  });
});

// Start the server
server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});
