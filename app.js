//Server
var server				=		require('express')();
var http					=		require('http').Server(server);
var httpl 				= 	require('http');
var net						=		require('net');
var express				=		require('express');
var fs						=		require('fs');   
var bodyParser		=		require('body-parser');    
var session				=		require('express-session');
var nodemailer 		= 	require('nodemailer');
const dotenv 			=		require('dotenv');
dotenv.config();
var dripClient 		= 	require('drip-nodejs')(
  {
    token: process.env.driptoken,
    accountId: process.env.dripaccountid
    
  }
);
//var io					=	require('socket.io')(http);
var cookieParser	=		require('cookie-parser');
var crypto				=		require('crypto');
var mongo					=		require('mongodb');

var mongoClient	=	mongo.MongoClient;
var url	=	process.env.mongourl;

const campaignId = process.env.dripcampaign;

server.set('view engine','ejs');
var viewArray	=	[__dirname+'/views'];
var viewFolder	=	fs.readdirSync('views');
for(var i=0;i<viewFolder.length;i++){
	if(viewFolder[i].split(".").length==1){
		viewArray.push(__dirname+'/'+viewFolder[i])
	}
}
server.set('views', viewArray);
server.use(express.static(__dirname + '/public'));
server.use(bodyParser.json());  
server.use(bodyParser.urlencoded({ extended: true }));
server.use(cookieParser());
server.use(session({
	secret: process.env.sessionsecret,
    resave: true,
    saveUninitialized: true
}));


function hashString(string){
	var hash	=	crypto.createHash('md5').update(string).digest('hex')
	return hash
}

console.log(hashString("mobatec123"))

//PORT Listening
http.listen(process.env.PORT, function(){
  console.log('Server Started');
});

var mainFileVersion	=	1.1;
var pageInfo	=	{};
pageInfo.fileVersion	=	mainFileVersion;
pageInfo.siteName		=	"Mobatec - Experts for process modelling";


var transporter = nodemailer.createTransport({
	host: process.env.transporterhost,
	port: 465,
	secure: true,
	auth: {
		user: process.env.transporteruser,
		pass: process.env.transporterpass
	}
});


function fetchPageInfo(pageName){
	var pageInfoObject	=	JSON.parse(JSON.stringify(pageInfo));
	if(fs.existsSync('./info/'+ pageName + '.json')){
		var pageJson	=	JSON.parse(fs.readFileSync('./info/'+ pageName + '.json','utf-8'));
	}else{
		var pageJson	=	JSON.parse(fs.readFileSync('./info/home.json','utf-8'));
	}
	for(var i=0;i<Object.keys(pageJson).length;i++){
		pageInfoObject[Object.keys(pageJson)[i]]	=	pageJson[Object.keys(pageJson)[i]].toString();
	}

	return pageInfoObject
}

function emailIsValid(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

function generateId(length) {
    var result           = [];
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
		result.push(characters.charAt(Math.floor(Math.random() * charactersLength)));
	}
   return result.join('');
}

function showDate(datetime){
	return new Date(datetime).getDate()+"-"+eval(new Date(datetime).getMonth()+1)+"-"+new Date(datetime).getFullYear()
}


function subscribeToLongflow(email,name,source){
	const payload = {
		email: email,
		custom_fields: {
			name: name,
			source: source 
		}
	}
	dripClient.subscribeToCampaign(campaignId, payload)
		.then((response) => {
			mongoClient.connect(url,{useUnifiedTopology: true},function(err,client){
				if(err){
					console.log(err)
				}else{
					var whitepaperSubs		=	client.db('MobaHub').collection('Whitepaper');
					var subscriberJson		=	{};
					subscriberJson.filetype	=	"whitepapersub";
					subscriberJson.name		=	name;
					subscriberJson.email	=	email;
					subscriberJson.source	=	source;
					subscriberJson.datetime	=	new Date().getTime();
					subscriberJson.showdate	=	showDate(subscriberJson.datetime);

					whitepaperSubs.insertOne(subscriberJson,function(err,addedResult){
						client.close();
					});
				}
			});
			
		})
		.catch((error) => {
			// Handle errors
			console.log(error);
		});
}

var keyArrayString	=	process.env.keyarray;

var keyArray	=	keyArrayString.split(",");
 
function dateToKey(date){
	var dateString	=	date.toString();
	var key			=	"";
	for(var i=0;i<dateString.length;i++){
		key	+=	keyArray[Number(dateString[i])];
	}
	return key;
}

