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
// HISTORIQUE DES MESSAGES
// =========================

// Les messages sont conservés en mémoire
// tant que le serveur fonctionne.

const messagesParSalon = {
    general: [],
    "lycee-a": [],
    "lycee-b": [],
    "lycee-c": []
};

// =========================
// ACTUALITÉS
// =========================

const actualites = [
    {
        title: "Bienvenue sur Blocus.net",
        content: "Bienvenue sur Blocus.net. Le site est actuellement en développement.",
        date: "6 octobre 2026"
    },

    {
        title: "Nouveau système de salons",
        content: "Les salons publics sont maintenant disponibles.",
        date: "6 octobre 2026"
    }
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

        if (typeof username !== "string") {
            return;
        }

        username = username.trim();

        if (username === "") {
            return;
        }

        if (username.length > 20) {
            username = username.substring(0, 20);
        }

        socket.username = username;

        console.log(
            username + " a rejoint Blocus."
        );

    });


// =========================
// ENVOYER LES ACTUALITÉS
// =========================

socket.on("get actualites", () => {

    socket.emit(
        "actualites",
        actualites
    );

});
    
    // =========================
    // REJOINDRE UN SALON
    // =========================

    socket.on("join room", (room) => {

        // Vérifier que le salon existe

        if (!salons.includes(room)) {
            return;
        }

        // Actualités sera traité séparément
        // et ne sera pas un salon de discussion.

        if (room === "actualites") {
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


        // Envoyer l'historique du salon
        // uniquement à la personne qui vient d'arriver

        const historique =
            messagesParSalon[room] || [];

        socket.emit(
            "room history",
            historique
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


        // Empêcher les messages dans Actualités

        if (socket.currentRoom === "actualites") {
            return;
        }


        // Vérifier le type du message

        if (typeof message !== "string") {
            return;
        }

        message = message.trim();


        // Vérifier que le message n'est pas vide

        if (message === "") {
            return;
        }


        // Limiter la taille du message

        if (message.length > 500) {
            message = message.substring(0, 500);
        }


        // Créer le message

        const nouveauMessage = {

            username: socket.username,

            message: message,

            room: socket.currentRoom

        };


        // Sauvegarder le message

        messagesParSalon[socket.currentRoom].push(
            nouveauMessage
        );


        // Limiter l'historique à 200 messages
        // par salon

        if (
            messagesParSalon[socket.currentRoom].length > 200
        ) {

            messagesParSalon[socket.currentRoom].shift();

        }


        // Envoyer le message aux personnes
        // présentes dans le même salon

        io.to(socket.currentRoom).emit(
            "chat message",
            nouveauMessage
        );

    });


    // =========================
    // DÉCONNEXION
    // =========================

    socket.on("disconnect", () => {

        if (socket.username) {

            console.log(
                socket.username +
                " s'est déconnecté."
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
