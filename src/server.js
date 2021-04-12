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

const io = socketIo(server);

let count = 0;

io.on("connect", (socket) => {
  count++;
  console.log("Connected client", count);

  socket.on("disconnect", () => {
    console.log("Disconnected client", count);
    count--;
  });
});
