var express = require("express");
var app = express();
var bodyparser = require("body-parser");
var mongoose = require("mongoose");
var passport = require("passport");
var LocalStrategy = require("passport-local");
var flash = require("connect-flash");
//var expressSanitizer = require("express-sanitizer");
var multer = require("multer");
const path = require("path");
const fs = require("fs");
var nodemailer = require("nodemailer");
var async = require("async");
var crypto = require("crypto");
var Art = require("../models/Art/art");
var User = require("../models/Art/user");
var Comment = require("../models/Art/comment");
var Contact = require("../models/Art/contact");
/*var Image = require("../models/Art/image");*/
var methodOverride= require("method-override");

/*mongoose.connect("mongodb://localhost:27017/Art", { useNewUrlParser: true });
mongoose.createConnection("mongodb://localhost:27017/Art", { useNewUrlParser: true });
*/
mongoose.connect('mongodb+srv://art:rr@artgallery.ay9ixkb.mongodb.net/',{
	useNewUrlParser: true
});

app.use(express.static("public"));
app.use(bodyparser.urlencoded({extended: true})); 

app.set("view engine","ejs");

var storage = multer.diskStorage({
	filename: function(req,file,callback){
		callback(null, Date.now() + file.originalname);
	}
});

var imageFilter = function(req,file,cb){
	if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)){
		return cb(new Error('Only image files are allowed!'), false);
	}
	cb(null,true);
} ;
var upload = multer({storage:storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({
	cloud_name:'djsshanet',
	api_key: 354263476369371,
	api_secret: "DJ6m5kitiF_yY9fELfPkRtPnXd0",
});

app.use(methodOverride("_method"));
app.use(flash());
app.locals.moment = require('moment');

app.use(require("express-session")({
	secret:"I am the Best",
	resave:false,
	SaveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res,next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});

app.get("/",function(req,res){
	res.render('art/home');
});

app.get("/register",function(req,res){
	res.render('art/register');
});

app.post("/register",function(req,res){
	User.register(new User({username: req.body.username, email:req.body.email}), req.body.password, function(err,user){
		if(err){
    console.log(err);
    return res.render("art/register", {error: err.message});
}
		passport.authenticate("local")(req,res,function(){
            var transporter = nodemailer.createTransport({
                 service: "gmail",
                 auth: {
                        user: 'rrartgal@gmail.com', // generated ethereal user
                        pass: 'artistrr@2021', // generated ethereal password
                    }
                });

  var mailOptions = {
    from: 'rrartgal@gmail.com', // sender address
    to: req.body.email, // list of receivers
    subject: "Email Verification", // Subject line
    text: "Thank You For Registration!! "+" Welcome to Art Gallery Hope U are doing well! Now Upload Your Creation and let the world Know about u!! Stay Safe..!!", // plain text body 
  };
  transporter.sendMail(mailOptions,function(err,info){
  	if(err)
  	{
  		req.flash("error","Mail Not Sent");
  		return res.redirect("back");
  	}
  	else
  	{
  		req.flash("success","Welcome to Art Gallery");
  		res.redirect("/art");

  	}
  });
		});
});
});

app.get("/art",function(req,res){
	/*res.writeHead(200,{'Content-Type':'text/html'});
	fs.readFile('./art.html',null,function(error,data){
		if(error)
		{
			console.log(error);
		}
		else
		{
			res.write(data);
		}
		//res.end();
	});*/
	res.render('art/art',{currentUser: req.user});
});

app.get("/login",function(req,res){
	res.render("art/login");
});

app.post("/login",passport.authenticate("local",
	{
		successRedirect: "/art",
		failureRedirect: "/login"
	}), function(req,res){
});

app.get("/forget",function(req,res){
	res.render("art/forget");
});

app.post("/forget", function(req,res,next){
	async.waterfall([
		function(done){
			crypto.randomBytes(20, function(err, buf){
				var token = buf.toString('hex');
				done(err, token);
			});
		},
		function(token, done){
			User.findOne({email: req.body.email }, function(err, user){
				if(!user){
					req.flash("error","Sorry You are not a User");
					return res.redirect('/forget');
				}
				user.resetPasswordToken = token;
				user.resetPasswordExpires = Date.now() + 3600000;

				user.save(function(err){
					done(err,token,user);
				});
			});
		},
		function(token,user,done)
		{
			var smtpTransport = nodemailer.createTransport({
				service:'Gmail',
				auth:{
					user: 'rrartgal@gmail.com',
					pass:'artistrr@2021',
				}
			});
			var mailOptions = {
				to: user.email,
				from: 'rrartgal@gmail.com',
				subject:'Password Reset',
				text: 'You are receiving this because you (or someone else) have requested the reset of the password' + 
				'Please click on the following link, or paste this into your browserto complete the peocess '+
				'http://'+ req.headers.host + '/reset/'+token + '\n\n'+
				'If you did not request this, please ignore this email and your password will remain unchanged'
			};
			smtpTransport.sendMail(mailOptions, function(err){
				console.log('Mail Sent');
				done(err, 'done');
			});
		}
		],function(err){
			if(err) return next(err);
			res.redirect('/forget');
		});
});

app.get('/reset/:token', function(req,res){
	User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires:{$gt: Date.now()}},function(err,user){
		if(!user){
			return res.redirect('/forget');
		}
		res.render('art/reset',{token: req.params.token});
		});
});

app.post('/reset/:token',function(req,res){
	async.waterfall([
		function(done){
			User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires:{$gt: Date.now()}},function(err,user){
				if(!user)
				{
					return res.redirect('back');
				}
				if(req.body.password === req.body.confirm){
					user.setPassword(req.body.password,function(err){
						user.resetPasswordToken = undefined;
						user.resetPasswordExpires = undefined;
						user.save(function(err){
							req.login(user,function(err){
								done(err,user);
							});
						})
					});
				}
				else
				{
				return res.redirect('back');	
				}
});
},
function(user,done){
	var smtpTransport = nodemailer.createTransport({
				service:'Gmail',
				auth:{
					user: 'rrartgal@gmail.com',
					pass:'artistrr@2021',
				}
			});
			var mailOptions = {
				to: user.email,
				from: 'rrartgal@gmail.com',
				subject:'Password Changed',
				text: 'Hello,\n\n'+
				'This is a Confirmation that the password for your account ' + user.email + ' has just changed'
			};
			smtpTransport.sendMail(mailOptions, function(err){
				done(err);
			});
		}
		], function(err){
			res.redirect('/login');
		});
});

