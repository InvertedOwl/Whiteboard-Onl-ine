const express = require('express')
const app = express()
const http = require('http').Server(app);
const io = require('socket.io')(http);
const crypto = require('crypto');
const port = 3007
app.use('/static',  express.static(__dirname + "/client"))

app.get('/', (req, res) => {
  res.sendFile(__dirname + "/client/index.html")
})

http.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

let mice = {};
let boards = {};

io.on('connection', (socket) => {
  socket.on("join", (msg) => {
    socket.join(msg);
    if (!boards[msg]) {
      boards[msg] = {};
    }
    for (let id of Object.keys(boards[msg])) {
      if (id.includes("stroke")) {
        socket.emit("strokes", boards[msg][id])
      }
      if (id.includes("sticky")) {
        socket.emit("sticky", boards[msg][id])
      }
    }
  })

  socket.on("strokes", (strokes) => {
    for (let i of socket.rooms) {
      if (!boards[i]) {
        boards[i] = {};
      }
      boards[i][strokes.id + "stroke"] = strokes;
      io.to(i).emit("strokes", strokes)
    }
  })
  socket.on("mouse", (strokes) => {
    for (let i of socket.rooms) {
      io.to(i).emit("mouse", strokes)
      mice[strokes.id] = strokes;
    }
  })

  socket.on("reset", () => {
    for (let i of socket.rooms) {
      boards[i] = {};
      io.to(i).emit("reset")
    }
  })

  socket.on("create", () => {
    let id = createId(32);
    socket.emit("create_res", {"id": id})
    for (let i of socket.rooms) {
      socket.leave(i);
    }
    socket.join(id);
    console.log(socket.rooms);
  })

  socket.on("disconnect", (reason) => {
    for (let mouseID of Object.keys(mice)) {
      let mouse = mice[mouseID];
      mouse.color = "hsl(0, 100%, 50%, 0)";
      console.log(mouse);
      io.emit("mouse", mouse)
    }
  });

  socket.on("sticky", (data) => {
    console.log(data);
    for (let i of socket.rooms) {
      if (!boards[i]) {
        boards[i] = {};
      }
      boards[i][data.id + "sticky"] = data;
      io.to(i).emit("sticky", data);
    }
  })
  socket.on("deleteSticky", (id) => {
    for (let i of socket.rooms) {
      if (!boards[i]) {
        boards[i] = {};
      }
      delete boards[i][id.id + "sticky"]
      io.to(i).emit("deleteSticky", id);
    }
  })
})

function createId(length) {
  let token = crypto.randomBytes(length);
  token = token.toString('hex');
  return token;
}

