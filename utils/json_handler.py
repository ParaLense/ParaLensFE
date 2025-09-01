"""JSON Handler für Template-Speicherung und -Laden"""
import json
import os
from datetime import datetime
from typing import List, Dict, Any


class JsonHandler:
    @staticmethod
    def save_template(template_data: List[Dict[str, Any]], project_name: str, base_path: str = "data/templates") -> str:
        """
        Speichert Template-Daten im JSON-Format mit relativen Koordinaten
        
        Args:
            template_data: Liste von Box-Dictionaries
            project_name: Name des Projekts
            base_path: Basis-Pfad für Templates
            
        Returns:
            Pfad zur gespeicherten Datei
        """
        os.makedirs(base_path, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{project_name}_{timestamp}.json"
        filepath = os.path.join(base_path, filename)
        
        # Konvertiere zu relativem Format für Speicherung
        relative_data = []
        for box in template_data:
            relative_box = {
                "id": box.get("id", f"box_{len(relative_data) + 1}"),
                "x": box["x"],  # Bereits in Prozent
                "y": box["y"],  # Bereits in Prozent
                "width": box["width"],  # Bereits in Prozent
                "height": box["height"],  # Bereits in Prozent
                "label": box.get("label", f"Box {len(relative_data) + 1}")
            }
            relative_data.append(relative_box)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(relative_data, f, indent=2, ensure_ascii=False)
        
        return filepath
    
    @staticmethod
    def load_template(filepath: str) -> List[Dict[str, Any]]:
        """
        Lädt Template-Daten aus JSON-Datei
        
        Args:
            filepath: Pfad zur JSON-Datei
            
        Returns:
            Liste von Box-Dictionaries mit relativen Koordinaten
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Template file not found: {filepath}")
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return data
    
    @staticmethod
    def save_project_metadata(project_info: Dict[str, Any], base_path: str = "data/projects") -> str:
        """
        Speichert Projekt-Metadaten
        
        Args:
            project_info: Projekt-Informationen
            base_path: Basis-Pfad für Projekte
            
        Returns:
            Pfad zur gespeicherten Datei
        """
        os.makedirs(base_path, exist_ok=True)
        
        timestamp = project_info.get("timestamp", datetime.now().strftime("%Y%m%d_%H%M%S"))
        filename = f"project_{timestamp}.json"
        filepath = os.path.join(base_path, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(project_info, f, indent=2, ensure_ascii=False)
        
        return filepath
    
    @staticmethod
    def list_templates(base_path: str = "data/templates") -> List[Dict[str, str]]:
        """
        Listet alle verfügbaren Templates auf
        
        Returns:
            Liste von Template-Informationen
        """
        if not os.path.exists(base_path):
            return []
        
        templates = []
        for filename in os.listdir(base_path):
            if filename.endswith('.json'):
                filepath = os.path.join(base_path, filename)
                templates.append({
                    "filename": filename,
                    "path": filepath,
                    "modified": datetime.fromtimestamp(os.path.getmtime(filepath)).strftime("%Y-%m-%d %H:%M:%S")
                })
        
        return sorted(templates, key=lambda x: x["modified"], reverse=True)
