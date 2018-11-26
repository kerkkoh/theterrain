const express = require('express'),
      app = express(),
      Datastore = require('nedb'),
      bcrypt = require('bcrypt'),
      sanitizeHtml = require('sanitize-html'),
      users = new Datastore({ filename: '.data/users.db', autoload: true }),
      news = new Datastore({ filename: '.data/news.db', autoload: true }),
      tutorials = new Datastore({ filename: '.data/tutorials.db', autoload: true }),
      resources = new Datastore({ filename: '.data/resources.db', autoload: true }),
      screenshots = new Datastore({ filename: '.data/screenshots.db', autoload: true }),
      exphbs  = require('express-handlebars'),
      session = require('express-session'),
      fs = require('fs'),
      NedbStore = require('nedb-session-store')(session),
      aes256 = require('aes256');

app.use(express.static('public'));

app.engine('handlebars', exphbs({
  defaultLayout: 'main',
  helpers: {
    active: function (a,b) {
      if (a === b) {
        return "active";
      } else {
        return "";
      }
    },
    activetwo: function (a,b,c) {
      if (a === c || b === c) {
        return "active";
      } else {
        return "";
      }
    }
  }
}));

app.set('view engine', 'handlebars');

//store sessions into the database encrypted with aes256
app.use(session({secret: process.env.SECRET,saveUninitialized: false,resave: true,cookie: { maxAge: 86400000 },store: new NedbStore({
  filename: '.data/persistence.db',
  afterSerialization: (s) => {
    return aes256.encrypt(process.env.PASSSECRET, s);
  },
  beforeDeserialization: (s) => {
    return aes256.decrypt(process.env.PASSSECRET, s);
  }
})}));

//Most functions here need to be taken to their own file

const l = (a) => {console.log(a)}

let sess;
const getSessInfo = (req) => {
  // get info from the request's session to pass on back to the UI to make sure the user sees certain things such as 'log in' button if they aren't logged in
  sess=req.session;
  let data = {loggedin:false};
  if (sess._id) {
    data.username = sess.username;
    data.id = sess._id;
    data.loggedin = true;
  }
  return data;
}

// This is used for getting a news article & tutorial "article" and their respective data
const articleGetter = (db, req, res, template) => {
  const data = getSessInfo(req);
  // find all articles that match the current one
  db.find({ _id: req.params.id }, (err, founddocs) => {
    // if we only find one that matches then all good, otherwise, we didn't find anything or it's an error
    if (founddocs.length === 1) {
      let currentdoc = founddocs[0];
      // find all articles (needed for the sidebar containing all articles)
      db.find({}, function (err, articles) {
        // Sort all those articles with respect to date so we get the newest one first
        articles.sort(function(a, b){return new Date(b.date).getTime() - new Date(a.date).getTime()});
        // Let's find the current one from all these articles and make sure that it knows that it's the current one
        const articleindex = articles.findIndex((elem) => {
          return (elem._id === currentdoc._id)
        });
        articles[articleindex].current = true;
        
        const date = new Date(currentdoc.date);
        currentdoc.date = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        
        // Find the author to get his name (since we only store author ID's in the database)
        users.findOne({ _id: currentdoc.author }, (err, authordoc) => {
         res.render(template, {title:`The Terrain | ${currentdoc.title}`, article_data: currentdoc, articles:articles, authorname:authordoc.username, data});
        });
      });
    } else {
      res.sendStatus(404);
    }
  });
}

const profiledb = (req,res,next) => {
  users.find({ _id: req.params.id }, (err, doc) => {
    if (doc.length === 1) {
      users.update({ _id: req.params.id }, { $set: { profileviews: doc[0].profileviews + 1 } }, {}, function (err, numReplaced) {});
      req.doc = doc[0];
      req.doc.error = false;
    } else {
      req.doc = {error: true};
    }
    return next();
  });
}

const rendprofile = (req,res) => {
  if (req.doc.error) {
    res.sendStatus(404);
  } else {
    const data = getSessInfo(req);
    res.render('profile', {title:`The Terrain | Profile of ${req.doc.username}`,profiledata: req.doc, data, ownprofile:(data.id===req.doc._id)});
  }
}

// Basic GET request handling structure, used for rendering index
app.get("/", (req, res) => {
  let data = getSessInfo(req);
  res.render('index', {"title":"The Terrain",data});
});

// Handle registering
app.post("/reg", (req,res) => {
  sess=req.session;
  // Finds out if the given username and email are unique and if so, inputs the data into the database with a hash of the given password
  users.find({ $or: [{ username: req.query.username }, { email: req.query.email }] }, (err, doc) => {
    let data = {success: true};
    if (doc.length > 0) {
      data.success = false;
      return res.send(data);
    }
    bcrypt.hash(req.query.password, 10, function(err, hash) {
      users.insert({"username": req.query.username, "password": hash, "email": req.query.email, "description": req.query.description, "picture": "https://cdn.glitch.com/fba56f03-3ec7-4a91-add5-e967fdd9b35c%2Fdefaultavatar.png?1510243196931", "profileviews": 0, "rank": 1}, (err, newDoc) => {
        data.id = newDoc._id;
        
        sess.username = newDoc.username;
        sess._id = newDoc._id;
        
        res.send(data);
      });
    });
  });
});

