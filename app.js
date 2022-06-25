import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import Joi from "joi";
import dayjs from "dayjs";
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
const client = new MongoClient(process.env.MONGO_URL);

app.post("/participants", async (req, res) => {
    const usrJoi = Joi.object({
        name: Joi.string().min(1).required(),
    });
    const vUsrJoi = usrJoi.validate(req.body);
    if (vUsrJoi.error) {
        
        res.sendStatus(422);
        return;
    }
    
    const name = req.body.name;
    try {
        await client.connect();
        const dbParticipants = client.db("chat");
        const collection = dbParticipants.collection("users");
        const participant = await collection.findOne({ name: name });
        if (participant) {
            
            res.sendStatus(409);
            return;
        } else {
            let nome = req.body.name;
            let hora = Date.now();
            const insertedParticipant = await collection.insertOne({ name: nome, lastStatus: hora });
            const dbMessages = client.db("chat");
            const collectionMessages = dbMessages.collection("messages");
            await collectionMessages.insertOne({
                from: nome,
                to: 'Todos',
                text: 'entra na sala...',
                type: 'status',
                time: dayjs().locale('pt-br').format('hh:mm:ss')
            })

            res.sendStatus(201);
            client.close();
        }
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
        client.close();
    }
});

app.get("/participants", async (_req, res) => {
    try {
        await client.connect();
        const chatDB = client.db("chat");
        const chatUsers = chatDB.collection("users");
        const users = await chatUsers.find({}).toArray();
        res.status(200).send(users);
        client.close();
    } catch (err) {
        res.send(err).status(500);
        client.close();
        console.log(err);
    }
});

app.post("/messages", async (req, res) => {
    const message = req.body;
    message.from = req.headers.user;
    message.time = dayjs().locale('pt-br').format('hh:mm:ss');
    try {
        await client.connect();
        const dbParticipants = client.db("chat");
        const collection = dbParticipants.collection("users");
        const from = await collection.findOne({ name: message.from });
        if (!from) {
            res.sendStatus(422);
            client.close();
            return;
        } else {
            await client.connect();
            const dbMessages = client.db("chat");
            const collectionMessages = dbMessages.collection("messages");
            const messagesModel = Joi.object({
                to: Joi.string().required(),
                text: Joi.string().required(),
                type: Joi.string().valid('message', 'private_message').required(),
                from: Joi.string().required(),
                time: Joi.optional()
            });
            const validation = messagesModel.validate(message);
            if (validation.error) {
                res.status(422).send("Envie um formato válido");
                console.log(validation.error.details);
                client.close();
                return;
            } else {
                await collectionMessages.insertOne(message);
                res.sendStatus(201);
                client.close();
            }
        }
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
        client.close();
    }
})


app.get("/messages", async (req, res) => {
    const limit = parseInt(req.query.limit);
    const user = req.headers.user;
    try {
        await client.connect();
        const dbMessages = client.db("chat");
        const collectionMessages = dbMessages.collection("messages");
        const messages = await collectionMessages.find({}).toArray();
        const userMessages = messages.filter(message => (message.to === user || message.from === user || message.to === "Todos"))
        if (!limit) {
            res.send(userMessages);
        } else if(userMessages.length < limit) {
                res.send(userMessages);
                return;
            }
    } catch (err) {
        console.log(err);
    }
})


app.listen(5000, () => {
    console.log("Servidor rodando na porta 5000");
});