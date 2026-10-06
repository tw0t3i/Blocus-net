const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Permet d'utiliser les fichiers du dossier "public"
app.use(express.static("public"));

// =========================
// SALONS DISPONIBLES
// =========================

const salons = [
    "general",
    "lycee-a",
    "lycee-b",
    "lycee-c",
    "actualites"
];


// =========================
// CONNEXION D'UN UTILISATEUR
// =========================

io.on("connection", (socket) => {

    console.log("Quelqu'un vient de se connecter !");


    // =========================
    // CHOIX DU PSEUDO
    // =========================

    socket.on("set username", (username) => {

        socket.username = username;

        console.log(username + " a rejoint Blocus.");

    });


    // =========================
    // REJOINDRE UN SALON
    // =========================

    socket.on("join room", (room) => {

        // Vérifier que le salon existe
        if (!salons.includes(room)) {
            return;
        }

        // Quitter l'ancien salon
        if (socket.currentRoom) {
            socket.leave(socket.currentRoom);
        }

        // Rejoindre le nouveau salon
        socket.join(room);

        socket.currentRoom = room;

        console.log(
            (socket.username || "Utilisateur") +
            " a rejoint le salon " +
            room
        );

    });


    // =========================
    // ENVOYER UN MESSAGE
    // =========================

    socket.on("chat message", (message) => {

        // Vérifier le pseudo
        if (!socket.username) {
            return;
        }

        // Vérifier le salon
        if (!socket.currentRoom) {
            return;
        }

        // Vérifier que le message n'est pas vide
        if (typeof message !== "string") {
            return;
        }

        message = message.trim();

        if (message === "") {
            return;
        }

        // Limiter la taille du message
        if (message.length > 500) {
            message = message.substring(0, 500);
        }


        // Envoyer le message uniquement
        // aux personnes présentes dans le même salon

        io.to(socket.currentRoom).emit("chat message", {

            username: socket.username,

            message: message,

            room: socket.currentRoom

        });

    });


    // =========================
    // DÉCONNEXION
    // =========================

    socket.on("disconnect", () => {

        if (socket.username) {

            console.log(
                socket.username + " s'est déconnecté."
            );

        }

    });

});


// =========================
// PORT DU SERVEUR
// =========================

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Le serveur fonctionne sur le port ${PORT}`
    );

});
