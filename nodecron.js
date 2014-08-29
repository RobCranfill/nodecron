/*
	nodecron.js
	A Node.js-based editor for 'crontab'.
	robcranfill@gmail.com
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


var requestCount_ = 0;

// The crontab job entries that we load on startup.
var jobs_;



/*
	Decide what to do with a given HTTP request (a GET).
*/
function router(req, resp) {

  console.log("-----------------------------------");
	requestCount_++;

	var url = req.url;
  var parsedURL = Url.parse(url);
  console.log("Request #" + requestCount_ + " for path " + parsedURL.pathname + " received.");
	console.log("pathname: " + parsedURL.pathname);
	console.log("    path: " + parsedURL.path);
	console.log("    href: " + parsedURL.href);
		console.log("  search: " + parsedURL.search);
//	console.log("   query: " + JSON.stringify(parsedURL.query));
	console.log("   query: " + parsedURL.query);

	if (parsedURL.path === SERVER_PATH_NAME) {
		console.log("* it's a top-level req!");
		doMainPageWaterfall(resp, "");	// FIXME: just the current user, for now.
		return;
		}

	// A request like 
	//  http://localhost:port/nodecron?action={action}?[params...] 
	// ?
	//
	if (parsedURL.query) {
		console.log("* it's a query!");
		doQuery(resp, parsedURL.query);
		return;
		}
		
	if (parsedURL.path === SERVER_PATH_NAME) {
		console.log("* it's a top-level req!");
		doMainPageWaterfall(resp, "");	// FIXME: just the current user, for now.
		return;
		}

	console.log("* it's some other req!");

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
	Query options (minus the spaces which are just for readability)
			?action=delete & index=n
				Delete entry {n}

			?action=add & min=min & hr=hr & dom=dom & mon=mon & dow=dow & command=command
				Add entry with given values

*/
function doQuery(httpResp, queryString) {
	var parsedQuery = Querystring.parse(queryString);
	console.log("parsedQuery: " + JSON.stringify(parsedQuery));

	var action = parsedQuery["action"];
	if (!action) {
		console.log("!No 'action' param!");
		return;
		}
		
	// Action = delete?
	//
	if (action === "delete") {
		var index = parsedQuery["index"];
		if (!index) {
			console.log("!Missing 'index' param!");
			handleBadRequest(httpResp);
			return;
		}

		console.log("delete #" + index);
		console.log(" - which is: " + jobs_[index]);
		if (!jobs_[index]) {
			httpResp.end("Index out of bounds?")
			return;
			}
		crontab_.remove(jobs_[index]);
		
		jobs_ = crontab_.jobs();
		console.log("jobs are now: " + jobs_);
		
// A little test for what if something goes wrong: puke on #3
//		if (index == 3){httpResp.end("NOK");} // is this all we do?
//		else
//		{
		httpResp.end("OK"); // is this all we do?
//		}
		return;
		}
	else
	
	// Action = add?
	//
	if (action === "add") {

		var q_min = parsedQuery["min"];
		var q_hr  = parsedQuery["hr"];
		var q_dom = parsedQuery["dom"];
		var q_mon = parsedQuery["mon"];
		var q_dow = parsedQuery["dow"];
		var q_command = parsedQuery["command"];
		
		if (!q_min || !q_hr || !q_dom || !q_mon || !q_dow || !q_command) {
			console.log("!Missing some 'add' param (you figure it out)!");
			console.log(" - query was '" + queryString + "'");
			handleBadRequest(httpResp);
			return;
		}
		
		
		console.log("add!");
		}


	handleBadRequest(httpResp); // really?
	}




/*
	Sequence of callbacks to handle a request on the main URL: show the HTML page.
*/
function doMainPageWaterfall(httpResponse, user) {

	console.log("* doMainPageWaterfall!");
	
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
				
					// ICK: globals! probably wrong???
					crontab_ = crontab;
					jobs_ = crontab.jobs();
					console.log("Jobs out: " + crontab.jobs());
					nextFunction(null, httpResponse, crontab.jobs());
					}
				else {
					console.log("Can't get jobs for " + user);
					return;
					}
		  	});
			},

		// 2nd step: Form the HTML
		//
		function(httpResponse, jobs, nextFunction) {
			console.log("makePage called");
			
			var fileStream = Fs.createReadStream("./nodecron.top.html");
			fileStream.on('error', function(error) {
				if (error.code === 'ENOENT') {
					httpResponse.statusCode = 404;
					httpResponse.end(Http.STATUS_CODES[404]);
				  console.log("!Error 404!");
					} 
				else {
					httpResponse.statusCode = 500;
					httpResponse.end(Http.STATUS_CODES[500]);
				  console.log("!Error 500!");
					}
				});
			console.log("File loaded.");

			// Start outputting the response - first the static HTML, then our crontab stuff.
			//
			httpResponse.writeHead(200, {"Content-Type": "text/html"});

			// We want to append all this *after* the header is done.
			//
			fileStream.on('end', function() {

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
				httpResponse.write(" <td><input type='text' class='inputMinute'     name='inputMinute'></td>\n");
				httpResponse.write(" <td><input type='text' class='inputHour'       name='inputHour'></td>\n");
				httpResponse.write(" <td><input type='text' class='inputDayOfMonth' name='inputDayOfMonth'></td>\n");
				httpResponse.write(" <td><input type='text' class='inputMonth'      name='inputMonth'></td>\n");
				httpResponse.write(" <td><input type='text' class='inputDayOfWeek'  name='inputDayOfWeek'></td>\n");
				httpResponse.write(" <td><input type='text' class='inputCommand'    name='inputCommand'></td>\n");
				httpResponse.write(" </tr>\n");
	
				httpResponse.write("</body>\n");
				httpResponse.write("</html>\n");
				httpResponse.end();

	//			nextFunction(null, "makePage done - OK!");	// end, for now
				});

			// Start the piping of the static header; when it's done, the above function will fire.
			//
			fileStream.pipe(httpResponse, {end: false});

			}

			],

	// The final callback function - error handler.
	function(err, status) {
	  console.log("Waterfall error: " + status);
		}

	);
	
	console.log("* end doMainPageWaterfall (but still cooking!)");
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



