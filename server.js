const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

// Create express app
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serves HTML/JS/CSS from "public" folder

// ----- User Schema & Model -----
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: 'user' } // "user" or "admin"
});

const User = mongoose.model('User', userSchema);

// Function to Create Admin User if not already exists
async function createAdminUser() {
    const adminEmail = 'admin123@gmail.com';
    const adminPassword = '1234';

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
        const adminUser = new User({
            name: 'Admin',
            email: adminEmail,
            password: adminPassword,
            role: 'admin'
        });

        await adminUser.save();
        console.log("✅ Admin user created successfully");
    } else {
        console.log("⚠️ Admin user already exists");
    }
}

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/hospitalDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("✅ Connected to MongoDB");
    createAdminUser(); // Ensure admin user exists after successful MongoDB connection
}).catch(err => {
    console.error("❌ MongoDB connection error:", err);
});

// ----- Doctor Schema & Model -----
const doctorSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    specialization: String
});

const Doctor = mongoose.model('Doctor', doctorSchema);

// ----- Appointment Schema & Model -----
const appointmentSchema = new mongoose.Schema({
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    doctor: String,
    appointmentDate: Date
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

// ----- Register Route -----
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const newUser = new User({ name, email, password });
        await newUser.save();
        res.status(201).json({ message: 'Registration successful!' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ----- Login Route -----
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'User not found.' });
        }

        if (user.password !== password) {
            return res.status(401).json({ message: 'Invalid password.' });
        }

        const isAdmin = user.role === 'admin';
        res.status(200).json({ message: 'Login successful.', isAdmin });
    } catch (err) {
        res.status(500).json({ message: 'Login failed.' });
    }
});

// ----- Appointment Booking Route -----
app.post('/api/appointments', async (req, res) => {
    try {
        const { doctorId, patientId, doctor, appointmentDate } = req.body;

        const newAppointment = new Appointment({ doctorId, patientId, doctor, appointmentDate });
        await newAppointment.save();

        res.status(201).json({ message: "Appointment booked successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to book appointment" });
    }
});

// ----- Doctor Registration Route -----
app.post('/api/doctor/register', async (req, res) => {
    try {
        const { name, email, password, specialization } = req.body;

        const existingDoctor = await Doctor.findOne({ email });
        if (existingDoctor) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const newDoctor = new Doctor({ name, email, password, specialization });
        await newDoctor.save();
        res.status(201).json({ message: 'Doctor registered successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ----- Doctor Login Route -----
app.post('/api/doctor/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const doctor = await Doctor.findOne({ email });
        if (!doctor) {
            return res.status(401).json({ message: 'Doctor not found.' });
        }

        if (doctor.password !== password) {
            return res.status(401).json({ message: 'Invalid password.' });
        }

        res.status(200).json({ message: 'Login successful.', doctorId: doctor._id });
    } catch (err) {
        res.status(500).json({ message: 'Login failed.' });
    }
});

// ----- Fetch All Appointments -----
app.get('/api/appointments', async (req, res) => {
    try {
        const appointments = await Appointment.find()
            .populate('doctorId')  // Fetch doctor details
            .populate('patientId'); // Fetch patient details
  
        res.status(200).json(appointments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to load appointments' });
    }
});

// ----- Delete Appointment by ID -----
app.delete('/api/appointments/:id', async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const result = await Appointment.findByIdAndDelete(appointmentId);
  
        if (!result) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
  
        res.status(200).json({ message: 'Appointment deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete appointment' });
    }
});

// ----- Update Appointment by ID -----
app.put('/api/appointments/:id', async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const { appointmentDate } = req.body;
  
        const updatedAppointment = await Appointment.findByIdAndUpdate(
            appointmentId,
            { appointmentDate },
            { new: true }
        );
  
        if (!updatedAppointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
  
        res.status(200).json(updatedAppointment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update appointment' });
    }
});

// Start the Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
