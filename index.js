const express = require("express");
const MongoClient = require("mongodb").MongoClient;
const cors = require("cors");
const bodyParser = require("body-parser");
const { ObjectId } = require("mongodb");
require("dotenv").config();

// mullter
const multer = require("multer");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/images");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });
// mullter

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wghoc.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(
  uri,
  { useUnifiedTopology: true },
  { useNewUrlParser: true },
  { connectTimeoutMS: 30000 },
  { keepAlive: 1 }
);

const port = 5000;
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

client.connect((err) => {
  const regCollection = client
    .db(`${process.env.DB_NAME}`)
    .collection("volunteers");
  const eventsCollection = client
    .db(`${process.env.DB_NAME}`)
    .collection("events");

  // perform actions on the collection object
  app.post("/register", (req, res) => {
    const data = req.body;

    regCollection
      .insertOne(data)
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        res.send(err);
      });
  });
  app.post("/addEvent", upload.single("banner"), (req, res) => {
    try {
      res.send("your file has been uploaded.");
      const data = {
        name: req.body.event,
        date: req.body.date,
        image: "http://localhost:5000/public/images/" + req.file.originalname,
      };
      eventsCollection.insertOne(data);
    } catch (err) {
      res.sendStatus(400);
    }
  });

  app.get("/registeredEvents", (req, res) => {
    const email = req.query.email;
    regCollection.find({ email: email }).toArray((err, docs) => {
      res.send(docs);
    });
  });
  app.get("/", (req, res) => {
    const events = eventsCollection
      .find({})
      .limit(20)
      .toArray((err, docs) => {
        res.send(docs);
      });
  });
  app.get("/public/images/:name", (req, res) => {
    const imgName = req.params.name;
    res.sendFile(__dirname + "/public/images/" + imgName);
  });
  app.get("/admin/volunteer-list", (req, res) => {
    regCollection.find({}).toArray((err, docs) => {
      if (docs) {
        res.send(docs);
      }
    });
  });

  app.delete("/event/:id", (req, res) => {
    const id = req.params.id;

    regCollection.deleteOne({ _id: ObjectId(id) }).then((result) => {
      res.send(result.deletedCount > 0);
    });
  });
  app.delete("/deleteVol/:id", (req, res) => {
    const id = req.params.id;
    regCollection.deleteOne({ _id: ObjectId(id) }).then((result) => {
      res.send(result.deletedCount > 0);
      console.log(result.deletedCount);
    });
  });
});
app.listen(process.env.PORT || port);
