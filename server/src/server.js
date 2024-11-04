const {createServer} = require("node:http");
const express = require("express");
const path = require("path");
const {Server} = require("socket.io");

const port = 6969;
const host = "127.0.0.1";

const app = express();
const server = createServer(app);
const io = new Server(server);

// gets root directory for the npm project and joins with client src
const rootDir = process.cwd();
const staticFilesRoot = path.join(rootDir, "client/src");

// virtual path to server static files for the client
app.use("/scripts", express.static(path.join(staticFilesRoot, "scripts/")));
app.use("/pages", express.static(path.join(staticFilesRoot, "pages/")));
app.use("/styles", express.static(path.join(staticFilesRoot, "styles/")));

app.get("/", (req, res) =>
	{
		res.sendFile(path.join(staticFilesRoot, "pages/home.html"));
	});

// when a new user is created it is assigned a room that has it's unique ID(To Be Implemented)
// to send a message to a different user that message payload must contain {userId, msg}
// there will be two name spaces, one for users and one for groups. This will help separate group and user-to-user logic

// current implementation: 
//   *there is no unique userId
//   *there is only session data persistence
//   *there is no message encryption


// defines namespaces to pipe data through different channels for users and groups;
const ioUser = io.of("/users");
const ioGroup = io.of("/groups");

ioUser.on("connection", (socket)=>
	{

		// TODO(Felipe): replace socketId with userId later on.
		socket.join(socket.id);
		// informs other sockets a new user has connected and that they can talk to him.
		socket.broadcast.emit("user connnected", {"id": socket.id});
		socket.on("user connected", (data)=> socket.broadcast.emit("user connnected", {"id": socket.id}))
		// watches on for send messages, and redirects it to the correct room.
		socket.on("send message", (data)=>
			{
				ioUser.to(data.id).emit("receive message", {id: socket.id, msg: data.msg});
			});

		socket.on("disconnect", (reason)=>
			{
				ioUser.emit("user disconnected", {"id": socket.id});
			});
	});

server.listen(port, host, ()=>{console.log(`shits is running ${host}:${port}`)});