//Handle login requests (Compare password hashes from the database and user input)
app.post("/login", (req,res) => {
  sess=req.session;
  let username = req.query.username;
  let password = req.query.password;
  users.findOne({ username: username }, (err, doc) => {
    if (doc) {
      bcrypt.compare(password, doc.password).then(function(boolean) {
        if (boolean) {
          sess.username = doc.username;
          sess._id = doc._id;

          if (sess.failedattempts) {
            delete sess.failedattempts;
          }

          res.send({success:true,id:doc._id,username:doc.username,sess:sess});
        } else {
          if (sess.failedattempts) {
            sess.failedattempts += 1;
          } else {
            sess.failedattempts = 1;
          }
          res.send({success:false,failedattempts:sess.failedattempts});
        }
      });
    } else {
      res.send({success:false,failedattempts:sess.failedattempts});
    }
  });
});

app.get("/profile/:id", profiledb, rendprofile);

app.post("/updateProfile", (req,res) => {
  sess = req.session;
  
  const safe_desc = sanitizeHtml(req.query.description, {});
  const safe_pic = sanitizeHtml(req.query.picture, {});
  
  users.update({ _id: sess._id }, { $set: { description: safe_desc, picture: safe_pic } }, {}, function (err, numReplaced) {
    res.send(`/profile/${sess._id}`);
  });
});

app.get("/login", (req, res) => {
  let data = getSessInfo(req);
  if (data.loggedin) {
    return res.redirect("/");
  }
  res.render('login', {layout: "largeform", title:"The Terrain | Login", data});
});

app.get("/logout", (req, res) => {
  req.session.destroy(function(err) {
    if(err) throw err;
    res.redirect("/");
  });
});

app.get("/register", (req, res) => {
  let data = getSessInfo(req);
  if (data.loggedin) {
    return res.redirect("/");
  }
  res.render('register', {layout: "largeform", title:"The Terrain | Register", register:true, data});
});

/*
  news.insert({"title": "New article!","description": "An another article over here","author": "IgRRrhlNJo2NyT0f","date": new Date(),"content": "<p>This</p><p>is</p><p>an</p><p>another</p><p>article</p>",}, (err, newDoc) => {
    l(newDoc);
  });
  tutorials.insert({"title": "Some tutorial","description": "An another tutorial over here","author": "IgRRrhlNJo2NyT0f","date": new Date(),"content": "<p>This</p><p>is</p><p>an</p><p>another</p><p>tutorial</p>",}, (err, newDoc) => {
    l(newDoc);
  });
*/

app.get("/news", (req, res) => {
  news.find({}, function (err, docs) {
    docs.sort(function(a, b){return new Date(b.date).getTime() - new Date(a.date).getTime()});
    res.redirect(`/news/${docs[0]._id}`);
  });
});

app.get("/news/:id", (req, res) => {
  articleGetter(news, req, res, 'news');
});

app.get("/resources", (req, res) => {
  let data = getSessInfo(req);
  res.render('resources', {"title":"The Terrain | Resources", data});
});

app.get("/screenshots", (req, res) => {
  let data = getSessInfo(req);
  res.render('screenshots', {"title":"The Terrain | Screenshots", data});
});

app.get("/screenshot", (req, res) => {
  let data = getSessInfo(req);
  res.render('screenshot', {"title":"The Terrain | Screenshot", data});
});

app.get("/tutorials", (req, res) => {
  tutorials.find({}, function (err, docs) {
    docs.sort(function(a, b){return new Date(b.date).getTime() - new Date(a.date).getTime()});
    res.redirect(`/tutorials/${docs[0]._id}`);
  });
});

app.get("/tutorials/:id", (req, res) => {
  articleGetter(tutorials, req, res, 'tutorials');
});

//tutorials.remove({}, { multi: true }, function (err, numRemoved) {
//});

// Handle new tutorials
app.post("/tutorials", (req,res) => {
  let data = getSessInfo(req);
  
  if (data.loggedin) {
    const safe_content = sanitizeHtml(req.query.content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img' ]),
      allowedSchemes: [ 'https' ]
    });

    tutorials.insert({"title": req.query.title, "description": req.query.description, "author": data.id, "description": req.query.description, "date": new Date(), "content": `<p>${safe_content}</p>`}, (err, newDoc) => {
      res.send(newDoc._id);
    });
  } else {
    res.send(false);
  }
});

app.get("/tos", (req, res) => {
  let data = getSessInfo(req);
  res.render('tos', {"title":"The Terrain | Terms of service", data});
});

const listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});
