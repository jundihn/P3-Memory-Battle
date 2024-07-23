const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const messages = [
  {
    sender: "⚔️ Memory Battle [System]",
    text: "Friendly reminder: keep the chat game-related and enjoyable for all players. Have fun!",
  },
];

const rooms = {};

io.on("connection", (socket) => {
  socket.user = {
    id: socket.id,
    name: "",
    room: "",
    flips: 0,
  };
  // console.log(socket.user.id);

  socket.on("Set-Nick", (nick) => {
    socket.user.name = nick;
  });

  socket.on("Join-Room", (room) => {
    socket.join(room);
    socket.user.room = room;
    if (!rooms[room]) {
      rooms[room] = {
        messages: [],
        users: [],
        turnIndex: 0,
        cards: [],
      };
    }
    rooms[room].users.push(socket.user);
    io.to(room).emit("user-joined", socket.user.name, rooms[room].users);
    io.to(room).emit(
      "update-turn",
      rooms[room].users[rooms[room].turnIndex].id
    );
    console.log(`${socket.user.name} joined ${room}`);
  });

  socket.on("Leave-Room", (room) => {
    socket.leave(room);
    rooms[room].users = rooms[room].users.filter(
      (user) => user.id !== socket.user.id
    );
    io.to(room).emit("user-left", socket.user.name, rooms[room].users);
    console.log(`${socket.user.name} left ${room}`);
  });

  socket.on("messages:post", (message) => {
    const { sender, text } = message;
    const room = socket.user.room;
    const newMessage = { sender, text };
    
    rooms[room].messages.push(newMessage);
    io.to(room).emit("message", newMessage);
    console.log(`Message received in ${room} from ${sender}: ${text}`);
  });

  socket.on("generate-shuffled-card", () => {
    const cardImages = [
      // { src: "/img/helmet-1.png", matched: false },
      // { src: "/img/potion-1.png", matched: false },
      // { src: "/img/ring-1.png", matched: false },
      // { src: "/img/scroll-1.png", matched: false },
      // { src: "/img/shield-1.png", matched: false },
      // { src: "/img/sword-1.png", matched: false },
      { src: "/img/cat.jpg", matched: false },
      { src: "/img/bear.jpeg", matched: false },
      { src: "/img/gorilla.jpg", matched: false },
      { src: "/img/owl.jpg", matched: false },
      { src: "/img/parrot.jpg", matched: false },
      { src: "/img/wolf.avif", matched: false },
    ];

    const shuffledCards = [...cardImages, ...cardImages]
      .sort(() => Math.random() - 0.5)
      .map((card) => ({ ...card, id: Math.random() }));

    rooms[socket.user.room].cards = shuffledCards;
    io.to(socket.user.room).emit("game-board-created", shuffledCards);
    // console.log(shuffledCards);
  });

  socket.on("flip-card", (cardId) => {
    const room = socket.user.room;
    const roomData = rooms[room];
    const card = roomData.cards.find((c) => c.id === cardId);

    if (!card || card.flipped || card.matched) return;

    const currentPlayerIndex = roomData.turnIndex % roomData.users.length;
    const currentPlayer = roomData.users[currentPlayerIndex];

    if (currentPlayer.id !== socket.user.id) {
      return;
    }

    card.flipped = true;
    io.to(room).emit("card-flipped", card);

    const flippedCards = roomData.cards.filter((c) => c.flipped && !c.matched);

    if (flippedCards.length === 2) {
      if (flippedCards[0].src === flippedCards[1].src) {
        flippedCards.forEach((c) => (c.matched = true));
        io.to(room).emit("cards-matched", flippedCards);
      } else {
        setTimeout(() => {
          flippedCards.forEach((c) => (c.flipped = false));
          io.to(room).emit("cards-unmatched", flippedCards);
        }, 1000);
      }

      currentPlayer.flips = 0;
      roomData.turnIndex++;
      io.to(room).emit(
        "update-turn",
        roomData.users[roomData.turnIndex % roomData.users.length].id
      );
    }
  });

  socket.on("disconnect", () => {
    if (socket.user.name) {
      Object.keys(rooms).forEach((room) => {
        rooms[room].users = rooms[room].users.filter(
          (user) => user.id !== socket.user.id
        );
        io.to(room).emit("user-left", socket.user.name, rooms[room].users);
      });
      console.log(`User ${socket.user.name} disconnected`);
    }
  });
  socket.emit("messages", messages);

  // 2. server menerima pesan nya dari client
  // NOTE: nama event harus sama
  socket.on("messages:post", (body) => {
    // 2.5 di masukin doang ke array
    messages.push(body);

    // 3. kita kirim messages yang udah diupdate
    io.emit("messages", messages);
  });
});

httpServer.listen(3000, () => {
  console.log("Server is running on port 3000");
// httpServer.listen(80, () => {
//   console.log("Server is running on port 80");
});
