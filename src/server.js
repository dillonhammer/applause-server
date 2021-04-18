const express = require("express");
const { createServer, Server } = require("http");
const cors = require("cors");
const socketIo = require("socket.io");
const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.options("*", cors());

const server = createServer(app);

server.listen(port, () => {
  console.log("Running server on port %s", port);
});

app.get("/knockknock", (req, res) => res.send("Who's there?"));

const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

/*
Example State:
{
  names: Set<string>,
  socketToName: Map<string, string>,
  count: number,
  clapping: string[],
}
*/

const state = {
  names: new Set(),
  socketToName: new Map(),
  count: 0,
  clapping: [],
};

io.on("connect", (socket) => {
  state.count++;
  console.log("New client connected");

  socket.on("disconnect", () => {
    console.log(
      state.socketToName.get(socket.id) || "Unknown client",
      "disconnected"
    );
    const name = state.socketToName.get(socket.id);
    state.names.delete(name);
    state.socketToName.delete(socket.id);
    state.count = Math.max(state.count - 1, 0);
    if (state.clapping.includes(name))
      state.clapping.splice(state.clapping.indexOf(name), 1);
    io.sockets.emit("update", state);
  });

  socket.on("enter", (name) => {
    if (state.names.has(name) && name !== "root") {
      socket.emit("error", "Name already taken! :(");
    } else {
      state.names.add(name);
      state.socketToName.set(socket.id, name);
      console.log(`${name} joined!`);
      socket.emit("welcome", state);
      io.sockets.emit("update", state);
    }
  });

  socket.on("clap", (name) => {
    state.clapping.push(name);
    console.log("clap", name);
    io.sockets.emit("update", state);
  });

  socket.on("end_clap", (name) => {
    state.clapping.splice(state.clapping.indexOf(name), 1);
    console.log("end_clap", name);
    io.sockets.emit("update", state);
  });

  socket.on("clear", () => {
    state.names = new Set();
    state.socketToName = new Map();
    state.count = 1;
    state.clapping = [];
    io.sockets.emit("update", state);
  });
});
