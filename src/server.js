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

/**
 * @param names The people in the audience
 * @param socketToName Mapping of socket IDs to person's name
 * @param count Count of total clients connected
 * @param sounds Map of sound_name to list of people currently doing that sound, e.g. "clap" -> ["Dillon", "Alex"]
 */
const state = {
  names: new Set(),
  socketToName: new Map(),
  count: 0,
  sounds: new Map(),
};

state.sounds.set("clap", []);
state.sounds.set("airhorn", []);
state.sounds.set("nytRemix", []);
state.sounds.set("nyt", []);
state.sounds.set("boo", []);

const serializeState = (state) => {
  const result = { count: state.count };
  for (let sound of state.sounds.keys()) {
    const names = state.sounds.get(sound);
    result[sound] = names;
  }
  return result;
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
    for (let sound of state.sounds.keys()) {
      const names = state.sounds.get(sound);
      if (names.includes(name)) names.splice(names.indexOf(name), 1);
    }
    io.sockets.emit("update", serializeState(state));
  });

  socket.on("enter", (name) => {
    if (state.names.has(name) && name !== "root") {
      socket.emit("error", "Name already taken! :(");
    } else {
      state.names.add(name);
      state.socketToName.set(socket.id, name);
      console.log(`${name} joined!`);
      socket.emit("welcome", name);
      io.sockets.emit("update", serializeState(state));
    }
  });

  socket.on("sound", ({ name, sound, type }) => {
    const names = state.sounds.get(sound);
    if (type === "START") {
      names.push(name);
    } else {
      if (names.includes(name)) names.splice(names.indexOf(name), 1);
    }

    io.sockets.emit("update", serializeState(state));
  });

  socket.on("clear", () => {
    state.names = new Set();
    state.socketToName = new Map();
    state.count = 1;
    state.sounds = new Map();
    io.sockets.emit("update", serializeState(state));
  });
});
