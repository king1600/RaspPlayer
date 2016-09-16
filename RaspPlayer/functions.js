/*
Name:         King Butcher
Date:         9.10.2016
Description:  Miscellanious Functions
*/

/* Database Variables */
var songPlace   = 0;
var songsPlayed = [];
var queuedSongs = [];

/* String Prefixes */
var OEMBED  = "https://www.youtube.com/oembed?url=";
var YOUTUBE = "https://www.youtube.com/watch?v=";

/* Notification settings */
$.notify.defaults({ className: "success" });
$.notify.addStyle('rasp-red', {
  html: "<div><span data-notify-text/></div>",
    classes: {
      base: {
        "background-color": "#BC1142",
        "padding": "0.6em",
        "padding-left": "1em",
        "padding-right": "1em",
        "border-radius":"5px"
      },
      berryRed: {
        "color": "white",
        "font-size":"1.2em",
        "font-family":"Open Sans"
      }
    }
  }
);

/* Notification */
function notify(message) {
  $.notify( message , {
    style: 'rasp-red',
    className: 'berryRed',
    position: "top right"
  });
}

/* Easier print */
function print(obj)
{
  console.log(obj);
}

/* Perform Async HTTP Get Request */
function AjaxRequest(url, callback_function)
{
  var ajax = new XMLHttpRequest();
  ajax.onreadystatechange = function() {
    if (ajax.readyState == 4 && ajax.status == 200)
      callback_function(ajax.responseText);
  }
  ajax.open("GET", url, true);
  ajax.send(null);
}

/* Get Video ID of Youtube Link */
function getVideoId(url)
{
  url = url.split("?v=")[1]
  try { url = url.split("&")[0]; }
  catch (error) {}
  return url;
}

/* Generate GUID : http://stackoverflow.com/a/105074 */
function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

/* Apply a function to element array */
function applyToElements(elements, action)
{
  for (var i=0; i < elements.length; i++)
    action(elements[i]);
}

/* Convert number seconds to time string (mm:ss) */
function IsNumeric(val) { return Number(parseFloat(val))==val; }
function secsToTime( secs ) {
  // Check if value is valid
  if (!IsNumeric(secs)) {
    return "00:00";
  }

  // Value Conversion | Get value in minutes
  var mins = ~~Math.floor(secs / 60);
  var rsecs = ~~(secs - mins * 60);

  // Check if conversion is valid
  if (!IsNumeric(rsecs) || !IsNumeric(mins)) {
    return "00:00";
  }

  // Convert to mm:ss
  var output = "";
  if (mins < 10 || mins == 0) {
    output += "0" + mins;
  }else { output += mins }
  output += ":";
  if (rsecs < 10 || rsecs == 0) { 
    output += "0" + rsecs;
  }else { output += rsecs }

  // Return value
  return output;
}