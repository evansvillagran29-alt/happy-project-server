const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

// Conexión a MongoDB Atlas (Lee la variable de entorno o usa una por defecto)
const MONGO_URI = process.env.MONGO_URI || "tu_url_de_mongodb_aqui";

mongoose.connect(MONGO_URI)
    .then(() => console.log("🔥 Conectado a MongoDB Atlas de happy ai"))
    .catch(err => console.error("Error conectando a MongoDB:", err));

// --- ESQUEMAS DE BASE DE DATOS ---
const UserSchema = new mongoose.Schema({
    userId: { type: Number, unique: true },
    username: String,
    avatarUrl: String,
    status: { type: String, default: "Jugando Roblox" },
    currentPlaceId: { type: Number, default: 0 },
    friends: [{ type: Number }]
});

const ScriptSchema = new mongoose.Schema({
    title: String,
    code: String,
    author: String,
    likes: { type: Number, default: 0 }
});

const User = mongoose.model('User', UserSchema);
const Script = mongoose.model('Script', ScriptSchema);

// --- RUTAS API (Cuentas y Scripts) ---

// Autenticación automática
app.post('/api/auth', async (req, res) => {
    try {
        let { userId, username } = req.body;
        let user = await User.findOne({ userId });
        if (!user) {
            const avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150&format=png`;
            user = new User({ userId, username, avatarUrl, friends: [] });
            await user.save();
        }
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Obtener o buscar TODOS los scripts
app.get('/api/scripts', async (req, res) => {
    try {
        const search = req.query.search || "";
        let query = {};
        if (search !== "") {
            query = { title: { $regex: search, $options: 'i' } };
        }
        const scripts = await Script.find(query).sort({ _id: -1 }).limit(50);
        res.json(scripts);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Guardar un script nuevo
app.post('/api/scripts', async (req, res) => {
    try {
        const { title, code, author } = req.body;
        const newScript = new Script({ title, code, author });
        await newScript.save();
        res.json({ success: true, message: "Script guardado con éxito" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Buscar usuarios
app.get('/api/users/search', async (req, res) => {
    try {
        const query = req.query.q || "";
        const users = await User.find({ username: { $regex: query, $options: 'i' } }).limit(10);
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Añadir amigos
app.post('/api/friends/add', async (req, res) => {
    try {
        const { userId, targetId } = req.body;
        await User.updateOne({ userId }, { $addToSet: { friends: targetId } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Obtener amigos
app.get('/api/friends/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ userId: Number(req.params.userId) });
        if (!user) return res.json([]);
        const friends = await User.find({ userId: { $in: user.friends } });
        res.json(friends);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- WEBSOCKETS (Chat en tiempo real) ---
wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            wss.clients.forEach(client => {
                if (client.readyState === ws.OPEN) {
                    client.send(JSON.stringify(data));
                }
            });
        } catch (e) {
            console.error(e);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Servidor de happy ai corriendo en puerto ${PORT}`));
          
