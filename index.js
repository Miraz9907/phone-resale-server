const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

//middlewar
app.use(cors())
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hic8zzf.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const allCategoriesCollection = client.db('phoneResale').collection('allCategories');
        const categoriesCollection = client.db('phoneResale').collection('categories');
        const bookingsPhoneCollection = client.db('phoneResale').collection('bookingsPhone');
        const usersCollection = client.db('phoneResale').collection('usersTable');

        app.get('/allcategories', async(req, res) =>{
            const query = {};
            const options = await allCategoriesCollection.find(query).toArray();
            res.send(options);
        });

        app.get('/categories', async(req, res) =>{
            let query = {};
            if(req.query.category_id){
                query = {
                    category_id: req.query.category_id
                }
            }
            const cursor = categoriesCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
            
        });

        app.get('/bookingsphone', async(req, res) =>{
            const email = req.query.email;
            const query = {email:email};
            const bookings = await bookingsPhoneCollection.find(query).toArray();
            res.send(bookings);
        })

        app.post('/bookingsphone', async(req, res) =>{
            const bookingPhone = req.body
            console.log(bookingPhone);
            const result = await bookingsPhoneCollection.insertOne(bookingPhone);
            res.send(result);
        });

        //signup
        app.post('/signup', async(req, res) =>{
            const addUser = req.body
            console.log(addUser);
            const result = await usersCollection.insertOne(addUser);
            res.send(result);
        });

        //login
        app.put('/login', async(req, res) =>{
            const user = req.body;
            const filter = {email: user.email}
            const option = { upsert: true};
            const updateUser = {
                $set:{
                    name:user.name,
                    email: user.email,
                    role: user.role
                }
            }
            const result = await usersCollection.updateOne(filter,updateUser,option);
            res.send(result);
        });

    }

    finally{

    }
}
run().catch(console.log)


app.get('/', async(req, res) =>{
    res.send('phone resale server is running');

})

app.listen(port, () => console.log(`Phone resale is running on ${port}`))