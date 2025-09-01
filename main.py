"""
Template Generator - Main Application
A comprehensive tool for creating and testing template overlays
"""

import tkinter as tk
from tkinter import ttk, messagebox
import sys
import os
from PIL import Image

# Add modules to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import modules
from modules.history_manager import HistoryManager
from modules.screen_capture import ScreenCapture
from gui.history_screen import HistoryScreen
from gui.drawing_screen import DrawingScreen
from gui.testing_screen import TestingScreen


class TemplateGeneratorApp:
    """Main Application Class"""
    
    def __init__(self):
        """Initialize the application"""
        self.root = tk.Tk()
        self.root.title("Template Generator - Professional Template Overlay System")
        
        # Set window size and center
        self.setup_window()
        
        # Initialize managers
        self.history_manager = HistoryManager()
        
        # Current state
        self.current_project = None
        self.current_image = None
        self.current_template = None
        
        # Setup UI
        self.setup_ui()
        
        # Apply styles
        self.apply_styles()
        
        # Bind global shortcuts
        self.bind_shortcuts()
    
    def setup_window(self):
        """Setup main window properties"""
        # Window size
        width = 1400
        height = 800
        
        # Get screen dimensions
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        
        # Calculate center position
        x = (screen_width - width) // 2
        y = (screen_height - height) // 2
        
        # Set geometry
        self.root.geometry(f"{width}x{height}+{x}+{y}")
        
        # Set minimum size
        self.root.minsize(1200, 600)
        
        # Set icon (if available)
        try:
            if os.path.exists("assets/icon.ico"):
                self.root.iconbitmap("assets/icon.ico")
        except:
            pass
    
    def setup_ui(self):
        """Setup the main UI structure"""
        # Main container
        main_container = ttk.Frame(self.root)
        main_container.pack(fill="both", expand=True)
        
        # Create Notebook for tabs
        self.notebook = ttk.Notebook(main_container)
        self.notebook.pack(fill="both", expand=True, padx=5, pady=5)
        
        # Create screens
        self.create_history_screen()
        self.create_drawing_screen()
        self.create_testing_screen()
        
        # Bind tab change event
        self.notebook.bind("<<NotebookTabChanged>>", self.on_tab_changed)
        
        # Start with history screen
        self.notebook.select(0)
    
    def create_history_screen(self):
        """Create the history/start screen"""
        self.history_screen = HistoryScreen(
            self.notebook,
            self.history_manager,
            on_project_open=self.open_project,
            on_new_project=self.create_new_project
        )
        
        self.notebook.add(self.history_screen, text="  📚 History / Start  ")
    
    def create_drawing_screen(self):
        """Create the drawing/editor screen"""
        self.drawing_screen = DrawingScreen(
            self.notebook,
            on_save_callback=self.on_template_saved
        )
        
        # Set history manager
        self.drawing_screen.set_history_manager(self.history_manager)
        
        self.notebook.add(self.drawing_screen, text="  ✏️ Drawing / Editor  ")
    
    def create_testing_screen(self):
        """Create the testing screen"""
        self.testing_screen = TestingScreen(self.notebook)
        
        self.notebook.add(self.testing_screen, text="  🧪 Testing / Resolution  ")
    
    def apply_styles(self):
        """Apply custom styles to the application"""
        style = ttk.Style()
        
        # Configure Notebook style
        style.configure('TNotebook', tabposition='n')
        style.configure('TNotebook.Tab', padding=[20, 10], font=('Segoe UI', 10))
        
        # Configure Frame styles
        style.configure('Card.TFrame', relief='solid', borderwidth=1)
        
        # Configure Button styles
        style.configure('Action.TButton', font=('Segoe UI', 10))
    
    def bind_shortcuts(self):
        """Bind global keyboard shortcuts"""
        self.root.bind("<Control-q>", lambda e: self.quit_application())
        self.root.bind("<Control-h>", lambda e: self.show_help())
        self.root.bind("<F1>", lambda e: self.show_help())
        
        # Tab navigation
        self.root.bind("<Control-1>", lambda e: self.notebook.select(0))
        self.root.bind("<Control-2>", lambda e: self.notebook.select(1))
        self.root.bind("<Control-3>", lambda e: self.notebook.select(2))
    
    def on_tab_changed(self, event):
        """Handle tab change event"""
        selected_tab = self.notebook.select()
        tab_index = self.notebook.index(selected_tab)
        
        # Update window title based on tab
        tab_names = ["History", "Drawing", "Testing"]
        if tab_index < len(tab_names):
            self.root.title(f"Template Generator - {tab_names[tab_index]}")
    
    def open_project(self, project):
        """Open an existing project"""
        self.current_project = project
        
        # Load in drawing screen
        self.drawing_screen.load_project(project)
        
        # Switch to drawing tab
        self.notebook.select(1)
        
        # If template exists, also load in testing
        if project.get('template_path') and os.path.exists(project['template_path']):
            try:
                from utils.json_handler import JsonHandler
                template_data = JsonHandler().load_template(project['template_path'])
                self.testing_screen.set_template(template_data)
                
                # Set background image if available
                if project.get('image_path') and os.path.exists(project['image_path']):
                    image = Image.open(project['image_path'])
                    self.testing_screen.set_background_image(image)
            except:
                pass
    
    def create_new_project(self, project, image):
        """Create a new project from capture"""
        self.current_project = project
        self.current_image = image
        
        # Load in drawing screen
        self.drawing_screen.load_project(project, image)
        
        # Switch to drawing tab
        self.notebook.select(1)
        
        # Also set in testing screen
        self.testing_screen.set_background_image(image)
    
    def on_template_saved(self, template_path):
        """Handle template save event"""
        # Update project
        if self.current_project:
            self.history_manager.update_project_template(
                self.current_project['id'],
                template_path
            )
        
        # Load in testing screen
        try:
            from utils.json_handler import JsonHandler
            template_data = JsonHandler().load_template(template_path)
            self.testing_screen.set_template(template_data)
        except:
            pass
    
    def show_help(self):
        """Show help dialog"""
        help_text = """
Template Generator - Help

SHORTCUTS:
• Ctrl+1/2/3: Switch between tabs
• Ctrl+N: Add new box (in Drawing)
• Ctrl+S: Save template (in Drawing)
• Ctrl+O: Load template
• Delete: Remove selected box
• F1: Show this help
• Ctrl+Q: Quit application

WORKFLOW:
1. Start: Create new project from screenshot or image
2. Drawing: Add and position template boxes
3. Testing: Test template on different resolutions

FEATURES:
• Drag & Drop box editing with resize handles
• Relative coordinates for resolution independence
• JSON export/import for templates
• Multi-monitor screenshot support
• Window capture functionality
• Project history management

For more information, check the README file.
        """
        
        messagebox.showinfo("Help", help_text)
    
    def quit_application(self):
        """Quit the application"""
        if messagebox.askyesno("Quit", "Are you sure you want to quit?"):
            self.root.quit()
    
    def run(self):
        """Run the application"""
        # Set DPI awareness for Windows
        try:
            from ctypes import windll
            windll.shcore.SetProcessDpiAwareness(1)
        except:
            pass
        
        # Start main loop
        self.root.mainloop()


def main():
    """Main entry point"""
    # Check Python version
    if sys.version_info < (3, 7):
        print("Error: Python 3.7 or higher is required")
        sys.exit(1)
    
    # Create and run application
    app = TemplateGeneratorApp()
    app.run()


if __name__ == "__main__":
    main()