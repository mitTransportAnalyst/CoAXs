# CoAXs
An interactive transit corridor “modifier/builder,” available as a web based tool and intended for use as an interactive, browser-based tool presented in an interactive transit exhibit.  Learn more: http://mittransportanalyst.github.io/

##### Warnings
Note to users: There are scroll bar issues present. Also, recorded issues of `post` fails on retrieving large geoJSONs. For usability, make sure you are running Mozilla FF (latest version). Also, since we have yet to custom remove the scroll bar issue - if you are running a Windows OS, use https://userstyles.org/styles/5449/scrollbar-hidden-hide-scrollbars-totally to deal with the scroll bar situation.

### View staging server online
The latest pushes at the end of day from the master branch are available online at `http://coaxs-staging.herokuapp.com/#/maps`. Due to cross-origin request issues, please be sure that you are going to `http` and NOT `https`. If you type in the address without specifically designating `http`, Heroku will route you automatically to `https`, so please be aware of that.

### How to get this up and running
##### Node, npm, Bower
You need Node installed on your computer. If you do not have it, go to https://nodejs.org/ and click the green button named "Install".

npm is Node's package manager, and comes bundled. Bower is a package manager for client side libraries. Install it if you don't have it by entering `npm install -g bower` in your terminal. More information on Bower can be found at http://bower.io/.

#### Cloning repo
If you don't have the repo cloned already, navigate to a fresh/clean/empty directory in your computer and enter `git clone https://github.com/mitTransportAnalyst/CoAXs.git`. Make sure you are in the `master` branch (you should be by default), by entering `git status` and checking which branch is highlighted.

#### Installing dependencies
Run `bower install` and `npm install` to install dependencies for client and server-side libraries, respectively. You can view the dependencies in `bower.json` for Bower and `package.json` for Node.

#### Starting up node
Once all dependencies have been installed, all that's left to do is enter `foreman start​`. Now open a web browser and navigate to `http://127.0.0.1:3000`. The app should be up and running there. Note: Normally, one would use `npm start` but, since we are deploying on Heroku, we have a host of local variables that are held in the `.env` file. `foreman` is a Heroku tool that accesses that `.env` file and extracts the information from it. `start` is a command that is given/defined to `foreman` in the `Procfile`. Our `Procfile` looks like this: `start: node app.js`.

As you can see, it is super simple. It just defines `start` so that, when it is called, it knows to run `node app.js`. This is just the same as `npm` except, like I said earlier, it just also knows to use the `.env` information as environment variables a la Heroku in production. Our variables currently in the `.env` file are as follows:

`AWS_ACCESS_KEY` = Unique id. 
`AWS_SECRET_KEY` = Unique id.
`S3_BUCKET` = Name of S3 bucket (currently all this is set up under Kuan's personal account, contact him for details if missing).