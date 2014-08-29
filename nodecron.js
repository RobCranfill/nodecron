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

var  SERVER_PATH_NAME = "/nodecron";

// Content types map - the only things we'll serve
//
var contentTypes_ = {
	'.css' : 'text/css'
//	'.htm' : 'text/html',
//	'.html': 'text/html',
//	'.js'  : 'text/javascript',
//	'.json': 'application/json',
	};


var 	requestCount_ = 0;


function formPage(jobList) {
	console.log("jobList: " + jobList);
	}


/*
	Decide what to do with a given HTTP request (a GET).
*/
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
//	if (parsedURL.pathname !== SERVER_PATH_NAME) {
//		console.log(" not for us! (" + parsedURL.pathname + ")");
//		handleBadRequest(resp);
//	  return;
//		}

	if (parsedURL.path === SERVER_PATH_NAME) {
		console.log(" it's a top-level req!");
		doMainPageWaterfall(resp, "");	// FIXME: just the current user, for now.
		return;
		}

	console.log(" it's some other req!");
	
	
  // Get the extension; is it a special file we'll handle?
  //
  var extension = Path.extname(url);
	console.log("Checking extension for '" + parsedURL.path + "': '" + extension + "'");

  // Read the extension against the content type map.
  //
	if (extension.length > 0) {
	  if (!contentTypes_[extension]) {
			console.log("!Unknown content type! (" + extension + ")");
			handleBadRequest(resp);
			return;
			}
	  var contentType = contentTypes_[extension];
	  console.log("contentType OK: " + contentType);

	  // Serve the file
		//
		var filename = Path.basename(parsedURL.path);
	 	console.log("Serving file: " + filename);
		var fileStream = Fs.createReadStream(filename);
		fileStream.on('error', function(error) {
			if (error.code === 'ENOENT') {
				resp.statusCode = 404;
				resp.end(Http.STATUS_CODES[404]);
			  console.log("!Error 404!");
				} 
			else {
				resp.statusCode = 500;
				resp.end(Http.STATUS_CODES[500]);
			  console.log("!Error 500!");
				}
			});

		resp.writeHead(200, {"Content-Type": contentType});
		fileStream.pipe(resp);

		console.log("File served!");

		return;
		}

	handleBadRequest(resp);
	} // router


/*
	Sequence of callbacks to handle a request on the main URL: show the HTML page.
*/
function doMainPageWaterfall(httpResponse, user) {

	console.log(" doMainPageWaterfall!");
	
	// see http://www.hacksparrow.com/node-js-async-programming.html
	//  or https://github.com/caolan/async#waterfall
	//
	Async.waterfall(
		[
	
		// 1st step: Load the crontab data
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
			httpResponse.write("<head>\n");
			httpResponse.write("  <title>nodecron 0.1</title>\n");
			httpResponse.write("  <link rel='stylesheet' type='text/css' href='" + SERVER_PATH_NAME + "/nodecron.css'/>\n");
			

			httpResponse.write("\
<script>\
 function deleteEntry(entryIndex)\
  {\
  console.log('deleteEntry=' + entryIndex);\
  }\
 function addEntry()\
  {\
  console.log('addEntry');\
  }\
</script>\n");

		
			httpResponse.write("</head>\n");

			httpResponse.write("<body>\n");

			httpResponse.write("<table border='1'>\n");

			// The table header.
			//
			httpResponse.write(" <tr>\n");
			httpResponse.write("  <th>-</th>\n");
			httpResponse.write("  <th>Min</th>\n");
			httpResponse.write("  <th>Hr</th>\n");
			httpResponse.write("  <th>DoM</th>\n");
			httpResponse.write("  <th>Mon</th>\n");
			httpResponse.write("  <th>DoW</th>\n");
			httpResponse.write("  <th>Command</th>\n");
			httpResponse.write(" </tr>\n");
		
			// A row for each existing entry.
			//
			for (var i=0; i<jobs.length; i++) {

				// httpResponse.write("   <tr><td>" + jobs[i].toString() + "</td></tr>");
				var job = jobs[i];
				httpResponse.write(" <tr>\n");
				httpResponse.write("  <td><button type='button' onClick='deleteEntry(\"" + i + "\")'>-</button></td>\n");
				httpResponse.write("  <td class='tableMinute'>" + job.minute() + "</td>\n");
				httpResponse.write("  <td class='tableHour'>" + job.hour() + "</td>\n");
				httpResponse.write("  <td class='tableDayOfMonth'>" + job.dom() + "</td>\n");
				httpResponse.write("  <td class='tableMonth'>" + job.month() + "</td>\n");
				httpResponse.write("  <td class='tableDayOfWeek'>" + job.dow() + "</td>\n");
				httpResponse.write("  <td class='tableCommand'>" + job.command() + "</td>\n");
				httpResponse.write(" </tr>\n");
		
				}
				
			// The 'Add' row.
			//
			httpResponse.write(" <tr>\n");
			httpResponse.write(" <td><button type='button' onClick='addEntry()'>+</button></td>\n");
			httpResponse.write(" <td><input class='inputMinute'			type='text' name='inputMinute'></td>\n");
			httpResponse.write(" <td><input class='inputHour'				type='text' name='inputHour'></td>\n");
			httpResponse.write(" <td><input class='inputDayOfMonth'	type='text' name='inputDayOfMonth'></td>\n");
			httpResponse.write(" <td><input class='inputMonth'			type='text' name='inputMonth'></td>\n");
			httpResponse.write(" <td><input class='inputDayOfWeek'	type='text' name='inputDayOfWeek'></td>\n");
			httpResponse.write(" <td><input class='inputCommand'		type='text' name='inputCommand'></td>\n");
			httpResponse.write(" </tr>\n");

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