app.get("/art/new",LoggedIn,function(req,res){
	res.render("art/new");
});

app.post("/art/show",upload.single("image"),function(req,res){
	cloudinary.v2.uploader.upload(req.file.path, function(err,result){
		if(err)
		{
			req.flash("error","Something Went Wrong!");
			return res.redirect('back');
		}
		req.body.art.image = result.secure_url;
		req.body.art.imageId = result.public_id;
		req.body.art.user = {
		id: req.user._id,
		username: req.user.username
	}
	Art.create(req.body.art,function(err, newart){
		if(err)
		{
			req.flash("error","Something Went Wrong! Please Try Again..");
			res.redirect("back");
					}
		else
		{
			req.flash("success","Successfully Uploaded Your Art!!");
			res.redirect("/art/show");
		}
	});
	       });
	});

app.get('/art/show',LoggedIn,function(req,res){
	Art.find({},function(err,arts){
		if(err)
		{
		    req.flash("error","Something Went Wrong! Please Try Again..");
			res.redirect("back");
		}
		else
		{
			res.render("art/show",{arts:arts});
		}
	});
});

app.get('/art/show/:id',function(req,res){
	Art.findById(req.params.id).populate("comments").exec(function(err, foundart){
		if(err)
		{
			req.flash("error","Something Went Wrong! Please Try Again..");
			res.redirect("back");
		}
		else
		{
			res.render("art/fullshow",{art: foundart});
		}
	});
});

app.get("/art/show/:id/edit",ownership,function(req,res){
	Art.findById(req.params.id,function(err,foundart){
		res.render("art/edit",{art:foundart});
	});
});

app.put("/art/show/:id",ownership,upload.single('image'),async function(req,res){
	Art.findById(req.params.id,req.body.art,async function(err,updateart){
		if(err)
		{
			req.flash("error","Something Went Wrong! Please Try Again..");
			res.redirect("back");
		}
		else
		{
			if(req.file){
				try {
					await cloudinary.v2.uploader.destroy(updateart.imageId);
		            var result = await cloudinary.v2.uploader.upload(req.file.path);
		            updateart.imageId = result.public_id;
		           	updateart.image = result.secure_url;
				}catch(err){
						return res.redirect("back");
					}
		      }
		      updateart.name = req.body.name;
		      updateart.description = req.body.description;
		      updateart.save();
		      req.flash("success","Your Art Updated Successfully!");
			res.redirect("/art/show/");
		}
	});
});

app.delete("/art/show/:id",ownership,function(req,res){
	Art.findById(req.params.id , async function(err, deleteart){
		if(err)
		{
			req.flash("error","Something Went Wrong! Please Try Again..");
			res.redirect("/art/show");
		}
		try
		{
		     await cloudinary.v2.uploader.destroy(deleteart.imageId);
 			deleteart.remove();
 			req.flash("success","Deleted Successfully!");
 			res.redirect("/art/show");

		}
		catch(err){
			if(err)
		{
			req.flash("error","Something Went Wrong! Please Try Again..");
			res.redirect("/art/show");
		}
		}
		});
});

