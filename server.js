const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    // Autorise l'envoi d'images (environ 2 Mo par message)
    maxHttpBufferSize: 2e6
});


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

// Identifiant unique pour chaque message (sert aux réponses)
let prochainIdMessage = 1;

// Taille maximale d'une image (en caractères base64, ~500 Ko)
const TAILLE_MAX_IMAGE = 700000;

// Formats d'image autorisés (pas de SVG : risque de sécurité)
const REGEX_IMAGE =
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;


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
    "Nouvelle connexion."
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

    socket.on("chat message", (payload) => {

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


        // Compatibilité : ancien format (texte seul)

        if (typeof payload === "string") {
            payload = { message: payload };
        }

        if (!payload || typeof payload !== "object") {
            return;
        }


        // ----- Texte -----

        let message = payload.message;

        if (typeof message !== "string") {
            message = "";
        }

        message = message.trim();

        if (message.length > 500) {
            message = message.substring(0, 500);
        }


        // ----- Image -----

        let image = null;

        if (payload.image !== undefined && payload.image !== null) {

            if (
                typeof payload.image !== "string" ||
                payload.image.length > TAILLE_MAX_IMAGE ||
                !REGEX_IMAGE.test(payload.image)
            ) {
                socket.emit("message error", "Image invalide ou trop lourde.");
                return;
            }

            image = payload.image;
        }


        // Il faut au moins du texte ou une image

        if (message === "" && image === null) {
            return;
        }


        const historique = messagesParSalon[socket.currentRoom];


        // ----- Réponse à un message -----

        let replyTo = null;

        if (payload.replyTo !== undefined && payload.replyTo !== null) {

            const original = historique.find(
                (m) => m.id === payload.replyTo
            );

            if (original) {

                replyTo = {
                    id: original.id,
                    username: original.username,
                    message: original.message.substring(0, 100),
                    hasImage: original.image !== null
                };

            }

        }


        // Créer le message

        const nouveauMessage = {

            id: prochainIdMessage++,

            username: socket.username,

            message: message,

            image: image,

            replyTo: replyTo,

            room: socket.currentRoom

        };


        // Sauvegarder le message

        historique.push(nouveauMessage);


        // Maximum 200 messages par salon

        if (historique.length > 200) {

            historique.shift();

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
    "Déconnexion."
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
