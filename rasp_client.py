#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Name:			King Butcher
Date:			9.9.2016
Description:	Media Fetching client
"""

import sys
import bs4
import json
import pafy
import asyncore

if sys.version_info[0] == 3: # python 3
	from urllib.request import urlopen
	from urllib.parse import quote as quote_plus
	from urllib.parse import unquote
else:						 # python 2
	from urllib import urlopen
	from urllib import quote_plus
	from urllib import unquote

#--- Http Response layout ---#
HTTP_RESPONSE = "HTTP/1.1 200 OK\r\n"
HTTP_RESPONSE += "Content-Type: text/html\r\n"
HTTP_RESPONSE += "Content-Length: {LEN}\r\n"
HTTP_RESPONSE += "Connection: Closed\r\n"
HTTP_RESPONSE += "Access-Control-Allow-Origin: *\r\n"

#--- Youtube link prefixes ---#
OEMBED = "https://www.youtube.com/oembed?url={url}"
QUERY  = "https://youtube.com/results?search_query={url}"
UTUBE  = "https://www.youtube.com/watch?v={url}"

"""
BASE_URL = http://localhost:4444
BASE_URL + "/search?url=..." = return youtube info
BASE_URL + "/lookup.php?url=..." = return youtube url after search
BASE_URL + "/pldump.php?url=..." = return list of youtube urls
"""

class RaspClient(asyncore.dispatcher_with_send):
	''' Fetch media info for client '''

	BUFFER = 2048 # TCP receive buffer

	def __init__(self, client, addr, logger):
		asyncore.dispatcher_with_send.__init__(self, client)
		self.addr   = addr
		self.logger = logger
		self.badUrl = "http://img.youtube.com/vi/pEylcg0vCQY/maxresdefault.jpg"

	def handle_close(self):
		''' handle connection closing '''
		self.close()

	def handle_read(self):
		'''
		# =========================== #
		# Handles client I/O          #
		# - youtube search            #
		# - youtube info fetcher      #
		# - youtube playlist dumping  #
		# =========================== #
		'''
		data = str(self.recv( self.BUFFER ).decode('utf-8'))

		# close connection on empty data
		if data.isspace() or data == '':
			self.close()
			return

		# Handle http request
		try:
			# Accept only valid requests
			request = data.split("\r\n")[0]
			isValid = False
			accepted = [
				'search.php',
				'lookup.php',
				'pldump.php',
				'writejson.php', 
				'oembed.php', 
				'compare.php'
			]
			for x in accepted:
				if x in request:
					isValid = True
					break
			if isValid:

				# Log youtube url
				request_url = request.split()[1].split("?url=")[1]
				if not request_url.startswith("{%22"):
					for x in accepted[:3]:
						if x in request:
							log = "{0}> {1}".format(str(self.addr[0]), request_url)
							self.logger.info( log )

				# Perform action based on request
				if "/search.php" in request:
					self.loadSong(request_url)

				elif "/lookup.php" in request:
					self.loadSearch(request_url)

				elif "/pldump.php" in request:
					self.loadPlaylist(request_url)

				elif '/writejson.php' in request:
					self.writeJson(request_url)

				elif '/oembed.php' in request:
					self.remoteOEmbed(request_url)

				elif '/compare.php' in request:
					self.compareImages(request_url)

				else:
					self.close()
					return

		# Log error and reload page
		except Exception as error:
			self.logger.info("Error: {0}".format(str(error)))
			self.build_and_send(['Reload',""])

	def compareImages(self, url):
		try:
			urlopen(url).read(16)
			result = "true"
		except:
			result = "false"
		self.build_and_send([result])

	def remoteOEmbed(self, url):
		data = urlopen(OEMBED.format(url=url)).read().decode('utf-8')
		self.build_and_send([data])

	def writeJson(self, jsonData):
		jsonData = json.loads(unquote(jsonData))
		with open("settings.json", 'w') as f:
			json.dump(jsonData, f, sort_keys=True, indent=4, ensure_ascii=False)
		self.logger.info("{0}> Updated settings.json".format(self.addr[0]))
		self.build_and_send(["Success",""])

	def loadSong(self, url):
		''' return video info: [stream_url, thumbnail, image] '''

		# get video info from youtube oembed
		data = urlopen(OEMBED.format(url=url)).read().decode('utf-8')
		data = json.loads(data)

		# get preffered audio format from settings
		with open("settings.json", 'r') as f:
			settings = json.loads(f.read())
		audioFormat = settings["audioFormat"]

		# set title and audio stream url
		title = data['title']
		stream_url = pafy.new(url, gdata=False, basic=False)
		stream_url = stream_url.getbestaudio(preftype=audioFormat)
		stream_url = stream_url.url_https

		# send info
		self.build_and_send([title, stream_url])

	def loadSearch(self, url):
		''' return youtube url first video search'''
		
		# Generate Query
		if '_' in url:
			url = url.replace('_',' ')
		url = quote_plus(url, safe='')
		url = QUERY.format(url=url)

		# Get youtube search results and parse through responses
		html_data = urlopen( url ).read().decode('utf-8')
		soup      = bs4.BeautifulSoup(html_data, 'html.parser')
		yt        = "yt-lockup-dismissable"
		div = [d for d in soup.find_all('div') if d.has_attr('class') and yt in d['class']]

		# return first video response
		video_result = None
		for d in div:
			image = d.find_all('img')[0]
			data  = image['src'] if not image.has_attr('data-thumb') else image['data-thumb']
			video_id = data.split('/')[-2]
			video_result = UTUBE.format(url=video_id)
			break

		# send info
		self.build_and_send([video_result])

	def loadPlaylist(self, url):
		''' return list of videos from playlist url '''
		
		# generate list of playlist links
		links = []
		playlist = pafy.get_playlist(url, basic=False, gdata=False)
		for link in playlist['items']:
			new_link = UTUBE.format(url = link['pafy'].videoid)
			links.append( new_link )
		links.reverse()

		# send info
		self.build_and_send(links)


	def build_and_send(self, args):
		''' Build HTTP Response data and send packet '''
		response_data = '\n'.join( args )

		# build http response
		response = HTTP_RESPONSE
		response = response.format(LEN = str(len(response_data)))
		response += "\r\n{data}".format(data = response_data)

		# send http response (unicode)
		response_string = "{0}".format(response).encode('utf-8')
		self.send(bytes(response_string))