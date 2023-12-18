const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Leave = require('./models/Leave');
const authMiddleware = require('./middleware/authMiddleware.js');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.use(cookieParser());

// Here Connection to mongodb
const MONGODB_URI = 'mongodb+srv://ninad:tJWg2rZ4Or5MKc8i@cluster0.79fxuld.mongodb.net/?retryWrites=true&w=majority'; 
mongoose.connect(MONGODB_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB Atlas');
});

// Register - Employee, Manager
app.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // Validate input
    if (!name || !email || !phone || !password || !role) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    // Check if the email is already taken
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already taken' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({ name, email, phone, password: hashedPassword, role });

    // Save the new user
    await newUser.save();

    res.json({ user: newUser });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Login - Both Employee, Manager
app.post('/login',   async (req, res) => {
    try {
      const { email, password, role } = req.body;
  
      // Validate input
      if (!email || !password || !role) {
        return res.status(400).json({ error: 'Please provide email and password' });
      }
  
      // Check if the user exists
      const user = await User.findOne({ email: email });
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
  
      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = await user.generateAuthToken();
      console.log(token);

      res.cookie("jwt", token, {
        expires: new Date(Date.now() + 604800000),
        httpOnly:true,
        secure:true
      })

    // res.json({ user: user });
    res.json({ user: { ...user.toObject(), role } });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Leave Application - Employee
app.post('/applyLeave', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    // Validate input
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }
    // Check if the leave dates are valid
    if (startDate > endDate) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }
    // Create a new leave application
    const newLeave = new Leave({
      user: req.rootUser._id,
      userName: req.rootUser.name,
      startDate,
      endDate,
      reason,
    });
    await newLeave.save();

    const updatedUser = await User.findByIdAndUpdate(
      req.rootUser._id,
      { $push: { leaveHistory: newLeave._id } },
      { new: true }
    );

    res.json({ message: 'Leave applied successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Single User - Both Employee, Manager
app.get(`/myinfo`, authMiddleware, (req, res) => {
  console.log(req.rootUser);
 res.send(req.rootUser);
});

app.get(`/manager-info`, authMiddleware, (req, res) => {
  console.log(req.rootUser);
  res.send(req.rootUser);
});

// User All Leaves - Employee
app.get(`/userLeaves`, authMiddleware ,  async (req, res) => {
  try {
    const userId = req.rootUser._id;
    const data = await Leave.find({ user: userId });
    res.json(data);

  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get All users - Manager
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({role: "Employee"});
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// All Leaves - Manager
app.get('/leaves', async(req, res)=>{
  try{
    const leaves = await Leave.find();
    res.json(leaves);
  }catch{
    res.status(500).json({error: "Internal Server Error"});
  }
})

// Pending Leaves 
app.get('/pendingLeaves', async (req, res) => {
  try {
    const pendingLeaves = await Leave.find({ status: 'Pending' });

    res.json(pendingLeaves);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});
// Denied Leaves
app.get('/deniedLeaves', async (req, res) => {
  try {
    const deniedLeaves = await Leave.find({ status: 'Denied' });
    res.json(deniedLeaves);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});
// Approved Leaves
app.get('/approvedLeaves', async (req, res) => {
  try {
    const approvedLeaves = await Leave.find({ status: 'Approved' });
    res.json(approvedLeaves);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

// Status of Leave - Manager
app.put('/leaveStatusUpdate', async (req, res) => {
  try {
    const userId = req.body._id;
    const status = req.body.status;

    // Assuming your Leave model has a property called 'status'
    const updatedLeave = await Leave.findByIdAndUpdate(userId, { status }, { new: true });
    if (!updatedLeave) {
      return res.status(404).json({ error: 'Leave not found' });
    }
    res.json(updatedLeave);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Logout 
app.get(`/logout`, (req, res) => {
  console.log("Logout");
  res.clearCookie('jwt', {path: '/'});
  res.status(200).send("Logout Successfully");
});


// Start the server 
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


