
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
    try {
        const usr = req.body
        await client.connect();
        const chatDB = client.db("chat");
        const chatUsers = chatDB.collection("users");
        const user = await chatUsers.findOne({ usr });
        if (user) {
            res.sendStatus(409);
            return;
        } else {
            let nome = req.body.name;
            let hora = Date.now();
            await db.collection("users").insertOne({
                name: nome, lastStatus: hora
            })
            await db.collection("messages").insertOne({
                from: nome,
                to: "Todos",
                text: "entra na sala...",
                type: "status",
                time: dayjs().locale('pt-br').format("hh:mm:ss"),
            });
            res.sendStatus(201);
            MongoClient.close(); 8
        }
    } catch (err) {
        res.sendStatus(500);
        MongoClient.close();
        console.log(err);
    }

});




app.listen(5000, () => {
    console.log("Servidor rodando na porta 5000");
});