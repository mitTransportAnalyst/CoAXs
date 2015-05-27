# CoAXs
An interactive transit corridor “modifier/builder,” available as a web based tool and intended for use as an interactive, browser-based tool presented in an interactive transit exhibit.

### How to get this up and running
##### Node, npm, Bower
You need Node installed on your computer. If you do not have it, go to https://nodejs.org/ and click the green button named "Install".

npm is Node's package manager, and comes bundled. Bower is a package manager for client side libraries. Install it if you don't have it by entering `npm install -g bower` in your terminal. More information on Bower can be found at http://bower.io/.

#### Cloning repo
If you don't have the repo cloned already, navigate to a fresh/clean/empty directory in your computer and enter `git clone https://github.com/mitTransportAnalyst/CoAXs.git`. Make sure you are in the `master` branch (you should be by default), by entering `git status` and checking which branch is highlighted.

#### Installing dependencies
Run `bower install` and `npm install` to install dependencies for client and server-side libraries, respectively. You can view the dependencies in `bower.json` for Bower and `package.json` for Node.

#### Starting up node
Once all dependencies have been installed, all that's left to do is enter `npm start`. Now open a web browser and navigate to `http://127.0.0.1:3000`. The app should be up and running there.
