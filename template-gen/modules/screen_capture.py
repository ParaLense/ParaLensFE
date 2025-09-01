"""Screen Capture Modul für Screenshots und Fenster-Auswahl"""
import tkinter as tk
from tkinter import messagebox
import pyautogui
import win32gui
import win32ui
import win32con
import win32api
from PIL import Image
import numpy as np
from typing import List, Tuple, Optional
import time


class ScreenCapture:
    def __init__(self):
        """Initialisiert das Screen Capture Modul"""
        self.monitors = self._get_monitors()
        
    def _get_monitors(self) -> List[dict]:
        """
        Ermittelt alle verfügbaren Monitore
        
        Returns:
            Liste von Monitor-Informationen
        """
        monitors = []
        
        def callback(hMonitor, hdcMonitor, lprcMonitor, dwData):
            info = win32api.GetMonitorInfo(hMonitor)
            monitor_area = info['Monitor']
            work_area = info['Work']
            monitors.append({
                'index': len(monitors),
                'name': f"Monitor {len(monitors) + 1}",
                'left': monitor_area[0],
                'top': monitor_area[1],
                'right': monitor_area[2],
                'bottom': monitor_area[3],
                'width': monitor_area[2] - monitor_area[0],
                'height': monitor_area[3] - monitor_area[1],
                'is_primary': info['Flags'] == 1
            })
            return True
        
        win32api.EnumDisplayMonitors(None, None)
        return monitors
    
    def capture_full_screen(self, monitor_index: int = 0) -> Image.Image:
        """
        Nimmt einen Screenshot des gesamten Bildschirms auf
        
        Args:
            monitor_index: Index des Monitors (0 = Primär)
            
        Returns:
            PIL Image des Screenshots
        """
        if monitor_index >= len(self.monitors):
            monitor_index = 0
        
        monitor = self.monitors[monitor_index]
        
        # Screenshot mit pyautogui
        screenshot = pyautogui.screenshot(region=(
            monitor['left'],
            monitor['top'],
            monitor['width'],
            monitor['height']
        ))
        
        return screenshot
    
    def get_window_list(self) -> List[dict]:
        """
        Ermittelt alle sichtbaren Fenster
        
        Returns:
            Liste von Fenster-Informationen
        """
        windows = []
        
        def enum_handler(hwnd, ctx):
            if win32gui.IsWindowVisible(hwnd):
                window_text = win32gui.GetWindowText(hwnd)
                if window_text:
                    rect = win32gui.GetWindowRect(hwnd)
                    windows.append({
                        'hwnd': hwnd,
                        'title': window_text,
                        'left': rect[0],
                        'top': rect[1],
                        'right': rect[2],
                        'bottom': rect[3],
                        'width': rect[2] - rect[0],
                        'height': rect[3] - rect[1]
                    })
            return True
        
        win32gui.EnumWindows(enum_handler, None)
        
        # Filtere System-Fenster
        filtered_windows = [w for w in windows 
                          if w['width'] > 50 and w['height'] > 50
                          and not w['title'].startswith('Default IME')
                          and not w['title'].startswith('MSCTFIME')]
        
        return filtered_windows
    
    def capture_window(self, hwnd: int) -> Optional[Image.Image]:
        """
        Nimmt einen Screenshot eines spezifischen Fensters auf
        
        Args:
            hwnd: Window Handle
            
        Returns:
            PIL Image des Fenster-Screenshots oder None bei Fehler
        """
        try:
            # Fenster in den Vordergrund bringen
            win32gui.SetForegroundWindow(hwnd)
            time.sleep(0.2)  # Kurz warten
            
            # Fenster-Rechteck ermitteln
            rect = win32gui.GetWindowRect(hwnd)
            x, y, right, bottom = rect
            width = right - x
            height = bottom - y
            
            # Screenshot des Fensterbereichs
            screenshot = pyautogui.screenshot(region=(x, y, width, height))
            
            return screenshot
            
        except Exception as e:
            print(f"Error capturing window: {e}")
            return None
    
    def capture_region(self, x: int, y: int, width: int, height: int) -> Image.Image:
        """
        Nimmt einen Screenshot einer spezifischen Region auf
        
        Args:
            x: X-Koordinate
            y: Y-Koordinate
            width: Breite
            height: Höhe
            
        Returns:
            PIL Image der Region
        """
        screenshot = pyautogui.screenshot(region=(x, y, width, height))
        return screenshot
    
    def select_region_interactive(self) -> Optional[Tuple[int, int, int, int]]:
        """
        Lässt den Benutzer interaktiv eine Region auswählen
        
        Returns:
            Tuple (x, y, width, height) oder None bei Abbruch
        """
        class RegionSelector:
            def __init__(self):
                self.start_x = None
                self.start_y = None
                self.end_x = None
                self.end_y = None
                self.selecting = False
                self.selection_made = False
                
                # Erstelle transparentes Vollbild-Fenster
                self.root = tk.Tk()
                self.root.attributes('-fullscreen', True)
                self.root.attributes('-alpha', 0.3)
                self.root.attributes('-topmost', True)
                self.root.configure(background='grey')
                
                # Canvas für Rechteck
                self.canvas = tk.Canvas(self.root, highlightthickness=0)
                self.canvas.pack(fill='both', expand=True)
                
                # Bind Events
                self.canvas.bind('<Button-1>', self.on_click)
                self.canvas.bind('<B1-Motion>', self.on_drag)
                self.canvas.bind('<ButtonRelease-1>', self.on_release)
                self.root.bind('<Escape>', lambda e: self.cancel())
                
                self.rect = None
                
            def on_click(self, event):
                self.start_x = event.x
                self.start_y = event.y
                self.selecting = True
                
                if self.rect:
                    self.canvas.delete(self.rect)
                
            def on_drag(self, event):
                if self.selecting:
                    if self.rect:
                        self.canvas.delete(self.rect)
                    
                    self.rect = self.canvas.create_rectangle(
                        self.start_x, self.start_y, event.x, event.y,
                        outline='red', width=2, fill='red', stipple='gray50'
                    )
                    
            def on_release(self, event):
                if self.selecting:
                    self.end_x = event.x
                    self.end_y = event.y
                    self.selecting = False
                    self.selection_made = True
                    self.root.quit()
                    
            def cancel(self):
                self.selection_made = False
                self.root.quit()
                
            def run(self):
                self.root.mainloop()
                self.root.destroy()
                
                if self.selection_made:
                    x = min(self.start_x, self.end_x)
                    y = min(self.start_y, self.end_y)
                    width = abs(self.end_x - self.start_x)
                    height = abs(self.end_y - self.start_y)
                    return (x, y, width, height)
                return None
        
        selector = RegionSelector()
        return selector.run()
