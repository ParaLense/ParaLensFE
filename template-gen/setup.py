"""
Setup script for Template Generator
Creates executable using PyInstaller
"""

import os
import sys
import subprocess
from pathlib import Path


def install_requirements():
    """Install required packages"""
    print("Installing requirements...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])


def create_executable():
    """Create executable using PyInstaller"""
    print("\nCreating executable...")
    
    # PyInstaller command
    cmd = [
        "pyinstaller",
        "--name", "TemplateGenerator",
        "--onefile",
        "--windowed",
        "--add-data", "utils;utils",
        "--add-data", "modules;modules",
        "--add-data", "gui;gui",
        "--hidden-import", "PIL._tkinter_finder",
        "--hidden-import", "win32gui",
        "--hidden-import", "win32ui",
        "--hidden-import", "win32con",
        "--hidden-import", "win32api",
        "main.py"
    ]
    
    # Add icon if exists
    icon_path = Path("assets/icon.ico")
    if icon_path.exists():
        cmd.extend(["--icon", str(icon_path)])
    
    # Run PyInstaller
    subprocess.check_call(cmd)
    
    print("\n✅ Executable created successfully!")
    print("📁 Location: dist/TemplateGenerator.exe")


def create_directories():
    """Create necessary directories"""
    directories = [
        "data",
        "data/templates",
        "data/screenshots", 
        "data/projects",
        "data/test_results",
        "assets"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
    
    print("✅ Directories created")


def main():
    """Main setup function"""
    print("=" * 50)
    print("Template Generator - Setup")
    print("=" * 50)
    
    # Create directories
    create_directories()
    
    # Install requirements
    response = input("\nInstall requirements? (y/n): ")
    if response.lower() == 'y':
        install_requirements()
    
    # Create executable
    response = input("\nCreate executable? (y/n): ")
    if response.lower() == 'y':
        create_executable()
    
    print("\n" + "=" * 50)
    print("Setup complete!")
    print("\nTo run the application:")
    print("  python main.py")
    print("\nOr use the executable in dist/ folder")
    print("=" * 50)


if __name__ == "__main__":
    main()
