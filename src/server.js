const express = require("express");
const { createServer, Server } = require("http");
const cors = require("cors");
const socketIo = require("socket.io");
const app = express();
const port = 8080;

app.use(cors());
app.options("*", cors());

const server = createServer(app);

server.listen(port, () => {
  console.log("Running server on port %s", port);
});

app.get("/knockknock", (req, res) => res.send("Who's there?"));

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

const state = {
  count: 0,
  clapping: 0,
};

io.on("connect", (socket) => {
  state.count++;
  console.log("Connected client", state);

  socket.on("disconnect", () => {
    console.log("Disconnected client", state);
    state.count--;
    io.sockets.emit("update", state);
  });

  socket.on("enter", (name) => {
    console.log(`${name} joined!`);
    io.sockets.emit("update", state);
  });

  socket.on("clap", () => {
    state.clapping++;
    io.sockets.emit("update", state);
  });

  socket.on("end_clap", () => {
    state.clapping--;
    io.sockets.emit("update", state);
  });
});
