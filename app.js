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

app.get("/", (req,res) => res.sendFile(__dirname + "/index.html"))
app.get("/Owners" ,(req,res) => res.sendFile(__dirname+"/Owners.html"));
app.get("/FAQ",(req,res) => res.sendFile(__dirname+"/FAQ.html"));
app.get("/Success",(req,res) => res.sendFile(__dirname+"/Success.html"));
app.get("/Failure",(req,res)=> res.sendFile(__dirname+"/Failure.html"));
app.get("/Signup",(req,res)=>res.render("Signup1"));

app.get("/Login",(req,res)=>res.render("Login-tenant"));
app.get("/Login2",(req,res) =>res.render("Login-owner"));

app.get("/Owner-claims",(req,res) =>res.render("Owner-claims" , {name: req.user.name, type:req.user.type}));
app.get("/Owner-active",(req,res) =>res.render("Owner-active" , {name: req.user.name, type:req.user.type}));
app.get("/Owner-pending",(req,res) =>res.render("Owner-pending" , {name: req.user.name, type:req.user.type}));
app.get("/Owner-create",(req,res) =>res.render("Owner-create" , {name: req.user.name, type:req.user.type}));

app.get("/Tenant-claims",(req,res) =>res.render("Tenant-claims" , {name: req.user.name, type:req.user.type}));
app.get("/Tenant-active",(req,res) =>res.render("Tenant-active" , {name: req.user.name, type:req.user.type}));
app.get("/Tenant-pending",(req,res) =>res.render("Tenant-pending" , {name: req.user.name, type:req.user.type}));
app.get("/Tenant-create",(req,res) =>res.render("Tenant-create" , {name: req.user.name, type:req.user.type}));
app.get("/About-us" ,(req,res) => res.sendFile(__dirname+"/About-us.html"));
app.get("/admin", (req,res)=> res.render('Admin1'));
app.get("/Tickets",(req,res)=>res.render("Tickets"));

app.post('/Signup', (req,res)=>{
    const {name,email,password,type} = req.body; 
    //searching for user in database
    User.findOne({email:email}).then(user=>{
        if(user){ 
            req.session.message = {
                type: 'warning',
                intro: 'Email already registered! ',
                message: 'Please try another email.'
              }
              res.redirect('/Signup')
                  }
        else{
          //register new user
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

//Tenant-dashboard

app.post('/Login',(req,res,next)=> {
    
    passport.authenticate('local',{
        successRedirect: '/Tenant-dash',
        failureRedirect:'/Login',
        failureFlash: true
    })(req,res,next);

});


app.get("/Tenant-dash",ensureAuthenticated,(req,res) =>res.render("Tenant-dash" , {name: req.user.name, type:req.user.type}));

//Owner-dashboard
app.post('/Login2',(req,res,next)=> {


    passport.authenticate('local',{
        successRedirect: '/Owner-dash',
        failureRedirect:'/Login2',
        failureFlash: true
    })(req,res,next);
});

app.get("/Owner-dash", ensureAuthenticated,(req,res) =>res.render("Owner-dash" , {name: req.user.name, type:req.user.type}));

//Logout
app.get("/Logout" , function(req,res){
    req.logOut();
    req.session.message = {
        type: 'success',
        intro: 'You are now logged out! ',
    }
        res.redirect("/Login");
    
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
// change api key 
const url='https://us2.api.mailchimp.com/3.0/lists/d6de6e11f3'

const options={
    method: "POST",
    //change list id 
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



