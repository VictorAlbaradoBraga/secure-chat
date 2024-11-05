const {createServer} = require("node:http");
const express = require("express");
const path = require("node:path");
const {Server} = require("socket.io");
const {randomUUID} = require("node:crypto")

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
		res.redirect("/welcome");
	});

app.get("/welcome", (req, res)=>
	{
		res.sendFile(path.join(staticFilesRoot, "pages/welcome.html"));
	})

app.get("/home", (req, res)=>
	{
		res.sendFile(path.join(staticFilesRoot, "pages/home.html"));
	})

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

// array of connected users and array of groups:
//   *users = [{"user_name": "user name", "id": <user id>, "groups": [<group ids>]}]
//   *groups = [{"group_id": <group id>, "group_name": "group name", "admin": <user id>, "members": [<user id>]}]
const users = [];
const groups = [];

// group to users/members communcation channel
ioGroup.on("connection", (socket)=>
	{
		socket.on("create group", (data)=>
			{
				const groupId = randomUUID();
				const group = {"group_id": groupId, "group_name": data.groupName, "admin": socket.id, "members": [socket.id]};
				groups.push(group);
				socket.join(group.group_id);
			});

		socket.on("join group", (data)=>
			{
				socket.join(groups.find((group)=> group.group_id == data.groupId).group_id);
				socket.emit("joined group", data.id);
			});

		socket.on("send message", (data)=>
			{
				socket.to(data.group_id).emit("receive message", {"id": socket.id, "msg": data.msg})
			});
	});	

// user to user communication channel
ioUser.on("connection", (socket)=>
	{
		//users.push({"user_name": socket.user_name, "id": socket.id, "groups": []});
		// TODO(Felipe): replace socketId with userId later on.
		
		socket.join(socket.id);
		// informs other sockets a new user has connected and that they can talk to him.
		socket.broadcast.emit("user connnected", {"id": socket.id, "user_name": socket.handshake.auth.user_name});
		// rebroadcast to the new users the ids of the already connected ones
		socket.on("user connected", (data)=> 
			{
				console.log(data.user_name);
				socket.broadcast.emit("user connnected", {"id": socket.id, "user_name": data.user_name})
			});
		// watches on for send messages, and redirects it to the correct room.
		socket.on("send message", (data)=>
			{
				socket.to(data.id).emit("receive message", {"id": socket.id, "sender": data.sender, "msg": data.msg});
			});
		// invitation event to signal to other user if they wish to join a group chat
		socket.on("invite user", (data)=>
			{
				socket.to(data.id).emit("invitation", {})
			})

		socket.on("disconnect", (reason)=>
			{
				// server signals all current connected users who disconnected
				ioUser.emit("user disconnected", {"id": socket.id});
			});
	});

server.listen(port, host, ()=>{console.log(`shits is running ${host}:${port}`)});