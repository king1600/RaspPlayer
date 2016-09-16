/*
King: 				King Butcher
Date: 				9.10.2016
Description: 		Music Player Controls
*/

/* Stream variables */
var stream    = null;
var volume    = 50;
var totalTime = "00:00";
var textLimit = 65;
var songImgUrl  = "" 

/* HTML elements */
var playButtons;
var rewindButtons;
var skipButtons;
var reloadButtons;
var volumeButtons;
var seekSliders;
var volumeSliders;
var songTitles;
var songImages;
var songTimes;

/* booleans */
var isLooping = false;
var isLoading = false;
var isSeeking = false;

/* Button image links */
var buttonLinks = {
	"play":"images/play.png",
	"pause":"images/pause.png",
	"reload":"images/refresh.png",
	"volumeOn":"images/volume_on.png",
	"volumeOff":"images/volume_off.png"
}

function setMusicElements()
{
	// get DOM elements
	stream        = document.getElementById("audio-player");
	playButtons   = document.getElementsByClassName("play-btn");
	rewindButtons = document.getElementsByClassName("rewind-btn");
	skipButtons   = document.getElementsByClassName("skip-btn");
	reloadButtons = document.getElementsByClassName("reload-btn");
	volumeButtons = document.getElementsByClassName("volume-btn");
	songTitles    = document.getElementsByClassName("song-title");
	seekSliders   = document.getElementsByClassName("seek-slider");
	volumeSliders = document.getElementsByClassName("volume-slider");
	songImages    = document.getElementsByClassName("song-image");
	songTimes     = document.getElementsByClassName("song-time");

	// set actions
	applyToElements(playButtons, function(btn){
		btn.onclick = togglePlay; });
	applyToElements(reloadButtons, function(btn){
		btn.onclick = toggleReload; });
	applyToElements(volumeButtons, function(btn){
		btn.onclick = toggleMute; });
	applyToElements(rewindButtons, function(btn){
		btn.onclick = Rewind; });
	applyToElements(skipButtons, function(btn){
		btn.onclick = Skip; });
	applyToElements(seekSliders, function(sldr){
		function customSeek() { Seek(sldr); }
		sldr.addEventListener("input", customSeek, false); });
	applyToElements(volumeSliders, function(sldr){
		sldr.addEventListener("mousemove", setVolume); });

	// Setup stream and start updater
	stream.onended = Skip;
	totalTime      = secsToTime(stream.duration);
	setVolume();
	setTimeout(musicUpdater, 0);
}

/* Button Functions */

function togglePlay() // toggle playing
{
	try {
		if (stream.paused) {
			stream.play();
			applyToElements(playButtons,
				function(btn){ btn.src = buttonLinks["pause"]; });
		} else {
			stream.pause();
			applyToElements(playButtons,
				function(btn){ btn.src = buttonLinks["play"]; });
		}
	}catch (error) { print(error.message); }
}

function toggleMute() // toggle muting
{
	try {
		if (stream.muted) {
			stream.muted = false;
			applyToElements(volumeButtons,
				function(btn){ btn.src = buttonLinks["volumeOn"]; });
		} else {
			stream.muted = true;
			applyToElements(volumeButtons,
				function(btn){ btn.src = buttonLinks["volumeOff"]; });
		}
	}catch (error) {}
}

function toggleReload() // toggle reload
{
	if (isLooping) {
		isLooping = false;
		notify("Replay disabled!");
		applyToElements(reloadButtons, function(btn){
			btn.style = "background-color: #DAE3EA;"; });
	} else {
		isLooping = true;
		notify("Replay enabled!");
		applyToElements(reloadButtons, function(btn){
			btn.style = "background-color: #80A6C3;"; });
	}
}

function Rewind() // rewind to last song
{
	if (isLoading) { return; }
	if (songPlace != -1) {
		if (songPlace == 1) { songPlace = 0; }	
		else { songPlace -= 2; }
	}
	if (songPlace < 0) { songPlace = 0; }
	getNextSong();
}

function Skip() // skip to next song
{
	if (isLoading) { return; }
	getNextSong();
}

/* Seek slider Functions */

function setVolume() // set the volume based on the sliders
{
	try {
		// Grab latest volume update
		for (var i=0; i < volumeSliders.length; i++) {
    		var vslider = volumeSliders[i];
    		if (vslider.value != volume) {
    			volume = vslider.value;
    			break;
    		}
		}
		// Update the other sliders
		applyToElements(volumeSliders,
			function(sldr){ sldr.value = volume; });
		// Set stream volume with surpressor
		stream.volume = (volume / parseInt(settings["surpressor"])) / 100;
	} catch(error) { }
}

function Seek(seekSlider) // seek tp position based on sliders
{
	try {
		// Seek to position in stream by slider
		if (!isSeeking) {
			isSeeking = true;
			var newPosition = (seekSlider.value * stream.duration) / 100;
			stream.currentTime = newPosition;
			isSeeking = false;
			updateMusicComponents();
		}
	} catch(error) {
		print("Seek error: "+error.message);
		isSeeking = false;
	}
}

