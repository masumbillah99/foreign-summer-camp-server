const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.og57wk2.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const usersCollection = client.db("summerCamp").collection("users");
    const popularClassesCollection = client
      .db("summerCamp")
      .collection("popularClasses");
    const popularInstructorsCollection = client
      .db("summerCamp")
      .collection("popularInstructors");

    // users related apis -----------------------

    // save user email and role in DB
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(query, updateDoc, options);
      //   console.log(result);
      res.send(result);
    });

    // popular classes related apis ------------------
    app.get("/popularClasses", async (req, res) => {
      const result = await popularClassesCollection.find().toArray();
      res.send(result);
    });

    app.get("/popularInstructors", async (req, res) => {
      const result = await popularInstructorsCollection.find().toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("summer camp is sitting");
});

app.listen(port, () => {
  console.log(`Summer camp school is on port ${port}`);
});