function generateLicense(email,name,type,starttime,source){
	mongoClient.connect(url,{useUnifiedTopology: true},function(err,client){
		if(err){
			console.log(err)
		}else{
			var licenses				=	client.db('MobaHub').collection('Modeller');
			var licenseJson				=	{};
			licenseJson.filetype		=	"license";
			licenseJson.name			=	name;
			licenseJson.email			=	email;
			licenseJson.source			=	source;
			licenseJson.type			=	type;
			licenseJson.datetime		=	starttime;
			licenseJson.datetimeshow	=	showDate(starttime);

			licenses.insertOne(licenseJson,function(err,addedResult){
				client.close();
				var options = {
					host: process.env.licensehost,
					port: process.env.licenseport,
					path: '/weblic/'+dateToKey(starttime)+'/'+encodeURIComponent(email)
				};

				callback = function(response) {
					response.on('data', function (chunk) {});
					//the whole response has been received, so we just print it out here
					response.on('end', function () {});
					response.on('error',function(){
						console.log("there was an error with your http request");
					})
				}
				httpl.request(options, callback).end();
			});
		}
	});
}

function addModellerSubscriber(email,name,datetime,source,downloadcode){
	mongoClient.connect(url,{useUnifiedTopology: true},function(err,client){
		if(err){
			console.log(err)
		}else{
			var subscribers				=	client.db('MobaHub').collection('Modeller');
			var subscriberJson			=	{};
			subscriberJson.filetype		=	"subscriber";
			subscriberJson.name			=	name;
			subscriberJson.email		=	email;
			subscriberJson.source		=	source;
			subscriberJson.datetime		=	datetime;
			subscriberJson.datetimeshow	=	showDate(datetime);
			subscriberJson.downloadcode	=	downloadcode;
			subscriberJson.valid		=	true;

			subscribers.insertOne(subscriberJson,function(err,addedResult){
				client.close();
			});
		}
	});
}

server.get('/whitepaper-post/:email/:name',function(req,res){
	const payload = {
		email: decodeURIComponent(req.params.email),
		custom_fields: {
			name: decodeURIComponent(req.params.name)
		}
	}
	dripClient.subscribeToCampaign(campaignId, payload)
		.then((response) => {
			res.redirect("https://mobatec.nl/web/thank-you");
		})
		.catch((error) => {
			// Handle errors
			res.redirect("https://mobatec.nl/web/thank-you");
			console.log(error);
		});
});

server.get('/whitepaper-post/:email/:name/:source',function(req,res){
	const payload = {
		email: decodeURIComponent(req.params.email),
		custom_fields: {
			name: decodeURIComponent(req.params.name),
			source: decodeURIComponent(req.params.source) 
		}
	}
	dripClient.subscribeToCampaign(campaignId, payload)
		.then((response) => {
			mongoClient.connect(url,{useUnifiedTopology: true},function(err,client){
				if(err){
					console.log(err)
				}else{
					var whitepaperSubs		=	client.db('MobaHub').collection('Whitepaper');
					var subscriberJson		=	{};
					subscriberJson.filetype	=	"whitepapersub";
					subscriberJson.name		=	decodeURIComponent(req.params.name);
					subscriberJson.email	=	decodeURIComponent(req.params.email);
					subscriberJson.source	=	decodeURIComponent(req.params.source);
					subscriberJson.datetime	=	new Date().getTime();
					subscriberJson.showdate	=	showDate(subscriberJson.datetime);

					whitepaperSubs.insertOne(subscriberJson,function(err,addedResult){
						res.redirect("https://mobatec.nl/web/thank-you");
						client.close();
					});
				}
			});
			
		})
		.catch((error) => {
			// Handle errors
			res.redirect("https://mobatec.nl/web/thank-you");
			console.log(error);
		});
});


/*const options = { per_page: 1000 };


dripClient.listAllSubscribesToCampaign(campaignId,options)
  .then((response) => {
    // Handle `response.body`
    console.log(response.body.subscribers.length);
    fs.writeFileSync("./subscibers.json",JSON.stringify(response.body.subscribers, null, 4))
  })
  .catch((error) => {
    // Handle errors
  });*/

server.get('/',function(req,res){
	res.render('home',{
		pageInfo: fetchPageInfo('home',''),
		pageName: 'home'
	});
});

server.get('/services',function(req,res){
	res.render('services',{
		pageInfo: fetchPageInfo('services',''),
		pageName: 'services'
	});
});

server.get('/products',function(req,res){
	res.render('products',{
		pageInfo: fetchPageInfo('products',''),
		pageName: 'products'
	});
});

server.get('/projects',function(req,res){
	var projectsFiles	=	fs.readdirSync("./info/projectspage");
	var projectsArray	=	[];
	for(var i=0;i<projectsFiles.length;i++){
		if(projectsFiles[i].split(".")[1]=="json"){
			projectsArray.push(JSON.parse(fs.readFileSync("./info/projectspage/"+projectsFiles[i])));
		}
	}
	projectsArray.sort(function (a, b) {
	    if (a.order < b.order) {
	        return -1;
	    }
	    else if (a.order > b.order) {
	        return 1;
	    }
	    return 0;
	});
	res.render('projects',{
		pageInfo: fetchPageInfo('projects',''),
		pageName: 'projects',
		projects: projectsArray 
	});
});

