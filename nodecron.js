/*
	nodecron.js
	A Node.js-based editor for 'crontab'.
	robcranfill@gmail.com
*/
var Crontab			= require("crontab");
var Async 			= require("async");
var Exec				= require("child_process");
var Fs				  = require("fs");
var Http				= require("http");
var Path				= require("path");
var Querystring	= require("querystring");
var Transform		= require("stream").Transform;
var Url					= require("url");

var  SERVER_PATH_NAME = "/nodecron";

// Content types map, indicated the only file types we'll serve.
// (why limit it?)
//
var contentTypes_ = {
	".css":	"text/css",
	".js":	"text/javascript"
//	".html": "text/html",
//	".json": "application/json",
	};


var requestCount_ = 0;

// The crontab and its job entries that we load on startup. XXX globals?!
var crontab_;


/*
	Decide what to do with a given HTTP GET request.
*/
function router(req, resp) {

  console.log("-----------------------------------");
	requestCount_++;

	var url = req.url;
  var parsedURL = Url.parse(url);
  console.log("Request #%d for path %s received.", requestCount_, parsedURL.pathname);
	console.log("pathname: %s", parsedURL.pathname);
	console.log("    path: %s", parsedURL.path);
	console.log("    href: %s", parsedURL.href);
	console.log("  search: %s", parsedURL.search);

	console.log("   query: %s", parsedURL.query);

	if (parsedURL.path === SERVER_PATH_NAME) {
		console.log("* it's a top-level req");
		doMainPageWaterfall(resp, "");	// FIXME: just the current user, for now.
		return;
		}

	// A request like 
	//  http://localhost:port/nodecron?action={action}?[params...] 
	// ?
	//
	if (parsedURL.query) {
		console.log("* it's a query/GET");
		handleGET(resp, parsedURL.query);
		return;
		}


	console.log("* it's some other req - for a file?");

  // Get the extension; is it of a type we'll serve?
  // (I'm not sure why we bother with this - why not just serve *all* files requested?)
	// (We'd have to know the proper content type, of course.)
	//
  var extension = Path.extname(url);
	console.log("Checking extension for '%s': '%s'", parsedURL.path, extension);

  // Read the extension against the content type map.
  //
	if (extension.length > 0) {
	  if (!contentTypes_[extension]) {
			console.log("!Unknown content type '%s'!", extension);
			handleBadRequest(resp);
			return;
			}
	  var contentType = contentTypes_[extension];
	  console.log("contentType OK: " + contentType);

	  // Serve the requested file.
		//
		var filename = Path.basename(parsedURL.path);
	 	console.log("Serving file: " + filename);
		var fileStream = Fs.createReadStream(filename);
		fileStream.on("error", function(error) {
			if (error.code === "ENOENT") {
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

		console.log("File served");

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
function handleGET(httpResp, queryString) {

	var parsedQuery = Querystring.parse(queryString);
	console.log("parsedQuery: %f" + parsedQuery);

	var action = parsedQuery["action"];
	if (!action) {
		console.log("!No 'action' param!");
		return;
		}
	console.log("parsedQuery: action: " + action);

	// Action = commmit?
	//
	if (action === "commit") {
		console.log("Commit!");
		handleGoodRequest(httpResp);
		return;
		}

	// Action = revert?
	//
	else
	if (action === "revert") {
		console.log("Revert!");
		handleGoodRequest(httpResp);
		return;
		}
	
	// Action = delete?
	//
	else
	if (action === "delete") {
		var index = parsedQuery["index"];
		if (!index) {
			console.log("!Missing 'index' param!");
			handleBadRequest(httpResp);
			return;
		}
		console.log("delete #" + index);
		console.log(" - which is: " + crontab_.jobs()[index]);
		if (!crontab_.jobs()[index]) {
//			httpResp.end("Index out of bounds?")
			handleBadRequest(httpResp);
			return;
			}

		crontab_.remove(crontab_.jobs()[index]);
		console.log("jobs are now " + crontab_.jobs().length + ": " + crontab_.jobs());

// A little test for what if something goes wrong: puke on #3
		var puke_on = -1; // -1 or 3;
		if (index == puke_on)
			{
			httpResp.end("Actually OK - test case 3"); // fail
			}
		else
			{
			doMainPageWaterfall(httpResp, "");	// FIXME: just the current user, for now.
			}
		return;
		}
	
	// Action = add?
	//
	else
	if (action === "add") {

		var q_min = parsedQuery["min"];
		var q_hr  = parsedQuery["hr"];
		var q_dom = parsedQuery["dom"];
		var q_mon = parsedQuery["mon"];
		var q_dow = parsedQuery["dow"];
		var q_cmd = parsedQuery["command"];
		
		if (!q_min || !q_hr || !q_dom || !q_mon || !q_dow || !q_cmd) {
			console.log("!Missing some 'add' param (you figure it out)!");
			console.log(" - query was '" + queryString + "'");
			handleBadRequest(httpResp);
			return;
		}
		
		console.log("Add: %s %s %s %s %s %s", q_min, q_hr, q_dom, q_mon, q_dow, q_cmd);

		var newjob = crontab_.create(q_cmd);
		newjob.minute().at(q_min);
		newjob.hour().at(q_hr);
		newjob.dom().on(q_dom);
		newjob.month().on(q_mon);
		newjob.dow().on(q_dow);

		console.log("newjob is %j", newjob);

//		crontab_.add(newjob);

		console.log("jobs are now %d: %j", crontab_.jobs().length, crontab_.jobs());

		console.log("End of add")
		doMainPageWaterfall(httpResp, "");	// FIXME: just the current user, for now.
		return;
		}


	handleBadRequest(httpResp); // really?
	}


/*
	Sequence of callbacks to handle a request on the main URL: show the HTML page.
*/
function doMainPageWaterfall(httpResponse, user) {

	console.log("* doMainPageWaterfall");
	
	// see http://www.hacksparrow.com/node-js-async-programming.html
	//  or https://github.com/caolan/async#waterfall
	//
	Async.waterfall(
		[
	
		// 1st step: Load the crontab data
		//
		function(nextFunction) {
			console.log("loadCrontab called for user '%s'", user);
			
			if (crontab_)
			  {
			  console.log("We already have one!");
			  nextFunction(null, httpResponse, crontab_);
			  }
			else
				{
				console.log("Setting up loadCrontab.load...");
				Crontab.load(user, function(err, crontab) {

				  console.log("loadCrontab.load called");
				  if (err) {
				  	console.log("Error in loadCrontab.load: " +_err);
						nextFunction(err, null, null);	// ??? RIGHT?
				  	}
				  if (!crontab)
				  	{
				  	console.log("Can't get jobs for " + user);
						nextFunction("Can't get jobs?", null, null);	// ??? RIGHT?
						return;
						}
					crontab_ = crontab;
					console.log("Loaded crontab.jobs: " + crontab_.jobs());

					nextFunction(null, httpResponse, crontab_);
					}); // end .load handler

				} // end else
			} // end 1st step function
 		,

		// 2nd step: Form the HTML
		//
		function(httpResponse, crontab, nextFunction) {
		
			// Start outputting the response - first the static HTML, then our crontab stuff.
			//
			httpResponse.writeHead(200, {"Content-Type": "text/html; charset=utf-8"});

			console.log("Forming HTML for crontab with %d jobs", crontab.jobs().length);
//			console.log("makePage httpResponse: %j", httpResponse);

			var fileStream = Fs.createReadStream("./nodecron.top.html");
			fileStream.on("error", function(error) {
				if (error.code === "ENOENT") {
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
			// We want to append all this *after* the header is done.
			//
			fileStream.on("end", function() {

				console.log("Static HTML file loaded; appending variable HTML for %d jobs...", crontab.jobs().length);

				// A row for each existing entry.
				//
				for (var i=0; i<crontab.jobs().length; i++) {
	
					// httpResponse.write("   <tr><td>" + jobs[i].toString() + "</td></tr>");
					var job = crontab.jobs()[i];
					httpResponse.write(" <tr>\n");
					httpResponse.write("  <td><button type='button' onClick='deleteEntry(\"" + i + "\");return false'>-</button></td>\n");
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
				httpResponse.write(" <td><input type='text' class='inputMinute'     id='inputMinute'></td>\n");
				httpResponse.write(" <td><input type='text' class='inputHour'       id='inputHour'></td>\n");
				httpResponse.write(" <td><input type='text' class='inputDayOfMonth' id='inputDayOfMonth'></td>\n");
				httpResponse.write(" <td><input type='text' class='inputMonth'      id='inputMonth'></td>\n");
				httpResponse.write(" <td><input type='text' class='inputDayOfWeek'  id='inputDayOfWeek'></td>\n");
				httpResponse.write(" <td><input type='text' class='inputCommand'    id='inputCommand'></td>\n");
				httpResponse.write(" </tr>\n");
	
				httpResponse.write("</table>\n");

				httpResponse.write("<button type='button' onClick='commit()'>Commit</button>\n");
				httpResponse.write("<button type='button' onClick='revert()'>Revert</button>\n");

				
				httpResponse.write("</body>\n");
				httpResponse.write("</html>\n");
				httpResponse.end();

	//			nextFunction(null, "makePage done - OK!");	// end, for now
	
				console.log("Done appending variable HTML.");

				});

			// Start the piping of the static header; when it's done, the above function will fire.
			//
			console.log("Loading static HTML file....");

//			fileStream.pipe(httpResponse, {end: false});
			fileStream.pipe(httpResponse);

			}
		],

		// The final callback function: an error handler.
		//
		function(err, status) {
			if (err) {
	  		console.log("Waterfall error: " + status);
	  		}
			}

	);
	
	console.log("* end doMainPageWaterfall (but still cooking)");
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


function handleGoodRequest(resp) {
  msg = "OK";
	resp.writeHead(200, 
			{
		  'Content-Length': msg.length,
		  'Content-Type': 'text/plain'
	  	}
	  );
	resp.end(msg);
	}

function handleBadRequest(resp) {
	resp.statusCode = 404;
	resp.end("Bad request! 404\n");
	}

start(router);



