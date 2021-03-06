const express = require('express');
const {
    body,
    validationResult
} = require('express-validator');
//for hashing of password
const bcrypt = require('bcryptjs');

//all module imports
const Hospital = require('../models/Hospital');
const tokengen = require('../token/GentokenHospital');

//middleware for token
const Userdata= require('../middleware/Userdata')

// const Userdata= require('../mIddleware/Userdata');

const router = express.Router();




//register route
router.post('/auth/register',

    //this will return invalid email and password in case of not valid formats which we got with the package express-validator
    [
        body('email', 'Invalid email').isEmail(),
        body('password', 'Invalid password').isLength({
            min: 8
        })
    ],


    //validating the email and password 
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            });
        }


        //checking if the email already exists on the database
        try {
            let user = await Hospital.findOne({
                email: req.body.email
            });
            // console.log(user)
            if (user) {
                return res.status(400).json({
                    "errors": [{
                        "value": req.body.email,
                        "msg": "Account already exist with this email",
                        "param": "email",
                        "location": "body"
                    }]
                });
            }

            //checking if the contact is already present in the database
            user = await Hospital.findOne({
                contact: req.body.contact
            });
            if (user) {
                return res.status(400).json({
                    "errors": [{
                        "value": req.body.contact,
                        "msg": "Account already exist with this contact",
                        "param": "contact",
                        "location": "body"
                    }]
                });
            }
            //salt is added to the user's password so that the users who are having weak password cannot get hacked
            let salt = await bcrypt.genSalt(10);


            //awaiting the function as it return a promise
            let secPass = await bcrypt.hash(req.body.password, salt);
            //in case of no error create the data on the database
            //used await for getting the user data created first and check for errors the res.json will return null as it would be executed earlier
            user = await Hospital.create({
                name: req.body.name,
                email: req.body.email,
                password: secPass,
                beds: 0,
                approve: false,
                contact: req.body.contact,
                location: req.body.location
            })

            //module returns the token in normal form which we will send to the user in json format
            const token = tokengen(user.id);
            //sending authentication token to the user


            res.json({
                token
            })
        } catch (error) {
            console.log(error.message);
            res.status(500).json({
                "errors": [{
                    "value": "no-value",
                    "msg": "Sorry for the inconvinience some internal server error occurred",
                    "param": "no-param",
                    "location": "server"
                }]
            });
        }
    })







