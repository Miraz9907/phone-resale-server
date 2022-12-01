const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();

const port = process.env.PORT || 5000;

//middlewar
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hic8zzf.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  console.log("token inside verifyJWT", req.headers.authorization);
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      console.log(err);
      return res.status(403).send({ message: "forbidden access2" });
    }
    req.decoded = decoded;
    next();
  });
}
async function run() {
  try {
    const allCategoriesCollection = client
      .db("phoneResale")
      .collection("allCategories");
    const categoriesCollection = client
      .db("phoneResale")
      .collection("categories");
    const bookingsPhoneCollection = client
      .db("phoneResale")
      .collection("bookingsPhone");
    const usersCollection = client.db("phoneResale").collection("usersTable");
    const paymentCollection = client.db("phoneResale").collection("payments");

    app.get("/allcategories", async (req, res) => {
      const query = {};
      const options = await allCategoriesCollection.find(query).toArray();
      res.send(options);
    });

    app.get("/categories", async (req, res) => {
      let query = {};
      if (req.query.category) {
        query = {
          category: req.query.category,
        };
      }
      const cursor = categoriesCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //get modal data from DB
    app.get("/bookingsphone", async (req, res) => {
      const email = req.query.email;
      //   const decodedEmail = req.decoded.email;
      //   if (email !== decodedEmail) {
      //     return res.status(403).send({ message: "forbidden access1" });
      //   }

      const query = { email: email };
      const bookings = await bookingsPhoneCollection.find(query).toArray();
      res.send(bookings);
    });
    // post modal data to DB
    app.post("/bookingsphone", async (req, res) => {
      const bookingPhone = req.body;
      console.log(bookingPhone);
      const result = await bookingsPhoneCollection.insertOne(bookingPhone);
      res.send(result);
    });

    //payment
    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await bookingsPhoneCollection.findOne(query);
      res.send(booking);
    });

    //  payment
    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const price = booking.price;
      const amount = parseInt(price) * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // payment
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      const id = payment.bookingId;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updatedResult = await bookingsPhoneCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(result);
    });

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "30d",
        });
        console.log(token);
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    //find seller and buyer
    app.get("/allusers", async (req, res) => {
      let query = {};
      if (req.query.role) {
        query = {
          role: req.query.role,
        };
      }
      const allUsers = await usersCollection.find(query).toArray();
      res.send(allUsers);
    });

    app.post("/addproduct", async (req, res) => {
      const addProduct = req.body;
      console.log(addProduct);
      const result = await categoriesCollection.insertOne(addProduct);
      res.send(result);
    });

    //product delete
    app.delete("/deleteproduct/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await categoriesCollection.deleteOne(query);
      res.send(result);
    });

    //user delete
    app.delete('/deleteuser/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    //find all admin
    app.get("/allusers/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    //seller
    app.get("/allusers/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.role === "Seller" });
    });

    //Buyer
    app.get("/allusers/buyer/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isBuyer: user?.role === "Buyer" });
    });

    //add user in DB by signup
    app.post("/signup", async (req, res) => {
      const addUser = req.body;
      console.log(addUser);
      const result = await usersCollection.insertOne(addUser);
      res.send(result);
    });

    // specific booked data
    app.get("/booked", async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      } else if (req.query.advertise) {
        query = {
          advertise: req.query.advertise,
        };
      }
      const cursor = categoriesCollection.find(query);
      const result = await cursor.toArray();

      res.send(result);
    });

    app.get("/mydata", async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      } else if (req.query.advertise) {
        query = {
          advertise: req.query.advertise,
        };
      }
      const cursor = categoriesCollection.find(query);
      const result = await cursor.toArray();

      res.send(result);
    });

    //advertise item
    app.patch("/advertiseupdate/:id", async (req, res) => {
      const id = req.params.id;
      const advertise = req.body.advertise;
      const query = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          advertise: advertise,
        },
      };
      const result = await categoriesCollection.updateOne(query, updatedDoc);
      res.send(result);
    });
//verify seller
app.patch('/verifiedupdate/:id', async (req, res) => {
  const id = req.params.id;
  const verified = req.body.verified;
  const query = { _id: ObjectId(id) }
  const updatedDoc = {
      $set:{
        verified: verified
      }
  }
  const result = await usersCollection.updateOne(query, updatedDoc);
  res.send(result);
});
app.patch('/verifiedcataupdate/:email', async (req, res) => {
  const email = req.params.email;
  const verified = req.body.verified;
  const query = { email: email }
  const updatedDoc = {
      $set:{
        verified: verified
      }
  }
  const result = await categoriesCollection.updateMany(query, updatedDoc);
  res.send(result);
});

// update item
app.patch('/reportupdate/:id', async (req, res) => {
  const id = req.params.id;
  const report = req.body.report;
  const query = { _id: ObjectId(id) }
  const updatedDoc = {
      $set:{
        report: report
      }
  }
  const result = await categoriesCollection.updateOne(query, updatedDoc);
  res.send(result);
});

//reported item
app.get('/allproduct', async(req, res) =>{
  let query ={}
  if(req.query.report){
    query = {
      report: req.query.report
       }
  

  }
  
  const cursor = categoriesCollection.find(query);
  const result = await cursor.toArray();
  
  res.send(result);

});




    // Save user email & generate JWT
    app.put("/user/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateUser = {
        $set: {
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updateUser,
        options
      );
      console.log(result);

      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "30d",
      });
      console.log(token);
      res.send({ result, token });
    });
  } finally {
  }
}
run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("phone resale server is running");
});

app.listen(port, () => console.log(`Phone resale is running on ${port}`));
