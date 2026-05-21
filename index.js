


const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const uri = process.env.MONGODB_URI;

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

const varifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "unauthorized" });
  }
  try {
    const { payload } = await jwtVerify(token, JWKS)
    console.log(payload)
    next();
  } catch (error) {
    return res.status(403).json({ message: "Forbidden" });
  }
};

async function run() {
  try {
    // await client.connect();

    const db = client.db("tutor")
    const tutorCollection = db.collection("teachers")
    const bookingCollection = db.collection("bookings")

    // ✅ public — varifyToken নেই
    app.get('/teachers', async (req, res) => {
      const result = await tutorCollection.find().toArray()
      res.json(result)
    })

    app.post('/teachers', async (req, res) => {
      const teacherData = req.body
      console.log(teacherData)
      const result = await tutorCollection.insertOne(teacherData)
      res.json(result)
    })

    // ✅ public — varifyToken নেই
    app.get("/teachers/:id", async (req, res) => {
      const { id } = req.params;
      const result = await tutorCollection.findOne({ _id: new ObjectId(id) });
      res.json(result);
    });

    app.get("/booking/:userId", async (req, res) => {
      const { userId } = req.params
      const result = await bookingCollection.find({ userId: userId }).toArray();
      res.json(result);
    })

    // ✅ protected — booking করতে login লাগবে
    app.post("/booking", varifyToken, async (req, res) => {
      const bookingData = req.body;
      const result = await bookingCollection.insertOne(bookingData)
      res.json(result);
    })

    // ✅ protected
    app.delete('/teachers/:id', varifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        if (!id || id === "undefined") {
          return res.status(400).json({ error: "Invalid ID" });
        }
        const result = await tutorCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).json({ error: "Teacher not found" });
        }
        res.json({ success: true, message: "Deleted successfully", result });
      } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ error: "Server error", details: error.message });
      }
    });

    // ✅ protected
    app.put('/teachers/:id', varifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const updatedData = req.body;
        const result = await tutorCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );
        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Teacher not found" });
        }
        const updated = await tutorCollection.findOne({ _id: new ObjectId(id) });
        res.json(updated);
      } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ error: "Server error", details: error.message });
      }
    });

    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello, World!')
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})