const express = require('express')
const { MongoClient, ObjectId } = require('mongodb')
const mongodb = require('mongodb')
const cors = require('cors')
const app = express()
app.use(cors())
app.use(express.json())
const dbUrl = 'mongodb+srv://rohit10231:rohitkaranpujari@cluster0.kjynvxt.mongodb.net/?retryWrites=true&w=majority'
const client = new MongoClient(dbUrl)
const port = 5000

// get all seats
app.get('/seats', async (req, res) => {
    const client = await MongoClient.connect(dbUrl)
    try {
        const db = await client.db('Booking_Service')
        // let seats = await db.collection('All_Seats').find().toArray()
        let seats = await db.collection('All_Seats').aggregate([{$project:{_id:0, phoneNumber: 0, userName: 0, seat_identifier: 0}}, {$sort:{seat_class:1}}]).toArray()
        res.status(200).send(seats)
    }
    catch (error) {
        console.log(error);
        res.status(500).send({ message: 'Internal server error', error })
    }
    finally {
        client.close()
    }
})

// add seats
app.post('/add-seats', async (req, res) => {
    const client = await MongoClient.connect(dbUrl)
    try {
        const db = await client.db('Booking_Service')
        await db.collection('All_Seats').insertMany(req.body)
        res.status(201).send({ message: 'Seat Added', data: req.body })
    }
    catch (error) {
        res.status(500).send({ message: 'Internal server error', error })
    }
    finally {
        client.close()
    }
})

// get seat
app.get('/seats/:id', async (req, res) => {
    const client = await MongoClient.connect(dbUrl)
    try {
        const db = await client.db('Booking_Service')
        let seat = await db.collection('All_Seats').aggregate([{$match:{seatId:parseInt(req.params.id)}}, {$project:{_id:0, seat_identifier:0, phoneNumber:0, userName:0}}]).toArray()
        let seatPricing = await db.collection('Seat_Price').aggregate([{$match:{seat_class: seat[0].seat_class}}, {$project:{_id:0}}]).toArray()

        if (seat[0].bookings < 41) {
            if (seatPricing[0].min_price === "not available") {
                seat[0].price = seatPricing[0].normal_price
                res.status(200).send(seat)
            }
            else {
                seat[0].price = seatPricing[0].min_price
                res.status(200).send(seat)
            }
        }
        else if (40 < seat.bookings < 60) {
            if (seatPricing[0].normal_price === "not available") {
                seat[0].price = seatPricing[0].max_price
                res.status(200).send(seat)
            }
            else {
                seat[0].price = seatPricing[0].normal_price
                res.status(200).send(seat)
            }
        }
        else {
            if (seatPricing[0].max_price === "not available") {
                seat[0].price = seatPricing[0].normal_price
                res.status(200).send(seat)
            }
            else {
                seat[0].price = seatPricing[0].max_price
                res.status(200).send(seat)
            }
        }
    }
    catch (error) {
        console.log(error);
        res.status(500).send({ message: 'Internal server error', error })
    }
    finally {
        client.close()
    }
})

// book seats
app.post('/booking', async (req, res) => {
    const client = await MongoClient.connect(dbUrl)
    try {
        const db = await client.db('Booking_Service')
        if (!req.body.userName || !req.body.phoneNumber || !req.body.seatId) {
            res.status(400).send({ message: `Please enter userName, phoneNumber & seatId` })
        }
        else {
            let seat = await db.collection('All_Seats').findOne({ seatId: parseInt(req.body.seatId) })
            let seatPricing = await db.collection('Seat_Price').findOne({ seat_class: seat.seat_class })
            if (seat.is_booked === true) {
                res.status(400).send({ message: `Seat with seatId ${req.body.seatId} is already booked` })
            }
            else {
                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                function generateString(length) {
                    let result = '';
                    const charactersLength = characters.length;
                    for (let i = 0; i < length; i++) {
                        result += characters.charAt(Math.floor(Math.random() * charactersLength));
                    }
                    return result;
                }
                if (seat.bookings < 41) {
                    if (seatPricing.min_price === "not available") {
                        bookingAmount = seatPricing.normal_price
                    }
                    else {
                        bookingAmount = seatPricing.min_price
                    }
                }
                else if (40 < seat.bookings < 61) {
                    if (seatPricing.normal_price === "not available") {
                        bookingAmount = seatPricing.max_price
                    }
                    else {

                        bookingAmount = seatPricing.normal_price
                    }
                }
                else {
                    if (seatPricing.max_price === "not available") {
                        bookingAmount = seatPricing.normal_price
                    }
                    else {
                        bookingAmount = seatPricing.max_price
                    }
                }
                req.body.BookingId = "booking_" + generateString(10)
                req.body.bookingAmount = bookingAmount
                let bookings = seat.bookings + 1
                await db.collection('All_Seats').updateOne({ seatId: req.body.seatId }, { $set: { is_booked: true, bookings: parseInt(bookings), userName: req.body.userName, phoneNumber: req.body.phoneNumber } })
                res.status(201).send({ message: "Seat Booked", data: req.body })
            }
        }
    }
    catch (error) {
        res.status(500).send({ message: 'Internal server error', error })
        console.log(error);
    }
    finally {
        client.close()
    }
})

// get bookings of a user
app.get('/bookings', async (req, res) => {
    const client = await MongoClient.connect(dbUrl)
    try {
        const db = await client.db('Booking_Service')
        if(!req.query.userIdentifier){
            res.status(400).send({message:"Please enter phone number"})
        }
        else{
            let user = await db.collection('All_Seats').aggregate([{$match:{phoneNumber:parseInt(req.query.userIdentifier)}}, {$project:{_id:0, seat_identifier:0, is_booked:0, bookings:0}}]).toArray()
            if (user.length!==0) {
                res.status(200).send(user)
            }
            else {
                res.status(200).send({ message: "No bookings done" })
            }
        }
    }
    catch (error) {
        console.log(error);
        res.status(500).send({ message: 'Internal server error', error })
    }
    finally {
        client.close()
    }
})

app.listen(port, () => { console.log(`App listening on ${port}`) })