server.get('/downloads',function(req,res){
	res.render('downloads',{
		pageInfo: fetchPageInfo('downloads',''),
		pageName: 'downloads'
	});
});


server.get('/company',function(req,res){
	var teamFiles	=	fs.readdirSync('./info/team');
	var team		=	[];
	for(var i=0;i<teamFiles.length;i++){
		if(teamFiles[i].split(".")[1]=="json"){
			team.push(JSON.parse(fs.readFileSync('./info/team/'+teamFiles[i])))
		}
	}
	team.sort(function (a, b) {
	    if (a.order < b.order) {
	        return -1;
	    }else if (a.order > b.order) {
	        return 1;
	    }
	    return 0;
	});

	var photoJsons		=	fs.readdirSync('./info/memorable-moments');
	var	photos 			=	[];
	for(var i=0;i<photoJsons.length;i++){
		if(photoJsons[i].split(".")[photoJsons[i].split(".").length-1]=="json"){
			photos.push(JSON.parse(fs.readFileSync('./info/memorable-moments/'+photoJsons[i])));
		}
	}
	photos.sort(function (a, b) {
	    if (a.order < b.order) {
	        return 1;
	    }else if (a.order > b.order) {
	        return -1;
	    }
	    return 0;
	});

	res.render('company',{
		pageInfo: 	fetchPageInfo('company',''),
		pageName: 	'company',
		team: 		team,
		photos: 	photos 
	});
});

server.get('/modeller-download',function(req,res){
	res.render('modeller-download',{
		pageInfo: fetchPageInfo('modeller-download','')
	});
});


server.post('/modeller-download',function(req,res){
	var email	=	req.body.email;
	var name	=	req.body.name ? req.body.name : "Process Modeller";
	if(emailIsValid(email)){
		mongoClient.connect(url,{useUnifiedTopology: true},function(err,client){
			var collection	=	client.db('MobaHub').collection('Modeller');
			collection.find({ $and: [ { email: email.toLowerCase() }, { filetype: "subscriber" } ] }).toArray(function(err,result){
				if(err){
					console.log(err)
				}else{
					if(result.length>0){
						if(result[0].valid){//Not really needed but i left it there anyhow
							res.render('message',{
								pageInfo: fetchPageInfo('message',''),
								message: "You have already subscribed for Mobatec Modeller.<br>&nbsp<br><a class=\"submitButton\" href=\"/modeller-check/"+result[0].downloadcode+"\">Download Latest Version</a><br>&nbsp<br>Kind regards,<br>The Mobatec Team"
							});
						}else{
							res.render('message',{
								pageInfo: fetchPageInfo('message',''),
								message: "This email is already subscribed but was never verified.<br>&nbsp<br>We have sen another download to link to the e-mail that was provided.<br>&nbsp<br>Kind regards,<br>The Mobatec Team"
							});
						}
						client.close();
					}else{
						var downloadcode 	=	generateId(105);
						addModellerSubscriber(email.toLowerCase(),name,new Date().getTime(),"Modeller Download Page",downloadcode);
						subscribeToLongflow(email.toLowerCase(),name,"Modeller Download");
						var mailOptions = {
							from: '"Mobatec Cloud" <admin@mobatec.cloud>',
							to: email,
							subject: 'Mobatec Modeller Download Link',
							attachments:[
								{   // use URL as an attachment
									filename: 'Mobatec_Whitepaper_Succesfully_Apply_Simulation_Models.pdf',
									path: 'https://www.mobatec.nl/web/downloads/Mobatec_Whitepaper_Succesfully_Apply_Simulation_Models.pdf'
								}
							],
							html: "Hello "+name+",<br>You can download the latest version of Mobatec Modeller "
							+"<a href=\"https://mobatec.azurewebsites.net/modeller-check/"+downloadcode+"\">here</a>."
							+"<br>&nbsp;<br>You can subscribe to our free introduction course "
							+"<a href=\"https://www.mobatec.nl/web/course-registration\">here</a> "
							+"and <b>get a one month Mobatec Modeller license</b> to complete the course once you have verified your e-mail address.<br>"
							+"Once you complete the course you will be rewarded a certificate if you provide us with the required files.<br>&nbsp;<br>"
							+"We have also attached a free whitepaper \"Modelling and Simulation in Process Industry\". To view it online click <a href=\"https://www.mobatec.nl/web/downloads/Mobatec_Whitepaper_Succesfully_Apply_Simulation_Models.pdf\">here</a><br>&nbsp;<br>"
							+"Kind regards,<br>The Mobatec Team"
						};

						transporter.sendMail(mailOptions, (error, info) => {
							if (error) {
								return console.log(error);
							}
						});
						res.render('message',{
							pageInfo: fetchPageInfo('message',''),
							message: "We have sent you the download link for Mobatec Modeller on the e-mail you have provided.<br>&nbsp<br>Good luck with modelling!<br>&nbsp;<br>Kind regards,<br>The Mobatec Team"
						});
					}
				}
			});
		});
	}else{
		res.render('modeller-download',{
			pageInfo: fetchPageInfo('modeller-download',''),
			email: email,
			name: req.body.name
		});
	}
})
 
