"""Testing Screen - Resolution Testing Interface"""
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from PIL import Image, ImageTk
from modules.resolution_tester import ResolutionTester
from utils.json_handler import JsonHandler
import os
from typing import List, Dict, Any, Optional


class TestingScreen(ttk.Frame):
    """Screen für Resolution Testing"""
    
    def __init__(self, parent):
        """
        Initialisiert den Testing Screen
        
        Args:
            parent: Parent Widget
        """
        super().__init__(parent)
        
        self.resolution_tester = ResolutionTester()
        self.json_handler = JsonHandler()
        self.current_template = None
        self.current_image = None
        self.test_image = None
        
        self.setup_ui()
    
    def setup_ui(self):
        """Erstellt die UI-Komponenten"""
        # Top Controls
        controls_frame = ttk.Frame(self)
        controls_frame.pack(fill="x", padx=10, pady=10)
        
        # Template Selection
        template_frame = ttk.LabelFrame(controls_frame, text="Template", padding=5)
        template_frame.pack(side="left", padx=5)
        
        ttk.Button(template_frame, text="📁 Load Template",
                  command=self.load_template).pack(side="left", padx=2)
        
        self.template_label = ttk.Label(template_frame, text="No template loaded",
                                       font=('Segoe UI', 9))
        self.template_label.pack(side="left", padx=(10, 0))
        
        # Resolution Selection
        resolution_frame = ttk.LabelFrame(controls_frame, text="Resolution", padding=5)
        resolution_frame.pack(side="left", padx=5, fill="x", expand=True)
        
        ttk.Label(resolution_frame, text="Preset:").pack(side="left", padx=(0, 5))
        
        self.resolution_var = tk.StringVar(value="Full HD (1080p)")
        self.resolution_combo = ttk.Combobox(resolution_frame, 
                                            textvariable=self.resolution_var,
                                            state="readonly",
                                            width=25)
        self.resolution_combo['values'] = self.resolution_tester.get_available_resolutions()
        self.resolution_combo.pack(side="left", padx=(0, 10))
        self.resolution_combo.bind("<<ComboboxSelected>>", self.on_resolution_change)
        
        # Custom Resolution
        ttk.Label(resolution_frame, text="Custom:").pack(side="left", padx=(0, 5))
        
        self.custom_width_var = tk.StringVar(value="1920")
        width_entry = ttk.Entry(resolution_frame, textvariable=self.custom_width_var,
                               width=8)
        width_entry.pack(side="left")
        
        ttk.Label(resolution_frame, text="x").pack(side="left", padx=2)
        
        self.custom_height_var = tk.StringVar(value="1080")
        height_entry = ttk.Entry(resolution_frame, textvariable=self.custom_height_var,
                                width=8)
        height_entry.pack(side="left")
        
        ttk.Button(resolution_frame, text="Apply Custom",
                  command=self.apply_custom_resolution).pack(side="left", padx=(5, 0))
        
        # Test Controls
        test_frame = ttk.LabelFrame(controls_frame, text="Test Options", padding=5)
        test_frame.pack(side="left", padx=5)
        
        self.show_grid_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(test_frame, text="Show Grid",
                       variable=self.show_grid_var).pack(side="left", padx=2)
        
        self.show_dimensions_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(test_frame, text="Show Dimensions",
                       variable=self.show_dimensions_var).pack(side="left", padx=2)
        
        self.use_background_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(test_frame, text="Use Background",
                       variable=self.use_background_var).pack(side="left", padx=2)
        
        # Action Buttons
        action_frame = ttk.Frame(controls_frame)
        action_frame.pack(side="right", padx=5)
        
        ttk.Button(action_frame, text="🔄 Apply Template",
                  command=self.apply_template).pack(side="left", padx=2)
        ttk.Button(action_frame, text="💾 Export Image",
                  command=self.export_image).pack(side="left", padx=2)
        ttk.Button(action_frame, text="📊 Export All",
                  command=self.export_all_resolutions).pack(side="left", padx=2)
        
        # Preview Area
        preview_container = ttk.Frame(self)
        preview_container.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        
        # Canvas mit Scrollbars
        h_scrollbar = ttk.Scrollbar(preview_container, orient="horizontal")
        h_scrollbar.pack(side="bottom", fill="x")
        
        v_scrollbar = ttk.Scrollbar(preview_container, orient="vertical")
        v_scrollbar.pack(side="right", fill="y")
        
        self.preview_canvas = tk.Canvas(preview_container,
                                       bg="white",
                                       xscrollcommand=h_scrollbar.set,
                                       yscrollcommand=v_scrollbar.set)
        self.preview_canvas.pack(side="left", fill="both", expand=True)
        
        h_scrollbar.config(command=self.preview_canvas.xview)
        v_scrollbar.config(command=self.preview_canvas.yview)
        
        # Bind zoom and scroll events
        self.preview_canvas.bind("<Control-MouseWheel>", self.on_zoom)
        self.preview_canvas.bind("<Shift-MouseWheel>", self.on_horizontal_scroll)
        self.preview_canvas.bind("<MouseWheel>", self.on_vertical_scroll)
        
        # Initialize zoom level
        self.zoom_level = 1.0
        self.min_zoom = 0.1
        self.max_zoom = 5.0
        self.base_display_image = None
        self.base_display_width = 0
        self.base_display_height = 0
        
        # Resolution Quick Access
        self.create_resolution_buttons()
        
        # Status Bar
        self.create_status_bar()
    
    def create_resolution_buttons(self):
        """Erstellt Quick-Access Buttons für häufige Auflösungen"""
        quick_frame = ttk.LabelFrame(self, text="Quick Access", padding=5)
        quick_frame.pack(side="bottom", fill="x", padx=10, pady=(0, 5))
        
        common_resolutions = [
            ("📱 Mobile", "iPhone 14"),
            ("💻 Laptop", "MacBook Air"),
            ("🖥️ Desktop", "Full HD (1080p)"),
            ("📺 4K", "4K (UHD)"),
            ("🎮 Ultrawide", "Ultrawide 21:9")
        ]
        
        for label, resolution in common_resolutions:
            ttk.Button(quick_frame, text=label,
                      command=lambda r=resolution: self.quick_select_resolution(r)
                      ).pack(side="left", padx=2)
    
    def create_status_bar(self):
        """Erstellt die Statusleiste"""
        status_frame = ttk.Frame(self)
        status_frame.pack(side="bottom", fill="x")
        
        ttk.Separator(status_frame, orient="horizontal").pack(fill="x")
        
        status_content = ttk.Frame(status_frame)
        status_content.pack(fill="x", padx=10, pady=2)
        
        self.status_label = ttk.Label(status_content, 
                                     text="Ready to test",
                                     font=('Segoe UI', 9))
        self.status_label.pack(side="left")
        
        self.resolution_info_label = ttk.Label(status_content,
                                              text="",
                                              font=('Segoe UI', 9))
        self.resolution_info_label.pack(side="right")
    
    def on_zoom(self, event):
        """Zoom mit Strg + Mausrad"""
        # Get current mouse position
        x = self.preview_canvas.canvasx(event.x)
        y = self.preview_canvas.canvasy(event.y)
        
        # Calculate zoom factor
        if event.delta > 0:
            zoom_factor = 1.1
        else:
            zoom_factor = 0.9
        
        # Apply zoom limits
        new_zoom = self.zoom_level * zoom_factor
        if self.min_zoom <= new_zoom <= self.max_zoom:
            self.zoom_level = new_zoom
            
            # Clear canvas and redraw everything with new zoom
            self.preview_canvas.delete("all")
            self.redraw_with_zoom()
            
            # Update scroll region
            self.update_scroll_region()
            
            # Update status
            self.update_zoom_status()
    
    def on_horizontal_scroll(self, event):
        """Horizontales Scrollen mit Shift + Mausrad"""
        delta = event.delta
        self.preview_canvas.xview_scroll(int(-delta/120), "units")
    
    def on_vertical_scroll(self, event):
        """Vertikales Scrollen mit Mausrad"""
        delta = event.delta
        self.preview_canvas.yview_scroll(int(-delta/120), "units")
    
    def update_scroll_region(self):
        """Aktualisiert die Scroll-Region basierend auf dem aktuellen Zoom"""
        if hasattr(self, 'current_image_size') and self.current_image_size:
            scaled_width = int(self.current_image_size[0] * self.zoom_level)
            scaled_height = int(self.current_image_size[1] * self.zoom_level)
            self.preview_canvas.config(scrollregion=(0, 0, scaled_width, scaled_height))
    
    def update_zoom_status(self):
        """Aktualisiert den Zoom-Status in der Statusleiste"""
        zoom_percent = self.zoom_level * 100
        if hasattr(self, 'current_image_size') and self.current_image_size:
            self.resolution_info_label.config(
                text=f"Zoom: {zoom_percent:.0f}% | {self.current_image_size[0]}x{self.current_image_size[1]}px"
            )
    
    def redraw_with_zoom(self):
        """Zeichnet alles neu mit dem aktuellen Zoom-Level"""
        if not self.test_image:
            return
        
        # Zeichne skaliertes Bild entsprechend Zoom
        if self.base_display_image:
            scaled_w = max(1, int(self.base_display_width * self.zoom_level))
            scaled_h = max(1, int(self.base_display_height * self.zoom_level))
            resized_image = self.base_display_image.resize((scaled_w, scaled_h), Image.LANCZOS)
            self.photo_image = ImageTk.PhotoImage(resized_image)
            self.preview_canvas.create_image(0, 0, anchor="nw", image=self.photo_image, tags="background_image")
            
            # Update Scrollregion basierend auf Zoom
            self.preview_canvas.config(scrollregion=(0, 0, scaled_w, scaled_h))
    
    def on_resolution_change(self, event=None):
        """Handler für Auflösungsänderung"""
        resolution = self.resolution_var.get()
        
        if resolution == "Custom":
            # Aktiviere Custom-Felder
            pass
        else:
            # Update Custom-Felder mit aktuellen Werten
            width, height = self.resolution_tester.RESOLUTIONS[resolution]
            self.custom_width_var.set(str(width))
            self.custom_height_var.set(str(height))
        
        self.update_resolution_info()
    
    def apply_custom_resolution(self):
        """Wendet eine benutzerdefinierte Auflösung an"""
        try:
            width = int(self.custom_width_var.get())
            height = int(self.custom_height_var.get())
            
            if width < 100 or height < 100:
                raise ValueError("Resolution too small")
            if width > 10000 or height > 10000:
                raise ValueError("Resolution too large")
            
            self.resolution_tester.set_resolution("Custom", width, height)
            self.resolution_var.set("Custom")
            self.update_resolution_info()
            
            if self.current_template:
                self.apply_template()
                
        except ValueError as e:
            messagebox.showerror("Invalid Resolution", 
                               f"Please enter valid resolution values\n{str(e)}")
    
    def quick_select_resolution(self, resolution: str):
        """Schnellauswahl einer Auflösung"""
        self.resolution_var.set(resolution)
        self.on_resolution_change()
        
        if self.current_template:
            self.apply_template()
    
    def update_resolution_info(self):
        """Aktualisiert die Auflösungs-Info"""
        width, height = self.resolution_tester.get_current_resolution()
        self.resolution_info_label.config(
            text=f"Current: {width}x{height}px | Aspect: {self._calculate_aspect_ratio(width, height)}"
        )
    
    def _calculate_aspect_ratio(self, width: int, height: int) -> str:
        """Berechnet das Seitenverhältnis"""
        from math import gcd
        divisor = gcd(width, height)
        return f"{width//divisor}:{height//divisor}"
    
    def load_template(self):
        """Lädt ein Template"""
        file_path = filedialog.askopenfilename(
            title="Load Template",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
            initialdir="data/templates"
        )
        
        if file_path:
            try:
                self.current_template = self.json_handler.load_template(file_path)
                self.template_label.config(text=os.path.basename(file_path))
                self.status_label.config(text=f"Template loaded: {len(self.current_template)} boxes")
                
                # Auto-apply
                self.apply_template()
                
            except Exception as e:
                messagebox.showerror("Error", f"Failed to load template: {str(e)}")
    
    def set_template(self, template_data: List[Dict[str, Any]]):
        """Setzt das Template programmatisch"""
        self.current_template = template_data
        self.template_label.config(text=f"Template ({len(template_data)} boxes)")
        self.apply_template()
    
    def set_background_image(self, image: Image.Image):
        """Setzt das Hintergrundbild"""
        self.current_image = image
        self.use_background_var.set(True)
    
    def apply_template(self):
        """Wendet das Template auf die aktuelle Auflösung an"""
        if not self.current_template:
            messagebox.showwarning("No Template", "Please load a template first")
            return
        
        try:
            # Setze aktuelle Auflösung
            resolution = self.resolution_var.get()
            if resolution != "Custom":
                self.resolution_tester.set_resolution(resolution)
            
            # Generiere Testbild
            background = self.current_image if self.use_background_var.get() else None
            
            self.test_image = self.resolution_tester.apply_template(
                self.current_template,
                background_image=background,
                show_grid=self.show_grid_var.get(),
                show_dimensions=self.show_dimensions_var.get()
            )
            
            # Zeige auf Canvas
            self.display_test_image()
            
            # Update Status
            width, height = self.resolution_tester.get_current_resolution()
            self.status_label.config(text=f"Template applied to {width}x{height}")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to apply template: {str(e)}")
    
    def display_test_image(self):
        """Zeigt das Testbild auf dem Canvas"""
        if not self.test_image:
            return
        
        # Konvertiere zu PhotoImage
        self.photo_image = ImageTk.PhotoImage(self.test_image)
        
        # Lösche alten Content
        self.preview_canvas.delete("all")
        
        # Zeige Bild
        self.preview_canvas.create_image(0, 0, anchor="nw", image=self.photo_image, tags="background_image")
        
        # Store base image for zoom
        self.base_display_image = self.test_image
        self.base_display_width, self.base_display_height = self.test_image.size
        self.current_image_size = (self.base_display_width, self.base_display_height)
        
        # Reset zoom level
        self.zoom_level = 1.0
        
        # Update Scrollregion
        width, height = self.base_display_width, self.base_display_height
        self.preview_canvas.config(scrollregion=(0, 0, width, height))
    
    def export_image(self):
        """Exportiert das aktuelle Testbild"""
        if not self.test_image:
            messagebox.showwarning("No Image", "Please apply a template first")
            return
        
        file_path = filedialog.asksaveasfilename(
            title="Export Test Image",
            defaultextension=".png",
            filetypes=[
                ("PNG files", "*.png"),
                ("JPEG files", "*.jpg"),
                ("All files", "*.*")
            ]
        )
        
        if file_path:
            try:
                self.test_image.save(file_path)
                messagebox.showinfo("Success", f"Image exported to {os.path.basename(file_path)}")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to export: {str(e)}")
    
    def export_all_resolutions(self):
        """Exportiert Tests für alle Auflösungen"""
        if not self.current_template:
            messagebox.showwarning("No Template", "Please load a template first")
            return
        
        # Auswahl der Auflösungen
        dialog = ResolutionSelectionDialog(self, self.resolution_tester.get_available_resolutions())
        self.wait_window(dialog)
        
        if dialog.selected_resolutions:
            output_dir = filedialog.askdirectory(title="Select Output Directory")
            
            if output_dir:
                try:
                    # Exportiere für ausgewählte Auflösungen
                    background = self.current_image if self.use_background_var.get() else None
                    
                    files = self.resolution_tester.export_test_results(
                        self.current_template,
                        output_dir=output_dir,
                        resolutions=dialog.selected_resolutions,
                        background_image=background
                    )
                    
                    messagebox.showinfo("Success", 
                                      f"Exported {len(files)} test images to {output_dir}")
                    
                except Exception as e:
                    messagebox.showerror("Error", f"Export failed: {str(e)}")


