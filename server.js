const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);


// =========================
// FICHIERS PUBLICS
// =========================

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
    },

    {
        title: "Compteur de personnes en lignes",
        content: "Un compteur qui indique le nombres de personnes en lignes et leurs pseudo",
        date: "7 octobre 2026"
    }
];


// =========================
// UTILISATEURS EN LIGNE
// =========================


const utilisateursConnectes = new Map();


// =========================
// CONNEXION
// =========================

io.on("connection", (socket) => {




    console.log(
        "Nouvelle connexion. Utilisateurs en ligne : " +
        utilisateursEnLigne
    );


    


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

        if (
    Array.from(utilisateursConnectes.values())
        .some(
            (pseudo) =>
                pseudo.toLowerCase() === username.toLowerCase()
        )
) {

    socket.emit(
        "username taken"
    );

    return;
}


        socket.username = username;

utilisateursConnectes.set(
    socket.id,
    username
);

socket.emit(
    "username accepted"
);
        
console.log(
    username + " a rejoint Blocus."
);

io.emit(
    "online users",
    Array.from(utilisateursConnectes.values())
);

    io.emit(
    "online count",
    utilisateursConnectes.size
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

        if (!salons.includes(room)) {
            return;
        }


        // Actualités n'est pas un salon de discussion

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


        // Envoyer l'historique

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

        if (!socket.username) {
            return;
        }


        if (!socket.currentRoom) {
            return;
        }


        // Empêcher les messages dans Actualités

        if (socket.currentRoom === "actualites") {
            return;
        }


        if (typeof message !== "string") {
            return;
        }


        message = message.trim();


        if (message === "") {
            return;
        }


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


        // Maximum 200 messages par salon

        if (
            messagesParSalon[socket.currentRoom].length > 200
        ) {

            messagesParSalon[socket.currentRoom].shift();

        }


        // Envoyer le message aux utilisateurs du salon

        io.to(socket.currentRoom).emit(
            "chat message",
            nouveauMessage
        );

    });


    // =========================
    // DÉCONNEXION
    // =========================

    socket.on("disconnect", () => {

        

        // Retirer le pseudo

        if (socket.username) {

    utilisateursConnectes.delete(
        socket.id
    );

}

        io.emit(
    "online users",
    Array.from(utilisateursConnectes.values())
);
        
        console.log(
            "Déconnexion. Utilisateurs en ligne : " +
            utilisateursEnLigne
        );


        // Mettre à jour le compteur

        io.emit(
    "online count",
    utilisateursConnectes.size
);


        // Mettre à jour la liste

        io.emit(
            "online users",
            Array.from(utilisateursConnectes.values())
        );

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
