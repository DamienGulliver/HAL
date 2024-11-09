# Import OpenCV first as per guidelines to avoid TLS block error
import cv2
import numpy as np
import time
from threading import Thread
import os
import multiprocessing
import subprocess
import pty
import sys

class VideoStream:
    # [VideoStream class remains the same]
    def __init__(self, src=0):
        self.stream = cv2.VideoCapture(src)
        
        # Set optimal parameters for Jetson Nano
        self.stream.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.stream.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        # Check if CUDA backend is available
        try:
            self.stream.set(cv2.CAP_PROP_BACKEND, cv2.CAP_CUDA)
        except:
            print("[INFO] CUDA backend not available for video capture")
        
        self.grabbed, self.frame = self.stream.read()
        self.stopped = False
        self.thread = Thread(target=self.update, args=())
        self.thread.daemon = True

    def start(self):
        self.thread.start()
        return self

    def update(self):
        while True:
            if self.stopped:
                return
            self.grabbed, self.frame = self.stream.read()

    def read(self):
        return self.frame

    def stop(self):
        self.stopped = True
        self.thread.join()
        self.stream.release()

def record_audio(stop_event):
    # Create a pseudo-terminal for capturing arecord output
    master, slave = pty.openpty()
    
    # Start arecord with VU meters
    process = subprocess.Popen([
        'arecord', '-D', 'softvol', 
        '-f', 'S16_LE', '-r', '48000', 
        '-c', '2', '-V', 'stereo',  # Enable VU meters
        'output.wav'
    ], stdout=subprocess.PIPE, stderr=slave, universal_newlines=True)
    
    # Close slave fd
    os.close(slave)
    
    # Open master as file
    master_file = os.fdopen(master, 'r')
    
    try:
        while not stop_event.is_set():
            try:
                # Read and display VU meter output
                output = master_file.readline()
                if output:
                    # Clear the current line and print the VU meter
                    sys.stdout.write('\r' + output.strip())
                    sys.stdout.flush()
                
                if process.poll() is not None:  # Process died
                    process = subprocess.Popen([
                        'arecord', '-D', 'softvol', 
                        '-f', 'S16_LE', '-r', '48000', 
                        '-c', '2', '-V', 'stereo',
                        'output.wav'
                    ], stdout=subprocess.PIPE, stderr=slave, universal_newlines=True)
            except (IOError, OSError):
                continue
    finally:
        process.terminate()
        master_file.close()

def run_face_detection(stop_event):
    # [rest of the face detection code remains the same]
    cascade_paths = [
        '/usr/share/opencv4/haarcascades/haarcascade_frontalface_default.xml',
        '/usr/local/share/opencv4/haarcascades/haarcascade_frontalface_default.xml',
        '/opt/opencv/haarcascades/haarcascade_frontalface_default.xml'
    ]
    
    cascade_file = None
    for path in cascade_paths:
        if os.path.exists(path):
            cascade_file = path
            break
    
    if cascade_file is None:
        raise FileNotFoundError(
            "Could not find haarcascade_frontalface_default.xml. Please install OpenCV's extra data: "
            "sudo apt-get install opencv-data"
        )
    
    print(f"[INFO] Loading cascade classifier from: {cascade_file}")
    face_cascade = cv2.CascadeClassifier(cascade_file)
    
    if face_cascade.empty():
        raise ValueError("Error loading cascade classifier")
    
    print("[INFO] Starting video stream...")
    vs = VideoStream(src=0).start()
    time.sleep(2.0)
    
    fps = 0
    frame_count = 0
    start_time = time.time()
    
    try:
        while not stop_event.is_set():
            frame = vs.read()
            if frame is None:
                print("[WARNING] No frame received")
                continue
                
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30),
                flags=cv2.CASCADE_SCALE_IMAGE
            )
            
            for (x, y, w, h) in faces:
                cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
            
            frame_count += 1
            if frame_count % 30 == 0:
                fps = frame_count / (time.time() - start_time)
            
            cv2.putText(frame, f"FPS: {fps:.1f}", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            cv2.putText(frame, f"Faces: {len(faces)}", (10, 60),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
            cv2.imshow("Face Detection", frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                stop_event.set()
                break
                
    except KeyboardInterrupt:
        print("\n[INFO] Interrupted by user")
        stop_event.set()
    finally:
        print("[INFO] Cleaning up...")
        vs.stop()
        cv2.destroyAllWindows()

def main():
    # Set Jetson Nano to maximum performance mode
    try:
        os.system('sudo nvpmodel -m 0')  # Max performance mode
        os.system('sudo jetson_clocks')  # Max clock speeds
        print("[INFO] Set Jetson Nano to maximum performance mode")
    except:
        print("[WARNING] Could not set performance mode")

    # Create a new line for audio levels display
    print("\nAudio Levels:")
    
    stop_event = multiprocessing.Event()
    
    print("[INFO] Starting audio recording...")
    audio_process = multiprocessing.Process(target=record_audio, args=(stop_event,))
    audio_process.start()
    
    try:
        run_face_detection(stop_event)
    finally:
        stop_event.set()
        audio_process.join()
        print("\n[INFO] Audio recording stopped")

if __name__ == "__main__":
    main()