//login route
router.post('/auth/login',

    //this will return invalid email and password in case of not valid formats which we got with the package express-validator
    [
        body('email', 'Invalid email').isEmail(),
        body('password', 'Password cannot be blank').exists()
    ],


    //validating the email and password 
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            });
        }


        //checking if the email exists in the database and if yes then checking if the password is correct
        try {


            //destructuring email and password from the req body
            const {email,password} = req.body;


            //checking if the email is there on the database and storing it on variable user
            let user = await Hospital.findOne({email});


            //if there is no account registered to this email then returning the error to the server with status 400
            if (!user) {
                return res.status(400).json({
                    "errors": [{
                        "value": email,
                        "msg": "Please check your email id or password",
                        "param": "email",
                        "location": "body"
                    }]
                })
            }

            //comparing the hashes of the users password with the database using the bcrypth compare method
            const comparepass = await bcrypt.compare(password, user.password);

            //if the password is wrong then sending error to the client with 400 status code
            if (!comparepass) {
                return res.status(400).json({
                    "errors": [{
                        "value": password,
                        "msg": "Please check your email id or password",
                        "param": "email",
                        "location": "body"
                    }]
                })
            }
            //module returns the token in normal form which we will send to the user in json format
            const token = tokengen(user.id);
            //sending authentication token to the user


            res.json({token})

        } catch (error) {
            console.log(error.message);
            res.status(500).json({
                "errors": [{
                    "value": "no-value",
                    "msg": "Sorry for the inconvinience some internal server error occurred",
                    "param": "no-param",
                    "location": "server"
                }]
            });
        }
    })





    //hospital data route
    //for users to search for beds and book a bed for them
    router.get('/search',
    Userdata,
    async (req, res) => {

        //checking if the request was from a user or not
        //in case the request was not from a user then deny the request for hospitals
        try {
            
        if(req.user)
        {
            const details=await Hospital.find().select("-password")
            res.send(details)
        }
        else
        {
            res.status(401).json({
                "errors": [{
                    "value": "no-value",
                    "msg": "Sorry for the inconvinience some internal server error occurred",
                    "param": "no-param",
                    "location": "server"
                }]
            });
        }
        } catch (error) {
            console.log(error.message);
            res.status(500).json({
                "errors": [{
                    "value": "no-value",
                    "msg": "Sorry for the inconvinience some internal server error occurred",
                    "param": "no-param",
                    "location": "server"
                }]
            });  
        }
    })
    



    
    //hospital data
    //for users to search for beds and book a bed for them
    router.post('/update',
    Userdata,
    async (req, res) => {
        try {
            //destructuring the contact and location from body 
            const {name,contact,location} = req.body;

            //checking if the contact and location is of length less than 9 and contact changed to string first for length function
            if(contact.toString().length< 9 || location.length< 9)
            {
                return res.status(400).json({
                    "errors": [{
                        "value": "no-value",
                        "msg": "Invalid contact or location",
                        "param": "no-param",
                        "location": "server"
                    }]
                });
            }
            if(req.hospital)
            {
                let hospital = await Hospital.findById(req.hospital.id);
                if(!hospital)
                {
                    return res.status(500).json({
                        "errors": [{
                            "value": "no-value",
                            "msg": "Sorry for the inconvinience some internal server error occurred",
                            "param": "no-param",
                            "location": "server"
                        }]
                    });
                }
                else
                {
                    let updatedHospital= {};
                    updatedHospital.contact=contact;
                    updatedHospital.location=location;
                    updatedHospital.name=name;
                    hospital= await Hospital.findByIdAndUpdate(req.hospital.id,{$set:updatedHospital},{new:true});
                    res.status(200).send(hospital);
                }
            }
            else
            {
                return res.status(401).json({
                    "errors": [{
                        "value": "no-value",
                        "msg": "Your session has expired",
                        "param": "no-param",
                        "location": "server"
                    }]
                });
            }
        } catch (error) {
            console.log(error.message);
            res.status(500).json({
                "errors": [{
                    "value": "no-value",
                    "msg": "Sorry for the inconvinience some internal server error occurred",
                    "param": "no-param",
                    "location": "server"
                }]
            });
        }
    })
    



    
    //hospital data
    //for users to search for beds and book a bed for them
    //made a separate route as beds would be changing frequently and hospital should be able to update beds on their console itself without
    //changing other details
    router.post('/update/beds',
    Userdata,
    async (req, res) => {
        try {
            //destructuring the contact and location from body 
            const {beds} = req.body;
            if(req.hospital)
            {
                let hospital = await Hospital.findById(req.hospital.id);
                if(!hospital)
                {
                    return res.status(500).json({
                        "errors": [{
                            "value": "no-value",
                            "msg": "Sorry for the inconvinience some internal server error occurred",
                            "param": "no-param",
                            "location": "server"
                        }]
                    });
                }
                else
                {
                    let updatedHospital= {};
                    updatedHospital.beds=beds;
                    hospital= await Hospital.findByIdAndUpdate(req.hospital.id,{$set:updatedHospital},{new:true});
                    res.status(200).send(hospital);
                }
            }
            else
            {
                return res.status(401).json({
                    "errors": [{
                        "value": "no-value",
                        "msg": "Your session has expired",
                        "param": "no-param",
                        "location": "server"
                    }]
                });
            }
        } catch (error) {
            console.log(error.message);
            res.status(500).json({
                "errors": [{
                    "value": "no-value",
                    "msg": "Sorry for the inconvinience some internal server error occurred",
                    "param": "no-param",
                    "location": "server"
                }]
            });
        }
    })


//exporting the router
module.exports = router;