"""Resolution Tester für Template-Tests auf verschiedenen Auflösungen"""
from PIL import Image, ImageDraw, ImageFont
from typing import List, Dict, Any, Tuple
import os


class ResolutionTester:
    """Testet Templates auf verschiedenen Bildschirmauflösungen"""
    
    # Vordefinierte Auflösungen
    RESOLUTIONS = {
        "HD (720p)": (1280, 720),
        "Full HD (1080p)": (1920, 1080),
        "2K": (2560, 1440),
        "4K (UHD)": (3840, 2160),
        "5K": (5120, 2880),
        "8K": (7680, 4320),
        # Mobile
        "iPhone 14": (1170, 2532),
        "iPhone SE": (750, 1334),
        "iPad Pro 12.9": (2048, 2732),
        "Android Phone": (1080, 2400),
        "Android Tablet": (1600, 2560),
        # Desktop
        "MacBook Air": (2560, 1600),
        "MacBook Pro 16": (3456, 2234),
        "Desktop 1366": (1366, 768),
        "Desktop 1440": (1440, 900),
        "Desktop 1600": (1600, 900),
        "Desktop 1920": (1920, 1200),
        # Ultrawide
        "Ultrawide 21:9": (2560, 1080),
        "Ultrawide 32:9": (3840, 1080),
        "Super Ultrawide": (5120, 1440),
        # Custom
        "Custom": (0, 0)
    }
    
    def __init__(self):
        """Initialisiert den Resolution Tester"""
        self.current_resolution = "Full HD (1080p)"
        self.custom_resolution = (1920, 1080)
    
    def get_available_resolutions(self) -> List[str]:
        """
        Gibt Liste verfügbarer Auflösungen zurück
        
        Returns:
            Liste von Auflösungsnamen
        """
        return list(self.RESOLUTIONS.keys())
    
    def set_resolution(self, resolution_name: str, custom_width: int = None, custom_height: int = None):
        """
        Setzt die aktuelle Test-Auflösung
        
        Args:
            resolution_name: Name der Auflösung
            custom_width: Breite für Custom-Auflösung
            custom_height: Höhe für Custom-Auflösung
        """
        if resolution_name == "Custom" and custom_width and custom_height:
            self.current_resolution = "Custom"
            self.custom_resolution = (custom_width, custom_height)
        elif resolution_name in self.RESOLUTIONS:
            self.current_resolution = resolution_name
    
    def get_current_resolution(self) -> Tuple[int, int]:
        """
        Gibt die aktuelle Auflösung zurück
        
        Returns:
            Tuple (width, height)
        """
        if self.current_resolution == "Custom":
            return self.custom_resolution
        return self.RESOLUTIONS[self.current_resolution]
    
    def apply_template(self, template: List[Dict[str, Any]], 
                      background_image: Image.Image = None,
                      show_grid: bool = True,
                      show_dimensions: bool = True) -> Image.Image:
        """
        Wendet ein Template auf die aktuelle Auflösung an
        
        Args:
            template: Template-Daten mit relativen Koordinaten
            background_image: Optionales Hintergrundbild
            show_grid: Zeigt Raster an
            show_dimensions: Zeigt Dimensionen an
            
        Returns:
            Generiertes Testbild
        """
        width, height = self.get_current_resolution()
        
        # Erstelle oder skaliere Hintergrundbild
        if background_image:
            # Skaliere Hintergrundbild auf Zielauflösung
            image = background_image.resize((width, height), Image.Resampling.LANCZOS)
        else:
            # Erstelle leeres Bild mit Gradient
            image = self._create_gradient_background(width, height)
        
        # Zeichne auf das Bild
        draw = ImageDraw.Draw(image, 'RGBA')
        
        # Zeichne Grid wenn gewünscht
        if show_grid:
            self._draw_grid(draw, width, height)
        
        # Zeichne Template-Boxen
        self._draw_template_boxes(draw, template, width, height)
        
        # Zeige Auflösungs-Info
        if show_dimensions:
            self._draw_resolution_info(draw, width, height)
        
        return image
    
    def _create_gradient_background(self, width: int, height: int) -> Image.Image:
        """Erstellt einen Gradient-Hintergrund"""
        image = Image.new('RGB', (width, height))
        draw = ImageDraw.Draw(image)
        
        # Erstelle vertikalen Gradient
        for y in range(height):
            color_value = int(220 + (y / height) * 35)  # Von hell zu etwas dunkler
            color = (color_value, color_value, min(255, color_value + 5))
            draw.line([(0, y), (width, y)], fill=color)
        
        return image
    
    def _draw_grid(self, draw: ImageDraw.Draw, width: int, height: int):
        """Zeichnet ein Raster"""
        # Hauptraster alle 100 Pixel
        grid_color = (200, 200, 200, 100)
        for x in range(0, width, 100):
            draw.line([(x, 0), (x, height)], fill=grid_color, width=1)
        for y in range(0, height, 100):
            draw.line([(0, y), (width, y)], fill=grid_color, width=1)
        
        # Feines Raster alle 50 Pixel
        fine_grid_color = (220, 220, 220, 50)
        for x in range(50, width, 100):
            draw.line([(x, 0), (x, height)], fill=fine_grid_color, width=1)
        for y in range(50, height, 100):
            draw.line([(0, y), (width, y)], fill=fine_grid_color, width=1)
    
    def _draw_template_boxes(self, draw: ImageDraw.Draw, template: List[Dict[str, Any]], 
                            width: int, height: int):
        """Zeichnet Template-Boxen"""
        try:
            # Versuche verschiedene Fonts
            try:
                font = ImageFont.truetype("arial.ttf", 14)
                small_font = ImageFont.truetype("arial.ttf", 11)
            except:
                try:
                    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 14)
                    small_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 11)
                except:
                    font = ImageFont.load_default()
                    small_font = font
        except:
            font = ImageFont.load_default()
            small_font = font
        
        for i, box in enumerate(template):
            # Konvertiere relative zu absoluten Koordinaten
            x = int((box['x'] / 100) * width)
            y = int((box['y'] / 100) * height)
            box_width = int((box['width'] / 100) * width)
            box_height = int((box['height'] / 100) * height)
            
            # Box-Farbe (verschiedene Farben für verschiedene Boxen)
            colors = [
                (255, 59, 48),   # Rot
                (255, 149, 0),   # Orange
                (255, 204, 0),   # Gelb
                (52, 199, 89),   # Grün
                (0, 122, 255),   # Blau
                (88, 86, 214),   # Indigo
                (175, 82, 222),  # Violett
                (255, 45, 85),   # Pink
            ]
            color = colors[i % len(colors)]
            
            # Zeichne Box mit Schatten-Effekt
            # Schatten
            shadow_offset = 3
            draw.rectangle(
                [x + shadow_offset, y + shadow_offset, 
                 x + box_width + shadow_offset, y + box_height + shadow_offset],
                fill=(0, 0, 0, 30)
            )
            
            # Box-Füllung (semi-transparent)
            draw.rectangle(
                [x, y, x + box_width, y + box_height],
                fill=(*color, 40),
                outline=(*color, 255),
                width=2
            )
            
            # Box-Nummer in Ecke
            box_number = str(i + 1)
            number_bbox = draw.textbbox((0, 0), box_number, font=font)
            number_width = number_bbox[2] - number_bbox[0]
            number_height = number_bbox[3] - number_bbox[1]
            
            # Nummer-Badge
            badge_padding = 4
            badge_x = x - badge_padding
            badge_y = y - number_height - badge_padding * 2
            
            draw.ellipse(
                [badge_x, badge_y,
                 badge_x + number_width + badge_padding * 2,
                 badge_y + number_height + badge_padding * 2],
                fill=(*color, 255)
            )
            
            draw.text(
                (badge_x + badge_padding, badge_y + badge_padding),
                box_number,
                fill=(255, 255, 255),
                font=font
            )
            
            # Box-Label
            if 'label' in box and box['label']:
                # Label-Hintergrund
                label_bbox = draw.textbbox((0, 0), box['label'], font=small_font)
                label_width = label_bbox[2] - label_bbox[0]
                label_height = label_bbox[3] - label_bbox[1]
                
                label_bg_x = x + 5
                label_bg_y = y + 5
                
                draw.rectangle(
                    [label_bg_x, label_bg_y,
                     label_bg_x + label_width + 6,
                     label_bg_y + label_height + 4],
                    fill=(255, 255, 255, 200)
                )
                
                draw.text(
                    (label_bg_x + 3, label_bg_y + 2),
                    box['label'],
                    fill=color,
                    font=small_font
                )
            
            # Box-Dimensionen anzeigen
            dim_text = f"{box_width}x{box_height}px"
            dim_bbox = draw.textbbox((0, 0), dim_text, font=small_font)
            dim_width = dim_bbox[2] - dim_bbox[0]
            
            draw.rectangle(
                [x + box_width - dim_width - 8, y + box_height - 20,
                 x + box_width - 2, y + box_height - 2],
                fill=(0, 0, 0, 150)
            )
            
            draw.text(
                (x + box_width - dim_width - 5, y + box_height - 18),
                dim_text,
                fill=(255, 255, 255),
                font=small_font
            )
    
    def _draw_resolution_info(self, draw: ImageDraw.Draw, width: int, height: int):
        """Zeigt Auflösungsinformationen an"""
        try:
            font = ImageFont.truetype("arial.ttf", 16)
        except:
            font = ImageFont.load_default()
        
        # Info-Text
        resolution_text = f"{self.current_resolution}: {width}x{height}px"
        aspect_ratio = self._calculate_aspect_ratio(width, height)
        aspect_text = f"Aspect Ratio: {aspect_ratio}"
        
        # Hintergrund für Info
        info_height = 60
        draw.rectangle(
            [0, height - info_height, width, height],
            fill=(0, 0, 0, 180)
        )
        
        # Text
        draw.text(
            (10, height - info_height + 10),
            resolution_text,
            fill=(255, 255, 255),
            font=font
        )
        
        draw.text(
            (10, height - info_height + 35),
            aspect_text,
            fill=(200, 200, 200),
            font=font
        )
        
        # DPI Info
        dpi_text = f"Standard DPI: {self._get_standard_dpi(self.current_resolution)}"
        draw.text(
            (width - 150, height - info_height + 35),
            dpi_text,
            fill=(200, 200, 200),
            font=font
        )
    
    def _calculate_aspect_ratio(self, width: int, height: int) -> str:
        """Berechnet das Seitenverhältnis"""
        from math import gcd
        
        divisor = gcd(width, height)
        ratio_width = width // divisor
        ratio_height = height // divisor
        
        # Vereinfache bekannte Verhältnisse
        common_ratios = {
            (16, 9): "16:9",
            (16, 10): "16:10",
            (4, 3): "4:3",
            (21, 9): "21:9",
            (32, 9): "32:9",
            (3, 2): "3:2",
            (5, 4): "5:4"
        }
        
        for (w, h), name in common_ratios.items():
            if abs(ratio_width/ratio_height - w/h) < 0.01:
                return name
        
        return f"{ratio_width}:{ratio_height}"
    
    def _get_standard_dpi(self, resolution_name: str) -> int:
        """Gibt Standard-DPI für bekannte Geräte zurück"""
        dpi_map = {
            "iPhone 14": 460,
            "iPhone SE": 326,
            "iPad Pro 12.9": 264,
            "MacBook Air": 227,
            "MacBook Pro 16": 254,
        }
        
        return dpi_map.get(resolution_name, 96)  # 96 DPI ist Standard für Desktop
    
    def export_test_results(self, template: List[Dict[str, Any]], 
                           output_dir: str = "data/test_results",
                           resolutions: List[str] = None,
                           background_image: Image.Image = None) -> List[str]:
        """
        Exportiert Testergebnisse für mehrere Auflösungen
        
        Args:
            template: Template-Daten
            output_dir: Ausgabe-Verzeichnis
            resolutions: Liste zu testender Auflösungen (None = alle)
            background_image: Optionales Hintergrundbild
            
        Returns:
            Liste der generierten Dateipfade
        """
        os.makedirs(output_dir, exist_ok=True)
        
        if resolutions is None:
            resolutions = [r for r in self.RESOLUTIONS.keys() if r != "Custom"]
        
        generated_files = []
        
        for resolution_name in resolutions:
            if resolution_name not in self.RESOLUTIONS:
                continue
            
            self.set_resolution(resolution_name)
            
            # Generiere Testbild
            test_image = self.apply_template(
                template,
                background_image=background_image,
                show_grid=True,
                show_dimensions=True
            )
            
            # Speichere Bild
            safe_name = resolution_name.replace(" ", "_").replace("(", "").replace(")", "")
            filename = f"test_{safe_name}.png"
            filepath = os.path.join(output_dir, filename)
            
            test_image.save(filepath)
            generated_files.append(filepath)
        
        return generated_files
