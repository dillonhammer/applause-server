const express = require("express");
const { createServer } = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const app = express();
const port = process.env.PORT || 8001;
require("dotenv").config();

app.use(cors({ origin: process.env.CLIENT }));

const server = createServer(app);

server.listen(port, () => {
  console.log("Running server on port %s", port);
});

app.get("/knockknock", (req, res) => res.send("Who's there?"));

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT,
  },
});

/**
 * @param names The people in the audience
 * @param socketToName Mapping of socket IDs to person's name
 * @param sounds Map of sound_name to list of people currently doing that sound, e.g. "clap" -> ["Dillon", "Alex"]
 */
const state = {
  names: new Set(),
  socketToName: new Map(),
  sounds: new Map(),
};

state.sounds.set("clap", []);
state.sounds.set("airhorn", []);
state.sounds.set("nytRemix", []);
state.sounds.set("nyt", []);
state.sounds.set("boo", []);
state.sounds.set("scream", []);
state.sounds.set("bee-boo-boo-bop", []);
state.sounds.set("seinfeld", []);

const serializeState = (state) => {
  const result = { count: state.names.size };
  result.audience = Array.from(state.names.values());
  for (let sound of state.sounds.keys()) {
    const names = state.sounds.get(sound);
    result[sound] = names;
  }
  return result;
};

io.on("connect", (socket) => {
  console.log("New client connected");

  socket.on("disconnect", () => {
    console.log(
      state.socketToName.get(socket.id) || "Unknown client",
      "disconnected"
    );
    const name = state.socketToName.get(socket.id);
    state.names.delete(name);
    state.socketToName.delete(socket.id);
    for (let sound of state.sounds.keys()) {
      const names = state.sounds.get(sound);
      if (names.includes(name)) names.splice(names.indexOf(name), 1);
    }
    io.sockets.emit("update", serializeState(state));
  });

  socket.on("enter", (name) => {
    if (name.length > 20) {
      socket.emit("error", "Name must be 20 characters or fewer");
    } else if (state.names.has(name)) {
      socket.emit("error", "Name already taken! :(");
    } else {
      state.names.add(name);
      state.socketToName.set(socket.id, name);
      console.log(`${name} joined!`);
      console.log(Array.from(state.names.values()));
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
    state.sounds = new Map();
    io.sockets.emit("update", serializeState(state));
  });
});
