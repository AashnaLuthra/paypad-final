require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const request = require("request");
const LocalStrategy = require('passport-local').Strategy;
const https= require("https")
const expressLayouts=require("express-ejs-layouts");
const bcrypt = require("bcryptjs");
const flash = require('connect-flash');
const session = require('express-session');


const app = express();

//Ejs
app.set(expressLayouts);
app.set('view engine', 'ejs');
app.use(express.static("public"));

app.use(bodyParser.urlencoded({extended: false}));

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true,
  }));


//Passport config
require('./config/passport')(passport);

//DB config
const db=require('./config/keys').MongoURI;
// Connect to Mongo
mongoose.connect(db, {useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

// Express body parser
// app.use(express.urlencoded({ extended: true }));

const User = require('./models/User');


const {ensureAuthenticated} = require('./config/auth');

//Passport middleware
    app.use(passport.initialize());
    app.use(passport.session());
   
//   Connect Flash
app.use(flash())

//Global Vars
app.use(function(req,res,next){
    res.locals.message = req.session.message;
    res.locals.error = req.flash('error');
    delete req.session.message
    next();

});

app.get("/", function(req,res){
    res.sendFile(__dirname + "/index.html")
})


app.get("/Owners" , function(req,res){
    res.sendFile(__dirname+"/Owners.html");
})

app.get("/FAQ",function(req,res){
    res.sendFile(__dirname+"/FAQ.html");
})

app.get("/Success",function(req,res){
    res.sendFile(__dirname+"/Success.html");
});
app.get("/Failure",function(req,res){
    res.sendFile(__dirname+"/Failure.html");
});

  

app.get("/Signup",function(req,res){
    res.render("Signup1");
});
app.get("/Login",function(req,res){
    res.render("Login-tenant");
});
app.get("/Login2",function(req,res){
    res.render("Login-owner");
});


app.post('/Signup', (req,res)=>{
    const {name,email,password,type} = req.body; 

    User.findOne({email:email}).then(user=>{
        if(user){ 
            // req.flash('message', 'email is already registered!')
            req.session.message = {
                type: 'warning',
                intro: 'Email already registered! ',
                message: 'Please try another email.'
              }
              res.redirect('/Signup')
                  }
        else{
          
        const newUser = new User ({
            name,
            email,
            password,
            type

        });
        

        //Hash password
        bcrypt.genSalt(10,(err,salt)=>{
            bcrypt.hash(newUser.password,salt,(err,hash)=>{
            if(err) throw err;
            //set password to hash
            newUser.password=hash;
            //save user
            newUser.save()
            .then(user => {
                req.session.message = {
                    type: 'success',
                    intro: 'You have been successfully registered! ',
                    message: 'Please log in.'
                  }
                if(req.body.type=="Owner"){
                    res.redirect('/Login2');

                }else{
                    res.redirect('/Login');
                }
                
                
            })
            .catch(err => console.log(err))
        });
    });
    }
});
});

app.post('/Login',(req,res,next)=> {
    
    passport.authenticate('local',{
        successRedirect: '/admin1',
        failureRedirect:'/Login',
        failureFlash: true
    })(req,res,next);

});


app.get("/admin1" , ensureAuthenticated, (req,res)=>{
    res.render('admin1', {name: req.user.name, type:req.user.type})
});


app.post('/Login2',(req,res,next)=> {


    passport.authenticate('local',{
        successRedirect: '/admin1',
        failureRedirect:'/Login2',
        failureFlash: true
    })(req,res,next);
});

app.get("/admin1" , ensureAuthenticated, (req,res)=>{
    res.render('admin1', {name: req.user.name, type: req.user.type})
});






// app.get("/" , ensureAuthenticated, (req,res)=>{
//     res.render('Tenant', {name: req.user.name})
// });


app.get("/Logout" , function(req,res){
    req.logOut();
    req.session.message = {
        type: 'success',
        intro: 'You are now logged out! ',
      }
      if(req.body.type=="Tenant"){
        res.redirect("/Login");

      }else {
        res.redirect("/Login2");
    
          }
});



//MailChimp
app.post("/",function(req,res){

    var data={
        members: [
            {
                email_address: req.body.email,
                status:"subscribed"
            }
        ]
    };


var jsonData= JSON.stringify(data);
const url='https://us2.api.mailchimp.com/3.0/lists/d6de6e11f3'

const options={
    method: "POST",
    auth: "paypad:63bbb120d896b5378a69055286465be5-us2"
}

const request=https.request(url,options,function(response){
    if (response.statusCode=200){
        
        res.redirect("/Success")
    }else{
        res.redirect("/Failure")
    }

    response.on("data",function(data){
        // console.log(JSON.parse(data));
    });
    
});
request.write(jsonData);
request.end();
});

app.listen(process.env.PORT || 5050 , function() {
    console.log("server running on port 5050")
})



