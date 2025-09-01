"""History Screen - Startseite mit Projektauswahl"""
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from PIL import Image, ImageTk
import os
from typing import Callable, Optional
from modules.history_manager import HistoryManager
from modules.screen_capture import ScreenCapture


class HistoryScreen(ttk.Frame):
    """Startseite mit Historie und Capture-Optionen"""
    
    def __init__(self, parent, history_manager: HistoryManager, 
                 on_project_open: Callable, on_new_project: Callable):
        """
        Initialisiert den History Screen
        
        Args:
            parent: Parent Widget
            history_manager: History Manager Instanz
            on_project_open: Callback für Projekt öffnen
            on_new_project: Callback für neues Projekt
        """
        super().__init__(parent)
        
        self.history_manager = history_manager
        self.screen_capture = ScreenCapture()
        self.on_project_open = on_project_open
        self.on_new_project = on_new_project
        
        self.selected_project = None
        
        self.setup_ui()
        self.refresh_history()
    
    def setup_ui(self):
        """Erstellt die UI-Komponenten"""
        # Hauptcontainer mit Grid
        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=2)
        self.grid_rowconfigure(1, weight=1)
        
        # Header
        header_frame = ttk.Frame(self)
        header_frame.grid(row=0, column=0, columnspan=2, sticky="ew", padx=20, pady=20)
        
        title_label = ttk.Label(header_frame, text="Template Generator", 
                               font=('Segoe UI', 24, 'bold'))
        title_label.pack(side="left")
        
        subtitle_label = ttk.Label(header_frame, text="Create and manage template overlays", 
                                  font=('Segoe UI', 11))
        subtitle_label.pack(side="left", padx=(20, 0))
        
        # Linke Seite - Capture Optionen
        left_frame = ttk.Frame(self)
        left_frame.grid(row=1, column=0, sticky="nsew", padx=(20, 10), pady=10)
        
        # Capture Section
        capture_label = ttk.Label(left_frame, text="Create New Project", 
                                 font=('Segoe UI', 14, 'bold'))
        capture_label.pack(anchor="w", pady=(0, 15))
        
        # Capture Buttons mit Icons und Beschreibungen
        self.create_capture_buttons(left_frame)
        
        # Rechte Seite - Historie
        right_frame = ttk.Frame(self)
        right_frame.grid(row=1, column=1, sticky="nsew", padx=(10, 20), pady=10)
        
        history_label = ttk.Label(right_frame, text="Recent Projects", 
                                 font=('Segoe UI', 14, 'bold'))
        history_label.pack(anchor="w", pady=(0, 15))
        
        # Suchfeld
        search_frame = ttk.Frame(right_frame)
        search_frame.pack(fill="x", pady=(0, 10))
        
        self.search_var = tk.StringVar()
        self.search_var.trace("w", lambda *args: self.filter_history())
        
        search_entry = ttk.Entry(search_frame, textvariable=self.search_var,
                                font=('Segoe UI', 10))
        search_entry.pack(side="left", fill="x", expand=True)
        
        clear_btn = ttk.Button(search_frame, text="Clear", width=8,
                              command=lambda: self.search_var.set(""))
        clear_btn.pack(side="left", padx=(5, 0))
        
        # History Liste mit Scrollbar
        history_container = ttk.Frame(right_frame)
        history_container.pack(fill="both", expand=True)
        
        scrollbar = ttk.Scrollbar(history_container)
        scrollbar.pack(side="right", fill="y")
        
        # Canvas für History Items
        self.history_canvas = tk.Canvas(history_container, 
                                       yscrollcommand=scrollbar.set,
                                       highlightthickness=0)
        self.history_canvas.pack(side="left", fill="both", expand=True)
        
        scrollbar.config(command=self.history_canvas.yview)
        
        # Frame im Canvas für History Items
        self.history_frame = ttk.Frame(self.history_canvas)
        self.history_canvas_window = self.history_canvas.create_window(
            0, 0, anchor="nw", window=self.history_frame
        )
        
        # Bind Canvas Resize
        self.history_frame.bind("<Configure>", self.on_history_frame_configure)
        self.history_canvas.bind("<Configure>", self.on_canvas_configure)
        
        # Mouse Wheel Binding
        self.history_canvas.bind_all("<MouseWheel>", self.on_mousewheel)
    
    def create_capture_buttons(self, parent):
        """Erstellt die Capture-Buttons"""
        button_style = {"width": 25}
        
        # Full Screen Capture
        screen_frame = ttk.LabelFrame(parent, text="Screen Capture", padding=15)
        screen_frame.pack(fill="x", pady=(0, 15))
        
        # Monitor Selection
        monitor_frame = ttk.Frame(screen_frame)
        monitor_frame.pack(fill="x", pady=(0, 10))
        
        ttk.Label(monitor_frame, text="Monitor:").pack(side="left")
        
        self.monitor_var = tk.StringVar()
        monitor_combo = ttk.Combobox(monitor_frame, textvariable=self.monitor_var,
                                     state="readonly", width=20)
        monitor_combo.pack(side="left", padx=(10, 0))
        
        # Populate monitors
        monitors = self.screen_capture.monitors
        monitor_names = [f"{m['name']}{' (Primary)' if m['is_primary'] else ''}" 
                        for m in monitors]
        monitor_combo['values'] = monitor_names
        if monitor_names:
            monitor_combo.current(0)
        
        ttk.Button(screen_frame, text="📸 Capture Full Screen",
                  command=self.capture_full_screen, **button_style).pack(pady=5)
        
        ttk.Button(screen_frame, text="✂️ Select Region",
                  command=self.capture_region, **button_style).pack(pady=5)
        
        # Window Capture
        window_frame = ttk.LabelFrame(parent, text="Window Capture", padding=15)
        window_frame.pack(fill="x", pady=(0, 15))
        
        # Window Selection
        window_select_frame = ttk.Frame(window_frame)
        window_select_frame.pack(fill="x", pady=(0, 10))
        
        ttk.Label(window_select_frame, text="Window:").pack(side="left")
        
        self.window_var = tk.StringVar()
        self.window_combo = ttk.Combobox(window_select_frame, textvariable=self.window_var,
                                         state="readonly", width=30)
        self.window_combo.pack(side="left", padx=(10, 0), fill="x", expand=True)
        
        refresh_btn = ttk.Button(window_select_frame, text="🔄", width=3,
                                command=self.refresh_windows)
        refresh_btn.pack(side="left", padx=(5, 0))
        
        self.refresh_windows()
        
        ttk.Button(window_frame, text="🪟 Capture Window",
                  command=self.capture_window, **button_style).pack(pady=5)
        
        # File Selection
        file_frame = ttk.LabelFrame(parent, text="From File", padding=15)
        file_frame.pack(fill="x", pady=(0, 15))
        
        ttk.Button(file_frame, text="📁 Select Image File",
                  command=self.select_image_file, **button_style).pack(pady=5)
    
    def refresh_windows(self):
        """Aktualisiert die Fensterliste"""
        windows = self.screen_capture.get_window_list()
        window_titles = [w['title'][:50] for w in windows]
        self.window_combo['values'] = window_titles
        if window_titles:
            self.window_combo.current(0)
        self.windows_data = windows
    
    def on_history_frame_configure(self, event):
        """Handler für History Frame Resize"""
        self.history_canvas.configure(scrollregion=self.history_canvas.bbox("all"))
    
    def on_canvas_configure(self, event):
        """Handler für Canvas Resize"""
        canvas_width = event.width
        self.history_canvas.itemconfig(self.history_canvas_window, width=canvas_width)
    
    def on_mousewheel(self, event):
        """Handler für Mausrad-Scrolling"""
        self.history_canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
    
    def refresh_history(self):
        """Aktualisiert die History-Anzeige"""
        # Lösche alte Items
        for widget in self.history_frame.winfo_children():
            widget.destroy()
        
        # Hole Projekte
        projects = self.history_manager.get_recent_projects(20)
        
        if not projects:
            no_projects_label = ttk.Label(self.history_frame, 
                                         text="No projects yet. Create your first project!",
                                         font=('Segoe UI', 11), foreground="gray")
            no_projects_label.pack(pady=50)
            return
        
        # Erstelle Project Cards
        for project in projects:
            self.create_project_card(project)
    
    def filter_history(self):
        """Filtert die History nach Suchbegriff"""
        query = self.search_var.get()
        
        if query:
            projects = self.history_manager.search_projects(query)
        else:
            projects = self.history_manager.get_recent_projects(20)
        
        # Lösche alte Items
        for widget in self.history_frame.winfo_children():
            widget.destroy()
        
        # Erstelle gefilterte Cards
        for project in projects:
            self.create_project_card(project)
    
    def create_project_card(self, project):
        """Erstellt eine Project Card"""
        card = ttk.Frame(self.history_frame, relief="solid", borderwidth=1)
        card.pack(fill="x", pady=5, padx=5)
        
        # Hover-Effekt
        def on_enter(e):
            card.configure(relief="raised", borderwidth=2)
        
        def on_leave(e):
            card.configure(relief="solid", borderwidth=1)
        
        card.bind("<Enter>", on_enter)
        card.bind("<Leave>", on_leave)
        
        # Card Content
        content_frame = ttk.Frame(card)
        content_frame.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Thumbnail (wenn vorhanden)
        if project.get('thumbnail') and os.path.exists(project['thumbnail']):
            try:
                img = Image.open(project['thumbnail'])
                img.thumbnail((80, 80), Image.Resampling.LANCZOS)
                photo = ImageTk.PhotoImage(img)
                
                thumb_label = ttk.Label(content_frame, image=photo)
                thumb_label.image = photo  # Keep reference
                thumb_label.pack(side="left", padx=(0, 10))
            except:
                pass
        
        # Project Info
        info_frame = ttk.Frame(content_frame)
        info_frame.pack(side="left", fill="both", expand=True)
        
        name_label = ttk.Label(info_frame, text=project['name'],
                               font=('Segoe UI', 11, 'bold'))
        name_label.pack(anchor="w")
        
        # Meta Info
        meta_text = f"Created: {project['created'][:10]}"
        if project.get('has_template'):
            meta_text += " | ✓ Has Template"
        
        meta_label = ttk.Label(info_frame, text=meta_text,
                              font=('Segoe UI', 9), foreground="gray")
        meta_label.pack(anchor="w", pady=(2, 0))
        
        if project.get('original_image'):
            file_label = ttk.Label(info_frame, text=f"📷 {project['original_image']}",
                                  font=('Segoe UI', 9), foreground="gray")
            file_label.pack(anchor="w")
        
        # Action Buttons
        action_frame = ttk.Frame(content_frame)
        action_frame.pack(side="right", padx=(10, 0))
        
        open_btn = ttk.Button(action_frame, text="Open", width=8,
                             command=lambda: self.open_project(project['id']))
        open_btn.pack(side="left", padx=2)
        
        delete_btn = ttk.Button(action_frame, text="🗑", width=3,
                               command=lambda: self.delete_project(project['id']))
        delete_btn.pack(side="left", padx=2)
    
    def open_project(self, project_id):
        """Öffnet ein Projekt"""
        project = self.history_manager.load_project(project_id)
        if project:
            self.on_project_open(project)
    
    def delete_project(self, project_id):
        """Löscht ein Projekt"""
        if messagebox.askyesno("Delete Project", 
                               "Are you sure you want to delete this project?"):
            self.history_manager.delete_project(project_id)
            self.refresh_history()
    
    def capture_full_screen(self):
        """Nimmt einen Full-Screen Screenshot auf"""
        try:
            # Hide main window
            self.winfo_toplevel().withdraw()
            self.update()
            
            # Get selected monitor
            monitor_index = self.monitor_var.get()
            if monitor_index:
                monitor_index = int(monitor_index.split()[1]) - 1
            else:
                monitor_index = 0
            
            # Capture
            image = self.screen_capture.capture_full_screen(monitor_index)
            
            # Show window again
            self.winfo_toplevel().deiconify()
            
            # Create project
            self.create_project_from_image(image)
            
        except Exception as e:
            self.winfo_toplevel().deiconify()
            messagebox.showerror("Error", f"Failed to capture screen: {str(e)}")
    
    def capture_region(self):
        """Lässt Benutzer eine Region auswählen"""
        try:
            # Hide main window
            self.winfo_toplevel().withdraw()
            self.update()
            
            # Select region
            region = self.screen_capture.select_region_interactive()
            
            if region:
                x, y, width, height = region
                image = self.screen_capture.capture_region(x, y, width, height)
                
                # Show window again
                self.winfo_toplevel().deiconify()
                
                # Create project
                self.create_project_from_image(image)
            else:
                self.winfo_toplevel().deiconify()
                
        except Exception as e:
            self.winfo_toplevel().deiconify()
            messagebox.showerror("Error", f"Failed to capture region: {str(e)}")
    
    def capture_window(self):
        """Nimmt Screenshot eines Fensters auf"""
        try:
            window_index = self.window_combo.current()
            if window_index < 0:
                messagebox.showwarning("No Window", "Please select a window first")
                return
            
            window_data = self.windows_data[window_index]
            
            # Hide main window
            self.winfo_toplevel().withdraw()
            self.update()
            
            # Capture window
            image = self.screen_capture.capture_window(window_data['hwnd'])
            
            # Show window again
            self.winfo_toplevel().deiconify()
            
            if image:
                self.create_project_from_image(image)
            else:
                messagebox.showerror("Error", "Failed to capture window")
                
        except Exception as e:
            self.winfo_toplevel().deiconify()
            messagebox.showerror("Error", f"Failed to capture window: {str(e)}")
    
    def select_image_file(self):
        """Lässt Benutzer eine Bilddatei auswählen"""
        file_path = filedialog.askopenfilename(
            title="Select Image",
            filetypes=[
                ("Image files", "*.png *.jpg *.jpeg *.bmp *.gif *.webp"),
                ("All files", "*.*")
            ]
        )
        
        if file_path:
            try:
                image = Image.open(file_path)
                self.create_project_from_image(image, os.path.basename(file_path))
            except Exception as e:
                messagebox.showerror("Error", f"Failed to load image: {str(e)}")
    
    def create_project_from_image(self, image: Image.Image, name: str = None):
        """Erstellt ein neues Projekt aus einem Bild"""
        if name is None:
            from datetime import datetime
            name = f"Project_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Speichere temporär
        temp_path = "temp_capture.png"
        image.save(temp_path)
        
        try:
            # Erstelle Projekt
            project = self.history_manager.create_project(name, temp_path)
            
            # Lösche temp Datei
            os.remove(temp_path)
            
            # Öffne Projekt
            self.on_new_project(project, image)
            
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            messagebox.showerror("Error", f"Failed to create project: {str(e)}")