function updateMusicComponents() // update Seek slider and music time
{
	try {
		if (!isSeeking) {
			// Update seeksliders
			var _currentTime = ~~stream.currentTime;
			var _duration    = stream.duration;
			var _percent     = (_currentTime * 100) / _duration;
			applyToElements(seekSliders, function(sldr){
				sldr.value = _percent; });

			// Update music time
			_currentTime = secsToTime(_currentTime);
			totalTime    = secsToTime(_duration);
			applyToElements(songTimes, function(elem){
				elem.innerHTML = _currentTime + " / " + totalTime; });
		}
	} catch(error) {
		print("musicUpdate error: "+error.message);
	}
}

function musicUpdater() // update the timer, etc every 1000ms = 1 sec
{
	try { updateMusicComponents(); }
	catch (error) {}
	setTimeout(musicUpdater, 1000);
}

/* Music Functions */

function loadMusicData(returnData) // load data received into stream and start playing
{
	stream.src = returnData.split("\n")[1];
	stream.play();
	totalTime  = secsToTime(stream.duration);

	applyToElements(playButtons,
		function(btn){ btn.src = buttonLinks["pause"]; });
	applyToElements(seekSliders,
		function(sldr){ sldr.value = 0; });

	isLoading = false;
}

function getNextSong() // get next song in either queue, played, or none
{
	// Loop current song if looping is active
	if (isLooping) {
		try {
			stream.currentTime = 0;
			stream.play();
		} catch (error) { print("Reload error: " + error.message); }
		return;
	}

	// Start loading next song
	isLoading  = true;
	var newUrl = "";
	var requestURL = settings["requestUrl"] + "/search.php?url=";
	setTitle("Loading...");

	// Get Song from song list
	if (songsPlayed.length != 0) {
		if (songPlace < songsPlayed.length) {
			newUrl = songsPlayed[songPlace]["url"];
			songPlace += 1;
			updateDatabase();

			// Get Url info
			AjaxRequest(requestURL + newUrl, function(recvData){
				isLoading = true;
				// Set title from OEMBED
				AjaxRequest(settings["requestUrl"] + "/oembed.php?url=" + newUrl,
					function(jsonData){
						var info = JSON.parse(jsonData);
						setTitle(info['title']);
					}
				);
				// Set Thumbnail Image
				setThumbnail(newUrl);
				// Load info to stream
				loadMusicData(recvData);
			});
			return;
		}
	}

	// Get Song from queued list
	if (queuedSongs.length != 0) {
		newUrl = queuedSongs[queuedSongs.length - 1]["url"];
		addSong(newUrl);
		waitForSongs(function(){updateDatabase();});
		songPlace += 1;
		updateDatabase();
		queuedSongs.pop();

		// Get url info
		AjaxRequest(requestURL + newUrl, function(recvData){
			isLoading = true;
			// Set title from OEMBED
			AjaxRequest(settings["requestUrl"] + "/oembed.php?url=" + newUrl,
				function(jsonData){
					var info = JSON.parse(jsonData);
					setTitle(info['title']);
				}
			);
			// Set Thumbnail Image
				setThumbnail(newUrl);
			// Load info to stream
			loadMusicData(recvData);
		});
		return;
	}

	// Auto playlist
	else {
		notify("Theres no songs in queue! Starting over!");
		songPlace = 0;
		isLoading = false;
	}
}

/* Database Functions */

function addSong(url) // add song to database
{
	// make new entry
	var myGuid   = guid();
	var songLen  = songsPlayed.length;
	var newEntry = {"guid":myGuid, "url":url, "title":null, "place":songLen}
	var reqUrl = settings["requestUrl"] + "/oembed.php?url=" + url;

	// add entry to songs
	songsPlayed.push(newEntry);

	// update song positions
	updateSongPos();

	// update entry's title for database
	AjaxRequest(reqUrl, function(jsonData) {
		var info = JSON.parse(jsonData);
		newEntry["title"] = info["title"];

		for (var i=0; i < songsPlayed.length; i++) {
			if (songsPlayed[i]["guid"] == myGuid) {
				songsPlayed[i] = newEntry;
			}
		}
	});
}

function removeSong(_guid) // remove song from database by GUID
{
	for (var i=0; i < songsPlayed.length; i++) {
		if (songsPlayed[i]["guid"] === _guid) {
			songsPlayed.splice(i, 1);
			break;
		}
	}
	updateSongPos();
	songPlace = songsPlayed[songPlace - 2]["place"] + 1;
	updateDatabase();
}

/* Setting Functions */

function setTitle(title_text) // set music player Title
{
	// Shorten down title if too long
	if (title_text.length > textLimit) {
		title_text = title_text.substring(0, textLimit + 1);
		title_text += "...";
	}

	// apply title to song titles
	applyToElements(songTitles, function(txt){ 
		txt.innerHTML = title_text; });

	/* document.title = title_text; */ // token out on release
}

function setThumbnail(url) // set current song image thumbnail
{
	// generate url
	songImgUrl = url;
	var newUrl = "http://img.youtube.com/vi/";
	newUrl += getVideoId(songImgUrl) + "/hqdefault.jpg";

	// Test if url is valid
	AjaxRequest(settings["requestUrl"] + "/compare.php?url=" + newUrl,
		function (result) {
			print(result);
			if (result == 'false') {
				newUrl = "http://img.youtube.com/vi/";
				newUrl += getVideoId(songImgUrl) + "/hqdefault.jpg";
			}
			// set image
			applyToElements(songImages, function(img){
				img.src = newUrl; });
		}
	);
}