server.get('/modeller-check/:downloadcode',function(req,res){
	mongoClient.connect(url,{useUnifiedTopology: true},function(err,client){
		if(err){
			console.log(err)
		}else{
			var collection	=	client.db('MobaHub').collection('Modeller');
			collection.find({downloadcode:req.params.downloadcode}).toArray(function(err,result){
				if(err){
					console.log(err)
				}else{
					if(result.length>0){
						if(result[0].valid){
							res.download(__dirname+'/public/downloads/Modeller_v4_16900_Setup.exe','Modeller_v4_16900_Setup.exe')
							//res.redirect("https://mobatec.nl/Modeller/getlink.php?bounceback="+encodeURIComponent("https://mobatec.azurewebsites.net/modeller-latest/"+req.params.downloadcode));
						}else{
							res.render('message',{
								pageInfo: fetchPageInfo('message',''),
								message: "To download the latest version of Mobatec Modeller please verify your e-mail address."
							});
						}
					}else{
						res.render('message',{
							pageInfo: fetchPageInfo('message',''),
							message: "No no :)"
						});
					}
				}
				client.close();
			});
		}
	});
});

//The beellow could be not necessary after some time, inspect it after some time

server.get('/modeller-latest/:downloadcode',function(req,res){
    mongoClient.connect(url,{useUnifiedTopology: true},function(err,client){
		if(err){
			console.log(err)
		}else{
			var collection	=	client.db('MobaHub').collection('Modeller');
			collection.find({downloadcode:req.params.downloadcode}).toArray(function(err,result){
				if(err){
					console.log(err)
				}else{
					if(result.length>0){
						if(result[0].valid){
							res.download(__dirname+'/public/downloads/Modeller_v4_16900_Setup.exe','Modeller_v4_16900_Setup.exe')
							//res.redirect("https://mobatec.nl/Modeller/"+req.query.version)
						}else{
							res.render('message',{
								pageInfo: fetchPageInfo('message',''),
								message: "To download the latest version of Mobatec Modeller please verify your e-mail address."
							});
						}
					}else{
						res.render('message',{
							pageInfo: fetchPageInfo('message',''),
							message: "No no :)"
						});
					}
				}
				client.close();
			});
		}
	});
});

server.get('/webinars/registration/introduction-to-process-modelling',function(req,res){
	res.render('webinar-registration',{
		pageInfo: fetchPageInfo('introduction-webinar','')
	});
});

