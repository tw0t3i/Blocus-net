const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Permet d'utiliser les fichiers du dossier "public"
app.use(express.static("public"));

// Quand quelqu'un se connecte
io.on("connection", (socket) => {

    console.log("Quelqu'un vient de se connecter !");

    // Quand un utilisateur choisit son pseudo
    socket.on("set username", (username) => {

        socket.username = username;

        console.log(username + " a rejoint le chat.");

    });

    // Quand quelqu'un envoie un message
    socket.on("chat message", (message) => {

        // Vérifier que l'utilisateur possède un pseudo
        if (!socket.username) {
            return;
        }

        // Envoyer le pseudo + le message à tout le monde
        io.emit("chat message", {
            username: socket.username,
            message: message
        });

    });

    // Quand quelqu'un se déconnecte
    socket.on("disconnect", () => {

        if (socket.username) {
            console.log(socket.username + " s'est déconnecté.");
        }

    });

});

// Port du serveur

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Le serveur fonctionne sur le port ${PORT}`);
});
