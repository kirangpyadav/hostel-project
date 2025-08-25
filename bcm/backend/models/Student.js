const mongoose = require('mongoose');

// Helper schema for previous marks (semesters/years)
const PreviousMarksSchema = new mongoose.Schema({
    type: { type: String, enum: ['Semester', 'Year'], required: true },
    number: { type: Number, required: true },
    marks: { type: Number, required: true },
    marksCard: { type: String, required: true } // Path to the file
}, { _id: false });

const studentSchema = new mongoose.Schema({
    // Step 1: Personal Information
    name: { type: String, required: true },
   sspId: { type: String, required: true, unique: true, },
    dob: { type: Date, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    photo: { type: String, required: true }, // Stores the file path

    // Step 2: Parent Information
    fatherName: { type: String, required: true },
    motherName: { type: String, required: true },
    parentPhone: { type: String, required: true },
    parentEmail: { type: String },
    parentAddress: { type: String, required: true },

    // Step 3: Professional Information
    aadharNumber: { type: String, required: true },
    casteNumber: { type: String, required: true },
    incomeNumber: { type: String, required: true },
    accountNumber: { type: String, required: true },
    ifsc: { type: String, required: true },
    // File Paths for Documents
    aadharCard: { type: String, required: true },
    casteCertificate: { type: String, required: true },
    incomeCertificate: { type: String, required: true },
    passbook: { type: String, required: true },
    
    // Step 4: Study Information
    tenthMarks: { type: Number, required: true },
    tenthMarksCard: { type: String, required: true },
    studyAfter10th: { type: String, enum: ['PUC', 'Diploma', 'ITI'], required: true },
    
    // Conditional Academic Details
    pucDetails: {
        pucMarks: { type: Number },
        pucMarksCard: { type: String }
    },
    diplomaDetails: {
        diplomaMarks: { type: Number }, // Simplified field
        diplomaMarksCard: { type: String }
    },
    itiDetails: {
        itiMarks: { type: Number },
        itiMarksCard: { type: String }
    },
    
    // UG/PG Details
    currentStudy: {
        level: { type: String, enum: ['UG', 'PG'] },
        degree: { type: String },
        college: { type: String },
        currentYear: { type: Number },
        currentSemester: { type: Number },
        pgLastUgMarks: { type: Number },
        pgLastUgMarksCard: { type: String },
        previousMarks: [PreviousMarksSchema] // For dynamic semester/year marks
    }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);