class ResolutionSelectionDialog(tk.Toplevel):
    """Dialog zur Auswahl mehrerer Auflösungen"""
    
    def __init__(self, parent, resolutions: List[str]):
        super().__init__(parent)
        
        self.title("Select Resolutions")
        self.geometry("400x500")
        self.resizable(False, False)
        
        self.selected_resolutions = []
        
        # Header
        ttk.Label(self, text="Select resolutions to export:",
                 font=('Segoe UI', 11)).pack(pady=10)
        
        # Checkboxes Frame mit Scrollbar
        frame = ttk.Frame(self)
        frame.pack(fill="both", expand=True, padx=20, pady=(0, 10))
        
        scrollbar = ttk.Scrollbar(frame)
        scrollbar.pack(side="right", fill="y")
        
        # Listbox mit Checkboxes
        self.listbox = tk.Listbox(frame, selectmode="multiple",
                                 yscrollcommand=scrollbar.set)
        self.listbox.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.listbox.yview)
        
        # Füge Auflösungen hinzu
        for resolution in resolutions:
            if resolution != "Custom":
                self.listbox.insert(tk.END, resolution)
        
        # Buttons
        button_frame = ttk.Frame(self)
        button_frame.pack(pady=10)
        
        ttk.Button(button_frame, text="Select All",
                  command=self.select_all).pack(side="left", padx=5)
        ttk.Button(button_frame, text="Clear All",
                  command=self.clear_all).pack(side="left", padx=5)
        ttk.Button(button_frame, text="OK",
                  command=self.ok_clicked).pack(side="left", padx=5)
        ttk.Button(button_frame, text="Cancel",
                  command=self.destroy).pack(side="left", padx=5)
    
    def select_all(self):
        """Wählt alle Einträge aus"""
        self.listbox.select_set(0, tk.END)
    
    def clear_all(self):
        """Löscht alle Auswahlen"""
        self.listbox.select_clear(0, tk.END)
    
    def ok_clicked(self):
        """OK Button geklickt"""
        selections = self.listbox.curselection()
        self.selected_resolutions = [self.listbox.get(i) for i in selections]
        self.destroy()
