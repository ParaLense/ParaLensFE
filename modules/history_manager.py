"""History Manager für Projektverwaltung"""
import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
import shutil


class HistoryManager:
    def __init__(self, base_path: str = "data"):
        """
        Initialisiert den History Manager
        
        Args:
            base_path: Basis-Pfad für alle Daten
        """
        self.base_path = base_path
        self.history_file = os.path.join(base_path, "history.json")
        self.projects_path = os.path.join(base_path, "projects")
        self.screenshots_path = os.path.join(base_path, "screenshots")
        self.templates_path = os.path.join(base_path, "templates")
        
        # Erstelle notwendige Verzeichnisse
        self._create_directories()
        
        # Lade History
        self.history = self._load_history()
        
    def _create_directories(self):
        """Erstellt notwendige Verzeichnisse"""
        for path in [self.projects_path, self.screenshots_path, self.templates_path]:
            os.makedirs(path, exist_ok=True)
    
    def _load_history(self) -> List[Dict[str, Any]]:
        """
        Lädt die Projekt-Historie
        
        Returns:
            Liste von Projekt-Einträgen
        """
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return []
        return []
    
    def _save_history(self):
        """Speichert die aktuelle Historie"""
        with open(self.history_file, 'w', encoding='utf-8') as f:
            json.dump(self.history, f, indent=2, ensure_ascii=False)
    
    def create_project(self, name: str, image_path: str, template_path: str = None) -> Dict[str, Any]:
        """
        Erstellt ein neues Projekt
        
        Args:
            name: Projektname
            image_path: Pfad zum Bild
            template_path: Optionaler Pfad zum Template
            
        Returns:
            Projekt-Dictionary
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        project_id = f"{name}_{timestamp}"
        
        # Kopiere Bild in Projekt-Ordner
        project_dir = os.path.join(self.projects_path, project_id)
        os.makedirs(project_dir, exist_ok=True)
        
        # Kopiere Bild
        image_ext = os.path.splitext(image_path)[1]
        new_image_path = os.path.join(project_dir, f"image{image_ext}")
        shutil.copy2(image_path, new_image_path)
        
        # Projekt-Info
        project_info = {
            "id": project_id,
            "name": name,
            "created": datetime.now().isoformat(),
            "last_modified": datetime.now().isoformat(),
            "image_path": new_image_path,
            "template_path": template_path,
            "original_image": os.path.basename(image_path),
            "thumbnail": self._create_thumbnail(new_image_path, project_dir)
        }
        
        # Speichere Projekt-Info
        info_path = os.path.join(project_dir, "project.json")
        with open(info_path, 'w', encoding='utf-8') as f:
            json.dump(project_info, f, indent=2, ensure_ascii=False)
        
        # Füge zur Historie hinzu
        self.add_to_history(project_info)
        
        return project_info
    
    def _create_thumbnail(self, image_path: str, project_dir: str) -> str:
        """
        Erstellt ein Thumbnail für die Historie
        
        Args:
            image_path: Pfad zum Original-Bild
            project_dir: Projekt-Verzeichnis
            
        Returns:
            Pfad zum Thumbnail
        """
        try:
            from PIL import Image
            
            img = Image.open(image_path)
            img.thumbnail((200, 200), Image.Resampling.LANCZOS)
            
            thumb_path = os.path.join(project_dir, "thumbnail.png")
            img.save(thumb_path)
            
            return thumb_path
        except:
            return image_path
    
    def add_to_history(self, project_info: Dict[str, Any]):
        """
        Fügt ein Projekt zur Historie hinzu
        
        Args:
            project_info: Projekt-Informationen
        """
        # Entferne ältere Version des gleichen Projekts
        self.history = [p for p in self.history if p['id'] != project_info['id']]
        
        # Füge am Anfang hinzu (neueste zuerst)
        self.history.insert(0, {
            "id": project_info['id'],
            "name": project_info['name'],
            "created": project_info['created'],
            "last_modified": project_info['last_modified'],
            "thumbnail": project_info.get('thumbnail'),
            "original_image": project_info.get('original_image'),
            "has_template": project_info.get('template_path') is not None
        })
        
        # Behalte nur die letzten 50 Einträge
        self.history = self.history[:50]
        
        self._save_history()
    
    def get_recent_projects(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Gibt die neuesten Projekte zurück
        
        Args:
            limit: Maximale Anzahl
            
        Returns:
            Liste von Projekten
        """
        return self.history[:limit]
    
    def load_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """
        Lädt ein Projekt
        
        Args:
            project_id: Projekt-ID
            
        Returns:
            Projekt-Informationen oder None
        """
        project_dir = os.path.join(self.projects_path, project_id)
        info_path = os.path.join(project_dir, "project.json")
        
        if os.path.exists(info_path):
            with open(info_path, 'r', encoding='utf-8') as f:
                project_info = json.load(f)
            
            # Aktualisiere last_modified
            project_info['last_modified'] = datetime.now().isoformat()
            
            # Speichere aktualisierte Info
            with open(info_path, 'w', encoding='utf-8') as f:
                json.dump(project_info, f, indent=2, ensure_ascii=False)
            
            # Aktualisiere Historie
            self.add_to_history(project_info)
            
            return project_info
        
        return None
    
    def update_project_template(self, project_id: str, template_path: str):
        """
        Aktualisiert das Template eines Projekts
        
        Args:
            project_id: Projekt-ID
            template_path: Neuer Template-Pfad
        """
        project_dir = os.path.join(self.projects_path, project_id)
        info_path = os.path.join(project_dir, "project.json")
        
        if os.path.exists(info_path):
            with open(info_path, 'r', encoding='utf-8') as f:
                project_info = json.load(f)
            
            # Kopiere Template in Projekt-Ordner
            template_name = os.path.basename(template_path)
            new_template_path = os.path.join(project_dir, template_name)
            shutil.copy2(template_path, new_template_path)
            
            # Aktualisiere Info
            project_info['template_path'] = new_template_path
            project_info['last_modified'] = datetime.now().isoformat()
            
            # Speichere
            with open(info_path, 'w', encoding='utf-8') as f:
                json.dump(project_info, f, indent=2, ensure_ascii=False)
            
            # Aktualisiere Historie
            self.add_to_history(project_info)
    
    def delete_project(self, project_id: str):
        """
        Löscht ein Projekt
        
        Args:
            project_id: Projekt-ID
        """
        # Lösche Projekt-Ordner
        project_dir = os.path.join(self.projects_path, project_id)
        if os.path.exists(project_dir):
            shutil.rmtree(project_dir)
        
        # Entferne aus Historie
        self.history = [p for p in self.history if p['id'] != project_id]
        self._save_history()
    
    def search_projects(self, query: str) -> List[Dict[str, Any]]:
        """
        Sucht Projekte nach Name
        
        Args:
            query: Suchbegriff
            
        Returns:
            Liste gefundener Projekte
        """
        query_lower = query.lower()
        results = []
        
        for project in self.history:
            if (query_lower in project['name'].lower() or
                query_lower in project.get('original_image', '').lower()):
                results.append(project)
        
        return results
