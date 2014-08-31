/*
	nodecron support scripts, called by the HTML (not exectued by Node.js)
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
