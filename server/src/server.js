// server.js
require("dotenv").config();

const { createServer } = require("node:http");
const express = require("express");
const path = require("node:path");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./db");
const { authenticateUser } = require("./auth");

const app = express();
const server = createServer(app);
const io = new Server(server);

const port = 3000;
const host = "127.0.0.1";

const rootDir = process.cwd();
const staticFilesRoot = path.join(rootDir, "client/src");

// Configuração de middlewares
app.use("/scripts", express.static(path.join(staticFilesRoot, "scripts/")));
app.use("/pages", express.static(path.join(staticFilesRoot, "pages/")));
app.use("/styles", express.static(path.join(staticFilesRoot, "styles/")));
app.use(express.json());

// Rotas
app.get("/", (req, res) => res.redirect("/welcome"));

app.get("/welcome", (req, res) => res.sendFile(path.join(staticFilesRoot, "pages/welcome.html")));

app.get("/chat", authenticateUser, (req, res) => {
  if (!req.user) return res.redirect("/");
  res.sendFile(path.join(staticFilesRoot, "pages/chat.html"));
});

app.get("/admin/api/users", (req, res) => {
  db.all("SELECT * FROM users;", (err, rows) => {
    if (err) {
      console.error("Erro no banco de dados:", err);
      return res.status(500).json({ message: "Erro ao buscar os usuários" });
    }
    return res.status(200).json({ users: rows.length > 0 ? rows : "Nenhum usuário encontrado" });
  });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT username, password FROM users WHERE username = ?", [username], (err, user) => {
    if (err || !user) return res.status(404).json({ message: "Usuário não encontrado" });

    bcrypt.compare(password, user.password).then((match) => {
      if (match) {
        const token = jwt.sign({ username: user.username }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
        return res.status(200).json({ message: "Login bem-sucedido!", token });
      }
      res.status(401).json({ message: "Credenciais inválidas" });
    });
  });
});

app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  const saltRounds = 10;

  db.get("SELECT username FROM users WHERE username = ?", [username], (err, row) => {
    if (row) return res.status(409).json({ message: "Usuário já existe" });

    bcrypt.hash(password, saltRounds).then((hash) => {
      db.run("INSERT INTO users VALUES (NULL, ?, ?)", [username, hash], (err) => {
        if (err) return res.status(500).json({ message: "Erro ao registrar o usuário" });
        res.status(200).json({ message: "Usuário registrado com sucesso" });
      });
    });
  });
});

// WebSocket
const ioUser = io.of("/users");
const ioGroup = io.of("/groups");

ioUser.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Token obrigatório"));

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return next(new Error("Token inválido"));
    socket.user = user;
    next();
  });
});

// Usuários conectados
ioUser.on("connection", (socket) => {
  console.log(`Usuário ${socket.user.username} conectado`);

  // Enviar solicitação de amizade
  socket.on("send friend request", (data) => {
    const { from, to } = data;
    socket.broadcast.emit("receive friend request", { from });
  });

  // Aceitar solicitação de amizade
  socket.on("accept friend request", (data) => {
    const { from, to } = data;
    socket.broadcast.emit("friend request accepted", { from });
  });

  // Enviar mensagem para amigo
  socket.on("send friend message", (data) => {
    const { to, msg } = data;
    socket.to(to).emit("receive friend message", { from: socket.user.username, msg });
  });
});

// Gerenciar grupos
ioGroup.on("connection", (socket) => {
  console.log(`Usuário ${socket.user.username} entrou no grupo`);

  // Criar grupo
  socket.on("create group", (data) => {
    const group = { groupId: randomUUID(), groupName: data.groupName, members: data.members };
    socket.broadcast.emit("group created", group);
  });

  // Enviar mensagem para grupo
  socket.on("send group message", (data) => {
    const { groupId, msg } = data;
    socket.to(groupId).emit("receive group message", { groupId, sender: socket.user.username, msg });
  });
});

// Função para gerar IDs aleatórios (UUID)
function randomUUID() {
  return crypto.randomUUID();
}

server.listen(port, host, () => console.log(`Servidor rodando em ${host}:${port}`));
