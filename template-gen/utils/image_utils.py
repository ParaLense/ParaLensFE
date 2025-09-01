"""Image Utilities für Bildverarbeitung und Konvertierung"""
import os
from PIL import Image, ImageDraw, ImageFont
from typing import Tuple, List, Dict, Any


class ImageUtils:
    @staticmethod
    def resize_to_fit(image: Image.Image, max_width: int, max_height: int) -> Tuple[Image.Image, float]:
        """
        Skaliert ein Bild proportional, um in gegebene Dimensionen zu passen
        
        Args:
            image: PIL Image Objekt
            max_width: Maximale Breite
            max_height: Maximale Höhe
            
        Returns:
            Tuple aus skaliertem Bild und Skalierungsfaktor
        """
        img_width, img_height = image.size
        
        # Berechne Skalierungsfaktor
        scale_x = max_width / img_width
        scale_y = max_height / img_height
        scale = min(scale_x, scale_y)
        
        # Skaliere nur wenn nötig
        if scale < 1:
            new_width = int(img_width * scale)
            new_height = int(img_height * scale)
            resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            return resized, scale
        
        return image, 1.0
    
    @staticmethod
    def draw_template_overlay(image: Image.Image, boxes: List[Dict[str, Any]], 
                             image_width: int, image_height: int) -> Image.Image:
        """
        Zeichnet Template-Boxen auf ein Bild
        
        Args:
            image: Basis-Bild
            boxes: Liste von Box-Definitionen (mit relativen Koordinaten in %)
            image_width: Breite des Canvas
            image_height: Höhe des Canvas
            
        Returns:
            Bild mit Overlay
        """
        # Erstelle eine Kopie
        overlay_image = image.copy()
        draw = ImageDraw.Draw(overlay_image, 'RGBA')
        
        # Versuche System-Font zu laden
        try:
            font = ImageFont.truetype("arial.ttf", 14)
            label_font = ImageFont.truetype("arial.ttf", 12)
        except:
            font = ImageFont.load_default()
            label_font = font
        
        for i, box in enumerate(boxes):
            # Konvertiere relative zu absoluten Koordinaten
            x = int((box['x'] / 100) * image_width)
            y = int((box['y'] / 100) * image_height)
            width = int((box['width'] / 100) * image_width)
            height = int((box['height'] / 100) * image_height)
            
            # Zeichne Box mit semi-transparentem Hintergrund
            draw.rectangle(
                [x, y, x + width, y + height],
                outline=(255, 0, 0, 255),  # Rot
                width=2
            )
            
            # Zeichne semi-transparenten Hintergrund
            draw.rectangle(
                [x + 1, y + 1, x + width - 1, y + height - 1],
                fill=(255, 0, 0, 30)  # Semi-transparentes Rot
            )
            
            # Zeichne Box-Nummer
            box_number = str(i + 1)
            number_bbox = draw.textbbox((0, 0), box_number, font=font)
            number_width = number_bbox[2] - number_bbox[0]
            number_height = number_bbox[3] - number_bbox[1]
            
            # Nummer-Hintergrund
            number_bg_x = x + 2
            number_bg_y = y - number_height - 4
            draw.rectangle(
                [number_bg_x, number_bg_y, 
                 number_bg_x + number_width + 4, number_bg_y + number_height + 2],
                fill=(255, 0, 0, 200)
            )
            
            # Nummer-Text
            draw.text(
                (number_bg_x + 2, number_bg_y),
                box_number,
                fill=(255, 255, 255, 255),
                font=font
            )
            
            # Label (wenn vorhanden)
            if 'label' in box and box['label']:
                draw.text(
                    (x + 4, y + 4),
                    box['label'],
                    fill=(255, 255, 255, 255),
                    font=label_font
                )
        
        return overlay_image
    
    @staticmethod
    def apply_template_to_resolution(template: List[Dict[str, Any]], 
                                    width: int, height: int,
                                    background_color: Tuple[int, int, int] = (240, 240, 240)) -> Image.Image:
        """
        Wendet ein Template auf eine spezifische Auflösung an
        
        Args:
            template: Template-Daten mit relativen Koordinaten
            width: Ziel-Breite
            height: Ziel-Höhe
            background_color: Hintergrundfarbe
            
        Returns:
            Generiertes Bild mit Template
        """
        # Erstelle neues Bild
        image = Image.new('RGB', (width, height), background_color)
        draw = ImageDraw.Draw(image)
        
        # Zeichne Grid für bessere Visualisierung
        grid_color = (220, 220, 220)
        for x in range(0, width, 100):
            draw.line([(x, 0), (x, height)], fill=grid_color, width=1)
        for y in range(0, height, 100):
            draw.line([(0, y), (width, y)], fill=grid_color, width=1)
        
        # Wende Template an
        result = ImageUtils.draw_template_overlay(image, template, width, height)
        
        return result
