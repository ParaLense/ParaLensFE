"""Template Editor mit Drag & Drop und Resize-Funktionalität"""
import tkinter as tk
from tkinter import Canvas
from PIL import Image, ImageTk, ImageDraw
from typing import List, Dict, Any, Optional, Tuple
import math


class ResizableBox:
    """Repräsentiert eine resize-bare Box im Editor"""
    
    def __init__(self, canvas: Canvas, x: float, y: float, width: float, height: float, 
                 box_id: str, label: str, color: str = "#FF0000"):
        """
        Initialisiert eine ResizableBox
        
        Args:
            canvas: Tkinter Canvas
            x, y: Position in Prozent (0-100)
            width, height: Größe in Prozent (0-100)
            box_id: Eindeutige ID
            label: Box-Label
            color: Farbe der Box
        """
        self.canvas = canvas
        self.x = x  # Prozent
        self.y = y  # Prozent
        self.width = width  # Prozent
        self.height = height  # Prozent
        self.box_id = box_id
        self.label = label
        self.color = color
        self.selected = False
        
        # Canvas Items
        self.rect = None
        self.handles = []
        self.number_bg = None
        self.number_text = None
        self.label_text = None
        
        # Drag state
        self.drag_data = {"x": 0, "y": 0, "handle": None}
        
    def draw(self, canvas_width: int, canvas_height: int):
        """Zeichnet die Box auf dem Canvas"""
        # Konvertiere Prozent zu Pixel
        px = (self.x / 100) * canvas_width
        py = (self.y / 100) * canvas_height
        pw = (self.width / 100) * canvas_width
        ph = (self.height / 100) * canvas_height
        
        # Lösche alte Elemente
        self.clear()
        
        # Zeichne Rechteck
        self.rect = self.canvas.create_rectangle(
            px, py, px + pw, py + ph,
            outline=self.color,
            width=2 if not self.selected else 3,
            fill="" if not self.selected else self.color,
            stipple="" if not self.selected else "gray50",
            tags=("box", self.box_id)
        )
        
        # Zeichne Box-Nummer
        number = self.box_id.split('_')[-1]
        self.number_bg = self.canvas.create_rectangle(
            px - 2, py - 22, px + 20, py - 2,
            fill=self.color,
            outline="",
            tags=("box_number", self.box_id)
        )
        self.number_text = self.canvas.create_text(
            px + 9, py - 12,
            text=number,
            fill="white",
            font=("Arial", 10, "bold"),
            tags=("box_number", self.box_id)
        )
        
        # Zeichne Label
        if self.label:
            self.label_text = self.canvas.create_text(
                px + 5, py + 5,
                text=self.label,
                fill=self.color,
                font=("Arial", 9),
                anchor="nw",
                tags=("box_label", self.box_id)
            )
        
        # Zeichne Resize-Handles wenn selektiert
        if self.selected:
            self.draw_handles(px, py, pw, ph)
    
    def draw_handles(self, x: float, y: float, width: float, height: float):
        """Zeichnet Resize-Handles"""
        handle_size = 8
        handle_positions = [
            ("nw", x, y),
            ("n", x + width/2, y),
            ("ne", x + width, y),
            ("e", x + width, y + height/2),
            ("se", x + width, y + height),
            ("s", x + width/2, y + height),
            ("sw", x, y + height),
            ("w", x, y + height/2)
        ]
        
        for handle_type, hx, hy in handle_positions:
            handle = self.canvas.create_rectangle(
                hx - handle_size/2, hy - handle_size/2,
                hx + handle_size/2, hy + handle_size/2,
                fill="white",
                outline=self.color,
                width=2,
                tags=("handle", f"{self.box_id}_handle_{handle_type}")
            )
            self.handles.append(handle)
    
    def clear(self):
        """Löscht alle Canvas-Elemente dieser Box"""
        if self.rect:
            self.canvas.delete(self.rect)
        if self.number_bg:
            self.canvas.delete(self.number_bg)
        if self.number_text:
            self.canvas.delete(self.number_text)
        if self.label_text:
            self.canvas.delete(self.label_text)
        for handle in self.handles:
            self.canvas.delete(handle)
        self.handles = []
    
    def contains_point(self, x: float, y: float, canvas_width: int, canvas_height: int) -> bool:
        """Prüft ob ein Punkt in der Box liegt"""
        px = (self.x / 100) * canvas_width
        py = (self.y / 100) * canvas_height
        pw = (self.width / 100) * canvas_width
        ph = (self.height / 100) * canvas_height
        
        return px <= x <= px + pw and py <= y <= py + ph
    
    def get_handle_at_point(self, x: float, y: float, canvas_width: int, canvas_height: int) -> Optional[str]:
        """Ermittelt welcher Handle an einem Punkt liegt"""
        if not self.selected:
            return None
        
        px = (self.x / 100) * canvas_width
        py = (self.y / 100) * canvas_height
        pw = (self.width / 100) * canvas_width
        ph = (self.height / 100) * canvas_height
        
        handle_size = 12  # Etwas größerer Bereich für einfacheres Greifen
        handle_positions = [
            ("nw", px, py),
            ("n", px + pw/2, py),
            ("ne", px + pw, py),
            ("e", px + pw, py + ph/2),
            ("se", px + pw, py + ph),
            ("s", px + pw/2, py + ph),
            ("sw", px, py + ph),
            ("w", px, py + ph/2)
        ]
        
        for handle_type, hx, hy in handle_positions:
            if abs(x - hx) <= handle_size/2 and abs(y - hy) <= handle_size/2:
                return handle_type
        
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertiert die Box zu einem Dictionary"""
        return {
            "id": self.box_id,
            "x": round(self.x, 2),
            "y": round(self.y, 2),
            "width": round(self.width, 2),
            "height": round(self.height, 2),
            "label": self.label
        }


class TemplateEditor:
    """Template Editor mit erweiterten Bearbeitungsfunktionen"""
    
    def __init__(self, canvas: Canvas):
        """
        Initialisiert den Template Editor
        
        Args:
            canvas: Tkinter Canvas für die Bearbeitung
        """
        self.canvas = canvas
        self.boxes: List[ResizableBox] = []
        self.selected_box: Optional[ResizableBox] = None
        self.box_counter = 0
        
        # Mindestgröße der Box (in Pixeln), wird bei Resize in Prozent umgerechnet
        self.min_box_size_px = 20
        
        # Drag & Resize State
        self.drag_start = None
        self.resize_handle = None
        self.is_dragging = False
        self.is_resizing = False
        
        # Canvas Dimensionen
        self.canvas_width = 800
        self.canvas_height = 600
        
        # Bind Events
        self._bind_events()
    
    def _bind_events(self):
        """Bindet Mouse-Events an den Canvas"""
        self.canvas.bind("<Button-1>", self.on_mouse_down)
        self.canvas.bind("<B1-Motion>", self.on_mouse_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_mouse_up)
        self.canvas.bind("<Delete>", self.on_delete_key)
        self.canvas.bind("<Configure>", self.on_canvas_resize)
        
        # Cursor ändern bei Hover
        self.canvas.bind("<Motion>", self.on_mouse_move)
    
    def on_canvas_resize(self, event):
        """Handler für Canvas-Resize"""
        self.canvas_width = event.width
        self.canvas_height = event.height
        self.redraw()
    
    def on_mouse_move(self, event):
        """Handler für Mausbewegung (Cursor-Änderung)"""
        # Canvas-Koordinaten statt Widget-Koordinaten verwenden (wichtig bei Scroll)
        cx = self.canvas.canvasx(event.x)
        cy = self.canvas.canvasy(event.y)
        
        if self.selected_box:
            handle = self.selected_box.get_handle_at_point(
                cx, cy, self.canvas_width, self.canvas_height
            )
            
            if handle:
                # Setze Cursor basierend auf Handle-Position
                cursors = {
                    "nw": "top_left_corner",
                    "ne": "top_right_corner",
                    "sw": "bottom_left_corner",
                    "se": "bottom_right_corner",
                    "n": "top_side",
                    "s": "bottom_side",
                    "e": "right_side",
                    "w": "left_side"
                }
                self.canvas.config(cursor=cursors.get(handle, "arrow"))
            elif self.selected_box.contains_point(cx, cy, self.canvas_width, self.canvas_height):
                self.canvas.config(cursor="fleur")  # Move cursor
            else:
                self.canvas.config(cursor="arrow")
        else:
            # Prüfe ob über einer Box
            for box in self.boxes:
                if box.contains_point(cx, cy, self.canvas_width, self.canvas_height):
                    self.canvas.config(cursor="hand2")
                    return
            self.canvas.config(cursor="arrow")
    
    def on_mouse_down(self, event):
        """Handler für Mausklick"""
        cx = self.canvas.canvasx(event.x)
        cy = self.canvas.canvasy(event.y)
        # Prüfe ob auf einem Handle geklickt wurde
        if self.selected_box:
            handle = self.selected_box.get_handle_at_point(
                cx, cy, self.canvas_width, self.canvas_height
            )
            if handle:
                self.resize_handle = handle
                self.is_resizing = True
                self.drag_start = (cx, cy)
                return
        
        # Prüfe ob auf einer Box geklickt wurde
        clicked_box = None
        for box in reversed(self.boxes):  # Reverse für Z-Order
            if box.contains_point(cx, cy, self.canvas_width, self.canvas_height):
                clicked_box = box
                break
        
        # Selektiere Box
        self.select_box(clicked_box)
        
        if clicked_box:
            self.is_dragging = True
            self.drag_start = (cx, cy)
    
    def on_mouse_drag(self, event):
        """Handler für Maus-Drag"""
        if not self.drag_start:
            return
        
        cx = self.canvas.canvasx(event.x)
        cy = self.canvas.canvasy(event.y)
        dx = cx - self.drag_start[0]
        dy = cy - self.drag_start[1]
        
        if self.is_resizing and self.selected_box:
            self.resize_box(self.selected_box, self.resize_handle, dx, dy)
            self.drag_start = (cx, cy)
            self.redraw()
        
        elif self.is_dragging and self.selected_box:
            # Bewege Box
            dx_percent = (dx / self.canvas_width) * 100
            dy_percent = (dy / self.canvas_height) * 100
            
            self.selected_box.x += dx_percent
            self.selected_box.y += dy_percent
            
            # Begrenze auf Canvas
            self.selected_box.x = max(0, min(100 - self.selected_box.width, self.selected_box.x))
            self.selected_box.y = max(0, min(100 - self.selected_box.height, self.selected_box.y))
            
            self.drag_start = (cx, cy)
            self.redraw()
    
    def on_mouse_up(self, event):
        """Handler für Maus-Release"""
        self.is_dragging = False
        self.is_resizing = False
        self.resize_handle = None
        self.drag_start = None
    
    def on_delete_key(self, event):
        """Handler für Delete-Taste"""
        if self.selected_box:
            self.remove_box(self.selected_box)
    
    def resize_box(self, box: ResizableBox, handle: str, dx: float, dy: float):
        """Ändert die Größe einer Box"""
        dx_percent = (dx / self.canvas_width) * 100
        dy_percent = (dy / self.canvas_height) * 100
        
        # Dynamische Mindestgröße in Prozent basierend auf aktuellem Canvas (inkl. Zoom)
        min_width_percent = (self.min_box_size_px / self.canvas_width) * 100 if self.canvas_width else 1
        min_height_percent = (self.min_box_size_px / self.canvas_height) * 100 if self.canvas_height else 1
        
        # Anpassung basierend auf Handle
        if "w" in handle:  # West
            new_x = box.x + dx_percent
            new_width = box.width - dx_percent
            if new_width > min_width_percent:  # dynamische Mindestbreite
                box.x = new_x
                box.width = new_width
        
        if "e" in handle:  # East
            new_width = box.width + dx_percent
            if new_width > min_width_percent:
                box.width = new_width
        
        if "n" in handle:  # North
            new_y = box.y + dy_percent
            new_height = box.height - dy_percent
            if new_height > min_height_percent:  # dynamische Mindesthöhe
                box.y = new_y
                box.height = new_height
        
        if "s" in handle:  # South
            new_height = box.height + dy_percent
            if new_height > min_height_percent:
                box.height = new_height
        
        # Begrenze auf Canvas
        box.x = max(0, min(100, box.x))
        box.y = max(0, min(100, box.y))
        box.width = max(min_width_percent, min(100 - box.x, box.width))
        box.height = max(min_height_percent, min(100 - box.y, box.height))
    
    def select_box(self, box: Optional[ResizableBox]):
        """Selektiert eine Box"""
        # Deselektiere vorherige
        if self.selected_box:
            self.selected_box.selected = False
        
        self.selected_box = box
        
        if box:
            box.selected = True
        
        self.redraw()
    
    def add_box(self, x: float = 25, y: float = 25, width: float = 20, height: float = 15, 
                label: str = None) -> ResizableBox:
        """
        Fügt eine neue Box hinzu
        
        Args:
            x, y: Position in Prozent
            width, height: Größe in Prozent
            label: Optionales Label
            
        Returns:
            Die erstellte Box
        """
        self.box_counter += 1
        box_id = f"box_{self.box_counter}"
        
        if label is None:
            label = f"Box {self.box_counter}"
        
        box = ResizableBox(
            self.canvas,
            x, y, width, height,
            box_id, label
        )
        
        self.boxes.append(box)
        self.select_box(box)
        self.redraw()
        
        return box
    
    def remove_box(self, box: ResizableBox):
        """Entfernt eine Box"""
        box.clear()
        self.boxes.remove(box)
        
        if self.selected_box == box:
            self.selected_box = None
        
        self.redraw()
    
    def clear_all(self):
        """Entfernt alle Boxen"""
        for box in self.boxes:
            box.clear()
        self.boxes = []
        self.selected_box = None
        self.box_counter = 0
        self.redraw()
    
    def load_template(self, template_data: List[Dict[str, Any]]):
        """
        Lädt ein Template
        
        Args:
            template_data: Liste von Box-Definitionen
        """
        self.clear_all()
        
        for box_data in template_data:
            self.box_counter += 1
            box = ResizableBox(
                self.canvas,
                box_data['x'],
                box_data['y'],
                box_data['width'],
                box_data['height'],
                box_data['id'],
                box_data.get('label', f"Box {self.box_counter}")
            )
            self.boxes.append(box)
        
        self.redraw()
    
    def get_template(self) -> List[Dict[str, Any]]:
        """
        Gibt das aktuelle Template zurück
        
        Returns:
            Liste von Box-Definitionen
        """
        return [box.to_dict() for box in self.boxes]
    
    def redraw(self):
        """Zeichnet alle Boxen neu"""
        # Lösche alle Box-Elemente
        self.canvas.delete("box")
        self.canvas.delete("box_number")
        self.canvas.delete("box_label")
        self.canvas.delete("handle")
        
        # Zeichne alle Boxen
        for box in self.boxes:
            box.draw(self.canvas_width, self.canvas_height)
