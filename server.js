const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const clients = {};

app.post('/start-session', async (req, res) => {
    const { number } = req.body;
    if (!number) return res.status(400).send("Phone number required");

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: number }),
        puppeteer: { headless: true, args: ["--no-sandbox"] },
    });

    clients[number] = { client, status: 'pending', code: null };

    client.on('requiresPhoneAssociation', (code) => {
        clients[number].code = code;
        clients[number].status = 'waiting';
    });

    client.on('ready', () => {
        clients[number].status = 'authenticated';
    });

    client.on('disconnected', () => {
        clients[number].status = 'disconnected';
    });

    client.initialize();
    res.json({ status: 'starting', number });
});

app.get('/status/:number', (req, res) => {
    const number = req.params.number;
    if (!clients[number]) return res.status(404).send('Session not found');
    res.json({
        status: clients[number].status,
        code: clients[number].code || null
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
