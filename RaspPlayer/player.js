/*
Name: 			King Butcher
Date: 			9.10.2016
Description: 	Javascript Player backend
*/

// variables
var screens = {};

/* First Initialized Function */
function init()
{
	// Settup screen toggling
	screens["music"]    = document.getElementById("music-content");
	screens["playlist"] = document.getElementById("playlist-content");
	screens["settings"] = document.getElementById("settings-content");
	toggleScreen("music");

	// Load Settings from json
	AjaxRequest("settings.json", function(respText){
		settings = JSON.parse(respText);
		onReady();
	});
}

/* Run when program is ready */
function onReady()
{
	// set elements
	setMusicElements();
	setPlaylistElements();
	setSettingsElements();
}

/* Screen Toggling */
function toggleScreen(screenName)
{
	for (var key in screens)
		if (screens.hasOwnProperty(key))
			if (screenName == key)
				screens[key].style.display = 'block';
			else
				screens[key].style.display = 'none';
}