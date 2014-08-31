/*
	nodecron support scripts, called by the HTML (not exectued by Node.js)
*/

function deleteEntry(entryIndex){
	console.log("deleteEntry #" + entryIndex);
	$.ajax({
			url: "nodecron",
			data: {action: "delete", index: entryIndex},
			type: "get",
			success: function(output){
				console.log("got response");
				// TODO: check status; if other than 200, handle error?
				if (output !== "OK"){
					console.log("'Delete' response was: \n" + output);
					// window.alert("Something bad happened in 'delete'! ('" + output + "')");
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
			success: function(output){
				console.log("'Add' response was: \n" + output);
				if (output !== "OK"){
					window.alert("Something bad happened in 'add'!");
					}
				location.reload(true);	// needed, to refresh the page
				}
			}
			);
		}
