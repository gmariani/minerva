**.minerva** is a Flash Local Shared Object editor built based on the AMF3 specification and the AMF0 specification.

**.minerva** is capable of reading and writing all known data types successfully.

Make a branch:
git branch <BRANCH NAME HERE>
git checkout <BRANCH NAME HERE>

Merge
git checkout master
git merge <BRANCH NAME HERE>
git branch -d <BRANCH NAME HERE>

To run, open a Node command prompt in a project folder
Type in "gulp build" to compile
Type in "npm update" to update modules
Type in "npm update -g" to update global modules
Type in "npm outdated -g" to view outdated global modules
Type in "npm outdated" to view outdated modules
Type in "npm cache clean" to clear out cached modules
Type in "npm -v" to view NPM version

Typ in "npm run-script build" to run build task

== Test locally ==
The easiest is to install http-server globally using node's package manager:

npm install -g http-server

Then simply run http-server in any of your project directories:

Eg. d:\my_project> http-server

Starting up http-server, serving ./
Available on:
http:169.254.116.232:8080
http:192.168.88.1:8080
http:192.168.0.7:8080
http:127.0.0.1:8080
Hit CTRL-C to stop the server