app.get("/art/show/:id/comments/new",LoggedIn,function(req,res){
	Art.findById(req.params.id,function(err,art){
		if(err)
		{
			res.redirect("back");
		}
		else
		{
			res.render("art/comments",{art:art});
		}
	});
});

app.post("/art/show/:id/comments",LoggedIn, function(req, res){
	Art.findById(req.params.id, function(err, art){
		if(err)
		{
			console.log(err);
			res.redirect("/art/show");
		}
		else
		{
			Comment.create(req.body.comment, function(err,Comment){
				if(err)
				{
					req.flash("error","Something Went Wrong!");
					console.log(err);
				}
				else
				{
					Comment.author.id = req.user._id;
			        Comment.author.username = req.user.username;
			        Comment.save();
					art.comments.push(Comment);
					art.save();
					req.flash("success","Successfully Commented!");
					res.redirect("/art/show/" + art._id);
				}
			});
		}
	});
});

app.get("/art/show/:id/comments/:comment_id/edit",checkCOwnership,function(req,res){
	Comment.findById(req.params.comment_id,function(err,foundComment){
		if(err){
			res.redirect("back");
		}
		else
			{
				res.render("art/editc",{art_id:req.params.id,comment: foundComment});
			}
		});
});

app.put("/art/show/:id/comments/:comment_id",checkCOwnership,function(req,res){
	Comment.findByIdAndUpdate(req.params.comment_id,req.body.comment,function(err,updatecomment){
		if(err)
		{
			req.flash("error","Not Able to Update Your Comment!");
			res.redirect("back");
		}
		else
		{
			req.flash("success","Your Comment Was Updated!");
			res.redirect("/art/show/" + req.params.id);
		}
	});
});

app.delete("/art/show/:id/comments/:comment_id",checkCOwnership,function(req,res){
	Comment.findByIdAndRemove(req.params.comment_id,function(err){
		if(err)
		{
			res.redirect("back");
		}
		else
		{
			req.flash("success","Successfully Deleted Your Comment!");
			res.redirect("/art/show/" + req.params.id);
		}
	});
});

app.get("/contact",function(req,res){
	res.render("art/contact");
});

app.post("/contact",function(req,res){
	Contact.create(req.body.contact,function(err,contact){
		if(err)
		{
			req.flash("error","Please Try Again");
			res.redirect("back");
		}
		else
		{
			req.flash("success","Thanks for Contacting Us! We will soon be in touch with you..!");
			res.redirect("/art");
		}
	});
});

app.get("/about",function(req,res){
	res.render("art/about");
});

app.get("/logout",function(req,res){
	req.logout();
	req.flash("success","Logged You Out! Bye !!");
	res.redirect("/");
});

function LoggedIn(req,res,next){
	if(req.isAuthenticated())
	{
		return next();
	}
	req.flash("error","Please Register or Login First!");
	res.redirect("/register");
}

function ownership(req,res,next)
{
	Art.findById(req.params.id,function(err,foundart){
		if(err)
		{
			req.flash("error","You Don't have the Permission!");
			res.redirect("back");
		}
		else
		{
			if(foundart.user.id.equals(req.user._id))
			{			
				next();
			}
			else
			{
				req.flash("error","You Don't have the Permission!");
				req.redirect("back");
			}
		}
	});
}

function checkCOwnership(req,res,next){
	if(req.isAuthenticated()){
		Comment.findById(req.params.comment_id,function(err,foundComment){
		if(err)
		{
			res.redirect("back");
		}
		else
		{
			if(foundComment.author.id.equals(req.user._id))
			{
			    next();
		    }
			else
		    {
		       	req.flash("error","Permission Denied!");
			    res.redirect("back");
		}
		}
	});
	}
	else
	{
		req.flash("error","You need to be logged in to do that!!");
		res.redirect("back");
	}
}

app.get("/developer",function(req,res){
	res.render("art/developer");
});
/*app.post("/upload/show",upload,function(req,res){
	console.log(req.file.filename);
	var image = req.file.filename;
	var newimg = {image:image};
	Image.create(newimg,function(err, newimg){
		if(err)
		{
			console.log(err);
		}
		else
		{
		   upload(req,res,function(err){
		   if(err)
		   {
			    console.log(err);
		   }
		   else
		   {
			    res.redirect("/upload/show");
			}
});
		}
	});
});

app.get('/upload/show',function(req,res){
	Image.find({},function(err,imgs){
		if(err)
		{
			console.log(err);
		}
		else
		{
			res.render("art/imgs",{imgs:imgs});
		}
	});
});*/

app.listen(process.env.PORT, process.env.IP);
