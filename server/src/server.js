require("dotenv").config();

const {createServer} = require("node:http");
const express = require("express");
const path = require("node:path");
const {Server} = require("socket.io");
const {randomUUID} = require("node:crypto");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")

const port = 3000;
const host = "127.0.0.1";

const db = new sqlite3.Database('./model/db');

db.serialize(()=>{
  //users informations
  db.run(`CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY, 
    username TEXT NOT NULL UNIQUE, 
    password TEXT NOT NULL);`);

  //friend list information
  db.run(`CREATE TABLE IF NOT EXISTS friends(id INTEGER PRIMARY KEY,
    id_friend1 INTEGER NOT NULL,
    id_friend2 INTEGER NOT NULL,
    FOREIGN KEY(id_friend1) REFERENCES users(id),
    FOREIGN KEY(id_friend2) REFERENCES users(id));`);

  //groups information
  db.run(
  `CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY, 
    admin INTEGER NOT NULL, 
    group_name TEXT NOT NULL, 
    FOREIGN KEY(admin) REFERENCES users(id)
  );`);

  //group members list information
  db.run(
  `CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY, 
    group_id INTEGER NOT NULL, 
    user INTEGER NOT NULL, 
    FOREIGN KEY(group_id) REFERENCES groups(id), 
    FOREIGN KEY(user) REFERENCES users(id)
  );`);
})

const app = express();
const server = createServer(app);
const io = new Server(server);

// gets root directory for the npm project and joins with client src
const rootDir = process.cwd();
const staticFilesRoot = path.join(rootDir, "client/src");

// setting up middlewares
app.use("/scripts", express.static(path.join(staticFilesRoot, "scripts/")));
app.use("/pages", express.static(path.join(staticFilesRoot, "pages/")));
app.use("/styles", express.static(path.join(staticFilesRoot, "styles/")));
app.use(express.json());


/*routes*/
function authenticateUser(req, res, next){
  console.log(req.headers);
  const token = req.headers.authorization?.split(" ")[1];
  //const token = req.query.token;
  if(!token){
    console.log("error sem token"); 
    return res.sendStatus(400);
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) =>{
    if(err) {
      console.log(err);
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
}

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
  res.status(200).sendFile(path.join(staticFilesRoot, "pages/chat.html"));
});

app.get("/admin/api/users", (req, res)=>{
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

app.post("/token", (req, res)=>{
  const refreshToken = req.body.refreshToken;
  if(!refreshToken) return res.status(401);
  if(!refresh.includes(refreshToken)) return res.status(403);
  jtw.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, user)=>{
    if(err) return res.status(403);
    const accessToken = jwt.sign({username: user.username}, ACCESS_TOKEN_SECRET);
    res.json({accessToken});
  })
});

let refresh = [];

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT username, password FROM users WHERE username = ?;", [username], (err, user) => {
    if (err) {
      console.error("Error: ", err); // Fixed variable name
      return res.status(500).json({ message: "Ocorreu um erro de conexão com o banco de dados" }); // Ends response
    } else if (!user) {
      return res.status(404).json({ message: "Username não existe no banco de dados" }); // Ends response
    } else {
      console.log("User found:", user);
      bcrypt.compare(password, user.password)
        .then((match) => {
          if (match) {
            const payload = { username: user.username };
            const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15s" });
            const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET);
            refresh.push(refreshToken);
            return res.status(200).json({ message: "Login successful!", accessToken, refreshToken }); // Ends response
          } else {
            return res.status(401).json({ message: "Invalid credentials." }); // Ends response
          }
        })
        .catch((error) => {
          console.error("Error: ", error);
          return res.status(500).json({ message: "Ocorreu um erro durante o login!" }); // Ends response
        });
    }
  });
});

app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  const saltRounds = 10;

  db.get("SELECT username FROM users WHERE username = ?;", [username], (err, row) => {
    if (err) {
      console.error("Database query error: ", err);
      return res.status(500).json({ message: "Erro ao verificar o usuário no banco de dados" });
    }

    if (row) {
      // User already exists
      return res.status(409).json({ message: "Este usuário já existe" });
    }

    // User does not exist, proceed with registration
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

// Adiciona um amigo
app.post("/api/addFriend", authenticateUser, (req, res) => {
  const { friendUsername } = req.body;

  if (req.user.username === friendUsername) {
    return res.status(400).json({ message: "Você não pode ser amigo de si mesmo!" });
  }

  db.run(
    "INSERT INTO friends(id_friend1, id_friend2) VALUES(?, ?);",
    [req.user.id, friendId, friendId, req.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "Erro ao adicionar amigo." });
      }
      res.status(200).json({ message: "Amigo adicionado com sucesso!" });
    }
  );
});

// Verifica se dois usuários são amigos
app.get("/api/isFriend/:friendId", authenticateUser, (req, res) => {
  const { friendId } = req.params;

  db.get(
    "SELECT * FROM friends WHERE (id_friend1 = ? AND id_friend2 = ?) OR (id_friend1 = ? AND id_friend2 = ?);",
    [req.user.id, friendId, friendId, req.user.id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao verificar amizade." });
      }
      if (row) {
        res.status(200).json({ isFriend: true });
      } else {
        res.status(200).json({ isFriend: false });
      }
    }
  );
});

/*websocket events*/
// defines namespaces to pipe data through different channels for users and groups;
const ioUser = io.of("/users");
const ioGroup = io.of("/groups");

ioUser.use((socket, next) => {
  const token = socket.handshake.auth["token"];
  const refreshToken = socket.handshake.auth["refresh"];
  if (!token) {
    return next(new Error('Authorization token is required'));
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Invalid token'));
    }
    socket.user = {decoded, refreshToken};
    console.log(decoded)
    next();
  });
});

// group to users/members communication channel
ioGroup.on("connection", (socket) => {
  socket.on("create group", (data) => {
    const groupId = randomUUID();
    const group = { group_id: groupId, group_name: data.groupName, admin: socket.id, members: [socket.id] };
    groups.push(group);
    socket.join(group.group_id);
  });

  socket.on("join group", (data) => {
    socket.join(groups.find((group) => group.group_id == data.groupId).group_id);
    socket.emit("joined group", data.id);
  });

  socket.on("send message", (data) => {
    socket.to(data.group_id).emit("receive message", { id: socket.id, msg: data.msg });
	console.log(`Sent key: ${sharedKey}`);
  });
});

// user to user communication channel
ioUser.on("connection", (socket) => {
  // informs other sockets a new user has connected and that they can talk to him.
  socket.broadcast.emit("user connected", { id: socket.id, username: socket.handshake.auth.username });

  // rebroadcast to the new users the ids of the already connected ones
  socket.on("notify", (data) => {
    socket.to(data.dst).emit("notify", { src: data.src, username: data.username, key: data.key});
  });

  socket.on("create secret", (data)=>
  {
  	socket.to(data.dst).emit("create secret", {src: data.src, key: data.key});
  })

  // watches on for send messages, and redirects it to the correct room.
  socket.on("send message", (data) => {
  	console.log(`message from ${data.id} to ${data.sender}: ${new TextDecoder().decode(data.msg)}`)
    socket.to(data.id).emit("receive message", { id: socket.id, sender: data.sender, msg: data.msg});
  });

  socket.on("disconnect", (reason) => {
    console.log(refresh);
    refresh = refresh.filter(token=> token !== socket.user.refreshToken);
    console.log(refresh);
    ioUser.emit("user disconnected", { id: socket.id });
  });
});

server.listen(port, host, () => { console.log(`server is running on ${host}:${port}`) });