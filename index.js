const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

//middlewar
app.use(cors())
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hic8zzf.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next){
    console.log("token inside verifyJWT", req.headers.authorization);
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send('unauthorized access');
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
        if(err){
        return res.status(403).send({message: 'forbidden access'})
        }
        req.decoded = decoded;
        next();
    })

}
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

        // app.get('/categories', async(req, res) =>{
        //     let query = {};
        //     if(req.query.category_id){
        //         query = {
        //             category_id: req.query.category_id
        //         }
        //     }
        //     const cursor = categoriesCollection.find(query);
        //     const result = await cursor.toArray();
        //     res.send(result)
            
        // });

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

        //get modal data from DB
        app.get('/bookingsphone',verifyJWT, async(req, res) =>{
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if(email!== decodedEmail){
                return res.status(403).send({message: "forbidden access"});
            }
            
            const query = {email:email};
            const bookings = await bookingsPhoneCollection.find(query).toArray();
            res.send(bookings);
        })
        // post modal data to DB
        app.post('/bookingsphone', async(req, res) =>{
            const bookingPhone = req.body
            console.log(bookingPhone);
            const result = await bookingsPhoneCollection.insertOne(bookingPhone);
            res.send(result);
        });

        app.get('/jwt', async(req, res) =>{
            const email = req.query.email;
            const query = {email:email};
            const user = await usersCollection.findOne(query);
            if(user){
                const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '1h'})
                return res.send({accessToken: token});
            }
            res.status(403).send({accessToken: ''})
        })
        
        //get all user from database
        // app.get('/allusers', async(req,res) =>{
        //     const query = {};
        //     const allUsers = await usersCollection.find(query).toArray();
        //     res.send(allUsers);

        // });

        //find seller and buyer
        app.get('/allusers', async(req,res) =>{
            let query = {};
            if(req.query.role){
                query = {
                    role: req.query.role
                }
            }
            const allUsers = await usersCollection.find(query).toArray();
            res.send(allUsers);

        });

        //find all admin
        app.get('/allusers/admin/:email', async(req, res) =>{
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({isAdmin: user?.role === 'admin'})
        });
        // //find all seller
        app.get('/allusers/seller/:role', async(req, res) =>{
            const role = req.params.role;
            const query = { role }
            const user = await usersCollection.findOne(query);
            res.send({isSeller: user?.role === 'Seller'})
        });

         //find all seller
        //  app.get('/allusers/:role', async(req, res) =>{
        //     const role = req.params.role;
        //     console.log(role);
        //     const query = { role }
        //     const user = await usersCollection.findOne(query);
        //     res.send({isSeller: user?.role === 'Seller'})
        // });

         //add user in DB by signup
         app.post('/signup', async(req, res) =>{
            const addUser = req.body
            console.log(addUser);
            const result = await usersCollection.insertOne(addUser);
            res.send(result);
        });

        app.put('/allusers/admin/:id', verifyJWT, async(req, res) =>{
            const decodedEmail = req.decoded.email;
            const query = {email: decodedEmail};
            const user = await usersCollection.findOne(query);
            if(user?.role !== 'admin'){
                return res.status(403).send({message: 'forbidden access'})
            }
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const options = {upsert: true};
            const updatedDoc = {
                $set:{
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

       

        //add user in DB by login
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