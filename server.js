const express = require('express');
// const mongoose = require('mongoose');
const path = require('path');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const twilio = require('twilio');
require('dotenv').config();
const cors = require('cors');


const app = express();

app.use(bodyParser.json());
app.use(cors());


// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Any route not handled by the API should return the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// mongoose.connect(process.env.MONGO_URI)
//     .then(() => console.log("MongoDB connected"))
//     .catch(err => console.error("MongoDB connection error:", err));


const MONGO_URI = process.env.MONGO_URI;

// Create a new MongoClient
const clientmdb = new MongoClient(MONGO_URI);
async function connectMongoDB() {
    try {
        await clientmdb.connect();
        console.log("MongoDB connected successfully!");
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await clientmdb.close();
    }
}
connectMongoDB();

async function getStudents() {
    const db = clientmdb.db('attendance_manager');
    const studentsCollection = db.collection('students');

    const today = new Date().toISOString().split('T')[0];
    return await studentsCollection.find({ date: today }).toArray();
}


app.get('/api/students', async (req, res) => {
    try {
        await clientmdb.connect();
        const students = await getStudents();

        res.json(students); 
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ message: 'Error fetching students', error });
    } finally {
        await clientmdb.close(); 
    }
});

// const studentSchema = new mongoose.Schema({
//     name: { type: String, required: true },
//     rollNumber: { type: String, required: true },
//     phoneNumber: { type: String, required: true },
//     status: { type: String, default: "Absent" },
//     date: { type: String, default: () => new Date().toISOString().split('T')[0] }
// });

// const Student = mongoose.model('Student', studentSchema);


// app.get('/api/students', async (req, res) => {
//     try {
//         const today = new Date().toISOString().split('T')[0];
//         const students = await Student.find({ date: today });

//         if (!students || students.length === 0) {
//             return res.status(404).json({ message: "No students found for today" });
//         }

//         console.log(students); 
//         res.json(students);
//     } catch (error) {
//         console.error('Error fetching students:', error);
//         res.status(500).json({ message: 'Error fetching students', error });
//     }
// });


app.put('/api/attendance/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await Student.findByIdAndUpdate(id, { status });
        res.json({ message: 'Attendance updated successfully!' });
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({ message: 'Error updating attendance', error });
    }
});


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);


app.post('/api/send-sms', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const absentees = await Student.find({ date: today, status: "Absent" });

        for (const student of absentees) {
            console.log(`Sending SMS to ${student.phoneNumber}`);
            await client.messages.create({
                body: `Hi ${student.name}, you were marked absent today.`,
                from: twilioPhoneNumber,
                to: student.phoneNumber 
            });
        }
        console.log("sms sent...!");

        res.json({ message: 'SMS sent to absentees!' });
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({ message: 'Failed to send SMS', error });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
