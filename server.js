const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
require('dotenv').config();
const cors = require('cors');
const schedule = require('node-schedule');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(cors());


const MONGO_URI = process.env.MONGO_URI;
const DATABASE_NAME = 'attendance_manager'; 
const COLLECTION_NAME = 'students';

let db;
let studentsCollection;

async function connectMongoDB() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DATABASE_NAME);
    studentsCollection = db.collection(COLLECTION_NAME);
    console.log('Connected to MongoDB Atlas!');
    updateAllStudentDates();
  } catch (error) {
    console.error("Error connecting to MongoDB Atlas:", error);
  }
}

// mongoose.connect(process.env.MONGO_URI)
//   .then(() => {
//     console.log("MongoDB connected via Mongoose");
//     updateAllStudentDates();
//   })
//   .catch(err => console.error("MongoDB connection error:", err));

// const studentSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   rollNumber: { type: String, required: true },
//   phoneNumber: { type: String, required: true },
//   status: { type: String, default: "Absent" },
//   date: { type: String, default: () => new Date().toISOString().split('T')[0] }
// });

// const Student = mongoose.model('Student', studentSchema);

const updateAllStudentDates = async () => {
  const today = new Date().toISOString().split('T')[0];
  try {
    await studentsCollection.updateMany({}, { $set: { date: today } });
    console.log("All student dates updated to today's date.");
  } catch (error) {
    console.error("Error updating student dates:", error);
  }
};

app.get('/api/students', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    await studentsCollection.updateMany({}, { $set: { date: today } });
    const students = await studentsCollection.find({ date: today }).toArray();
    if (!students || students.length === 0) {
      return res.status(404).json({ message: "No students found for today" });
    }
    res.json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Error fetching students", error });
  }
});

schedule.scheduleJob('0 0 * * *', async () => {
  const today = new Date().toISOString().split('T')[0];
  try {
    await studentsCollection.updateMany({}, { $set: { date: today } });
    console.log("All student dates updated to today's date (Scheduled Task).");
  } catch (error) {
    console.error("Error updating student dates (Scheduled Task):", error);
  }
});

app.put('/api/attendance/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await studentsCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status } });
    res.json({ message: "Attendance updated successfully!" });
  } catch (error) {
    console.error("Error updating attendance:", error);
    res.status(500).json({ message: "Error updating attendance", error });
  }
});

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const twilioClient = twilio(accountSid, authToken);

app.post('/api/send-sms', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const absentees = await studentsCollection.find({ date: today, status: "Absent" }).toArray();
    for (const student of absentees) {
      console.log(`Sending SMS to ${student.phoneNumber}`);
      // await twilioClient.messages.create({
      //   body: `Hi ${student.name}, you were marked absent today.`,
      //   from: twilioPhoneNumber,
      //   to: student.phoneNumber
      // });
    }
    res.json({ message: "SMS sent to absentees!" });
  } catch (error) {
    console.error("Error sending SMS:", error);
    res.status(500).json({ message: "Failed to send SMS", error });
  }
});

const PORT = process.env.PORT || 5000;

connectMongoDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
});


app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});