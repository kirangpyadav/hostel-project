const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Student = require('../models/Student');
const mongoose = require('mongoose');


const router = express.Router();


// --- Multer Configuration for File Uploads (with Dynamic Folders) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Get name and sspId from the form body to create a unique folder
        // This now works because the fields are sent first from the HTML
        const studentName = req.body.name ? req.body.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : 'student';
        const sspId = req.body.sspId || Date.now(); // Use a timestamp as a fallback
        const userFolderPath = `uploads/${studentName}_${sspId}`;

        // Ensure the user-specific directory exists
        fs.mkdirSync(userFolderPath, { recursive: true });
        cb(null, userFolderPath);
    },
    filename: function (req, file, cb) {
        // Keep the filename simple as it's already in a unique folder
        const uniqueSuffix = Date.now();
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});



const upload = multer({ storage: storage });

// --- POST /students/register ---
// The `upload.any()` middleware processes all files sent with the form.
router.post('/register', upload.any(), async (req, res) => {
    try {
        const { body: fields, files } = req;

        // Map uploaded files to their field names for easy access
        const filePaths = {};
        files.forEach(file => {
            // We use replace to handle potential backslashes on Windows systems
            filePaths[file.fieldname] = file.path.replace(/\\/g, "/");
        });

        // Structure the academic data based on selections
        const studentData = {
            ...fields,
            photo: filePaths.photo,
            aadharCard: filePaths.aadharCard,
            casteCertificate: filePaths.casteCertificate,
            incomeCertificate: filePaths.incomeCertificate,
            passbook: filePaths.passbook,
            tenthMarksCard: filePaths.tenthMarksCard,
            pucDetails: {},
            diplomaDetails: {},
            itiDetails: {},
            currentStudy: {
                previousMarks: []
            }
        };

        // Populate academic details based on `studyAfter10th`
        if (fields.studyAfter10th === 'PUC') {
            studentData.pucDetails = { pucMarks: fields.pucMarks, pucMarksCard: filePaths.pucMarksCard };
        } else if (fields.studyAfter10th === 'Diploma') {
            studentData.diplomaDetails = { diplomaMarks: fields.diplomaMarks, diplomaMarksCard: filePaths.diplomaMarksCard };
        } else if (fields.studyAfter10th === 'ITI') {
            studentData.itiDetails = { itiMarks: fields.itiMarks, itiMarksCard: filePaths.itiMarksCard };
        }

        // Populate current study (UG/PG) details
        if (fields.ugPgSelect) {
            studentData.currentStudy.level = fields.ugPgSelect;
            studentData.currentStudy.degree = fields.ugDegree || fields.pgDegree;
            studentData.currentStudy.college = fields.ugCollege || fields.pgCollege;
            studentData.currentStudy.currentYear = fields.ugCurrentYear || fields.pgCurrentYear;
            studentData.currentStudy.currentSemester = fields.ugSemester || fields.pgSemester;
            
            if (fields.ugPgSelect === 'PG') {
                studentData.currentStudy.pgLastUgMarks = fields.pgLastUgMarks;
                studentData.currentStudy.pgLastUgMarksCard = filePaths.pgLastUgMarksCard;
            }
        }
        
        // Dynamically collect previous semester/year marks
        for (const key in fields) {
            const semMatch = key.match(/^(ug|pg)Sem(\d+)Marks$/);
            const yearMatch = key.match(/^(ug|pg)Year(\d+)Marks$/);

            if (semMatch) {
                const [ , level, number] = semMatch;
                studentData.currentStudy.previousMarks.push({
                    type: 'Semester',
                    number: number,
                    marks: fields[key],
                    marksCard: filePaths[`${level}Sem${number}Card`]
                });
            } else if (yearMatch) {
                 const [ , level, number] = yearMatch;
                 studentData.currentStudy.previousMarks.push({
                    type: 'Year',
                    number: number,
                    marks: fields[key],
                    marksCard: filePaths[`${level}Year${number}Card`]
                });
            }
        }

        const student = new Student(studentData);
        await student.save();

        res.status(201).json({ message: 'Student registered successfully!' });



} catch (error) {
    // Check for a duplicate key error (code 11000)
    if (error.code === 11000) {
        const message = error.message; // Get the full error message string

        // Check the message for the name of the index that failed
        if (message.includes('sspId_1')) {
            return res.status(409).json({ message: 'This SSP ID is already registered.' });
        }
        if (message.includes('email_1')) {
            return res.status(409).json({ message: 'This Email is already registered.' });
        }
        if (message.includes('phone_1')) {
            return res.status(409).json({ message: 'This Phone Number is already registered.' });
        }
        if (message.includes('aadharNumber_1')) {
            return res.status(409).json({ message: 'This Aadhar Number is already registered.' });
        }
        if (message.includes('casteNumber_1')) {
            return res.status(409).json({ message: 'This Caste Certificate Number is already registered.' });
        }
        if (message.includes('incomeNumber_1')) {
            return res.status(409).json({ message: 'This Income Certificate Number is already registered.' });
        }
        if (message.includes('accountNumber_1')) {
            return res.status(409).json({ message: 'This Bank Account Number is already registered.' });
        }
    }
    
    // For all other errors
    console.error('Operation Error:', error);
    res.status(500).json({ message: 'Server error during operation.', error: error.message });
}
});




