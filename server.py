import http.server
import socketserver
import os
import webbrowser

HOST = "127.0.0.1"
PORT = 8000
DIRECTORY = "dashboard"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def run():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with socketserver.TCPServer((HOST, PORT), Handler) as httpd:
        print(f"🚀 Dashboard Server đang chạy an toàn tại: http://{HOST}:{PORT}")
        print("Mở trình duyệt web để xem giao diện trực quan Workflow & Behavioral Simulator.")
        webbrowser.open(f"http://{HOST}:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nĐã dừng Server.")

if __name__ == "__main__":
    run()
