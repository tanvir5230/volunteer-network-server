const express = require("express");
const MongoClient = require("mongodb").MongoClient;
const cors = require("cors");
const bodyParser = require("body-parser");
const { ObjectId } = require("mongodb");
require("dotenv").config();

const admin = require("firebase-admin");

const serviceAccount = require("./volunteer-network-t-firebase-adminsdk-4q30x-475fd98db7.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://volunteer-network-t.firebaseio.com",
});

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
        image:
          "https://volunteer-network-server-t.herokuapp.com/public/images/" +
          req.file.originalname,
      };
      eventsCollection.insertOne(data);
    } catch (err) {
      res.sendStatus(400);
    }
  });

  app.get("/registeredEvents", (req, res) => {
    const queryEmail = req.query.email;
    const bearer = req.headers.authorization;
    if (bearer && bearer.startsWith("Bearer ")) {
      const idToken = req.headers.authorization.split(" ")[1];
      // idToken comes from the client app
      admin
        .auth()
        .verifyIdToken(idToken)
        .then(function (decodedToken) {
          let decodedEmail = decodedToken.email;
          if (decodedEmail === queryEmail) {
            regCollection.find({ email: queryEmail }).toArray((err, docs) => {
              res.send(docs);
            });
          }
        })
        .catch(function (error) {
          // Handle error
        });
    }
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
    });
  });
});
app.listen(process.env.PORT || port);
