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
const mongoClient = new MongoClient(process.env.MONGO_URL);

let db;
mongoClient.connect(() => {
    db = mongoClient.db("chat");
});
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
        const participant = await db.collection("users").findOne({ name: name });
        if (participant) {
            res.sendStatus(409);
            return;
        } else {
            let nome = req.body.name;
            let hora = Date.now();
            await db.collection("users").insertOne({ name: nome, lastStatus: hora });
            await db.collection("messages").insertOne({
                from: nome,
                to: 'Todos',
                text: 'entra na sala...',
                type: 'status',
                time: dayjs().locale('pt-br').format('hh:mm:ss')
            })
            res.sendStatus(201);
        }
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

app.get("/participants", async (_req, res) => {
    try {
        const users = await db.collection("users").find({}).toArray();
        res.status(200).send(users);
    } catch (err) {
        res.send(err).status(500);
    }
});

app.post("/messages", async (req, res) => {
    const message = req.body;
    message.from = req.headers.user;
    message.time = dayjs().locale('pt-br').format('hh:mm:ss');
    try {
        const from = await db.collection("users").findOne({
            name: message.from
        });
        if (!from) {
            res.sendStatus(422);
            return;
        } else {
            const collectionMessages = await db.collection("messages");
            const messagesModel = Joi.object({
                to: Joi.string().required(),
                text: Joi.string().required(),
                type: Joi.string().valid('message',
                    'private_message').required(),
                from: Joi.string().required(),
                time: Joi.optional()
            });
            const validation = messagesModel.validate(message);
            if (validation.error) {
                res.status(422).send("Envie um formato válido");
                console.log(validation.error.details);
                return;
            } else {
                await collectionMessages.insertOne(message);
                res.sendStatus(201);
            }
        }
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
})

app.get("/messages", async (req, res) => {
    const limit = parseInt(req.query.limit);
    const user = req.headers.user;
    try {
        const messages = await db.collection("messages").find({}).toArray();
        const userMessages = messages.filter(message => (message.to === user || message.from === user || message.to === "Todos"))
        if (!limit) {
            res.send(userMessages);
        } else if (userMessages.length < limit) {
            res.send(userMessages);
        } else {
            const showMessages = await userMessages.splice(-{ limit });
            res.send(showMessages);
            return;
        }
    } catch (err) {
        console.log(err);
    }
});

app.post("/status", async (req, res) => {
    const user = req.headers.user;
    try {
        const participant = await db.collection("users").findOne({ name: user });
        if (!participant) {
            res.sendStatus(404);
        } else {
            await db.collection("users").updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
            res.sendStatus(200);
        }
    } catch (err) {
        res.sendStatus(500);
    }
});

setInterval(async () => {
    const now = Date.now() - 10000;
    const deleted = await db
        .collection("users")
        .find({ lastStatus: { $lt: now - 10000 } })
        .toArray();
    if (deleted.length > 0) {
        await db.collection("messages").insertMany(
            deleted.map((user) => ({
                from: user.name,
                to: "Todos",
                text: "sai da sala...",
                type: "status",
                time: dayjs(now).format("HH:mm:ss"),
            }))
        );
        await db.collection("users").deleteMany({ lastStatus: { $lte: now } });
    }
}, 15000);

app.listen(5000);