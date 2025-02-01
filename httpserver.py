import http.server
from http.server import SimpleHTTPRequestHandler, HTTPServer

class CORSHTTPRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept')
        SimpleHTTPRequestHandler.end_headers(self)

    def do_OPTIONS(self):
        self.send_response(200, "OK")
        self.end_headers()

def run(server_class=HTTPServer, handler_class=CORSHTTPRequestHandler, port=8888):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f'Serving HTTP on port {port}...')
    httpd.serve_forever()

if __name__ == '__main__':
    run()
