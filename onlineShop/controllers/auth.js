const User = require('../models/user')
const bcrypt = require('bcryptjs')
const nodemailer = require('nodemailer')
// const data = require('./authData.json')
//nodejs provides inbuild crypto package to generate random byte token
const crypto = require('crypto')
const {validationResult} = require('express-validator/check')

let transport = nodemailer.createTransport({
  service:'Gmail',
  auth:{
    user:data.gmail,
    pass:data.pass
  }
})

exports.getLogin = (req, res, next) => {
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    isAuthenticated:req.session.isLoggedIn,
    errMessage:req.flash('loginerror')
  });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email
    const password = req.body.password
    
    User.findOne({email:email})
    .then(user=>{
      if(user){
        const userPassword = user.password
       return bcrypt.compare(password,userPassword)
        .then(doMatch=>{
          if(doMatch){
            req.session.isLoggedIn = true
            req.session.user = user
            return req.session.save(err=>{
              console.log(err)
              res.redirect('/')
            })
          }
          else{
           req.flash('loginerror','Password Incorrect')
           res.redirect('/login')
           console.log("wrong password")
          }
        })
       
      }
      else{
        req.flash('loginerror','Cant Find User')
        res.redirect('/login')
        console.log("cant find user")
      }
    })
    .catch(err=>{
      req.flash('loginerror','Some Error Occured')
      res.redirect('/login')
      console.log(err)
    })

  };

exports.getSignUp = (req,res,next) =>{
  res.render('auth/signup',{
    pageTitle:"Sign Up",
    path:'/signup',
    isAuthenticated:req.session.isLoggedIn,
    errMessage:req.flash('signuperror')
  })
}  

exports.postSignUp = (req,res,next) =>{
  const email = req.body.email
  const password = req.body.password
  const valerrors = validationResult(req)
  if(!valerrors.isEmpty()){
    console.log(valerrors)
    return res.status(422).render('auth/signup',{
      pageTitle:"Sign Up",
      path:'/signup',
      isAuthenticated:req.session.isLoggedIn,
      errMessage:valerrors.array()[0].msg
    })
    }

  User.findOne({email:email})
  .then(hasUser=>{
    if(hasUser){
      req.flash('signuperror','user already exist')
      res.redirect('/signup')
      console.log("user already exist")
     }
   
    return bcrypt.hash(password,12)
      .then(hashPassword=>{
        const newUser = new User({email:email,password:hashPassword,resetToken:null,tokenExpieryDate:null,cart:{items:[]}})
        return newUser.save()
       })
      .then((result)=>{
        transport.sendMail({
          from:"Onlone Shop Company",
          to:email,
          subject:"successfully signed up",
          text:"You are successfully registered",
          html:"<h1> welcome to Graphixo online shop </h1>"
        })
        .then(()=>{
        console.log("email sent")
        res.redirect('/login')
        })
        .catch(err=>{
          console.log(err)
        })
      })
    })
    .catch(err=>{console.log(err)})
}

exports.postLogout = (req,res,next)=>{
  req.session.destroy(err=>{
    console.log(err);
    res.redirect('/');
  })
}  

exports.resetPassword = (req,res,next) =>{
  res.render('auth/reset',{
    pageTitle:"Reset Page",
    path:"/reset-password",
    isAuthenticated:req.session.isLoggedIn,
    errMessage:req.flash('reseterror')
  })
} 

exports.postReset = (req,res,next) =>{
  crypto.randomBytes(32,(err,buffer)=>{
    if(err){
      console.log(err)
      res.redirect('/reset-password')
    }
    const token = buffer.toString('hex')
    User.findOne({email:req.body.email})
    .then(user=>{
     if(!user){
       req.flash('reseterror','No User Found')
       console.log("no user found")
       res.redirect('/reset-password')
     }
     user.resetToken = token
     user.tokenExpieryDate = Date.now() + 3600000
     return user.save()
    })
    .then(result=>{
      return transport.sendMail({
        from:'Graphixo Online Shoping',
        to:req.body.email,
        subject:"Reset your Password",
        text:"Reset your Graphixo password . This link will expire in 1 Hours",
        html:`
          <p>
          Click here to reset password : 
          <p>
          <a href="http://localhost:3000/reset-password/${token}">here - ${token} </a>
          </p>
          </p> `
       })
    })
    .then(result=>{
      req.flash('reseterror','Check your email and reset password')
    })
    .then((result)=>{
      res.redirect('/reset-password')
    })
    .catch(err=>{
      console.log(err)
    })
  })
}

exports.getNewPassword = (req,res,next) =>{
 const token = req.params.ResetToken
 User.findOne({resetToken:token,tokenExpieryDate:{$gt:Date.now()}})
 .then(user=>{
  res.render('auth/newpassword',{
    pageTitle:'ResetPassword',
    path:'/reset-password',
    isAuthenticated:req.session.isLoggedIn,
    userId:user._id.toString(),
    passwordToken:token
  })
 })
 .catch(err=>{console.log(err)})
 
}

exports.postNewPassword = (req,res,next) =>{
  const nwpassword = req.body.newpassword
  const userid = req.body.userId
  const token = req.body.passToken
  let resetUser
  User.findOne({resetToken:token,tokenExpieryDate:{$gt:Date.now()},_id:userid})
  .then(user=>{
    resetUser = user
    return bcrypt.hash(nwpassword,12)
  })
  .then(hashPassword=>{
    resetUser.password = hashPassword
    resetUser.resetToken = null
    resetUser.tokenExpieryDate = null
    return resetUser.save()
  })
  .then(result=>{
    res.redirect('/login')
  })
  .catch(err=>{
    console.log(err)
  })
}