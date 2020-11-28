// Requiring dependencies
const express = require("express");
const path = require("path");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { ExpressPeerServer } = require("peer");
const shortid = require("shortid");

const {
  userJoin,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

// Creating peer server
const peerServer = ExpressPeerServer(server, {
  debug: process.env.NODE_ENV === "development",
});

// Middlewares
app.use("/peerjs", peerServer);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "/public")));

// Index route
app.get("/", (req, res) => {
  // res.redirect(`/${shortid.generate()}`);
  res.render("index", { roomId: shortid.generate() });
});

// Exit route
app.get("/exit", (req, res) => {
  res.render("exit");
});

// Specific room route
app.get("/:room", (req, res) => {
  res.render("room", {
    roomId: req.params.room,
    port: process.env.NODE_ENV === "production" ? 443 : 5000, // Setting peerjs port dynamically
  });
});

// Socket conenction
io.on("connection", (socket) => {
  // Join room event
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", userId);

    // Message event
    socket.on("message", (messageObj) => {
      // console.log(roomId);
      io.to(roomId).emit("createMessage", messageObj);
    });

    // Disconnect event
    socket.on("disconnect", () => {
      const user = userLeave(socket.id);
      socket.to(roomId).broadcast.emit("user-disconnected", userId);
      io.to(user.room).emit("roomUsers", getRoomUsers(user.room));
    });
  });

  // Add user to chat list
  socket.on("addUserToList", (username, roomId) => {
    const user = userJoin(socket.id, username, roomId);
    io.to(roomId).emit("roomUsers", getRoomUsers(user.room));
    socket.emit("roomUsers", getRoomUsers(user.room));
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
