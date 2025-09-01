"""Drawing Screen - Template Editor Interface"""
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import os
from PIL import Image, ImageTk
from modules.template_editor import TemplateEditor
from utils.json_handler import JsonHandler
from utils.image_utils import ImageUtils
from typing import Optional, Dict, Any


class DrawingScreen(ttk.Frame):
    """Template Editor Screen mit Drag & Drop"""
    
    def __init__(self, parent, on_save_callback=None):
        """
        Initialisiert den Drawing Screen
        
        Args:
            parent: Parent Widget
            on_save_callback: Callback wenn Template gespeichert wird
        """
        super().__init__(parent)
        
        self.on_save_callback = on_save_callback
        self.current_image = None
        self.current_project = None
        self.json_handler = JsonHandler()
        self.image_utils = ImageUtils()
        
        self.setup_ui()
    
    def setup_ui(self):
        """Erstellt die UI-Komponenten"""
        # Toolbar
        toolbar = ttk.Frame(self)
        toolbar.pack(fill="x", padx=10, pady=(10, 5))
        
        # Box Controls
        box_frame = ttk.LabelFrame(toolbar, text="Box Controls", padding=5)
        box_frame.pack(side="left", padx=5)
        
        ttk.Button(box_frame, text="➕ Add Box", 
                  command=self.add_box).pack(side="left", padx=2)
        ttk.Button(box_frame, text="➖ Remove Selected", 
                  command=self.remove_selected_box).pack(side="left", padx=2)
        ttk.Button(box_frame, text="🗑️ Clear All", 
                  command=self.clear_all_boxes).pack(side="left", padx=2)
        
        # Template Controls
        template_frame = ttk.LabelFrame(toolbar, text="Template", padding=5)
        template_frame.pack(side="left", padx=5)
        
        ttk.Button(template_frame, text="💾 Save Template", 
                  command=self.save_template).pack(side="left", padx=2)
        ttk.Button(template_frame, text="📁 Load Template", 
                  command=self.load_template).pack(side="left", padx=2)
        ttk.Button(template_frame, text="📋 Export JSON", 
                  command=self.export_json).pack(side="left", padx=2)
        
        # View Controls
        view_frame = ttk.LabelFrame(toolbar, text="View", padding=5)
        view_frame.pack(side="left", padx=5)
        
        self.show_grid_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(view_frame, text="Show Grid", 
                       variable=self.show_grid_var,
                       command=self.toggle_grid).pack(side="left", padx=2)
        
        self.show_guides_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(view_frame, text="Show Guides", 
                       variable=self.show_guides_var,
                       command=self.toggle_guides).pack(side="left", padx=2)
        
        # Info Panel
        info_frame = ttk.Frame(toolbar)
        info_frame.pack(side="right", padx=5)
        
        self.info_label = ttk.Label(info_frame, text="No box selected", 
                                   font=('Segoe UI', 9))
        self.info_label.pack()
        
        # Main Canvas Container
        canvas_container = ttk.Frame(self)
        canvas_container.pack(fill="both", expand=True, padx=10, pady=(5, 10))
        
        # Canvas mit Scrollbars
        h_scrollbar = ttk.Scrollbar(canvas_container, orient="horizontal")
        h_scrollbar.pack(side="bottom", fill="x")
        
        v_scrollbar = ttk.Scrollbar(canvas_container, orient="vertical")
        v_scrollbar.pack(side="right", fill="y")
        
        # Drawing Canvas
        self.canvas = tk.Canvas(canvas_container, 
                               bg="#f0f0f0",
                               xscrollcommand=h_scrollbar.set,
                               yscrollcommand=v_scrollbar.set,
                               highlightthickness=1,
                               highlightbackground="#cccccc")
        self.canvas.pack(side="left", fill="both", expand=True)
        
        h_scrollbar.config(command=self.canvas.xview)
        v_scrollbar.config(command=self.canvas.yview)
        
        # Template Editor
        self.template_editor = TemplateEditor(self.canvas)
        
        # Status Bar
        self.create_status_bar()
        
        # Keyboard Shortcuts
        self.bind_shortcuts()
    
    def create_status_bar(self):
        """Erstellt die Statusleiste"""
        status_frame = ttk.Frame(self)
        status_frame.pack(side="bottom", fill="x")
        
        # Separator
        ttk.Separator(status_frame, orient="horizontal").pack(fill="x")
        
        # Status Content
        status_content = ttk.Frame(status_frame)
        status_content.pack(fill="x", padx=10, pady=2)
        
        # Project Name
        self.project_label = ttk.Label(status_content, text="No project loaded",
                                      font=('Segoe UI', 9))
        self.project_label.pack(side="left", padx=(0, 20))
        
        # Image Info
        self.image_info_label = ttk.Label(status_content, text="",
                                         font=('Segoe UI', 9))
        self.image_info_label.pack(side="left", padx=(0, 20))
        
        # Box Count
        self.box_count_label = ttk.Label(status_content, text="Boxes: 0",
                                        font=('Segoe UI', 9))
        self.box_count_label.pack(side="left", padx=(0, 20))
        
        # Mouse Position
        self.mouse_pos_label = ttk.Label(status_content, text="X: 0, Y: 0",
                                        font=('Segoe UI', 9))
        self.mouse_pos_label.pack(side="right")
        
        # Bind mouse motion
        self.canvas.bind("<Motion>", self.update_mouse_position)
        
        # Bind zoom and scroll events
        self.canvas.bind("<Control-MouseWheel>", self.on_zoom)
        self.canvas.bind("<Shift-MouseWheel>", self.on_horizontal_scroll)
        self.canvas.bind("<MouseWheel>", self.on_vertical_scroll)
        
        # Initialize zoom level
        self.zoom_level = 1.0
        self.min_zoom = 0.1
        self.max_zoom = 5.0
        self.base_display_image = None
        self.base_display_width = 0
        self.base_display_height = 0
    
    def bind_shortcuts(self):
        """Bindet Keyboard Shortcuts"""
        self.bind_all("<Control-n>", lambda e: self.add_box())
        self.bind_all("<Control-s>", lambda e: self.save_template())
        self.bind_all("<Control-o>", lambda e: self.load_template())
        self.bind_all("<Control-Shift-C>", lambda e: self.clear_all_boxes())
    
    def update_mouse_position(self, event):
        """Aktualisiert die Mausposition-Anzeige"""
        canvas_x = self.canvas.canvasx(event.x)
        canvas_y = self.canvas.canvasy(event.y)
        
        # Konvertiere zu Prozent
        if hasattr(self.template_editor, 'canvas_width') and self.template_editor.canvas_width > 0:
            percent_x = (canvas_x / self.template_editor.canvas_width) * 100
            percent_y = (canvas_y / self.template_editor.canvas_height) * 100
            self.mouse_pos_label.config(
                text=f"X: {canvas_x:.0f} ({percent_x:.1f}%), Y: {canvas_y:.0f} ({percent_y:.1f}%)"
            )
        else:
            self.mouse_pos_label.config(text=f"X: {canvas_x:.0f}, Y: {canvas_y:.0f}")
    
    def on_zoom(self, event):
        """Zoom mit Strg + Mausrad"""
        # Get current mouse position
        x = self.canvas.canvasx(event.x)
        y = self.canvas.canvasy(event.y)
        
        # Calculate zoom factor
        if event.delta > 0:
            zoom_factor = 1.1
        else:
            zoom_factor = 0.9
        
        # Apply zoom limits
        new_zoom = self.zoom_level * zoom_factor
        if self.min_zoom <= new_zoom <= self.max_zoom:
            self.zoom_level = new_zoom
            
            # Redraw background and boxes with new zoom
            self.canvas.delete("background_image")
            self.canvas.delete("grid")
            self.redraw_with_zoom()
            
            # Update scroll region
            self.update_scroll_region()
            
            # Update status
            self.update_zoom_status()
    
    def on_horizontal_scroll(self, event):
        """Horizontales Scrollen mit Shift + Mausrad"""
        delta = event.delta
        self.canvas.xview_scroll(int(-delta/120), "units")
    
    def on_vertical_scroll(self, event):
        """Vertikales Scrollen mit Mausrad"""
        delta = event.delta
        self.canvas.yview_scroll(int(-delta/120), "units")
    
    def update_scroll_region(self):
        """Aktualisiert die Scroll-Region basierend auf dem aktuellen Zoom"""
        if hasattr(self.template_editor, 'canvas_width') and self.template_editor.canvas_width > 0:
            scaled_width = int(self.template_editor.canvas_width * self.zoom_level)
            scaled_height = int(self.template_editor.canvas_height * self.zoom_level)
            self.canvas.config(scrollregion=(0, 0, scaled_width, scaled_height))
        elif hasattr(self, 'photo_image') and self.photo_image:
            # Fallback: Verwende die aktuelle Bildgröße
            width = self.photo_image.width()
            height = self.photo_image.height()
            scaled_width = int(width * self.zoom_level)
            scaled_height = int(height * self.zoom_level)
            self.canvas.config(scrollregion=(0, 0, scaled_width, scaled_height))
    
    def update_zoom_status(self):
        """Aktualisiert den Zoom-Status in der Statusleiste"""
        zoom_percent = self.zoom_level * 100
        self.image_info_label.config(
            text=f"Image: {self.current_image.size[0]}x{self.current_image.size[1]}px (Zoom: {zoom_percent:.0f}%)"
        )
    
    def redraw_with_zoom(self):
        """Zeichnet alles neu mit dem aktuellen Zoom-Level"""
        if not self.current_image:
            return
        
        # Berechne skalierte Dimensionen
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        
        if canvas_width > 1 and canvas_height > 1 and self.base_display_image:
            # Skaliere Hintergrundbild auf Zoomgröße
            scaled_w = max(1, int(self.base_display_width * self.zoom_level))
            scaled_h = max(1, int(self.base_display_height * self.zoom_level))
            resized_image = self.base_display_image.resize((scaled_w, scaled_h), Image.LANCZOS)
            
            # Konvertiere zu PhotoImage
            self.photo_image = ImageTk.PhotoImage(resized_image)
            
            # Zeige skaliertes Bild auf Canvas (ohne Offset)
            self.canvas.create_image(0, 0, anchor="nw", 
                                    image=self.photo_image,
                                    tags="background_image")
            
            # Update Template Editor Canvas Size, damit Boxen korrekt liegen
            self.template_editor.canvas_width = scaled_w
            self.template_editor.canvas_height = scaled_h
            
            # Boxen neu zeichnen
            self.template_editor.redraw()
            
            # Zeichne Grid neu falls aktiv
            if self.show_grid_var.get():
                self.draw_grid()
    
    def load_project(self, project: Dict[str, Any], image: Optional[Image.Image] = None):
        """
        Lädt ein Projekt in den Editor
        
        Args:
            project: Projekt-Daten
            image: Optional PIL Image (wenn nicht angegeben, wird aus Projekt geladen)
        """
        self.current_project = project
        
        # Lade Bild
        if image:
            self.current_image = image
        elif project.get('image_path') and os.path.exists(project['image_path']):
            self.current_image = Image.open(project['image_path'])
        else:
            messagebox.showerror("Error", "Could not load project image")
            return
        
        # Zeige Bild auf Canvas
        self.display_image()
        
        # Lade Template wenn vorhanden
        if project.get('template_path') and os.path.exists(project['template_path']):
            try:
                template_data = self.json_handler.load_template(project['template_path'])
                self.template_editor.load_template(template_data)
            except Exception as e:
                print(f"Could not load template: {e}")
        
        # Update Status
        self.project_label.config(text=f"Project: {project.get('name', 'Unnamed')}")
        self.update_status()
    
    def display_image(self):
        """Zeigt das Bild auf dem Canvas an"""
        if not self.current_image:
            return
        
        # Resize für Canvas
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        
        if canvas_width > 1 and canvas_height > 1:
            # Skaliere Bild auf Basisgröße, die in das Canvas passt
            resized_image, scale = self.image_utils.resize_to_fit(
                self.current_image,
                canvas_width,
                canvas_height
            )
            
            # Konvertiere zu PhotoImage
            self.photo_image = ImageTk.PhotoImage(resized_image)
            
            # Zeige auf Canvas (ohne Offset)
            self.canvas.delete("background_image")
            self.canvas.create_image(0, 0, anchor="nw", 
                                    image=self.photo_image,
                                    tags="background_image")
            
            # Update Template Editor Canvas Size
            img_width, img_height = resized_image.size
            self.template_editor.canvas_width = img_width
            self.template_editor.canvas_height = img_height
            
            # Speichere Basisanzeige für Zoom
            self.base_display_image = resized_image
            self.base_display_width, self.base_display_height = img_width, img_height
            
            # Configure scrollregion
            self.canvas.config(scrollregion=(0, 0, img_width, img_height))
            
            # Reset zoom level
            self.zoom_level = 1.0
            
            # Boxen neu zeichnen auf Basisgröße
            self.template_editor.redraw()
            
            # Update Status
            orig_width, orig_height = self.current_image.size
            self.image_info_label.config(
                text=f"Image: {orig_width}x{orig_height}px (Scale: {scale:.1%})"
            )
        else:
            # Canvas noch nicht bereit, später nochmal versuchen
            self.after(100, self.display_image)
    
    def add_box(self):
        """Fügt eine neue Box hinzu"""
        # Zufällige Position für neue Box
        import random
        x = random.randint(10, 40)
        y = random.randint(10, 40)
        
        self.template_editor.add_box(x, y)
        self.update_status()
    
    def remove_selected_box(self):
        """Entfernt die ausgewählte Box"""
        if self.template_editor.selected_box:
            self.template_editor.remove_box(self.template_editor.selected_box)
            self.update_status()
        else:
            messagebox.showinfo("No Selection", "Please select a box first")
    
    def clear_all_boxes(self):
        """Löscht alle Boxen"""
        if self.template_editor.boxes:
            if messagebox.askyesno("Clear All", "Remove all boxes?"):
                self.template_editor.clear_all()
                self.update_status()
    
    def save_template(self):
        """Speichert das aktuelle Template"""
        if not self.template_editor.boxes:
            messagebox.showwarning("No Boxes", "Please add at least one box")
            return
        
        if not self.current_project:
            messagebox.showwarning("No Project", "No project loaded")
            return
        
        # Hole Template-Daten
        template_data = self.template_editor.get_template()
        
        # Speichere Template
        try:
            project_name = self.current_project.get('name', 'template')
            template_path = self.json_handler.save_template(
                template_data, 
                project_name
            )
            
            # Update Projekt
            if hasattr(self, 'history_manager'):
                self.history_manager.update_project_template(
                    self.current_project['id'],
                    template_path
                )
            
            messagebox.showinfo("Success", f"Template saved: {os.path.basename(template_path)}")
            
            # Callback
            if self.on_save_callback:
                self.on_save_callback(template_path)
                
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save template: {str(e)}")
    
    def load_template(self):
        """Lädt ein Template aus Datei"""
        file_path = filedialog.askopenfilename(
            title="Load Template",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
            initialdir="data/templates"
        )
        
        if file_path:
            try:
                template_data = self.json_handler.load_template(file_path)
                self.template_editor.load_template(template_data)
                self.update_status()
                messagebox.showinfo("Success", "Template loaded successfully")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to load template: {str(e)}")
    
    def export_json(self):
        """Exportiert Template als JSON"""
        if not self.template_editor.boxes:
            messagebox.showwarning("No Boxes", "No boxes to export")
            return
        
        file_path = filedialog.asksaveasfilename(
            title="Export Template",
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        
        if file_path:
            try:
                template_data = self.template_editor.get_template()
                import json
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(template_data, f, indent=2, ensure_ascii=False)
                messagebox.showinfo("Success", f"Template exported to {os.path.basename(file_path)}")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to export: {str(e)}")
    
    def toggle_grid(self):
        """Schaltet das Raster ein/aus"""
        if self.show_grid_var.get():
            self.draw_grid()
        else:
            self.canvas.delete("grid")
    
    def draw_grid(self):
        """Zeichnet ein Raster"""
        self.canvas.delete("grid")
        
        if hasattr(self.template_editor, 'canvas_width'):
            width = self.template_editor.canvas_width
            height = self.template_editor.canvas_height
            
            # Hauptraster alle 50 Pixel
            for x in range(0, int(width), 50):
                self.canvas.create_line(x, 0, x, height, fill="#e0e0e0", tags="grid")
            for y in range(0, int(height), 50):
                self.canvas.create_line(0, y, width, y, fill="#e0e0e0", tags="grid")
            
            # Grid nach hinten
            self.canvas.tag_lower("grid")
    
    def toggle_guides(self):
        """Schaltet Hilfslinien ein/aus"""
        # Implementierung für Hilfslinien
        pass
    
    def update_status(self):
        """Aktualisiert die Statusanzeige"""
        box_count = len(self.template_editor.boxes)
        self.box_count_label.config(text=f"Boxes: {box_count}")
        
        if self.template_editor.selected_box:
            box = self.template_editor.selected_box
            self.info_label.config(
                text=f"Selected: {box.box_id} | Pos: ({box.x:.1f}%, {box.y:.1f}%) | Size: ({box.width:.1f}% x {box.height:.1f}%)"
            )
        else:
            self.info_label.config(text="No box selected")
    
    def set_history_manager(self, history_manager):
        """Setzt den History Manager"""
        self.history_manager = history_manager
