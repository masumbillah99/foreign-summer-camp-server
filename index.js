const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// verify jwt token
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized Access" });
  }
  // bearer 'token'
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "Unauthorized Access" });
    }
    req.decoded = decoded;
    next();
  });
};

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
    const classesCollection = client.db("summerCamp").collection("classes");
    const cartCollection = client.db("summerCamp").collection("carts");
    const paymentCollection = client.db("summerCamp").collection("payments");
    const reviewCollection = client.db("summerCamp").collection("reviews");

    //  JWT TOKEN secure
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // verify admin
    // warning: user verifyJWT before using verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden Access" });
      }
      next();
    };

    // users related apis -----------------------
    app.get("/all-users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // check users ? admin
    // email name
    // check admin
    app.get("/user-admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    // make role admin
    app.patch("/make-admin/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { role: "admin" } };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // make role instructor
    app.patch("/make-instructor/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { role: "instructor" } };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    /** instructor roles */
    // app.get("/make-instructor/:email", async (req, res) => {
    //   const email = req.params.email;
    //   // if (req.decoded.email !== email) {
    //   //   res.send({ instructor: false });
    //   // }
    //   const query = { email: email };
    //   const user = await usersCollection.findOne(query);
    //   const result = { instructor: user?.role === "instructor" };
    //   res.send(result);
    // });

    // delete a user
    app.delete("/delete-user/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });

    // ---------- admin apis ---------------

    // ----------- instructor apis -------------

    // save new class in database
    app.post("/add-class", async (req, res) => {
      const classData = req.body;
      const result = await classesCollection.insertOne(classData);
      res.send(result);
    });

    // update add classes information
    app.patch("/update-class/:id", async (req, res) => {
      const id = req.params.id;
      const classData = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: classData.status,
          available_seat: classData.available_seat,
        },
      };
      const update = await classesCollection.updateOne(filter, updateDoc);
      console.log(update);
      res.send(update);
    });

    // get my classes
    app.get("/my-classes/:email", verifyJWT, async (req, res) => {
      const result = await classesCollection
        .find({ email: req.params.email })
        .toArray();
      res.send(result);
    });

    /** get only instructors */
    app.get("/all-instructors", async (req, res) => {
      const query = { role: "instructor" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // ----------- instructor apis -------------

    // ------------------------------

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
      res.send(result);
    });

    // get single user
    app.get("/single-user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // ---------------------------

    /** student all apis ------------------ */

    // get cart item from database
    app.get("/get-cart/:email", async (req, res) => {
      const email = req.query.email;
      const query = { student_email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/cart-item/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.findOne(query);
      res.send(result);
    });

    /**
     * _id, name, image, ins_name, email, price, seat, descrip, status
     * classid, name, email, image, price
     */

    // add cart in database
    app.post("/carts", async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });

    // DELETE CART
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    /** payments system -------------- */
    // create payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      if (price) {
        const amount = parseFloat(price * 100);
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });
        res.send({ clientSecret: paymentIntent.client_secret });
      }
    });

    // store payment data to server
    app.post("/payments", async (req, res) => {
      const paymentData = req.body;
      const insertResult = await paymentCollection.insertOne(paymentData);
      // delete cart items after payment
      const query = {
        _id: new ObjectId(paymentData._id),
      };
      const deleteResult = await cartCollection.deleteOne(query);
      res.send({ insertResult, deleteResult });
    });

    // get payment history
    app.get("/payments", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    // post your review
    app.post("/give-review", async (req, res) => {
      const body = req.body;
      const result = await reviewCollection.insertOne(body);
      res.send(result);
    });

    // get all users reviews
    app.get("/user-review", async (req, res) => {
      const result = await reviewCollection.find({}).toArray();
      res.send(result);
    });

    // /** Enrolled class apis */
    // app.get("/enrolled-class/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await classesCollection.findOne(query);
    //   res.send(result);
    // });

    /** student all apis ------------------ */

    // -------- class related apis -----------

    // get all class
    app.get("/classes", async (req, res) => {
      const query = {};
      const options = { sort: { available_seat: -1 } };
      const cursor = classesCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });

    // -------------------------

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
