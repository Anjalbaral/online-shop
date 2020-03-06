const express = require('express');
//expressValidator is an object
//const expressValidator = require('express-validator');
const { check,body } = require('express-validator/check');

const authController = require('../controllers/auth');

const router = express.Router();

router.get('/login', authController.getLogin);

router.post('/login', authController.postLogin);

router.post('/logout',authController.postLogout)

router.get('/signup',authController.getSignUp)

//here isEmail() is predefined function
router.post('/signup',
[
check('email')
.isEmail()
.withMessage('Enter valid email'),

body('password','Enter password longer then 5 characters and numeric values are not allowed')
.isLength({min:5})
.isAlphanumeric(),
body('confirmpassword').custom((valuereceived,{req})=>{
    if(valuereceived !== req.body.password){
    throw new Error('dickhead! your password doesnt match')
     }
    return true;
})
]
,authController.postSignUp)

router.get('/reset-password',authController.resetPassword)

router.post('/reset-password',authController.postReset)

router.get('/reset-password/:ResetToken',authController.getNewPassword)

router.post('/new-password',authController.postNewPassword)

module.exports = router;