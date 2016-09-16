/*
King: 				King Butcher
Date: 				9.15.2016
Description: 		Settings Updater
*/

// input boxes
var formatBox;
var suppressorBox;
var saveButton;

// Json Settings dict
var settings = {};

// Setup the elements
function setSettingsElements()
{
	formatBox     = document.getElementById("formats");
	suppressorBox = document.getElementById("vol-sup");
	saveButton    = document.getElementById("save-btn");

	suppressorBox.value = settings["surpressor"].toString();
	formatBox.options[0].selected = "selected";
	saveButton.onclick = saveSettings;
}

// Save settings
function saveSettings()
{
	// Update settings
	var data = suppressorBox.value.toString();
	if (data != "") {
		print("Setting surpressor info");
		settings["surpressor"] = parseInt(data);
	}
	settings["audioFormat"] = formatBox.options[formatBox.selectedIndex].value;

	print(settings);

	// save settings
	notify("Saving settings...");
	var reqUrl = settings["requestUrl"];
	reqUrl += "/writejson.php?url=" + JSON.stringify(settings) ;
	AjaxRequest( reqUrl, function(){ notify("Save Successful!"); });
}