/*
	nodecron support scripts, called by the HTML (not exectued by Node.js)
*/

// tt: ng
// tf: ng
// ff: ng
// ft: 

function deleteEntry(entryIndex){
	console.log("deleteEntry #" + entryIndex);
	$.ajax({
			url: "nodecron",
			data: {action: "delete", index: entryIndex},
			type: "post",
			success: function(output){
				console.log("'Delete' response was: " + output);
				if (output !== "OK"){
					// window.alert("Something bad happened in 'delete'! ('" + output + "')");
					}
				location.reload(true);
				// return value used?
				}
			}
			);
		// return value used?
		}

function addEntry(){
	console.log("addEntry");
	$.ajax({
			url: "nodecron",
			data: {action: "add"},
			type: "get",
			success: function(output){
				console.log("'Add' response was: " + output);
				if (output !== "OK"){
					window.alert("Something bad happened in 'add'!");
					}
				}
			}
			);
		}