// --- GET /students/find/:sspId ---
// This route finds a single student by their SSP ID
router.get('/find/:sspId', async (req, res) => {
    try {
        const { sspId } = req.params;

        if (!sspId || sspId.length !== 11) {
            return res.status(400).json({ message: 'A valid 11-digit SSP ID is required.' });
        }

        const student = await Student.findOne({ sspId: sspId });

        if (!student) {
            return res.status(404).json({ message: 'Student with that SSP ID not found.' });
        }

        res.status(200).json(student);

    } catch (error) {
        console.error('Find Student Error:', error);
        res.status(500).json({ message: 'Server error while finding student.' });
    }
});




// --- PUT /students/update/:id ---
// This route finds a student by their MongoDB _id and updates their details
router.put('/update/:id', upload.any(), async (req, res) => {
    try {
        const { id } = req.params;
        const { body: fields, files } = req;

        const existingStudent = await Student.findById(id);
        if (!existingStudent) {
            return res.status(404).json({ message: 'Student not found for updating.' });
        }

        const filePaths = {};
        files.forEach(file => {
            filePaths[file.fieldname] = file.path.replace(/\\/g, "/");
        });

        // Start building the update object with all form fields
        const updateData = { ...fields };

        // Add paths for any newly uploaded files
        Object.keys(filePaths).forEach(fieldname => {
            updateData[fieldname] = filePaths[fieldname];
        });

        // ===================================================================
        // CORRECTED LOGIC: Rebuild the nested academic objects
        // ===================================================================

        // 1. Clear old academic details to prevent old data from lingering
        updateData.pucDetails = {};
        updateData.diplomaDetails = {};
        updateData.itiDetails = {};
        
        // 2. Rebuild the "studyAfter10th" details, using new files if they exist, otherwise keeping the old ones
        if (fields.studyAfter10th === 'PUC') {
            updateData.pucDetails = { 
                pucMarks: fields.pucMarks, 
                pucMarksCard: filePaths.pucMarksCard || existingStudent.pucDetails.pucMarksCard 
            };
        } else if (fields.studyAfter10th === 'Diploma') {
            updateData.diplomaDetails = { 
                diplomaMarks: fields.diplomaMarks, 
                diplomaMarksCard: filePaths.diplomaMarksCard || existingStudent.diplomaDetails.diplomaMarksCard
            };
        } else if (fields.studyAfter10th === 'ITI') {
            updateData.itiDetails = { 
                itiMarks: fields.itiMarks, 
                itiMarksCard: filePaths.itiMarksCard || existingStudent.itiDetails.itiMarksCard
            };
        }

        // 3. Rebuild the "currentStudy" object
        if (fields.ugPgSelect) {
            updateData.currentStudy = {
                level: fields.ugPgSelect,
                degree: fields.ugDegree || fields.pgDegree,
                college: fields.ugCollege || fields.pgCollege,
                currentYear: fields.ugCurrentYear || fields.pgCurrentYear,
                currentSemester: fields.ugSemester || fields.pgSemester,
                pgLastUgMarks: fields.pgLastUgMarks,
                pgLastUgMarksCard: filePaths.pgLastUgMarksCard || (existingStudent.currentStudy && existingStudent.currentStudy.pgLastUgMarksCard),
                previousMarks: [] // Reset and rebuild this array
            };

            // Dynamically collect previous semester/year marks
            for (const key in fields) {
                const semMatch = key.match(/^(ug|pg)Sem(\d+)Marks$/);
                const yearMatch = key.match(/^(ug|pg)Year(\d+)Marks$/);
                
                if (semMatch) {
                    const [ , level, number] = semMatch;
                    const cardField = `${level}Sem${number}Card`;
                    updateData.currentStudy.previousMarks.push({
                        type: 'Semester',
                        number: number,
                        marks: fields[key],
                        marksCard: filePaths[cardField] || 'path/to/existing/card' // You might need to fetch old path here if not re-uploaded
                    });
                } else if (yearMatch) {
                    const [ , level, number] = yearMatch;
                    const cardField = `${level}Year${number}Card`;
                    updateData.currentStudy.previousMarks.push({
                        type: 'Year',
                        number: number,
                        marks: fields[key],
                        marksCard: filePaths[cardField] || 'path/to/existing/card' // You might need to fetch old path here if not re-uploaded
                    });
                }
            }
        } else {
             updateData.currentStudy = {};
        }

        // Use Mongoose's findByIdAndUpdate to save the changes
        const updatedStudent = await Student.findByIdAndUpdate(
            id,
            updateData, // Pass the entire reconstructed object
            { new: true, runValidators: true }
        );

        res.status(200).json({ message: 'Student details updated successfully!', student: updatedStudent });
} catch (error) {
    // Check for a duplicate key error (code 11000)
    if (error.code === 11000) {
        const message = error.message; // Get the full error message string

        // Check the message for the name of the index that failed
        if (message.includes('sspId_1')) {
            return res.status(409).json({ message: 'This SSP ID is already registered.' });
        }
        if (message.includes('email_1')) {
            return res.status(409).json({ message: 'This Email is already registered.' });
        }
        if (message.includes('phone_1')) {
            return res.status(409).json({ message: 'This Phone Number is already registered.' });
        }
        if (message.includes('aadharNumber_1')) {
            return res.status(409).json({ message: 'This Aadhar Number is already registered.' });
        }
        if (message.includes('casteNumber_1')) {
            return res.status(409).json({ message: 'This Caste Certificate Number is already registered.' });
        }
        if (message.includes('incomeNumber_1')) {
            return res.status(409).json({ message: 'This Income Certificate Number is already registered.' });
        }
        if (message.includes('accountNumber_1')) {
            return res.status(409).json({ message: 'This Bank Account Number is already registered.' });
        }
    }
    
    // For all other errors
    console.error('Operation Error:', error);
    res.status(500).json({ message: 'Server error during operation.', error: error.message });
}
});





