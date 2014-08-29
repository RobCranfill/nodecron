/*
	g!
*/
Crontab = require("crontab");
var Async 			= require("async");
var Exec				= require("child_process");
var Fs				  = require("fs");
var Http				= require("http");
var Path				= require("path");
var Querystring	= require("querystring");
var Transform		= require("stream").Transform;
var Url					= require("url");

var  SERVER_PATH_NAME = "/cron";

var 	requestCount_ = 0;


/*
	'u' param doesn't work: must be current user or "".
*/
function loadCrontab(u) {
	Crontab.load(u, function(err, crontab) {
		if (crontab) {
		
//			console.log("Jobs for " + u);
//			var j = crontab.jobs();
//			for (var i=0; i<j.length; i++) {
//				console.log(j[i].toString());
//				}

			formPage(crontab.jobs());
			}
		else {
			console.log("Can't get jobs for " + u);
			return;
			}
	
	  });
	}


function formPage(jobList) {
	console.log("jobList: " + jobList);
	}


function router(req, resp) {

  console.log("-----------------------------------");
	requestCount_++;

	var url = req.url;
  var parsedURL = Url.parse(url);
  console.log("Request #" + requestCount_ + " for path " + parsedURL.pathname + " received.");

  console.log("Routing a request for " + parsedURL.pathname);

	console.log("  search: " + parsedURL.search);
//	console.log("   query: " + JSON.stringify(parsedURL.query));
	console.log("   query: " + parsedURL.query);
	console.log("pathname: " + parsedURL.pathname);
	console.log("    path: " + parsedURL.path);
	console.log("    href: " + parsedURL.href);
	
	// 'path' is the whole deal
	//
	if (parsedURL.pathname !== SERVER_PATH_NAME) {
		console.log(" not for us! (" + parsedURL.pathname + ")");
		handleBadRequest(resp);
	  return;
		}

	if (parsedURL.path === SERVER_PATH_NAME) {
		console.log(" it's a top-level req!");
		doMainPageWaterfall(resp, "");	// FIXME: just the current user, for now.
		return;
		}

	console.log(" it's some other req!");
	handleBadRequest(resp); // not really

	} // router



function doMainPageWaterfall(httpResponse, user) {

	console.log(" doMainPageWaterfall!");
	
	// see http://www.hacksparrow.com/node-js-async-programming.html
	//  or https://github.com/caolan/async#waterfall
	//
	Async.waterfall(
		[
	
		// 1st step: load the crontab data
		//
		function(nextFunction) {
			console.log("loadCrontab called; user: " + user);
			Crontab.load(user, function(err, crontab) {
			  console.log("loadCrontab.load called");
				if (crontab) {
					console.log("Jobs out: " + crontab.jobs());
					nextFunction(null, httpResponse, crontab.jobs());
					}
				else {
					console.log("Can't get jobs for " + user);
					return;
					}
		  	});
			},

		// 2nd step: form the HTML
		//
		function(httpResponse, jobs, nextFunction) {
			console.log("makePage called");
			
			httpResponse.writeHead(200, {"Content-Type": "text/html"});
		
			httpResponse.write("<!DOCTYPE html>\n");
			httpResponse.write("<html>\n");
			httpResponse.write("  <header>\n");
			httpResponse.write("    <title>Jobs</title>\n");
			httpResponse.write("  </header>\n");
			httpResponse.write("<body>\n");

			httpResponse.write("<h3>Jobs</h3>\n");
			httpResponse.write(" <tt><table>\n");
			for (var i=0; i<jobs.length; i++) {
				httpResponse.write("  <tr><td>" + jobs[i].toString() + "</td></tr>");
				}
			httpResponse.write(" </table></tt>\n");

			httpResponse.write("</body>\n");
			httpResponse.write("</html>\n");
			httpResponse.end();
	
//			nextFunction(null, "makePage done - OK!");	// end, for now
			}

/*
	    // i. check if headers.txt exists
	    function(callback) {
	        fs.stat(path, function(err, stats) {
	            if (stats == undefined) { 
		            callback(null); 
		            }
	            else { 
	            	console.log('headers already collected'); 
	            	}
		        });
		    },
	 
	    // ii. fetch the HTTP headers
	    function(callback) {
	        var options = {
	            host: 'www.wikipedia.org',
	            port: 80
	        	};        
	        http.get(options, function(res) {
	            var headers = JSON.stringify(res.headers);
	            callback(null, headers);
		        });
		    },
		    
	    // iii. write the headers to headers.txt
	    function(headers, callback) {
	        fs.writeFile(path, headers, function(err) {
	            console.log('Great Success!');
	            callback(null, ':D');
		        });
		    }
*/
		    
			],
	
	// the bonus final callback function
	function(err, status) {
	  console.log("Waterfall error: " + status);
		}

	);
	
	console.log("end doMainPageWaterfall!");
	} // doMainPageWaterfall


/*
*/
function showStartPage(resp) {

	loadCrontab(resp);
	
	resp.writeHead(200, {"Content-Type": "text/html"});
	
	resp.write("<!DOCTYPE html>\n");
	resp.write("<html>\n<header>\n");
	
	var header = "";
	resp.write(header);
	
	resp.write("</header>\n<body>\n");
	
	var body = "<p>What the f?</p>\n";
	resp.write(body);
	
	resp.write("</body>\n</html>\n");

	resp.end();
	console.log("showStartPage OK");
	}


function start(router) {

  function onRequest(request, response) {
  	if (request.method !== "GET") {
			console.log("!Not a GET!");
			handleBadRequest(response);
			return;
			}
    router(request, response);
    console.log("Request routed");
	  }

  Http.createServer(onRequest).listen(9999);
  console.log("Server has started.");
	}


function handleBadRequest(resp) {
	resp.statusCode = 404;
	resp.end("Bad request! 404\n");
	}

start(router);

// loadCrontab("");


