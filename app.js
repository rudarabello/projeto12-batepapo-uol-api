
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
        console.log(vUsrJoi.error.details);
        res.sendStatus(422);
        return;
    }
    try {
        await client.connect();
        const chatDB = client.db("chat");
        const chatUsers = chatDB.collection("users");
        const usr = req.body.name;
        const user = await chatUsers.findOne({ name: usr });
        if (user) {
            res.sendStatus(409);
        } else {
            const time = Date.now();
            await chatUsers.insertOne({ usr, time });
            const chatDB = client.db("chat");
            const chatMessages = chatDB.collection("messages");
            await chatMessages.insertOne({
                name: usr,
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
        client.close();
        res.sendStatus(500);
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
        const chatDB = client.db("chat");
        const chatMessages = chatDB.collection("messages");
        const from = await chatMessages.findOne({ name: message.from });
        if (!from) {
            res.sendStatus(422);
            client.close();
        } else {
            await client.connect();
            const chatDB = client.db("chat");
            const chatMessages = chatDB.collection("messages");
            const patern = Joi.object({
                to: Joi.string().min(1).required(),
                text: Joi.string().min(1).required(),
                type: Joi.string().valid('message', 'private_message').required(),
                from: Joi.string().required(),
                time: Joi.required()
            });
            const validation = patern.validate(message);
            if (validation.error) {
                res.sendStatus(422);
                console.log(validation.error.details);
                client.close();
            } else {
                await chatMessages.insertOne(message);
                res.sendStatus(201);
                client.close();
            }
        }
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
        client.close();
    }
});



app.listen(5000, () => {
    console.log("Servidor rodando na porta 5000");
});