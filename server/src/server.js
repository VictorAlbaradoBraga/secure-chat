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

app.get("/", (req, res) =>
	{
		res.sendFile(path.join(staticFilesRoot, "pages/home.html"));
	});

io.on("connection", (socket)=>
	{
		console.log(`${socket.id} connected`);

		socket.on("message", (msg)=>
			{
				console.log(`Received message: ${msg}`);
				socket.broadcast.emit("message", msg);
			})

		socket.on("disconnect", ()=>console.log("user disconnected"));
	});

server.listen(port, host, ()=>{console.log(`shits is running ${host}:${port}`)});