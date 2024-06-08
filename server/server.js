require('dotenv').config();
const mongoose = require("mongoose");
const Document = require("./document");
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3001;

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => console.log('connected'));
mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err));

app.use(helmet());
app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
}));

const server = require("http").createServer(app);
const io = require("socket.io")(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});

const defaultValue = "";

io.on("connection", (socket) => {
    console.log('New client connected');

    socket.on("get-document", async (documentId) => {
        const document = await findOrCreateDocument(documentId);
        socket.join(documentId);
        socket.emit("load-document", document.data);

        socket.on("send", (delta) => {
            socket.broadcast.to(documentId).emit("receive", delta);
        });

        socket.on("save-document", async (data) => {
            console.log(`Saving document ${documentId} with data:`, data);
            await Document.findByIdAndUpdate(documentId, { data });
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

async function findOrCreateDocument(id) {
    if (id == null) return;
    let document = await Document.findById(id);
    if (document) return document;
    return await Document.create({ _id: id, data: defaultValue });
}

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});