const path = require('path');
const session = require('express-session')
const sessionConnector = require('connect-mongodb-session')(session)
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const flashError = require('connect-flash')
const errorController = require('./controllers/error');
const User = require('./models/user');
const csurf = require('csurf');
const app = express();
const csrfProtection = csurf();
const multer = require('multer');

const store = new sessionConnector({
  uri:'mongodb+srv://Anjal:PA%24%24WORD@cluster0-hkkfi.mongodb.net/test?authSource=admin&replicaSet=Cluster0-shard-0&w=majority&readPreference=primary&appname=MongoDB%20Compass&retryWrites=true&ssl=true',
  collection:'session'
})


app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(bodyParser.urlencoded({ extended: false }));
const fileStorage  = multer.diskStorage({
  destination:(req,file,cb)=>{
    cb(null,'images');
  },
  filename: (req,file,cb)=>{
    cb(null,new Date().toString()+'-'+file.originalname)
  }
})

const fileFilter = (req,file,cb)=>{
  if(file.mimetype==='image/png' || file.mimetype==='image/jpeg' || file.mimetype==='image/jpg' ){
    cb(null,true)
  }
  else{
    console.log('invalid file type')
    cb(null,false)
  }
}

//.single('image') indicates that it only accepts single file at a time
app.use(multer({storage:fileStorage,fileFilter:fileFilter}).single('image'))
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images',express.static(path.join(__dirname, 'images')));
app.use(session({secret:"some secret",resave:false,saveUninitialized:false,store:store}))
app.use(flashError())
app.use(csrfProtection)
app.use((req, res, next)=>{
  if(!req.session.user){
    return next()
  }
  User.findById(req.session.user._id)
    .then(user => {
      if(!user){
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {throw new Error(err)});
});

app.use((req,res,next)=>{
  res.locals.csrfToken = req.csrfToken()
  next()
})

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use(errorController.get404);

mongoose
  .connect(
    'mongodb+srv://Anjal:PA%24%24WORD@cluster0-hkkfi.mongodb.net/test?authSource=admin&replicaSet=Cluster0-shard-0&w=majority&readPreference=primary&appname=MongoDB%20Compass&retryWrites=true&ssl=true',{useNewUrlParser:true})
  .then(result => {
    User.findOne().then(user => {
      if (!user) {
        const user = new User({
         email:'newmail@gmail.com',
         password:'password',
          cart: {
            items: []
          }
        });
        user.save();
      }
    });
    console.log("connected")
    app.listen(3000);
  })
  .catch(err => {
    console.log(err);
  });
