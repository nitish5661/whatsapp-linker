const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
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

    clients[number] = { client, status: 'pending', qr: null };

    client.on('qr', (qr) => {
        clients[number].status = 'waiting';
        clients[number].qr = qr;
    });

    client.on('ready', async () => {
        clients[number].status = 'authenticated';
        const devices = await client.getContacts();
        clients[number].devices = devices; // Save linked devices
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
        qr: clients[number].qr || null,
        devices: clients[number].devices || null
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