server.get('/webinars/verification/:verificationid',function(req,res){
	mongoClient.connect(url,{useUnifiedTopology: true},function(err,client){
		if(err){
			console.log(err)
		}else{
			var collection	=	client.db('MobaHub').collection('Webinar');
			collection.find({validationcode:req.params.verificationid}).toArray(function(err,result){
				if(err){
					console.log(err)
				}else{
					if(result.length>0){
						if(result[0].valid){
							res.render('message',{
								pageInfo: fetchPageInfo('message',''),
								message: "This e-mail has already been verified. You can view the course by clicking <a href='/webinars/watch/introduction-to-process-modelling/"+req.params.verificationid+"' style='color:rgb(20,255,20);font-weight:600;text-decoration:none'>here.</a>"
							});
							client.close();
						}else{
							var validationtime		=	new Date().getTime();
							var licenseOver			=	new Date(validationtime+2.628e+9);
							var newvalues = { $set: {valid: true, validationdatetime: validationtime, validationshowdate: showDate(validationtime) } };
							collection.updateOne({validationcode:req.params.verificationid}, newvalues, function(err, result2) {
								if(err){
									console.log(err)
								}else{
									if(result2.modifiedCount==0){
										res.render('message',{
											pageInfo: fetchPageInfo('message',''),
											message: "No no :)"
										});
									}else if(result2.modifiedCount==1){
										subscribeToLongflow(result[0].email,result[0].name,result[0].source);
										generateLicense(result[0].email,result[0].name,"Free Intro Course",validationtime,result[0].source);
										var collection2	=	client.db('MobaHub').collection('Modeller');
										collection2.find({ $and: [ { email: result[0].email }, { filetype: "subscriber" } ] }).toArray(function(err,result3){
											if(err){
												console.log(err)
											}else{
												if(result3.length>0){
													//do nothing
													var downloadCode	=	result3[0].downloadcode;
												}else{
													var downloadCode 	=	generateId(105);
													addModellerSubscriber(result[0].email,result[0].name,validationtime,"Webinar",downloadCode)
												}
												res.render('message',{
													pageInfo: fetchPageInfo('message',''),
													message: "You successfully verified your e-mail and have been <a href='/webinars/watch/introduction-to-process-modelling/"+result[0].validationcode+"'><span class='green'>granted access to Introduction to Process Modelling Course</span></a>.<br>&nbsp;<br>You have also been granted a <span class='green'>one month license</span> for Mobatec Modeller starting from this time.<br>&nbsp;<br>Good luck with modelling!<div style='margin-top:20px;'><div class='submitButton' onclick='window.location.href=\"/webinars/watch/introduction-to-process-modelling/"+result[0].validationcode+"\"'>Go to Course!</div></div>"
												});
												var mailOptions = {
													from: '"Mobatec Cloud" <admin@mobatec.cloud>',
													to: result[0].email.toLowerCase(),
													subject: 'Mobatec License',
													attachments:[
														{   // use URL as an attachment
															filename: 'Mobatec_Whitepaper_Succesfully_Apply_Simulation_Models.pdf',
															path: 'https://www.mobatec.nl/web/downloads/Mobatec_Whitepaper_Succesfully_Apply_Simulation_Models.pdf'
														}
													],
													html: "Hello "+result[0].name+",<br>Thank you for verifying your e-mail.<br>&nbsp;<br>You can access the "
													+"course <a href=\"https://mobatec.azurewebsites.net/webinars/watch/introduction-to-process-modelling/"+result[0].validationcode+"\">here</a>."
													+"<br>&nbsp;<br>Your Mobatec Modeller license is "
													+"active until "+showDate(licenseOver.getTime())+".<br>&nbsp;<br>To use your license go into \"License Options\" and click "
													+"\"Connect to a license server\". For the license server logon use license.mobatec.nl and for Server Logon User Name use "
													+"your email address: "+result[0].email.toLowerCase()+"<br>&nbsp;<br> You can download Mobatec Modeller by clicking on "
													+"<a href=\"https://mobatec.azurewebsites.net/modeller-check/"+downloadCode+"\">this link.</a><br>&nbsp;<br>"
													+"We have also attached a free whitepaper \"Modelling and Simulation in Process Industry\". To view it online click <a href=\"https://www.mobatec.nl/web/downloads/Mobatec_Whitepaper_Succesfully_Apply_Simulation_Models.pdf\">here</a><br>&nbsp;<br>"
													+"Kind regards,<br>The Mobatec Team"
												};

												transporter.sendMail(mailOptions, (error, info) => {
													if (error) {
														return console.log(error);
													}
												});

												client.close();
											}
										})
									}
								}
							
							});
						}
						
					}else{
						res.render('message',{
							pageInfo: fetchPageInfo('message',''),
							message: "No no :)"
						});
						client.close();
						
					}
				}
			});
			
		}
	});
});
 
