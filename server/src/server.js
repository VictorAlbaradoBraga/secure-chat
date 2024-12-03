const {createServer} = require("node:http");
const express = require("express");
const path = require("node:path");
const {Server} = require("socket.io");
const {randomUUID} = require("node:crypto");
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require("bcrypt");

const port = 3000;
const host = "127.0.0.1";

const db = new sqlite3.Database(':memory:');

db.serialize(()=>{
  db.run("CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL UNIQUE);")
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
app.get("/", (req, res) => {
  res.redirect("/welcome");
});


app.get("/welcome", (req, res) => {
  res.sendFile(path.join(staticFilesRoot, "pages/welcome.html"));
});

app.get("/home", (req, res) => {
  res.sendFile(path.join(staticFilesRoot, "pages/home.html"));
});

app.post("/api/login", (req, res) => {
  const {username, password} = req.body;
  
  db.get("SELECT username, password FROM users WHERE username = ?;", [username], (err, user)=>{
    if(err)
    {
      console.error("Error: ", error);
      res.status(500).json({message: "Ocorreu um erro de conexão com o banco de dados"});
    }else if (!user) {
        console.log('User not found.');
        res.status(500).json({message: "Username não existe no banco de dados"});
    }else {
      console.log('User found:', user);
      if(user){
        try
        {
          bcrypt.compare(password, user.password).then((match)=>{
            if(match)
            {
              res.status(200).json({message: "Login successful!"}); 
            }else
            {
              res.status(401).json({message: "Invalid credentials."});
            }
          });
        }catch(err)
        {
          console.error('Error: ', error);
          res.status(500).json({message: "Ocorreu um erro durante o login!"});
        }
      }
    }
  });
});

app.post("/api/register", (req, res) => {
  const {username, password} = req.body;
  const saltRound = 10;

  db.get("SELECT username FROM users WHERE username = ?", [username], (err, row)=>{
    if(err)
    {
      console.error("Error: ", error)
    }else if(!row){
      try
      {
        bcrypt.hash(password, saltRound).then((hash)=>{
          db.run("INSERT INTO users VALUES (NULL, ?, ?)", [username, hash], (err, rowid)=>{
            if(err)
            {
              console.log("Erro durante INSERT INTO: ", err);
            }else
            {
              res.status(200).json({message: "Usuário registrado com sucesso"});
            }
          });
        });
      }catch(err)
      {
        console.error('Error during registration:', error);
        res.status(500).json({message: "Ocorreu um erro durante o registro!"});
      }
    }else{
      res.status(500).json({message: "Este usuário já existe"});
    }
  });
});


/*websocket events*/
// defines namespaces to pipe data through different channels for users and groups;
const ioUser = io.of("/users");
const ioGroup = io.of("/groups");

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
  // TODO(Felipe): replace socketId with uuid later on.
  socket.join(socket.id);

  // informs other sockets a new user has connected and that they can talk to him.
  socket.broadcast.emit("user connected", { id: socket.id, user_name: socket.handshake.auth.user_name });

  // rebroadcast to the new users the ids of the already connected ones
  socket.on("notify", (data) => {
    socket.to(data.dst).emit("notify", { src: data.src, user_name: data.user_name, key: data.key});
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

  // invitation event to signal to other user if they wish to join a group chat
  socket.on("invite user", (data) => {
    socket.to(data.id).emit("invitation", {});
  });

  socket.on("share key", (data)=>
  {
  	socket.to(data.id).emit("receive key", {"id": data.id, "key": data.key})
  })

  // Armazenando as chaves compartilhadas
  const sharedKeys = {};  // Aqui é onde vamos armazenar as chaves compartilhadas

  socket.on("user pair connected", (data) => {
	// Sort the IDs to ensure the key is always the same regardless of the order
	const pairId = [data.user1, data.user2].sort().join("_");
  
	// Check if a shared key already exists for this pair
	if (!sharedKeys[pairId]) {
	  // If not, generate and store a new key
	  const sharedKey = randomUUID();
	  sharedKeys[pairId] = sharedKey;
	  console.log(`Shared key between ${data.user1} and ${data.user2}: ${sharedKey}`);
	} else {
	  // Otherwise, retrieve the existing key
	  const sharedKey = sharedKeys[pairId];
	}
  
	// Store the shared key in the socket
	socket.sharedKey = sharedKeys[pairId];
  
	// Send the shared key to both users
	socket.emit("shared key", { key: sharedKeys[pairId] });
	socket.broadcast.to(data.user2).emit("shared key", { key: sharedKeys[pairId] });
  });  

  socket.on("disconnect", (reason) => {
    // server signals all current connected users who disconnected
    ioUser.emit("user disconnected", { id: socket.id });
  });
});

server.listen(port, host, () => { console.log(`server is running on ${host}:${port}`) });