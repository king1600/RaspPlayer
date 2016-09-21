#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Name:			King Butcher
Date:			9.9.2016
Description:	Python HTTP Media Streamer (http://localhost:8080)
"""

#### Dependencies ####
# - youtube-dl       #
# - pafy             #
######################

import os
import sys
import json
import socket
import logging
import asyncore
import threading
from rasp_client import RaspClient, OEMBED

# python 2 and python 3 compatible
if sys.version_info[0] == 3: # python3
	from http.server import HTTPServer
	from http.server import SimpleHTTPRequestHandler
else: # python2
	from BaseHTTPServer import HTTPServer
	from SimpleHTTPServer import SimpleHTTPRequestHandler


class HttpServerSubclass(SimpleHTTPRequestHandler):
	''' override http logging for less output '''
	def log_message(self, format, *args):
		pass

class Server(asyncore.dispatcher):
	THREADS   = [] # hold all created threads
	HTML_PATH = "RaspPlayer" # website file directory

	def __init__(self, port, logger=None):
		''' Create clients and handle connections '''
		asyncore.dispatcher.__init__(self)
		self.port = int(port)
		self.logger = logger

		# Create server socket to listen for connections
		self.create_socket(socket.AF_INET, socket.SOCK_STREAM)
		self.set_reuse_addr()
		self.bind(('', self.port))
		self.listen(0)

		# Start HTTP Server and Player Server
		self.create_http_server()
		self.logger.info("Server started on port {0}".format(self.port))

	def __del__(self):
		''' Class Destructor: delete all threads '''
		for _thread in self.THREADS:
			thread = self.THREADS.pop(self.THREADS.index(_thread))
			thread.join(1)
			del thread
		del self.THREADS
		asyncore.close_call()

	def handle_accept(self):
		''' create new clients on connection '''

		# accept & validate new client
		client_accept = self.accept()
		if client_accept is not None:
			conn, addr = client_accept

			# create new client
			clientHandler = RaspClient(conn, addr, self.logger)

	def create_http_server(self):
		''' Create HTTP Server in local director '''
		HandlerClass = HttpServerSubclass
		ServerClass  = HTTPServer
		Protocol     = "HTTP/1.0"
		HTTP_PORT    = 8080

		# Navigate to Website Directory
		os.chdir(os.path.abspath(self.HTML_PATH))

		# create and run server
		server_addr = ('0.0.0.0', HTTP_PORT)
		HandlerClass.protocol_version = Protocol
		httpd = ServerClass(server_addr, HandlerClass)
		http_thread = self.create_thread(httpd.serve_forever)
		self.THREADS.append( http_thread )

	def create_thread(self, func, *args):
		''' Create and return Python GIL-Thread '''
		thread = threading.Thread(target=func, args=args)
		thread.daemon = True
		thread.start()
		return thread


if __name__ == '__main__':
	# Create Logger
	logging.basicConfig(level=logging.INFO,
						format='[%(asctime)s] %(message)s')
	logger = logging.getLogger(__name__)

	# Create server
	if len(sys.argv) > 1: port = int(sys.argv[1])
	else: port = 4444
	server = Server( port, logger )

	# edit settings port num in conf file
	jsonFile = "settings.json"
	with open(jsonFile, 'r') as f:
		jsonData = json.loads(f.read())
	lanSock = socket.socket(socket.AF_INET,socket.SOCK_DGRAM)
	lanSock.connect(("8.8.8.8",53))
	lanIP = lanSock.getsockname()[0]
	lanSock.close()
	jsonData["requestUrl"] = "http://{0}:{1}".format(lanIP, port)
	with open(jsonFile, 'w') as f:
		json.dump(jsonData, f, sort_keys=True, indent=4, ensure_ascii=False)

	# Start server
	server.create_thread(asyncore.loop)

	# Handle CTRL-C
	print("Press CTRL-C to exit")
	while True:
		try:
			input()
		except (KeyboardInterrupt, SystemExit):
			break
		except:
			break
	sys.exit()