server.post('/introduction-course-registration',function(req,res){
	var email	=	req.body.email;
	var name	=	req.body.name ? req.body.name : "Webinar Subscriber";
	var sourceW	=	req.body.source ? req.body.source : "Not defined";
	var scroll	=	Number(req.body.scroll);
	if(emailIsValid(email)){
		mongoClient.connect(url,{useUnifiedTopology: true},function(err,client){
			if(err){
				console.log(err)
			}else{
				var collection	=	client.db('MobaHub').collection('Webinar');
				collection.find({email:email.toLowerCase()}).toArray(function(err,result){
					if(err){
						console.log(err)
					}else{
						if(result.length>0){
							if(result[0].valid){
								res.redirect('/webinars/watch/introduction-to-process-modelling/'+result[0].validationcode)
							}else{
								res.render('webinar-registration',{
									pageInfo: fetchPageInfo('introduction-webinar',''),
									email: email,
									name: name,
									scroll: scroll,
									emaildouble: result[0].valid ? 1 : 2
								});
							}
							
							if(!result[0].valid){
								var mailOptions = {
									from: '"Mobatec Cloud" <admin@mobatec.cloud>',
									to: email.toLowerCase(),
									subject: 'Mobatec E-mail Verification',
									html: "Hello "+result[0].name+",<br>&nbsp;<br>Please click <a href='https://mobatec.azurewebsites.net/webinars/verification/"
									+result[0].validationcode+"''>here</a>"
									+" to verify your e-mail address and gain access to the Introduction to Process Modelling Course.<br>&nbsp;<br>"
									+"Kind regards,<br>The Mobatec Team"
								};

								transporter.sendMail(mailOptions, (error, info) => {
									if (error) {
										return console.log(error);
									}
								});
							}
							client.close();
						}else{
							var registerJson			=	{};
							registerJson.filetype		=	"webinarregistration";
							registerJson.email			=	email.toLowerCase();
							registerJson.name			=	name;
							registerJson.validationcode	=	generateId(100);
							registerJson.source			=	sourceW;
							registerJson.valid			=	false;
							registerJson.datetime		=	new Date().getTime();
							registerJson.showdate		=	showDate(registerJson.datetime);
							collection.insertOne(registerJson,function(err,addedResult){
								if(err){
									console.log(err)
								}else{
									var mailOptions = {
										from: '"Mobatec Cloud" <admin@mobatec.cloud>',
										to: email.toLowerCase(),
										subject: 'Mobatec E-mail Verification',
										html: "Hello "+name+",<br>&nbsp;<br>Please click <a href='https://mobatec.azurewebsites.net/webinars/verification/"+registerJson.validationcode+"''>here</a>"
										+" to verify your e-mail address and gain access to the Introduction to Process Modelling Course.<br>&nbsp;<br>"
										+"Kind regards,<br>The Mobatec Team"
									};
	
									transporter.sendMail(mailOptions, (error, info) => {
										if (error) {
											return console.log(error);
										}else{
											res.render('message',{
												pageInfo: fetchPageInfo('message',''),
												message: "Please verify the e-mail address by clicking on the link in the message we have just sent.<br>&nbsp;<br>Kind regards<br>The Mobatec Team"
											});
										}
										
									});
									client.close();
								}
							});
						}
					}
				});
			}
		});
	}else{
		res.render('webinar-registration',{
			pageInfo: fetchPageInfo('introduction-webinar',''),
			email: email,
			name: name,
			scroll: scroll
		});
	}
});


server.get('/webinars/watch/introduction-to-process-modelling/:verificationid',function(req,res){
	mongoClient.connect(url,{useUnifiedTopology: true},function(err,client){
		if(err){
			console.log(err)
		}else{
			var collection	=	client.db('MobaHub').collection('Webinar');
			collection.find({validationcode:req.params.verificationid}).toArray(function(err,result){
				if(err){
					console.log(err)
				}else{
					if(result.length>0){
						if(result[0].valid){
							res.render('introduction-webinar',{
								pageInfo: fetchPageInfo('introduction-webinar',''),
								user: result[0]
							});
						}else{
							res.render('message',{
								pageInfo: fetchPageInfo('message',''),
								message: "Hello "+result[0].name+",<br>Your e-mail address still hasn't been verified. Please click on the link that we have resent.<br>&nbsp;<br>Kind reagrds,<br>The Mobatec Team"
							});
							var mailOptions = {
								from: '"Mobatec Cloud" <admin@mobatec.cloud>',
								to: result[0].email.toLowerCase(),
								subject: 'Mobatec E-mail Verification',
								html: "Hello "+result[0].name+",<br>Please click <a href='https://mobatec.azurewebsites.net/webinars/verification/"
								+result[0].validationcode+"''>here</a>"
								+" to verify your e-mail address and gain access to the Introduction to Process Modelling & Simulation webinar.<br>"
								+"Kind regards,<br>The Mobatec Team"
							};

							transporter.sendMail(mailOptions, (error, info) => {
								if (error) {
									return console.log(error);
								}
							});
						}
						client.close();
					}else{
						res.render('message',{
							pageInfo: fetchPageInfo('message',''),
							message: "No no :)"
						});
						client.close();
					}
				}
			});
			
		}
	});
});

server.get('/modeller-login',function(req,res){
	res.render('modeller-login',{
		pageInfo: fetchPageInfo('message','')
	});
});

server.post('/modeller-login',function(req,res){
	var username	=	req.body.username;
	var password	=	hashString(req.body.password);
	if(username && password){
		mongoClient.connect(url,{useUnifiedTopology: true},function(err,client){
			if(err){
				console.log(err)
			}else{
				var collection	=	client.db('MobaHub').collection('Modeller Cloud');
				collection.find({username:username}).toArray(function(err,result){
					if(err){
						console.log(err)
					}else{
						if(result.length>0){
							if(result[0].password==password){
									res.redirect(result[0].url);
							}else{
								res.render('message',{
									pageInfo: fetchPageInfo('message',''),
									message: "Wrong Credentials. Try <a href=\"/modeller-login\">logging in</a> again."
								});
								client.close();
							}
						}else{
							res.render('message',{
								pageInfo: fetchPageInfo('message',''),
								message: "Wrong Credentials. Try <a href=\"/modeller-login\">logging in</a> again."
							});
							client.close();
						}
					}
				});
			}
		});
	}else{
		res.render('message',{
			pageInfo: fetchPageInfo('message',''),
			message: "Wrong Credentials. Try <a href=\"/modeller-login\">logging in</a> again."
		});
	}
});

