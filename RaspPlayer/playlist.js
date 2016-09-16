/*
King: 			King Butcher
Date: 			9.15.2016
Description: 	Playlist Manager
*/

// song queue table element
var queueTable;

// add boxes & buttons
var searchBox;
var searchButton;
var playlistBox;
var playlistButton;
var updateButton;

// Database update variables
var updateCount = 0;
var updateSize  = 0;
var isUpdating  = false;

function setPlaylistElements()
{
	// get elements
	queueTable     = document.getElementById("song-table");
	searchBox      = document.getElementById("search-box");
	searchButton   = document.getElementById("search-btn");
	playlistBox    = document.getElementById("playlist-box");
	playlistButton = document.getElementById("playlist-btn");
	updateButton   = document.getElementById("db-update");

	// set element events
	searchBox.onkeyup      = emitSearch;
	searchButton.onclick   = addSearch; 
	playlistBox.onkeyup    = emitPlaylist; 
	playlistButton.onclick = addPlaylist;
	updateButton.onclick   = updateDatabase;
}

/* Database Functions  */

/* Update Song positions for all songs in database */
function updateSongPos()
{
  for (var i=0; i < songsPlayed.length; i++) {
    songsPlayed[i]["place"] = i;
  }
}

function updateDatabase()
{
	// If still updating
	if (isUpdating) {
		notify("Please wait.. updating database");
		return;
	}

	// clear table and settings
	isUpdating  = true;
	updateCount = 0;
	updateSize  = songsPlayed.length;
	queueTable.innerHTML = "";
	// update song positions
	updateSongPos();

	// wait for update to finish
	setTimeout(releaseUpdate, 1);

	// load items
	applyToElements(songsPlayed, function(entry) {
		// add dot to current song
		var playpos = 0;
		if (songPlace == 1) { playpos = 0; }
		if (songPlace > 1) { playpos = songPlace - 1; }
		if (songPlace < 0 || songPlace == 0) { playpos = 0; }

		// display new entry item
		if (songsPlayed[playpos]["guid"] == entry["guid"]) {
			queueTable.innerHTML += makeNewEntry(entry, true);
		}
		else { queueTable.innerHTML += makeNewEntry(entry, false); }

		// wait for updating to stop
		updateCount += 1;
	});
}

function releaseUpdate()
{
	// repeat if updating isn't done
	if (!updateCount == updateSize) {
		setTimeout(releaseUpdate, 100);
	}

	else { // on update done
		// update song positions
		updateSongPos();

		// reset settings for another update
		isUpdating = false;
		updateCount = 0;
		updateSize = 0;
		return;
	}
}

function waitForDatabase(callback) // Async callback for when database is done updating
{
	if (!isUpdating) { return callback(); }
	else { setTimeout(waitForDatabase, 100); }
}

function waitForSongs(callback) // Async callback for when songs are done updating
{
	var done = true;
	applyToElements(songsPlayed, function(entry) {
		if (entry["title"] === null) { done = false;}
	});
	if (!done) { setTimeout(function(){waitForSongs(callback);}, 100); }
	else { return callback(); }
}

function makeNewEntry(entry, hasDot) // create new entry item with HTML
{
	var result = "<div class=\"song-entry\" ";
	// #1D89CF #BC1142;
	result += "style=\"background-color:#BC1142;color:white;border-radius:5%;width:95%;height:10%;padding:1%;\" >\n"
	
	// Add dot if its current song
	if (hasDot) {
		result += "<img src=\"images/current.png\" ";
		result += "style=\"width:%8;height:60%;float:left;border-radius:15%;";
		result += "padding-top:2%;padding-right:2%;background-color:#BC1142;\" />\n";
	}

	// Set image
	var imgUrl = "http://img.youtube.com/vi/" + getVideoId(entry["url"]) + "/hqdefault.jpg";
	result += "<img class=\"img\" src=\"" + imgUrl + "\" ";
	result += "style=\"width:10%;height:100%;float:left;\" />\n";

	// Set title + Close button
	result += "<span style=\"padding-top:2%;float:left;padding-left:2%;\"";
	result +="> " + entry["title"] + " </span>\n";

	// set close button
	result += "<img class=\"del\" src=\"images/close.png\" ";
	result += "onclick='removeSong(\""+ entry["guid"] +"\")' "
	result += "style=\"width:8%;height:70%;float:right;\" />";
	result += "\n</div> <br />";
	return result;
}


/* Add functions */

function addSearch()
{
	isLoading = true;

	// sanitize input
	var data = searchBox.value;
	searchBox.value = '';
	if (/\S/.test(data)) {
    	if (data.indexOf(' ') != -1) {
    		data = data.replace(/\s+/g, '_').toLowerCase();
    	}
	}
	else { isLoading = false; return; }

	// notify of event
	notify("Attempting to add song...");

	// Add song
	var reqUrl = settings["requestUrl"] + "/lookup.php?url=" + data;
	AjaxRequest(reqUrl, function(recvData) {
		// on fail
		if (recvData.startsWith("Reload")) {
			notify("Failed to fetch song!");
			isLoading = false;
			return;
		}

		// on success: add song to queue
		notify("Success!");
		queuedSongs.push({"url":recvData});
		print("Added to Queue");

		// start playing it
		isLoading = false;
		Skip();
	});
}

function addPlaylist()
{
	isLoading = true;
	var data = playlistBox.value;
	playlistBox.value = '';

	// check if its actually a playlist link
	if (data.indexOf("playlist?list=") > -1) { }
	else {
		notify("Not a playlist url!");
		isLoading = false;
		return
	}

	// notify of event
	notify("Attempting to add song...");

	// Add songs from playlist
	var reqUrl = settings["requestUrl"] + "/lookup.php?url=" + data;
	AjaxRequest(reqUrl, function(recvData) {
		// get data
		var info = recvData.split('\n');

		// on fail
		if (info[0] == "Reload") {
			notify("Failed to add playlist!");
			isLoading = false;
			return;
		}

		// on success, all songs to queue
		notify("Success! Adding Playlist");
		applyToElements(info, function(url) {
			queuedSongs.push({"url":url});
		});
		print("Added to Queue");

		// start playing
		Skip();
	});
}

// add Search on "enter" key press
function emitSearch(event){ if (event.which == 13) {addSearch();}}

// add Playlist on "enter" key press
function emitPlaylist(event){ if (event.which == 13) {addPlaylist();}}