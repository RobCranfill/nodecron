/*
	nodecron support scripts, called by the HTML (not exectued by Node.js)
	
	Code conventions more or less as per http://javascript.crockford.com/code.html
	"Avoid conventions that demonstrate a lack of competence" ! ;-)
*/


/*
	Javascript handler for one of the "-" buttons.
	Will do an AJAX 'GET' to push the data across. Which is kinda wrong - not idempotent? It works...
*/
function deleteEntry(entryIndex){
	console.log("deleteEntry #" + entryIndex);
	$.ajax({
			url: "nodecron",
			data: {action: "delete", index: entryIndex},
			type: "get",
			success: function(data, status, jqXHR){

			//	console.log("'Add' data: %j\n", data);
			//	console.log("'Add' status: %j\n", status);
			//	console.log("'Add' jqXHR: %j\n",  jqXHR);
			//	console.log("'Add' jqXHR.status: %d\n",  jqXHR["status"]);
				
				if (jqXHR["status"] != "200"){
					window.alert("Something bad happened in 'delete'!");
					}
				location.reload(true);	// needed, to refresh the page
				// return value used?
				}
			}
			);
		// return value used?
		}


/*
	Javascript handler for "+" button.
	Will do an AJAX 'GET' to push the data across. Which is kinda wrong - not idempotent? It works...
*/
function addEntry(minute, hour, dom, month, dow, command){

	var min = document.getElementById("inputMinute").value;
	var hr  = document.getElementById("inputHour").value;
	var dom = document.getElementById("inputDayOfMonth").value;
	var mon = document.getElementById("inputMonth").value;
	var dow = document.getElementById("inputDayOfWeek").value;
	var cmd = document.getElementById("inputCommand").value;

	console.log("Add: %s %s %s %s %s %s", min, hr, dom, mon, dow, cmd);

	$.ajax({
			url: "nodecron",
			data: {action: "add",
						 min: min, hr: hr, dom: dom, mon: mon, dow: dow, command: cmd},
			type: "get",
			success: function(data, status, jqXHR){
				if (jqXHR["status"] != "200"){
					window.alert("Something bad happened in 'add'!");
					}
				location.reload(true);	// needed, to refresh the page
				}
			}
			);
		}


/*
	Javascript handler for "Commit" button.
*/
function commit() {
	console.log("COMMIT!");
	$.ajax({
			url: "nodecron",
			data: {action: "commit"},
			type: "get",
			success: function(data, status, jqXHR){
				if (jqXHR["status"] != "200") {
					window.alert("Something bad happened in 'commit'!");
					}
				location.reload(true);	// needed, to refresh the page
				}
			}
			);
		}


/*
	Javascript handler for "Revert" button.
*/
function revert() {
	console.log("REVERT!");
	$.ajax({
			url: "nodecron",
			data: {action: "revert"},
			type: "get",
			success: function(data, status, jqXHR){
				if (jqXHR["status"] != "200") {
					window.alert("Something bad happened in 'revert'!");
					}
				location.reload(true);	// needed, to refresh the page
				}
			}
			);
		}

	
	