server.get('/modeller-login2',function(req,res){
	res.render('modeller-login2',{
		pageInfo: fetchPageInfo('message','')
	});
});

server.post('/modeller-login2',function(req,res){
	var username	=	req.body.username;
	var password	=	hashString(req.body.password);
	if(username && password){
		mongoClient.connect(url,{useUnifiedTopology: true},function(err,client){
			if(err){
				console.log(err)
			}else{
				var collection	=	client.db('MobaHub').collection('Modeller Cloud');
				collection.find({username:username}).toArray(function(err,result){
					if(err){
						console.log(err)
					}else{
						if(result.length>0){
							if(result[0].password==password){
									res.redirect(result[0].url);
							}else{
								res.render('message',{
									pageInfo: fetchPageInfo('message',''),
									message: "Wrong Credentials. Try <a href=\"/modeller-login\">logging in</a> again."
								});
								client.close();
							}
						}else{
							res.render('message',{
								pageInfo: fetchPageInfo('message',''),
								message: "Wrong Credentials. Try <a href=\"/modeller-login\">logging in</a> again."
							});
							client.close();
						}
					}
				});
			}
		});
	}else{
		res.render('message',{
			pageInfo: fetchPageInfo('message',''),
			message: "Wrong Credentials. Try <a href=\"/modeller-login\">logging in</a> again."
		});
	}
});

server.get('/lms/operatorc',function(req,res){
	res.render('message',{
		pageInfo: fetchPageInfo('message',''),
		message: "Waiting user information..."
	});
});

server.get('/lms/operatorc/:email/:name',function(req,res){
	var email 	=	decodeURIComponent(req.params.email);
	var name 		=	decodeURIComponent(req.params.name);
	mongoClient.connect(url,{useUnifiedTopology: true},function(err,client){
			if(err){
				console.log(err)
			}else{
				var collection	=	client.db('LMS').collection('OperatorC');
				collection.find({email:email}).toArray(function(err,result){
					if(err){
						console.log(err)
					}else{
						res.redirect("https://operatorc6demo.modeller.cloud:3000/vnc.html?password=7b0ce21a0d8d3c7adec51d48abe2a3e9");
						/*if(result.length>0){
							//user exists
							client.close();
						}else{
							var mailOptions = {
								from: '"Mobatec Cloud" <admin@mobatec.cloud>',
								to: "milos.ivankovic@mobatec.nl",
								subject: 'OperatorC New User',
								html: "Whitelist required for: <br>"+name+"<br>&nbsp<br>"+email+"<br>Encoded name: "+req.params.name
							};

							transporter.sendMail(mailOptions, (error, info) => {
								if (error) {
									return console.log(error);
								}
								res.render('message',{
									pageInfo: fetchPageInfo('message',''),
									message: "Sorry "+name+",<br>No user defined with student ID: "+ email + "<br>. An e-mail has been sent to whitelist you, once you receive an e-mail from Mobatec you can try the exercise again."
								});
								client.close();
							});
							
							
						}*/
					}
				});
			}
		});
});


/*var emailsToAdd		=	["ksenija.kozlovacki@mobatec.nl"];
var level					=	10;
function courseMailSend(item, index) {
	 var mailOptions = {
			from: '"Mobatec Cloud" <admin@mobatec.cloud>',
			to: item.email.toLowerCase(),
			subject: 'Welcome to Mobatec Modeller Online Courses',
			html: "Hello,<br>You have been granted access to Mobatec Modeller Online Course material.<br>"
			+" Please click <a href='https://mobatec.azurewebsites.net/courses-register/"+item.unique+"''>here</a>"
			+" to set a password for the online platform.<br>&nbsp;<br>The course material can be found <a href='https://mobatec.azurewebsites.net/courses'><b>here</b></a>.<br>&nbsp;<br>"
			+"Kind regards,<br>The Mobatec Team"
		};

		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				return console.log(error);
			}else{
				console.log("Successfully added "+item.email);
			}
		});
}
mongoClient.connect(url,{useUnifiedTopology: true},function(err,client){
	if(err){
		console.log(err)
	}else{
		var collection	=	client.db('MobaHub').collection('Courses');
		collection.find({}).toArray(function(err,result){
			if(err){
				console.log(err)
			}else{
				for(var i=0;i<result.length;i++){
					var foundEmail	=	result[i].email;
					if(emailsToAdd.indexOf(foundEmail)>=0){
						emailsToAdd.splice(emailsToAdd.indexOf(foundEmail), 1);
						console.log("E-mail: " +foundEmail+ " already exists.");
					}
				}

				var users 	=	[];
				for(var i=0;i<emailsToAdd.length;i++){
					var	user	=	{};
					user.email	=	emailsToAdd[i].toLowerCase();
					user.unique = generateId(101);
					user.level	=	level;
					users.push(user)
				}
				collection.insertMany(users,function(err,archived){
					if(err){
						console.log(err);
					}else{
						users.forEach(courseMailSend);
						client.close();
					}
				});
			}
		});
	}
});*/