// --- GET /students ---
// This route fetches all students to display on the manage page
router.get('/', async (req, res) => {
    try {
        // Find all students, but only select the fields needed for the cards
        const students = await Student.find({}).select('_id name sspId photo');
        
        res.status(200).json(students);

    } catch (error) {
        console.error('Get All Students Error:', error);
        res.status(500).json({ message: 'Server error while fetching students.' });
    }
});





// --- GET /students/details/:id ---
// This route fetches the full details for a single student by their _id
router.get('/details/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate that the ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid student ID format.' });
        }

        const student = await Student.findById(id);

        if (!student) {
            return res.status(404).json({ message: 'Student not found.' });
        }

        res.status(200).json(student);

    } catch (error) {
        console.error('Get Student Details Error:', error);
        res.status(500).json({ message: 'Server error while fetching student details.' });
    }
});





// --- GET /students/image/:id ---
// This route reads an image file and sends it as base64 data for the PDF
router.get('/image/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id).select('photo');
        if (!student || !student.photo) {
            return res.status(404).json({ message: 'Photo not found.' });
        }

        const filePath = path.join(__dirname, '..', student.photo);

        if (fs.existsSync(filePath)) {
            const image = fs.readFileSync(filePath, { encoding: 'base64' });
            res.status(200).json({ data: `data:image/jpeg;base64,${image}` });
        } else {
            res.status(404).json({ message: 'File not found on server.' });
        }
    } catch (error) {
        console.error('Get Image Error:', error);
        res.status(500).json({ message: 'Server error while fetching image.' });
    }
});






// --- DELETE /students/delete/:id ---
// This route deletes a student's record and their associated upload folder
router.delete('/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // First, find the student to get their file paths
        const student = await Student.findById(id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found.' });
        }

        // Determine the student's folder path from one of the file fields
        if (student.photo) {
            const folderPath = path.join(__dirname, '..', path.dirname(student.photo));
            // Check if the directory exists before trying to delete it
            if (fs.existsSync(folderPath)) {
                fs.rmSync(folderPath, { recursive: true, force: true });
            }
        }

        // Now, delete the student's record from the database
        await Student.findByIdAndDelete(id);

        res.status(200).json({ message: 'Student and associated files deleted successfully.' });

    } catch (error) {
        console.error('Delete Student Error:', error);
        res.status(500).json({ message: 'Server error while deleting student.' });
    }
});





module.exports = router;