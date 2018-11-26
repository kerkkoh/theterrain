The Terrain
=========================

A site made for an Arma 3 modding community. Simply put it's a dumbed down social network. Right now the functionality isn't finished so it's more of a demo than anything else.

You can see the working demo over at [glitch](https://theterrain.glitch.me/), where it's hosted in its full capacity.

Frontend done in:
- JQuery
- Bootstrap 4.0
- CSS, HTML, JS etc.

Backend somewhat done in Node.js using:
- Express (backbone of the entire server: sessions, routing etc.)
- NeDB (Essentially local MongoDB)
- bcrypt (for hashing passwords)
- Handlebars (templating)
- zxcvbn (Checking password strength)

**Note:** The current implementation of sessions, login & registering isn't 100% fool proof and should be implemented in passport or oauth. Also there are a few things that could be useful like https://github.com/expressjs/csurf and https://github.com/ctavan/express-validator for securing things even more.

What's implemented:
- Registering with captcha & Password strength checking
- Login with a captcha if the login has failed more than 3 times
- Profile with ability to change description & profile picture (Articles and screenshots are not implemented in the profile section yet)
- Working news articles & tutorials + loading them from the database in the correct order
- Handlebars helpers for setting different tabs active
- Submitting new tutorials when you're registered (this needs its own captcha, though)