server.get('/courses-login',function(req,res){
	res.render('courses-login',{
		pageInfo: fetchPageInfo('courses','')
	});
});

server.post('/courses-login',function(req,res){
	var email			=	req.body.email.toLowerCase();
	var password	=	hashString(req.body.password);
	var type			=	req.body.type;//0-login, 1-forgot password
	mongoClient.connect(url,{useUnifiedTopology: true},function(err,client){
		if(err){
			console.log(err)
		}else{
			var collection	=	client.db('MobaHub').collection('Courses');
			collection.find({email:email}).toArray(function(err,result){
				if(err){
					console.log(err)
				}else{
					if(result.length>0){
						if(type==0){
							//Login
							if(password==result[0].password){
								var sessionObject	=	JSON.parse(JSON.stringify(result[0]));
								delete sessionObject.password;
								delete sessionObject.unique;
								req.session.user	=	sessionObject;
								res.redirect('/courses');
							}else{
								res.render('message',{
									pageInfo: fetchPageInfo('message',''),
									message: "The password you have provided is incorrect. Try logging in again by clicking <a href=\"https://mobatec.azurewebsites.net/courses-login\">here</a><br>&nbsp<br>Kind regards,<br>The Mobatec Team"
								});
							}
							client.close();
						}else{
							//Forgot password
							var mailOptions = {
								from: '"Mobatec Cloud" <admin@mobatec.cloud>',
								to: email.toLowerCase(),
								subject: 'Mobatec Modeller Online Course Password Reset',
								html: "Hello,<br>To reset your password for Mobatec Modeller Online Course material please click"
								+" <a href='https://mobatec.azurewebsites.net/courses-register/"+result[0].unique+"''>here</a>. <br>"
								+"Kind regards,<br>The Mobatec Team"
							};

							transporter.sendMail(mailOptions, (error, info) => {
								if (error) {
									return console.log(error);
								}
							});
							res.render('message',{
								pageInfo: fetchPageInfo('message',''),
								message: "We have sent you an e-mail with a password reset link.<br>&nbsp<br>Kind regards,<br>The Mobatec Team"
							});
							client.close();
						}
						
					}else{
						res.render('message',{
							pageInfo: fetchPageInfo('message',''),
							message: "This e-mail is not registered to view Mobatec Modeller online course material.<br>&nbsp<br>Kind regards,<br>The Mobatec Team"
						});
						client.close();
					}
				}
			});
		}
	});
});

server.get('/courses-register/:id',function(req,res){
	res.render('courses-register',{
		pageInfo: fetchPageInfo('courses-register',''),
		id: 			req.params.id
	});
});

server.post('/courses-register',function(req,res){
	var id				=	req.body.id;
	var password	=	hashString(req.body.password);
	mongoClient.connect(url,{useUnifiedTopology: true},function(err,client){
		if(err){
			console.log(err)
		}else{
			var collection	=	client.db('MobaHub').collection('Courses');
			collection.find({unique:id}).toArray(function(err,result){
				if(err){
					console.log(err)
				}else{
					if(result.length>0){
						var setObj	=	{ $set: {password:password}};
						collection.updateOne({unique:id},setObj, (err , collection) => {
							if(err){
								console.log(err)
							}else{
								res.redirect('/courses-login?message=1');
							}
							client.close();
						});
					}else{
						res.render('message',{
							pageInfo: fetchPageInfo('message',''),
							message: "Something went wrong with setting your password. Please try again.<br>&nbsp<br>Kind regards,<br>The Mobatec Team"
						});
						client.close();
					}
				}
			});
		}
	});
});

server.get('/courses',function(req,res){
	if(req.session.user){
		res.render('courses',{
			pageInfo: fetchPageInfo('courses','')
		});
	}else{
		res.redirect('/courses-login');
	}
});

server.get('/courses2',function(req,res){ 
	if(req.session.user){
		res.render('courses2',{
			pageInfo: fetchPageInfo('courses2','')
		});
	}else{
		res.redirect('/courses-login');
	}
});



/*server.get('*',function(req,res){
	res.redirect("https://mobatec.nl/");
});*/